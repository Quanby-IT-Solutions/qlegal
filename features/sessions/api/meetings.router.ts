import { TRPCError } from "@trpc/server"
import { and, asc, desc, eq, inArray, ne, type InferSelectModel } from "drizzle-orm"
import { z } from "zod/v4"

import { getFullName } from "@/core/lib/utils"

import {
	getDoconchainApiToken,
	invalidateDoconchainToken,
} from "@/services/doconchain/auth/generate-token"
import { addDoconchainProjectSigner } from "@/services/doconchain/projects/add-signer"
import { createDoconchainProject } from "@/services/doconchain/projects/create-project"
import { generateDoconchainSignLink } from "@/services/doconchain/projects/generate-sign-link"
import { db } from "@/services/drizzle/db"
import { appointmentParticipants } from "@/services/drizzle/schema/appointment-participants"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { meetingMessages } from "@/services/drizzle/schema/meeting-messages"
import { meetings } from "@/services/drizzle/schema/meetings"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { sendSigningLinkEmail } from "@/services/react-email/lib/send.signing-link"
import { getPublicClient, getServiceRoleClient } from "@/services/supabase"
import { getPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { createMeetingRoom, fetchRecordings, generateMeetingToken } from "@/services/video-sdk"

import { getAccountReadiness } from "@/features/account-readiness/lib/account-readiness"
import { populateNotarialRegistryOnMeetingEnd } from "@/features/notarial-book/server/populate-notarial-registry-on-meeting-end"
import { getSubOrgCredsForMemberEmail } from "@/features/sub-orgs/server/get-sub-org-creds-for-member"

import { env } from "@/env"

import { assertMeetingUnlockedForDocumentMutations } from "./meeting-lock-guard"

function isEnpRole(role: unknown): boolean {
	if (typeof role !== "string") return false
	return role.trim().toUpperCase() === "ENP"
}

/** Resolve avatar storage path to public URL (same as next-auth session). */
function resolveAvatarImage(image: string | null | undefined): string | null {
	if (!image || typeof image !== "string") return image ?? null
	const trimmed = image.trim()
	if (!trimmed) return null
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
	try {
		const supabase = getPublicClient()
		const path = trimmed.replace(/^\/+/, "")
		const { data } = supabase.storage.from("avatar").getPublicUrl(path)
		return data.publicUrl ?? null
	} catch {
		return null
	}
}

function asNonEmptyEmail(email: unknown): string | undefined {
	if (typeof email !== "string") return undefined
	const trimmed = email.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

function stripUrlQueryAndHash(urlString: string | null | undefined): string | null {
	if (!urlString || typeof urlString !== "string") return urlString ?? null
	try {
		const url = new URL(urlString)
		url.search = ""
		url.hash = ""
		return url.toString()
	} catch {
		return urlString
	}
}

async function getAppointmentParticipantsByMeetingId(meetingId: string) {
	const appointment = await db.query.appointments.findFirst({
		where: eq(appointments.meetingId, meetingId),
	})

	if (!appointment) {
		return { appointment: null, apParticipants: [] }
	}

	const apParticipants = await db.query.appointmentParticipants.findMany({
		where: eq(appointmentParticipants.appointmentId, appointment.id),
		with: {
			user: {
				columns: {
					id: true,
					firstName: true,
					middleName: true,
					lastName: true,
					email: true,
					image: true,
					role: true,
				},
				with: {
					enpProfile: {
						columns: {
							acknowledgmentPrice: true,
							affirmationPrice: true,
							juratPrice: true,
							signatureWitnessingPrice: true,
						},
					},
				},
			},
		},
	})

	return { appointment, apParticipants }
}

export const meetingsRouter = createTRPCRouter({
	// Create a new meeting (and linked appointment + participants so it shows in the list)
	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1, "Title is required").optional().default("Ad-hoc meeting"),
				participantIds: z.array(z.string().min(1)).optional().default([]),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { roomId } = await createMeetingRoom()

			const [meeting] = await db
				.insert(meetings)
				.values({
					roomId,
					createdById: ctx.session.user.id,
				})
				.returning()

			if (!meeting) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create meeting",
				})
			}

			const title = (input.title ?? "Ad-hoc meeting").trim() || "Ad-hoc meeting"
			const participantIds = Array.isArray(input.participantIds)
				? input.participantIds.filter((id): id is string => typeof id === "string" && id.length > 0)
				: []

			const [appointment] = await db
				.insert(appointments)
				.values({
					userId: ctx.session.user.id,
					meetingId: meeting.id,
					title,
					type: "CONSULTATION",
					status: "CONFIRMED",
					appointmentDate: new Date(),
				})
				.returning()

			if (!appointment) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create appointment for meeting",
				})
			}

			// Creator as HOST / ACCEPTED
			await db.insert(appointmentParticipants).values({
				appointmentId: appointment.id,
				userId: ctx.session.user.id,
				status: "ACCEPTED",
				participantRole: "HOST",
				acceptedAt: new Date(),
			})

			// Other participants (ACCEPTED so they see the meeting immediately in manual flow)
			const otherIds = participantIds.filter(id => id !== ctx.session.user.id)
			if (otherIds.length > 0) {
				await db.insert(appointmentParticipants).values(
					otherIds.map(userId => ({
						appointmentId: appointment.id,
						userId,
						status: "ACCEPTED" as const,
						participantRole: "PARTICIPANT" as const,
						acceptedAt: new Date(),
					}))
				)
			}

			return {
				success: true,
				meeting,
				token: generateMeetingToken(),
			}
		}),

	// Get user's meetings
	getUserMeetings: protectedProcedure.query(async ({ ctx }) => {
		const userMeetings = await db.query.appointmentParticipants.findMany({
			where: and(
				eq(appointmentParticipants.userId, ctx.session.user.id),
				eq(appointmentParticipants.status, "ACCEPTED")
			),
			with: {
				appointment: {
					with: {
						meeting: {
							with: {
								createdBy: {
									columns: {
										id: true,
										firstName: true,
										middleName: true,
										lastName: true,
										email: true,
										image: true,
										role: true,
									},
								},
							},
						},
					},
				},
			},
			orderBy: (ap, { desc }) => [desc(ap.createdAt)],
		})

		return userMeetings
			.map(ap => ap.appointment?.meeting)
			.filter((meeting): meeting is NonNullable<typeof meeting> => Boolean(meeting))
	}),

	// Get user's meetings (same order as meetings page), plus document stats
	getUserMeetingsWithDocumentStats: protectedProcedure
		.input(
			z
				.object({
					limit: z.number().int().min(1).max(50).optional(),
					offset: z.number().int().min(0).max(50_000).optional(),
				})
				.optional()
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 10
			const offset = input?.offset ?? 0

			// NOTE: We intentionally avoid Drizzle relational `with:` on appointment participants here.
			// Some DBs have a legacy mismatch between `participantRole` vs `participant_role`, and Drizzle
			// will eagerly select that column even when we don't need it for the Sessions UI.
			// By selecting only the columns we need, we avoid blowing up this query.
			const participantLinks = await db
				.select({
					appointmentId: appointmentParticipants.appointmentId,
					createdAt: appointmentParticipants.createdAt,
				})
				.from(appointmentParticipants)
				.where(
					and(
						eq(appointmentParticipants.userId, ctx.session.user.id),
						eq(appointmentParticipants.status, "ACCEPTED")
					)
				)
				.orderBy(desc(appointmentParticipants.createdAt))
				.limit(limit + 1)
				.offset(offset)

			const hasMore = participantLinks.length > limit
			const pageLinks = hasMore ? participantLinks.slice(0, limit) : participantLinks
			const appointmentIds = pageLinks.map(r => r.appointmentId)

			if (appointmentIds.length === 0) {
				return { items: [], hasMore }
			}

			const appts = await db.query.appointments.findMany({
				where: inArray(appointments.id, appointmentIds),
				with: {
					meeting: {
						with: {
							createdBy: {
								columns: {
									id: true,
									firstName: true,
									middleName: true,
									lastName: true,
									email: true,
									image: true,
									role: true,
								},
							},
							documents: {
								columns: {
									id: true,
									docoChainProjectId: true,
								},
							},
							signatureRequests: {
								columns: {
									documentId: true,
									status: true,
								},
							},
						},
					},
				},
			})

			const apptById = new Map(appts.map(a => [a.id, a]))

			// Fetch ACCEPTED participants for the appointments, without selecting participant role column.
			const acceptedParticipantRows = await db
				.select({
					id: appointmentParticipants.id,
					appointmentId: appointmentParticipants.appointmentId,
					userId: appointmentParticipants.userId,
					status: appointmentParticipants.status,
					user: {
						id: users.id,
						firstName: users.firstName,
						middleName: users.middleName,
						lastName: users.lastName,
						image: users.image,
					},
				})
				.from(appointmentParticipants)
				.innerJoin(users, eq(appointmentParticipants.userId, users.id))
				.where(
					and(
						inArray(appointmentParticipants.appointmentId, appointmentIds),
						eq(appointmentParticipants.status, "ACCEPTED")
					)
				)

			const participantsByAppointmentId = new Map<
				string,
				Array<{
					id: string
					userId: string
					status: "ACCEPTED" | "PENDING" | "DECLINED"
					user: { id: string; name: string | null; image: string | null } | null
				}>
			>()

			for (const row of acceptedParticipantRows) {
				const list = participantsByAppointmentId.get(row.appointmentId) ?? []
				list.push({
					id: row.id,
					userId: row.userId,
					status: row.status,
					user: row.user
						? {
								id: row.user.id,
								name: getFullName(row.user),
								image: resolveAvatarImage(row.user.image),
							}
						: null,
				})
				participantsByAppointmentId.set(row.appointmentId, list)
			}

			const rawItems = pageLinks
				.map(link => apptById.get(link.appointmentId))
				.filter(
					(
						appointment
					): appointment is NonNullable<typeof appointment> & {
						meeting: NonNullable<NonNullable<typeof appointment>["meeting"]>
					} => Boolean(appointment?.meetingId && appointment?.meeting)
				)
				.map(appointment => {
					const meeting = appointment.meeting
					const documentsList = meeting.documents ?? []
					const total = documentsList.length

					const requestsByDocumentId = new Map<string, string[]>()
					for (const req of meeting.signatureRequests ?? []) {
						const list = requestsByDocumentId.get(req.documentId) ?? []
						list.push(req.status)
						requestsByDocumentId.set(req.documentId, list)
					}

					let signed = 0
					for (const doc of documentsList) {
						const reqStatuses = requestsByDocumentId.get(doc.id) ?? []
						const isSignedByRequests =
							reqStatuses.length > 0 && reqStatuses.every(s => s === "SIGNED")
						if (isSignedByRequests) signed += 1
					}

					const participants = participantsByAppointmentId.get(appointment.id) ?? []

					// Role-aware title: principal books "Notarization with [ENP]"; when ENP views, show "Notarization with [principal]"
					const currentUserId = ctx.session.user.id
					const isAppointmentOwner = appointment.userId === currentUserId
					let displayTitle = appointment.title ?? "Meeting"
					if (isAppointmentOwner && participants.length > 0) {
						const other = participants.find(p => p.user?.id !== currentUserId)?.user
						const otherName = other?.name?.trim() ?? "Client"
						displayTitle =
							(appointment.type === "NOTARIZATION" ? "Notarization with " : "Session with ") +
							otherName
					}

					return {
						...meeting,
						title: displayTitle,
						status: appointment.status ?? "CONFIRMED",
						appointmentDate: appointment.appointmentDate,
						allowPublicLink: appointment.allowPublicLink ?? false,
						createdBy: meeting.createdBy
							? { ...meeting.createdBy, image: resolveAvatarImage(meeting.createdBy.image) }
							: meeting.createdBy,
						participants,
						documentStats: { total, signed, isComplete: true },
					}
				})

			// Dedupe by meeting id (same meeting can appear for multiple ACCEPTED participants)
			const seenMeetingIds = new Set<string>()
			const items = rawItems.filter(item => {
				if (seenMeetingIds.has(item.id)) return false
				seenMeetingIds.add(item.id)
				return true
			})

			return { items, hasMore }
		}),

	// Get meeting by ID
	getById: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
			with: {
				createdBy: {
					columns: {
						id: true,
						firstName: true,
						middleName: true,
						lastName: true,
						email: true,
						image: true,
					},
				},
			},
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		// Check if user has access (host OR accepted participant)
		const isHost = meeting.createdById === ctx.session.user.id
		const { appointment, apParticipants } = await getAppointmentParticipantsByMeetingId(input)

		const isAcceptedParticipant = apParticipants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)
		const hasAccess = isHost || isAcceptedParticipant

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this meeting",
			})
		}

		const acceptedParticipants = apParticipants.filter(p => p.status === "ACCEPTED")
		const pendingInvites = apParticipants.filter(p => p.status === "PENDING")

		// Return accepted participants as "participants" (for normal meeting pages),
		// and also expose pending invites for host UI (lobby invite list). Resolve avatar paths to URLs.
		const resolveParticipant = (p: (typeof apParticipants)[number]) => ({
			...p,
			user: p.user ? { ...p.user, image: resolveAvatarImage(p.user.image) } : p.user,
		})
		return {
			...meeting,
			title: appointment?.title ?? meeting.id,
			status: appointment?.status ?? "CONFIRMED",
			allowPublicLink: appointment?.allowPublicLink ?? false,
			createdBy: meeting.createdBy
				? { ...meeting.createdBy, image: resolveAvatarImage(meeting.createdBy.image) }
				: meeting.createdBy,
			participants: acceptedParticipants.map(resolveParticipant),
			pendingInvites: pendingInvites.map(resolveParticipant),
		}
	}),

	// Get meeting token
	getToken: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		// Check if user has access (host OR accepted participant)
		const isHost = meeting.createdById === ctx.session.user.id
		const { apParticipants } = await getAppointmentParticipantsByMeetingId(input)
		const isAcceptedParticipant = apParticipants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)
		const hasAccess = isHost || isAcceptedParticipant

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this meeting",
			})
		}

		return {
			token: generateMeetingToken(),
			roomId: meeting.roomId,
		}
	}),

	// Ensure a fresh DocoChain token for the meeting (ENP only). Use to gate "Create Project"
	// so the button stays disabled with a loader until we have a valid fresh token.
	ensureDocoChainToken: protectedProcedure
		.input(z.object({ meetingId: z.string().min(1) }))
		.query(async ({ input, ctx }) => {
			const debugLogsEnabled = env.NODE_ENV !== "production"
			const startMs = Date.now()
			if (debugLogsEnabled) {
				console.log("[sessions][doconchain] ensureDocoChainToken start", {
					meetingId: input.meetingId,
					userId: ctx.session.user.id,
				})
			}
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				columns: { id: true, createdById: true },
			})
			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}
			const isHost = meeting.createdById === ctx.session.user.id
			const { apParticipants } = await getAppointmentParticipantsByMeetingId(input.meetingId)
			const isAccepted = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			if (!isHost && !isAccepted) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this meeting" })
			}

			// Determine which DocOnChain user owns projects for this meeting (ENP participant).
			const enpParticipant = apParticipants.find(
				p => isEnpRole(p.user?.role) && !!asNonEmptyEmail(p.user?.email)
			)
			const enpEmail = asNonEmptyEmail(enpParticipant?.user?.email)
			if (!enpEmail) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "An ENP participant with an email is required to prepare DocOnChain.",
				})
			}
			if (debugLogsEnabled) {
				console.log("[sessions][doconchain] ensureDocoChainToken resolved ENP", {
					meetingId: input.meetingId,
					enpEmail,
					totalMs: Date.now() - startMs,
				})
			}

			try {
				// Force-refresh the cached token so the next DocOnChain call is not using a stale token.
				const tokenStartMs = Date.now()
				if (debugLogsEnabled) {
					console.log("[sessions][doconchain] invalidateDoconchainToken", {
						meetingId: input.meetingId,
						enpEmail,
					})
				}
				invalidateDoconchainToken(enpEmail)
				if (debugLogsEnabled) {
					console.log("[sessions][doconchain] getDoconchainApiToken start", {
						meetingId: input.meetingId,
						enpEmail,
					})
				}
				await getDoconchainApiToken({
					email: enpEmail,
					forceGenerated: true,
					getSubOrgCredsForEmail: em => getSubOrgCredsForMemberEmail(em, db),
				})
				if (debugLogsEnabled) {
					console.log("[sessions][doconchain] getDoconchainApiToken ok", {
						meetingId: input.meetingId,
						enpEmail,
						tokenMs: Date.now() - tokenStartMs,
						totalMs: Date.now() - startMs,
					})
				}
				return { ready: true }
			} catch (error) {
				const msg = error instanceof Error ? error.message : "Failed to prepare DocOnChain."
				if (debugLogsEnabled) {
					console.log("[sessions][doconchain] ensureDocoChainToken error", {
						meetingId: input.meetingId,
						enpEmail,
						message: msg,
						totalMs: Date.now() - startMs,
					})
				}
				const lower = msg.toLowerCase()

				// Don't block document upload UX if DocOnChain auto-join is temporarily unauthorized.
				// Uploading to QSign can still proceed; DocOnChain project creation can be retried later.
				const looksLikeDoconchainUnauthorized =
					lower.includes("e_unauthorized_access") ||
					(lower.includes("doconchain auto-join failed") && lower.includes("unauthorized"))
				if (looksLikeDoconchainUnauthorized) {
					return { ready: true, doconchainDegraded: true }
				}

				throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: msg })
			}
		}),

	// Fetch VideoSDK recordings for a meeting (user must have access)
	getRecordings: protectedProcedure
		.input(z.object({ meetingId: z.string() }))
		.query(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				columns: { id: true, roomId: true, createdById: true },
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			const isHost = meeting.createdById === ctx.session.user.id
			const { apParticipants } = await getAppointmentParticipantsByMeetingId(input.meetingId)
			const isAcceptedParticipant = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			const hasAccess = isHost || isAcceptedParticipant

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this meeting",
				})
			}

			const list = await fetchRecordings(meeting.roomId)
			return list
		}),

	// Start meeting (change status to ONGOING)
	startMeeting: protectedProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		const isHost = meeting.createdById === ctx.session.user.id
		const { appointment, apParticipants } = await getAppointmentParticipantsByMeetingId(input)
		const isParticipant = apParticipants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)

		if (!isHost && !isParticipant) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only meeting participants can start the meeting",
			})
		}

		const readiness = await getAccountReadiness(ctx.session.user.id, db)
		const isEnp = isEnpRole(ctx.session.user.role)
		const canProceed = isEnp ? readiness.canStartNotarization : readiness.canJoinMeeting
		if (!canProceed) {
			throw new TRPCError({
				code: "PRECONDITION_FAILED",
				message: isEnp
					? "ENP must have active commission and valid ID to start a notarization session"
					: "You must complete KYC verification before joining a session",
				cause: { reasons: readiness.reasons },
			})
		}

		if (!appointment) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Appointment not found for this meeting",
			})
		}

		if (appointment.status !== "CONFIRMED") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Meeting is already started or ended",
			})
		}

		await db
			.update(appointments)
			.set({ status: "ONGOING", updatedAt: new Date() })
			.where(eq(appointments.meetingId, input))

		const updatedMeeting = await db.query.meetings.findFirst({ where: eq(meetings.id, input) })

		return { success: true, meeting: updatedMeeting }
	}),

	// End meeting (change status to COMPLETED)
	endMeeting: protectedProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		const meetingId = input
		const { apParticipants } = await getAppointmentParticipantsByMeetingId(meetingId)
		const isHost = meeting.createdById === ctx.session.user.id
		const isAcceptedParticipant = apParticipants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)

		if (!isHost && !isAcceptedParticipant) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only meeting participants can end the meeting",
			})
		}

		const appointment = await db.query.appointments.findFirst({
			where: eq(appointments.meetingId, meetingId),
		})

		if (!appointment) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Appointment not found for this meeting",
			})
		}

		if (appointment.status !== "ONGOING") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Meeting is not ongoing",
			})
		}

		const meetingEndedAt = new Date()
		await db
			.update(appointments)
			.set({ status: "COMPLETED", updatedAt: meetingEndedAt })
			.where(eq(appointments.meetingId, meetingId))

		const updatedMeeting = await db.query.meetings.findFirst({ where: eq(meetings.id, input) })

		// Populate Notarial Registry entries for completed DocOnChain projects in this meeting.
		// This runs ONLY when this specific meeting is ended (host clicks End Session).
		try {
			await populateNotarialRegistryOnMeetingEnd({
				meetingId: input,
				meetingEndedAt,
			})
		} catch (error) {
			// Don't block "End Session" on DocOnChain availability; log and proceed.
			console.warn("⚠️ Failed to populate notarial registry on meeting end:", error)
		}

		// Delete in-meeting chat messages when session ends (retention policy).
		await db.delete(meetingMessages).where(eq(meetingMessages.meetingId, meetingId))

		return { success: true, meeting: updatedMeeting }
	}),

	// Get meeting chat messages (for rejoin / refresh). Deleted when meeting ends.
	getMeetingMessages: protectedProcedure
		.input(z.object({ meetingId: z.string().min(1) }))
		.query(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})
			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}
			const rows = await db.query.meetingMessages.findMany({
				where: eq(meetingMessages.meetingId, input.meetingId),
				orderBy: [asc(meetingMessages.createdAt)],
				with: {
					sender: {
						columns: {
							id: true,
							firstName: true,
							middleName: true,
							lastName: true,
						},
					},
				},
			})
			const currentUserId = ctx.session.user.id
			return rows.map(row => ({
				id: row.id,
				text: row.content,
				senderId: row.senderId,
				senderName: row.sender ? getFullName(row.sender) : "Someone",
				timestamp: row.createdAt.getTime(),
				isSelf: row.senderId === currentUserId,
			}))
		}),

	// Send a meeting chat message (persisted until meeting ends).
	sendMeetingMessage: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1),
				content: z.string().min(1).max(5000),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})
			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}
			const [inserted] = await db
				.insert(meetingMessages)
				.values({
					meetingId: input.meetingId,
					senderId: ctx.session.user.id,
					content: input.content.trim(),
				})
				.returning()
			if (!inserted) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to send message",
				})
			}
			const senderName = (ctx.session.user as { name?: string }).name ?? "Someone"
			return {
				id: inserted.id,
				text: inserted.content,
				senderId: inserted.senderId,
				senderName: String(senderName),
				timestamp: inserted.createdAt.getTime(),
				isSelf: true,
			}
		}),

	// Delete meeting
	delete: protectedProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		if (meeting.createdById !== ctx.session.user.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the creator can delete this meeting",
			})
		}

		await db.delete(meetings).where(eq(meetings.id, input))

		return { success: true }
	}),

	// Cancel meeting (set associated appointment to CANCELLED with reason)
	cancelMeeting: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1, "Meeting ID is required"),
				cancelReason: z.string().min(1, "Cancellation reason is required"),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			if (meeting.createdById !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the creator can cancel this meeting",
				})
			}

			const appointment = await db.query.appointments.findFirst({
				where: eq(appointments.meetingId, input.meetingId),
			})

			if (!appointment) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No appointment associated with this meeting",
				})
			}

			if (appointment.status !== "CONFIRMED" && appointment.status !== "PENDING") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Cannot cancel a meeting that is ${appointment.status.toLowerCase()}`,
				})
			}

			await db
				.update(appointments)
				.set({
					status: "CANCELLED",
					cancelReason: input.cancelReason,
					color: "#EF4444",
					updatedAt: new Date(),
				})
				.where(eq(appointments.id, appointment.id))

			return { success: true }
		}),

	// Upload document during meeting
	uploadDocument: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1),
				name: z.string().min(1, "Document name is required"),
				file: z.string(), // Base64 encoded file
				mimeType: z.string(),
				size: z.number(),
				description: z.string().optional(),
				notarizationType: z.enum([
					"ACKNOWLEDGMENT",
					"AFFIRMATION",
					"JURAT",
					"SIGNATURE_WITNESSING",
				]),
				fees: z.number().nonnegative().optional(), // ENP-only, set during upload
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { meetingId, name, file, mimeType, size, notarizationType } = input

			// Verify meeting exists and user has access, and get the ENP's email
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, meetingId),
				with: {
					createdBy: {
						columns: {
							email: true,
							role: true,
						},
					},
				},
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			// Check if user has access to the meeting
			const isHost = meeting.createdById === ctx.session.user.id
			const { appointment, apParticipants } = await getAppointmentParticipantsByMeetingId(meetingId)
			const isAcceptedParticipant = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			const hasAccess = isHost || isAcceptedParticipant

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this meeting",
				})
			}
			assertMeetingUnlockedForDocumentMutations(meeting)

			try {
				// Validate file type - only PDF is supported for document signing
				if (mimeType !== "application/pdf") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Only PDF files are supported for document signing",
					})
				}

				// Get existing documents count to set the order for new upload
				const existingDocuments = await db
					.select({ id: documents.id })
					.from(documents)
					.where(eq(documents.meetingId, meetingId))

				const nextOrder = existingDocuments.length

				// Decode base64 file data
				const fileBuffer = Buffer.from(file, "base64")

				// Determine which DocOnChain user should own the project (ENP).
				const enpParticipant = apParticipants.find(
					p => isEnpRole(p.user?.role) && !!asNonEmptyEmail(p.user?.email)
				)
				const enpEmail = asNonEmptyEmail(enpParticipant?.user?.email)
				const enpUserId = enpParticipant?.userId

				if (!enpEmail || !enpUserId) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "An ENP participant with an email is required for document signing",
					})
				}

				// Best-effort document_stamp payload (improves parity with portal).
				const [enpUser, enpProfile] = await Promise.all([
					db.query.users.findFirst({
						where: eq(users.id, enpUserId),
						columns: { firstName: true, middleName: true, lastName: true, email: true },
					}),
					db.query.enpProfiles.findFirst({
						where: eq(enpProfiles.userId, enpUserId),
						columns: {
							rollNo: true,
							rollNoDate: true,
							commissionNo: true,
							commissionNoValidUntil: true,
							ptrNo: true,
							ptrNoLocation: true,
							ptrNoDate: true,
							ibpNo: true,
							ibpNoDate: true,
							notaryAddress: true,
							mcleNoPeriod: true,
							mcleNo: true,
							mcleNoDate: true,
						},
					}),
				])

				const mcleNoPeriod =
					typeof enpProfile?.mcleNoPeriod === "string" &&
					/^\d{4}-\d{2}-\d{2}T/.test(enpProfile.mcleNoPeriod.trim())
						? ""
						: (enpProfile?.mcleNoPeriod ?? "")

				const enpNameRaw = getFullName(enpUser).trim()
				const rollNo = (enpProfile?.rollNo ?? "").trim()

				// Format attorney name for seal: "ATTY." prefix and uppercase (matches auth registration seal)
				const formatAttorneyNameForSeal = (n: string | null | undefined): string => {
					const base = (n ?? "").trim()
					if (!base) return ""
					const upper = base.toUpperCase()
					return upper.startsWith("ATTY.") ? upper : `ATTY. ${upper}`
				}
				const attyNameForSeal = formatAttorneyNameForSeal(enpNameRaw)

				// Mode of notarization is set at booking (principal side); REN = Remote (video), IEN = In-person
				const modeRaw = (appointment?.modeOfNotarization ?? "REN").trim().toUpperCase()
				const modeOfNotarization =
					modeRaw === "REN" || modeRaw === "REMOTE" ? "Remote" : "In-person"

				const documentStamp =
					attyNameForSeal && rollNo
						? {
								seal: {
									type: "seal",
									enp_name: attyNameForSeal,
									enpName: attyNameForSeal,
									enp_role_number: rollNo,
								},
								notary_info: {
									type: "notary",
									name: attyNameForSeal,
									atty_name: attyNameForSeal,
									attyName: attyNameForSeal,
									roll_no: rollNo,
									roll_no_date: enpProfile?.rollNoDate ?? "",
									commission_no: enpProfile?.commissionNo ?? "",
									commission_no_valid_until: enpProfile?.commissionNoValidUntil ?? "",
									PTR_no: enpProfile?.ptrNo ?? "",
									PTR_no_location: enpProfile?.ptrNoLocation ?? "",
									PTR_no_date: enpProfile?.ptrNoDate ?? "",
									IBP_no: enpProfile?.ibpNo ?? "",
									IBP_no_date: enpProfile?.ibpNoDate ?? "",
									email: enpUser?.email ?? enpEmail,
									address: enpProfile?.notaryAddress ?? "",
									MCLE_no_period: mcleNoPeriod,
									MCLE_no: enpProfile?.mcleNo ?? "",
									MCLE_no_date: enpProfile?.mcleNoDate ?? "",
									mode_of_notarization: modeOfNotarization,
									modeOfNotarization,
								},
							}
						: undefined

				// STEP 1: Create document record in database
				const [document] = await db
					.insert(documents)
					.values({
						name,
						path: "", // Will be updated after Supabase upload
						type: mimeType,
						size,
						description: input.description ?? null,
						notarizationType, // Required for notarial book
						meetingId,
						docoChainProjectId: null, // Set after DocOnChain project creation
						docoChainRedirectUrl: null,
						order: nextOrder, // Set order based on upload sequence
						fees: input.fees ?? null,
					})
					.returning()

				if (!document) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create document record",
					})
				}

				// STEP 2: Upload to Supabase storage (this is the PRIMARY storage)
				const supabase = getServiceRoleClient()
				const fileName = `meetings/${meetingId}/${document.id}/${name}`

				console.log("🔵 Uploading to Supabase storage...")
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("documents")
					.upload(fileName, fileBuffer, {
						contentType: mimeType,
						cacheControl: "3600",
					})

				if (uploadError) {
					console.error("❌ Supabase upload failed:", uploadError)
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Failed to upload document to storage: ${uploadError.message}`,
					})
				}

				console.log("✅ Uploaded to Supabase:", uploadData.path)

				// Get public URL for the document
				const publicUrl = uploadData?.path
					? supabase.storage.from("documents").getPublicUrl(uploadData.path).data.publicUrl
					: null

				// Update document with storage path
				const [updatedDocument] = await db
					.update(documents)
					.set({
						path: uploadData.path,
					})
					.where(eq(documents.id, document.id))
					.returning()

				// STEP 3: Create DocOnChain project using ENP token (best-effort).
				// IMPORTANT: DocOnChain can be flaky (504/5xx). We keep the Supabase upload + DB record
				// and allow retry via createDocoChainProject instead of deleting user data.
				const safeFilename = name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`

				let docoChain: { projectCreated: boolean; error?: string } = { projectCreated: false }
				const transientAttempts = 2
				for (let attempt = 0; attempt <= transientAttempts; attempt++) {
					try {
						const project = await createDoconchainProject({
							enpEmail,
							fileBuffer,
							filename: safeFilename,
							mimeType,
							userListEditable: false,
							creatorAsViewer: false,
							documentStamp,
							getSubOrgCredsForEmail: em => getSubOrgCredsForMemberEmail(em, db),
						})

						await db
							.update(documents)
							.set({
								docoChainProjectId: project.uuid,
								// Never persist tokenized DocOnChain app URLs (they may contain api_token/token/email).
								docoChainRedirectUrl: stripUrlQueryAndHash(project.url),
							})
							.where(eq(documents.id, document.id))

						docoChain = { projectCreated: true }
						break
					} catch (error) {
						const message =
							error instanceof Error ? error.message : "DocOnChain project creation failed"
						docoChain = { projectCreated: false, error: message }

						// Retry only for likely-transient upstream failures.
						const isTransient =
							typeof message === "string" &&
							(message.includes("504") || message.includes("503") || message.includes("502"))

						if (!isTransient || attempt >= transientAttempts) {
							break
						}

						// small backoff (0.5s, 1s)
						await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
					}
				}

				return {
					...updatedDocument,
					url: publicUrl,
					docoChain,
				}
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Upload failed",
				})
			}
		}),

	// Mark a document as plotted/sent (ENP only).
	// We persist this using the existing document.status enum: READY = plotted & ready for signing.
	markDocumentPlotted: protectedProcedure
		.input(z.object({ meetingId: z.string().min(1), documentId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})

			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}

			const isHost = meeting.createdById === ctx.session.user.id
			const { apParticipants } = await getAppointmentParticipantsByMeetingId(input.meetingId)
			const isAcceptedParticipant = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			if (!isHost && !isAcceptedParticipant) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this meeting" })
			}

			// ENP only can mark plotted.
			if (!isEnpRole(ctx.session.user.role)) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Only ENP can mark document as plotted" })
			}

			const { canStartNotarization, reasons: readinessReasons } = await getAccountReadiness(
				ctx.session.user.id,
				db
			)
			if (!canStartNotarization) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "ENP must have active commission and valid ID to perform notarization actions",
					cause: { reasons: readinessReasons },
				})
			}

			const doc = await db.query.documents.findFirst({
				where: and(eq(documents.id, input.documentId), eq(documents.meetingId, input.meetingId)),
				columns: { id: true, docoChainProjectId: true },
			})

			if (!doc) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Document not found in this meeting" })
			}

			if (!doc.docoChainProjectId) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "DocOnChain project must exist before marking plotted",
				})
			}

			// Only transition to READY once (idempotent). If it was already READY, do nothing.
			const [updated] = await db
				.update(documents)
				.set({ status: "READY" })
				.where(and(eq(documents.id, doc.id), ne(documents.status, "READY")))
				.returning({ id: documents.id, status: documents.status })

			if (!updated) {
				return { success: true, document: { id: doc.id, status: "READY" as const } }
			}

			// After plotting, generate sign links and email them to the selected signers (in order).
			try {
				const signerRows = await db.query.documentSigners.findMany({
					where: eq(documentSigners.documentId, doc.id),
					columns: { userId: true, signingOrder: true },
					orderBy: [asc(documentSigners.signingOrder)],
				})

				if (signerRows.length > 0) {
					// Ensure we have internal signature request records for order gating + UI status.
					// These are created once per (meeting, document, signer) and updated by the signer after signing.
					try {
						const existing = await db.query.signatureRequests.findMany({
							where: and(
								eq(signatureRequests.meetingId, input.meetingId),
								eq(signatureRequests.documentId, doc.id)
							),
							columns: { signerId: true },
						})
						const existingSignerIds = new Set(existing.map(r => r.signerId))
						const uniqueSignerIdsInOrder: string[] = []
						const seen = new Set<string>()
						for (const row of signerRows) {
							if (!row?.userId) continue
							if (seen.has(row.userId)) continue
							seen.add(row.userId)
							uniqueSignerIdsInOrder.push(row.userId)
						}

						const requesterId = meeting.createdById
						const toInsert = uniqueSignerIdsInOrder
							.filter(signerId => !existingSignerIds.has(signerId))
							.map(signerId => ({
								meetingId: input.meetingId,
								documentId: doc.id,
								requesterId,
								signerId,
								status: "PENDING",
							}))

						if (toInsert.length > 0) {
							await db.insert(signatureRequests).values(toInsert)
						}
					} catch (error) {
						// Internal request creation should not break READY transition.
						console.error("❌ Failed to create internal signature requests after plotting:", error)
					}

					const signerUsers = await db.query.users.findMany({
						where: inArray(
							users.id,
							signerRows.map(s => s.userId)
						),
						columns: { id: true, email: true, firstName: true, middleName: true, lastName: true },
					})
					const userById = new Map(signerUsers.map(u => [u.id, u]))

					const documentRow = await db.query.documents.findFirst({
						where: eq(documents.id, doc.id),
						columns: { name: true, docoChainProjectId: true },
					})

					const projectUuid = documentRow?.docoChainProjectId ?? doc.docoChainProjectId
					const documentName = documentRow?.name ?? "Document"

					for (let i = 0; i < signerRows.length; i += 1) {
						const row = signerRows[i]!
						const signer = userById.get(row.userId)
						const signerEmail = signer?.email?.trim()
						if (!signerEmail || !projectUuid) continue

						const link = await generateDoconchainSignLink({
							projectUuid,
							signerEmail,
						})

						const sendEmail = sendSigningLinkEmail as (input: {
							to: string
							recipientName: string
							documentName: string
							signingLink: string
							signOrderLabel: string
						}) => Promise<void>
						await sendEmail({
							to: signerEmail,
							recipientName: (getFullName(signer) || signerEmail).trim(),
							documentName,
							signingLink: link,
							signOrderLabel: `Signer ${i + 1} of ${signerRows.length}`,
						})
					}
				}
			} catch (error) {
				// Email/link generation failures should not break READY transition.
				console.error("❌ Failed to send signing links after plotting:", error)
			}

			return { success: true, document: updated }
		}),

	// Get meeting documents (with per-document signer selection)
	getMeetingDocuments: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
			with: {
				documents: {
					with: {
						signers: { columns: { userId: true, signingOrder: true, signerRole: true } },
					},
				},
			},
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		// Check if user has access (host OR accepted participant)
		const isHost = meeting.createdById === ctx.session.user.id
		const { apParticipants } = await getAppointmentParticipantsByMeetingId(input)
		const isAcceptedParticipant = apParticipants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)
		const hasAccess = isHost || isAcceptedParticipant

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this meeting",
			})
		}

		// Define type for document with nested signers
		type DocumentWithSigners = InferSelectModel<typeof documents> & {
			signers: { userId: string; signingOrder: number | null; signerRole: string | null }[]
		}

		// Sort by order first (for manual reordering), then by createdAt (for upload sequence)
		const sorted = ([...meeting.documents] as DocumentWithSigners[]).sort((a, b) => {
			const orderA = a.order ?? 0
			const orderB = b.order ?? 0
			if (orderA !== orderB) return orderA - orderB
			const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0
			const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0
			return createdAtA - createdAtB
		})

		// Map to include signerUserIds and signerRoles for each document, ordered by signingOrder
		return sorted.map(doc => {
			const { signers, ...rest } = doc
			const sortedSigners = [...(signers ?? [])].sort((a, b) => {
				const orderA = a.signingOrder ?? 999999
				const orderB = b.signingOrder ?? 999999
				if (orderA !== orderB) return orderA - orderB
				return (a.userId ?? "").localeCompare(b.userId ?? "")
			})
			const signerRoles: Record<string, "principal" | "witness"> = {}
			for (const s of sortedSigners) {
				if (s.userId && (s.signerRole === "principal" || s.signerRole === "witness")) {
					signerRoles[s.userId] = s.signerRole
				} else if (s.userId) {
					signerRoles[s.userId] = "principal"
				}
			}
			return {
				...rest,
				signerUserIds: sortedSigners.map(s => s.userId),
				signerRoles,
			}
		})
	}),

	// Create signing project for a document (temporarily disabled)
	createDocoChainProject: protectedProcedure
		.input(
			z.object({
				documentId: z.string().min(1),
				meetingId: z.string().min(1),
			})
		)
		.mutation(async () => {
			throw new TRPCError({
				code: "SERVICE_UNAVAILABLE",
				message:
					"Project creation is temporarily unavailable while we rebuild the signing integration.",
			})
		}),

	// Set which meeting participants are signers for a given document (before plotting).
	// Signers include role (principal | witness) assigned by ENP; order = array order.
	setDocumentSigners: protectedProcedure
		.input(
			z.object({
				documentId: z.string().min(1),
				meetingId: z.string().min(1),
				signers: z.array(
					z.object({
						userId: z.string().min(1),
						role: z.enum(["principal", "witness"]),
					})
				),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { documentId, meetingId, signers: signerInputs } = input
			const userIds = signerInputs.map(s => s.userId)

			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, meetingId),
				with: {
					documents: {
						where: eq(documents.id, documentId),
						columns: {
							id: true,
							meetingId: true,
							docoChainProjectId: true,
						},
						with: {
							signers: { columns: { userId: true, signingOrder: true } },
						},
					},
					createdBy: {
						columns: {
							email: true,
							role: true,
						},
					},
				},
			})

			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}

			const isHost = meeting.createdById === ctx.session.user.id
			const { apParticipants } = await getAppointmentParticipantsByMeetingId(meetingId)
			const isAccepted = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			if (!isHost && !isAccepted) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this meeting" })
			}
			const isEnpUser = isEnpRole(ctx.session.user.role)
			const enpReadiness = await getAccountReadiness(ctx.session.user.id, db)
			const canProceedWithSigners = isEnpUser
				? enpReadiness.canStartNotarization
				: enpReadiness.canJoinMeeting
			if (!canProceedWithSigners) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: isEnpUser
						? "ENP must have active commission and valid ID to set document signers"
						: "You must complete KYC verification to participate in this session",
					cause: { reasons: enpReadiness.reasons },
				})
			}
			const doc = meeting.documents.find(d => d.id === documentId)
			if (!doc) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Document not found in this meeting" })
			}

			const acceptedIds = new Set(
				apParticipants.filter(p => p.status === "ACCEPTED").map(p => p.userId)
			)
			const invalid = userIds.filter(id => !acceptedIds.has(id))
			if (invalid.length > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "All signers must be accepted participants in this meeting",
				})
			}

			await db.delete(documentSigners).where(eq(documentSigners.documentId, documentId))

			if (userIds.length > 0) {
				// Fetch user details to populate signerName and signerAddress for principals
				const signerUsers = await db.query.users.findMany({
					where: inArray(users.id, userIds),
					columns: {
						id: true,
						firstName: true,
						middleName: true,
						lastName: true,
						email: true,
						address: true,
						role: true,
					},
				})

				// Create a map for quick lookup
				const userMap = new Map(signerUsers.map(u => [u.id, u]))

				// Insert signers with name, address, role (assigned by ENP), and signing order
				await db.insert(documentSigners).values(
					signerInputs.map(({ userId, role }, index) => {
						const user = userMap.get(userId)
						const isPrincipal = role === "principal"

						const signerName: string | null = isPrincipal && user ? getFullName(user) || null : null
						const signerAddress: string | null =
							isPrincipal && user?.address && typeof user.address === "string"
								? String(user.address)
								: null

						return {
							documentId,
							userId,
							signerName,
							signerAddress,
							signerRole: role,
							signingOrder: index + 1,
						}
					})
				)

				// If a DocOnChain project already exists, sync signers there using the ENP's token.
				if (doc.docoChainProjectId) {
					const enpParticipant = apParticipants.find(
						p => isEnpRole(p.user?.role) && !!asNonEmptyEmail(p.user?.email)
					)
					const enpEmail = asNonEmptyEmail(enpParticipant?.user?.email)
					if (!enpEmail) {
						throw new TRPCError({
							code: "PRECONDITION_FAILED",
							message: "ENP email is required to sync DocOnChain signers",
						})
					}

					// Add signers in the same order as `userIds` to preserve signing sequence.
					for (const userId of userIds) {
						const user = userMap.get(userId)
						const signerEmail = asNonEmptyEmail(user?.email)
						if (!signerEmail) {
							throw new TRPCError({
								code: "PRECONDITION_FAILED",
								message: "Signer email is required to sync DocOnChain signers",
							})
						}

						await addDoconchainProjectSigner({
							projectUuid: doc.docoChainProjectId,
							enpEmail,
							signer: {
								email: signerEmail,
								name: getFullName(user) || signerEmail,
								role: "Signer",
							},
							getSubOrgCredsForEmail: em => getSubOrgCredsForMemberEmail(em, db),
						})
					}
				}
			}

			return { success: true }
		}),

	// Get notarization details for a meeting (documents + signing status)
	getMeetingNotarizationDetails: protectedProcedure
		.input(z.object({ meetingId: z.string() }))
		.query(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				with: {
					createdBy: {
						columns: {
							id: true,
							firstName: true,
							middleName: true,
							lastName: true,
							email: true,
							image: true,
							role: true,
						},
					},
					documents: true,
					signatureRequests: {
						columns: {
							id: true,
							documentId: true,
							status: true,
							signedAt: true,
							signerId: true,
							requesterId: true,
							createdAt: true,
							updatedAt: true,
						},
						with: {
							signer: {
								columns: {
									id: true,
									firstName: true,
									middleName: true,
									lastName: true,
									email: true,
									image: true,
								},
							},
						},
					},
				},
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			// Check if user has access (host OR accepted participant)
			const isHost = meeting.createdById === ctx.session.user.id
			const { apParticipants } = await getAppointmentParticipantsByMeetingId(input.meetingId)
			const isAcceptedParticipant = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			const hasAccess = isHost || isAcceptedParticipant

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this meeting",
				})
			}

			const signatureRequestsByDocumentId = new Map<
				string,
				Array<{
					id: string
					status: string
					signedAt: Date | null
					signerId: string
					signer: {
						id: string
						name: string | null
						email: string | null
						image: string | null
					} | null
				}>
			>()

			for (const req of meeting.signatureRequests ?? []) {
				const list = signatureRequestsByDocumentId.get(req.documentId) ?? []
				list.push({
					id: req.id,
					status: req.status,
					signedAt: req.signedAt ?? null,
					signerId: req.signerId,
					signer: req.signer ? { ...req.signer, name: getFullName(req.signer) } : null,
				})
				signatureRequestsByDocumentId.set(req.documentId, list)
			}

			// Sort by order first (for manual reordering), then by createdAt (for upload sequence)
			const sortedDocuments = (meeting.documents ?? []).sort((a, b) => {
				const orderA = a.order ?? 0
				const orderB = b.order ?? 0

				if (orderA !== orderB) return orderA - orderB

				const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return createdAtA - createdAtB
			})

			const documentsWithSigning = await Promise.all(
				sortedDocuments.map(async doc => {
					const reqs = signatureRequestsByDocumentId.get(doc.id) ?? []
					const signerTotal = reqs.length
					const signerSigned = reqs.filter(r => r.status === "SIGNED").length

					const isFullySigned = signerTotal > 0 && signerSigned === signerTotal

					const rawFees = doc.fees
					const feesVal: number | null =
						rawFees !== null &&
						rawFees !== undefined &&
						typeof rawFees === "number" &&
						!Number.isNaN(rawFees)
							? rawFees
							: null

					let previewUrl: string | null = null
					if (doc.path?.trim()) {
						try {
							// Meeting documents are always in the "documents" bucket
							previewUrl = await getPublicUrl("documents", doc.path)
						} catch {
							// Ignore preview URL resolution failures
						}
					}

					return {
						id: doc.id,
						name: doc.name,
						status: doc.status,
						type: doc.type,
						path: doc.path ?? null,
						createdAt: doc.createdAt,
						docoChainProjectId: doc.docoChainProjectId ?? null,
						isFullySigned,
						fees: feesVal,
						previewUrl,
						signerSummary: {
							total: signerTotal,
							signed: signerSigned,
						},
						signatureRequests: reqs.map(r => ({
							...r,
							signer: r.signer
								? { ...r.signer, image: resolveAvatarImage(r.signer.image) }
								: r.signer,
						})),
					}
				})
			)

			const total = documentsWithSigning.length
			const signed = documentsWithSigning.filter(d => d.isFullySigned).length

			return {
				meeting: {
					id: meeting.id,
					roomId: meeting.roomId,
					createdById: meeting.createdById,
					isDocumentOrderLocked: meeting.isDocumentOrderLocked,
					createdAt: meeting.createdAt,
					updatedAt: meeting.updatedAt,
					createdBy: meeting.createdBy
						? { ...meeting.createdBy, image: resolveAvatarImage(meeting.createdBy.image) }
						: meeting.createdBy,
					participants: apParticipants.map(p => ({
						...p,
						user: p.user ? { ...p.user, image: resolveAvatarImage(p.user.image) } : p.user,
					})),
				},
				documentStats: { total, signed },
				documents: documentsWithSigning,
			}
		}),

	// Update document order
	updateDocumentOrder: protectedProcedure
		.input(
			z.object({
				meetingId: z.string(),
				documentIds: z.array(z.string()),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				with: {
					documents: true,
				},
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			// Check if user has access (host OR accepted participant)
			const isHost = meeting.createdById === ctx.session.user.id
			const { apParticipants } = await getAppointmentParticipantsByMeetingId(input.meetingId)
			const isAcceptedParticipant = apParticipants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			const hasAccess = isHost || isAcceptedParticipant

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this meeting",
				})
			}
			// Update order for each document
			await Promise.all(
				input.documentIds.map((documentId, index) =>
					db.update(documents).set({ order: index }).where(eq(documents.id, documentId))
				)
			)

			return { success: true }
		}),

	// Toggle document order lock
	toggleDocumentOrderLock: protectedProcedure
		.input(
			z.object({
				meetingId: z.string(),
				isLocked: z.boolean(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			// Only the meeting creator (principal) can toggle the lock
			if (meeting.createdById !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the meeting creator can lock/unlock document uploads",
				})
			}

			const [updatedMeeting] = await db
				.update(meetings)
				.set({
					isDocumentOrderLocked: input.isLocked,
					updatedAt: new Date(),
				})
				.where(eq(meetings.id, input.meetingId))
				.returning()

			return {
				success: true,
				isLocked: updatedMeeting?.isDocumentOrderLocked ?? false,
			}
		}),

	/**
	 * Invite a witness (or any participant) to the meeting by email.
	 * Creates a PENDING invite. The invited user must ACCEPT in their dashboard to join.
	 *
	 * NOTE: This does not send email; it's in-app (peer-to-peer) only.
	 */
	inviteWitnessByEmail: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1),
				email: z.string().email(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})

			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}

			// Only the meeting creator (principal/host) can add participants from the lobby.
			if (meeting.createdById !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the meeting host can invite a witness",
				})
			}

			const appointment = await db.query.appointments.findFirst({
				where: eq(appointments.meetingId, input.meetingId),
			})

			if (!appointment) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
			}

			const existingParticipants = await db.query.appointmentParticipants.findMany({
				where: eq(appointmentParticipants.appointmentId, appointment.id),
			})

			const email = input.email.trim().toLowerCase()

			const user = await db.query.users.findFirst({
				where: eq(users.email, email),
				columns: {
					id: true,
					firstName: true,
					middleName: true,
					lastName: true,
					email: true,
					image: true,
				},
			})

			if (!user?.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User not found. They must have an account first.",
				})
			}

			// Prevent inviting self (common typo)
			if (user.id === ctx.session.user.id) {
				return {
					created: false,
					status: "ACCEPTED" as const,
					user,
				}
			}

			const existing = existingParticipants.find(p => p.userId === user.id)
			if (existing) {
				return {
					created: false,
					status: existing.status,
					user,
				}
			}

			await db.insert(appointmentParticipants).values({
				appointmentId: appointment.id,
				userId: user.id,
				status: "PENDING",
				invitedById: ctx.session.user.id,
				participantRole: "PARTICIPANT",
			})

			return {
				created: true,
				status: "PENDING" as const,
				user,
			}
		}),

	// Enable/disable public join link for this session (meeting creator only).
	setAllowPublicLink: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1),
				allow: z.boolean(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				columns: { id: true, createdById: true },
			})
			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}
			if (meeting.createdById !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the meeting host can change the public link setting",
				})
			}
			const appointment = await db.query.appointments.findFirst({
				where: eq(appointments.meetingId, input.meetingId),
				columns: { id: true },
			})
			if (!appointment) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
			}
			await db
				.update(appointments)
				.set({ allowPublicLink: input.allow })
				.where(eq(appointments.id, appointment.id))
			return { allowPublicLink: input.allow }
		}),

	// Join a meeting via public link (adds current user as participant, then they go through liveness → lobby).
	joinMeetingByLink: protectedProcedure
		.input(z.object({ meetingId: z.string().min(1) }))
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				columns: { id: true },
			})
			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}
			const appointment = await db.query.appointments.findFirst({
				where: eq(appointments.meetingId, input.meetingId),
				columns: { id: true, allowPublicLink: true },
			})
			if (!appointment) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
			}
			if (!appointment.allowPublicLink) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This session is not open for link-based join",
				})
			}
			const { canJoinMeeting, reasons } = await getAccountReadiness(ctx.session.user.id, db)
			if (!canJoinMeeting) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "You must complete KYC verification before joining a session",
					cause: { reasons },
				})
			}
			const existing = await db.query.appointmentParticipants.findFirst({
				where: and(
					eq(appointmentParticipants.appointmentId, appointment.id),
					eq(appointmentParticipants.userId, ctx.session.user.id)
				),
			})
			if (existing) {
				if (existing.status === "ACCEPTED") {
					return { joined: false, alreadyAccepted: true }
				}
				await db
					.update(appointmentParticipants)
					.set({ status: "ACCEPTED", acceptedAt: new Date() })
					.where(eq(appointmentParticipants.id, existing.id))
				return { joined: true }
			}
			await db.insert(appointmentParticipants).values({
				appointmentId: appointment.id,
				userId: ctx.session.user.id,
				status: "ACCEPTED",
				acceptedAt: new Date(),
				participantRole: "PARTICIPANT",
			})
			return { joined: true }
		}),

	// Respond to a meeting invite (accept/decline)
	respondToInvite: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1),
				response: z.enum(["ACCEPT", "DECLINE"]),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
			})

			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}

			const appointment = await db.query.appointments.findFirst({
				where: eq(appointments.meetingId, input.meetingId),
			})

			if (!appointment) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
			}

			const row = await db.query.appointmentParticipants.findFirst({
				where: and(
					eq(appointmentParticipants.appointmentId, appointment.id),
					eq(appointmentParticipants.userId, ctx.session.user.id),
					eq(appointmentParticipants.status, "PENDING")
				),
			})

			if (row?.status !== "PENDING") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No pending invite found for this meeting",
				})
			}

			const newStatus = input.response === "ACCEPT" ? "ACCEPTED" : "DECLINED"

			await db
				.update(appointmentParticipants)
				.set({
					status: newStatus,
					...(newStatus === "ACCEPTED" ? { acceptedAt: new Date() } : {}),
				})
				.where(eq(appointmentParticipants.id, row.id))

			return { success: true, status: newStatus }
		}),
})
