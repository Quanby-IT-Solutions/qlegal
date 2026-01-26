import { TRPCError } from "@trpc/server"
import { and, eq, inArray, type InferSelectModel } from "drizzle-orm"
import { z } from "zod/v4"

import {
	checkSigningStatus,
	createProject,
	deleteSigner,
	getProjectDetails,
	normalizeUrl,
} from "@/services/doconchain"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
import { getServiceRoleClient } from "@/services/supabase"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import {
	createMeetingRoom,
	fetchRecordings,
	generateMeetingToken,
} from "@/services/video-sdk"

function isEnpRole(role: unknown): boolean {
	if (typeof role !== "string") return false
	return role.trim().toUpperCase() === "ENP"
}

function asNonEmptyEmail(email: unknown): string | undefined {
	if (typeof email !== "string") return undefined
	const trimmed = email.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

// Format date from ISO string or existing formatted string to readable format (e.g., "5 June 2018" or "Dec 31, 2025")
function formatDateForStamp(dateString: string | null | undefined): string {
	if (!dateString) return ""
	
	// Try to parse as ISO date
	const date = new Date(dateString)
	if (!Number.isNaN(date.getTime())) {
		// Format as "d MMM yyyy" (e.g., "5 June 2018")
		const day = date.getDate()
		const monthNames = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December"
		]
		const month = monthNames[date.getMonth()]
		const year = date.getFullYear()
		return `${day} ${month} ${year}`
	}
	
	// If not a valid date, return as-is (might already be formatted)
	return dateString
}

function getDocoChainAuthEmailForMeeting(
	meeting: {
		createdBy?: { email?: string | null; role?: string | null } | null
		participants?: Array<{ user?: { email?: string | null; role?: string | null } | null }> | null
	},
	fallbackEmail?: string | null
): string | undefined {
	const createdByEmail = asNonEmptyEmail(meeting.createdBy?.email)
	if (createdByEmail && isEnpRole(meeting.createdBy?.role)) return createdByEmail

	const enpParticipantEmail = meeting.participants
		?.map(p => p.user)
		.find(u => isEnpRole(u?.role) && !!asNonEmptyEmail(u?.email))?.email

	return asNonEmptyEmail(enpParticipantEmail) ?? createdByEmail ?? asNonEmptyEmail(fallbackEmail)
}

type SigningStatusCacheEntry = { isFullySigned: boolean; expiresAtMs: number }
const signingStatusCache = new Map<string, SigningStatusCacheEntry>()

function getCachedIsFullySigned(projectUuid: string): boolean | undefined {
	const cached = signingStatusCache.get(projectUuid)
	if (!cached) return undefined
	if (cached.expiresAtMs <= Date.now()) return undefined
	return cached.isFullySigned
}

async function getIsFullySignedCached(projectUuid: string, userEmail?: string): Promise<boolean> {
	const now = Date.now()
	const cached = signingStatusCache.get(projectUuid)
	if (cached && cached.expiresAtMs > now) return cached.isFullySigned

	try {
		const status = await checkSigningStatus(projectUuid, userEmail)
		const isFullySigned = !!status.isFullySigned
		signingStatusCache.set(projectUuid, { isFullySigned, expiresAtMs: now + 60_000 })
		return isFullySigned
	} catch {
		// If auth/lookup fails, treat as not signed (and cache briefly to avoid hammering).
		signingStatusCache.set(projectUuid, { isFullySigned: false, expiresAtMs: now + 15_000 })
		return false
	}
}

async function asyncPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
	const executing = new Set<Promise<void>>()
	for (const item of items) {
		const p = fn(item).finally(() => executing.delete(p))
		executing.add(p)
		if (executing.size >= concurrency) {
			await Promise.race(executing)
		}
	}
	await Promise.all(executing)
}

export const meetingsRouter = createTRPCRouter({
	// Create a new meeting
	create: protectedProcedure
		.input(
			z.object({
				title: z.string().min(1).max(255),
				participantIds: z.array(z.string()).optional(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Create VideoSDK room
			const { roomId } = await createMeetingRoom()

			// Create meeting in database
			const [meeting] = await db
				.insert(meetings)
				.values({
					title: input.title,
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

			// Add creator as participant
			await db.insert(meetingParticipants).values({
				meetingId: meeting.id,
				userId: ctx.session.user.id,
			})

			// Add other participants
			if (input.participantIds && input.participantIds.length > 0) {
				await db.insert(meetingParticipants).values(
					input.participantIds.map(userId => ({
						meetingId: meeting.id,
						userId,
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
		const userMeetings = await db.query.meetingParticipants.findMany({
			where: and(
				eq(meetingParticipants.userId, ctx.session.user.id),
				eq(meetingParticipants.status, "ACCEPTED")
			),
			with: {
				meeting: {
					with: {
						createdBy: {
							columns: {
								id: true,
								name: true,
								email: true,
								image: true,
								role: true,
							},
						},
						participants: {
							with: {
								user: {
									columns: {
										id: true,
										name: true,
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
			orderBy: (meetingParticipants, { desc }) => [desc(meetingParticipants.createdAt)],
		})

		return userMeetings.map(mp => mp.meeting)
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
			// Keep list views fast by capping external checks.
			// Any missing statuses will be marked as "incomplete" and will fill in over time via cache.
			const MAX_EXTERNAL_STATUS_CHECKS = 20
			const limit = input?.limit ?? 10
			const offset = input?.offset ?? 0

			const rows = await db.query.meetingParticipants.findMany({
				where: and(
					eq(meetingParticipants.userId, ctx.session.user.id),
					eq(meetingParticipants.status, "ACCEPTED")
				),
				with: {
					meeting: {
						with: {
							createdBy: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
									role: true,
								},
							},
							participants: {
								with: {
									user: {
										columns: {
											id: true,
											name: true,
											email: true,
											image: true,
											role: true,
										},
									},
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
				// IMPORTANT: this is the same ordering the Meetings page uses
				orderBy: (meetingParticipants, { desc }) => [desc(meetingParticipants.createdAt)],
				limit: limit + 1,
				offset,
			})

			const hasMore = rows.length > limit
			const userMeetings = hasMore ? rows.slice(0, limit) : rows

			const externalSignedByProjectUuid = new Map<string, boolean>()
			const projectUuidsToCheck: Array<{ projectUuid: string; authEmail?: string }> = []

			// Build a limited list of project UUIDs to check (most recent meetings first).
			for (const mp of userMeetings) {
				const meeting = mp.meeting
				const authEmail = getDocoChainAuthEmailForMeeting(meeting, ctx.session.user.email)

				const requestsByDocumentId = new Map<string, string[]>()
				for (const req of meeting.signatureRequests ?? []) {
					const list = requestsByDocumentId.get(req.documentId) ?? []
					list.push(req.status)
					requestsByDocumentId.set(req.documentId, list)
				}

				for (const doc of meeting.documents ?? []) {
					const projectUuid = doc.docoChainProjectId
					if (!projectUuid) continue

					// If we already know it's signed (cached), use that.
					const cachedIsFullySigned = getCachedIsFullySigned(projectUuid)
					if (cachedIsFullySigned !== undefined) {
						externalSignedByProjectUuid.set(projectUuid, cachedIsFullySigned)
						continue
					}

					// If signature requests already confirm signed, skip external check.
					const reqStatuses = requestsByDocumentId.get(doc.id) ?? []
					const isSignedByRequests =
						reqStatuses.length > 0 && reqStatuses.every(s => s === "SIGNED")
					if (isSignedByRequests) continue

					// Cap external checks to keep response time predictable.
					if (projectUuidsToCheck.length >= MAX_EXTERNAL_STATUS_CHECKS) continue

					// Avoid duplicates in the same response.
					if (projectUuidsToCheck.some(p => p.projectUuid === projectUuid)) continue

					projectUuidsToCheck.push({ projectUuid, authEmail })
				}
			}

			// Run limited external checks with moderate concurrency.
			await asyncPool(projectUuidsToCheck, 6, async item => {
				const isFullySigned = await getIsFullySignedCached(item.projectUuid, item.authEmail)
				externalSignedByProjectUuid.set(item.projectUuid, isFullySigned)
			})

			const items = userMeetings.map(mp => {
				const meeting = mp.meeting
				const documentsList = meeting.documents ?? []
				const total = documentsList.length

				// A document is "signed" if:
				// - all signature requests for it are SIGNED (when those rows exist), OR
				// - DocoChain says it's fully signed (limited + cached checks).
				const requestsByDocumentId = new Map<string, string[]>()
				for (const req of meeting.signatureRequests ?? []) {
					const list = requestsByDocumentId.get(req.documentId) ?? []
					list.push(req.status)
					requestsByDocumentId.set(req.documentId, list)
				}

				let signed = 0
				let isComplete = true
				for (const doc of documentsList) {
					const reqStatuses = requestsByDocumentId.get(doc.id) ?? []
					const isSignedByRequests =
						reqStatuses.length > 0 && reqStatuses.every(s => s === "SIGNED")
					const isSignedByDocoChain =
						!!doc.docoChainProjectId &&
						(externalSignedByProjectUuid.get(doc.docoChainProjectId) ?? false)

					// If this doc has a DocoChain project and isn't signed-by-requests, but we don't yet
					// have an external status, mark the stats as incomplete (UI can show "checking").
					if (
						doc.docoChainProjectId &&
						!isSignedByRequests &&
						!externalSignedByProjectUuid.has(doc.docoChainProjectId)
					) {
						isComplete = false
					}

					if (isSignedByRequests || isSignedByDocoChain) {
						signed += 1
					}
				}

				return {
					...meeting,
					documentStats: { total, signed, isComplete },
				}
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
						name: true,
						email: true,
						image: true,
					},
				},
				participants: {
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								email: true,
								image: true,
								role: true,
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
		const isAcceptedParticipant = meeting.participants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)
		const hasAccess = isHost || isAcceptedParticipant

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this meeting",
			})
		}

		const acceptedParticipants = meeting.participants.filter(p => p.status === "ACCEPTED")
		const pendingInvites = meeting.participants.filter(p => p.status === "PENDING")

		// Return accepted participants as "participants" (for normal meeting pages),
		// and also expose pending invites for host UI (lobby invite list).
		return {
			...meeting,
			participants: acceptedParticipants,
			pendingInvites,
		}
	}),

	// Get meeting token
	getToken: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
			with: {
				participants: true,
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
		const isAcceptedParticipant = meeting.participants.some(
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

	// Fetch VideoSDK recordings for a meeting (user must have access)
	getRecordings: protectedProcedure
		.input(z.object({ meetingId: z.string() }))
		.query(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				columns: { id: true, roomId: true, createdById: true },
				with: {
					participants: {
						columns: { userId: true, status: true },
					},
				},
			})

			if (!meeting) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			const isHost = meeting.createdById === ctx.session.user.id
			const isAcceptedParticipant = meeting.participants.some(
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
			with: {
				participants: true,
			},
		})

		if (!meeting) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Meeting not found",
			})
		}

		const isHost = meeting.createdById === ctx.session.user.id
		const isParticipant = meeting.participants.some(
			p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
		)

		if (!isHost && !isParticipant) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only meeting participants can start the meeting",
			})
		}

		if (meeting.status !== "SCHEDULED") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Meeting is already started or ended",
			})
		}

		const [updatedMeeting] = await db
			.update(meetings)
			.set({ status: "ONGOING", updatedAt: new Date() })
			.where(eq(meetings.id, input))
			.returning()

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

		if (meeting.createdById !== ctx.session.user.id) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only the host can end the meeting",
			})
		}

		if (meeting.status !== "ONGOING") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Meeting is not ongoing",
			})
		}

		const [updatedMeeting] = await db
			.update(meetings)
			.set({ status: "COMPLETED", updatedAt: new Date() })
			.where(eq(meetings.id, input))
			.returning()

		return { success: true, meeting: updatedMeeting }
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
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { meetingId, name, file, mimeType, size, notarizationType } = input

			// Verify meeting exists and user has access, and get the ENP's email
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, meetingId),
				with: {
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									role: true,
								},
							},
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
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Meeting not found",
				})
			}

			// Check if user has access to the meeting
			const isHost = meeting.createdById === ctx.session.user.id
			const isAcceptedParticipant = meeting.participants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			const hasAccess = isHost || isAcceptedParticipant

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this meeting",
				})
			}

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

				// Get creator's email for DocoChain operations
				const creatorEmail = meeting.createdBy?.email

				if (!creatorEmail) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "Meeting creator email is required for document signing",
					})
				}

				// STEP 1: Create document record in database
				// DocoChain project will be created later after signers are set
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
						docoChainProjectId: null, // No project yet - will be created after signers are set
						docoChainRedirectUrl: null,
						order: nextOrder, // Set order based on upload sequence
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

				return {
					...updatedDocument,
					url: publicUrl,
				}
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Upload failed",
				})
			}
		}),

	// Get meeting documents (with per-document signer selection)
	getMeetingDocuments: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
			with: {
				participants: true,
				documents: {
					with: {
						signers: { columns: { userId: true, signingOrder: true } },
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
		const isAcceptedParticipant = meeting.participants.some(
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
			signers: { userId: string; signingOrder: number | null }[]
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

		// Map to include signerUserIds for each document, ordered by signingOrder
		return sorted.map(doc => {
			const { signers, ...rest } = doc
			// Sort signers by signingOrder (nulls last), then by userId for consistency
			const sortedSigners = [...(signers ?? [])].sort((a, b) => {
				const orderA = a.signingOrder ?? 999999
				const orderB = b.signingOrder ?? 999999
				if (orderA !== orderB) return orderA - orderB
				return (a.userId ?? "").localeCompare(b.userId ?? "")
			})
			return {
				...rest,
				signerUserIds: sortedSigners.map(s => s.userId),
			}
		})
	}),

	// Create DocoChain project for a document (after signers are set)
	createDocoChainProject: protectedProcedure
		.input(
			z.object({
				documentId: z.string().min(1),
				meetingId: z.string().min(1),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { documentId, meetingId} = input

			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, meetingId),
				with: {
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									role: true,
								},
							},
						},
					},
				documents: {
					where: eq(documents.id, documentId),
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
			const isAccepted = meeting.participants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			if (!isHost && !isAccepted) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this meeting" })
			}

			const document = meeting.documents.find(d => d.id === documentId)
			if (!document) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Document not found in this meeting" })
			}

			// Check if project already exists
			if (document.docoChainProjectId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "DocoChain project already exists for this document",
				})
			}

			// Check if signers are set
			const signerUserIds = new Set((document.signers ?? []).map(s => s.userId))
			if (signerUserIds.size === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Please select at least one signer before creating the project",
				})
			}

			// Get creator email (ENP)
			let creatorEmail: string | undefined
			if (isEnpRole(meeting.createdBy?.role)) {
				creatorEmail = asNonEmptyEmail(meeting.createdBy?.email)
			}
			if (!creatorEmail) {
				const enpParticipant = meeting.participants.find(
					p => isEnpRole(p.user?.role) && !!p.user?.email
				)
				creatorEmail = asNonEmptyEmail(enpParticipant?.user?.email)
			}
			if (!creatorEmail && isEnpRole(ctx.session.user.role) && ctx.session.user.email) {
				creatorEmail = asNonEmptyEmail(ctx.session.user.email)
			}

			if (!creatorEmail) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "ENP email is required for creating DocoChain project",
				})
			}

			// Download file from Supabase storage
			if (!document.path) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Document file not found in storage. Please re-upload the document.",
				})
			}

			const { getServiceRoleClient } = await import("@/services/supabase")
			const supabase = getServiceRoleClient()
			const { data: fileData, error: downloadError } = await supabase.storage
				.from("documents")
				.download(document.path)

			if (downloadError || !fileData) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to download document from storage: ${downloadError?.message ?? "Unknown error"}`,
				})
			}

			// Convert Blob to Buffer
			const arrayBuffer = await fileData.arrayBuffer()
			const fileBuffer = Buffer.from(arrayBuffer)

			// Get ENP user ID from email
			const enpUser = await db.query.users.findFirst({
				where: eq(users.email, creatorEmail),
				columns: { id: true },
			})

			if (!enpUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "ENP user not found",
				})
			}

			// Get ENP profile
			const enpProfile = await db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, enpUser.id),
			})

			if (!enpProfile) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "ENP profile not found. Please complete your profile settings first.",
				})
			}

			// Validate required fields
			if (!enpProfile.enpName || !enpProfile.enpRoleNumber) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"ENP profile is incomplete. Please complete your seal and notary information in settings.",
				})
			}

			// Create document stamp from ENP profile
			const documentStamp = {
				seal: {
					type: "seal",
					enp_name: enpProfile.enpName,
					enp_role_number: enpProfile.enpRoleNumber,
				},
				notary_info: {
					type: "notary",
					atty_name: enpProfile.enpName ?? "",
					roll_no: enpProfile.rollNo ?? "",
					roll_no_date: formatDateForStamp(enpProfile.rollNoDate),
					commission_no: enpProfile.commissionNo ?? "",
					commission_no_valid_until: formatDateForStamp(enpProfile.commissionNoValidUntil),
					PTR_no: enpProfile.ptrNo ?? "",
					PTR_no_location: enpProfile.ptrNoLocation ?? "",
					PTR_no_date: formatDateForStamp(enpProfile.ptrNoDate),
					IBP_no: enpProfile.ibpNo ?? "",
					IBP_no_date: formatDateForStamp(enpProfile.ibpNoDate),
					email: creatorEmail,
					address: enpProfile.notaryAddress ?? "",
					MCLE_no_period: enpProfile.mcleNoPeriod ?? "",
					MCLE_no: enpProfile.mcleNo ?? "",
					MCLE_no_date: formatDateForStamp(enpProfile.mcleNoDate),
					mode_of_notarization: document.notarizationType ?? "",
				},
			}

			console.log("🔵 Creating DocoChain project for document:", document.name)
			console.log("   - Document ID:", documentId)
			console.log("   - Creator Email:", creatorEmail)
			console.log("   - Ensuring token is valid...")

			// Create DocoChain project
			const docoChainProject = await createProject({
				title: document.name,
				documentFile: fileBuffer,
				fileName: document.name.endsWith(".pdf") ? document.name : `${document.name}.pdf`,
				userListEditable: false,
				creatorAsViewer: false,
				documentStamp,
				creatorEmail,
			})

			const docoChainProjectId = docoChainProject.uuid
			const docoChainRedirectUrl = normalizeUrl(docoChainProject.redirectUrl) ?? null

			// Update document with project UUID
			await db
				.update(documents)
				.set({
					docoChainProjectId,
					docoChainRedirectUrl,
				})
				.where(eq(documents.id, documentId))

			console.log("✅ DocoChain project created successfully!")
			console.log("   - Project UUID:", docoChainProjectId)
			console.log("   - Redirect URL:", docoChainRedirectUrl)

			return {
				success: true,
				projectUuid: docoChainProjectId,
				redirectUrl: docoChainRedirectUrl,
			}
		}),

	// Set which meeting participants are signers for a given document (before plotting)
			setDocumentSigners: protectedProcedure
		.input(
			z.object({
				documentId: z.string().min(1),
				meetingId: z.string().min(1),
				userIds: z.array(z.string().min(1)), // Array order represents signing order (first = 1, second = 2, etc.)
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { documentId, meetingId, userIds } = input

			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, meetingId),
				with: {
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									email: true,
									role: true,
								},
							},
						},
					},
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
			const isAccepted = meeting.participants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			if (!isHost && !isAccepted) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this meeting" })
			}

			const doc = meeting.documents.find(d => d.id === documentId)
			if (!doc) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Document not found in this meeting" })
			}

			const acceptedIds = new Set(
				meeting.participants.filter(p => p.status === "ACCEPTED").map(p => p.userId)
			)
			const invalid = userIds.filter(id => !acceptedIds.has(id))
			if (invalid.length > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "All signers must be accepted participants in this meeting",
				})
			}

			// Sync DocoChain signers if project exists
			if (doc.docoChainProjectId) {
				try {
					// Get ENP email for DocoChain auth
					let creatorEmail: string | undefined
					if (isEnpRole(meeting.createdBy?.role)) {
						creatorEmail = asNonEmptyEmail(meeting.createdBy?.email)
					}
					if (!creatorEmail) {
						const enpParticipant = meeting.participants.find(
							p => isEnpRole(p.user?.role) && !!p.user?.email
						)
						creatorEmail = asNonEmptyEmail(enpParticipant?.user?.email)
					}
					if (!creatorEmail && isEnpRole(ctx.session.user.role) && ctx.session.user.email) {
						creatorEmail = asNonEmptyEmail(ctx.session.user.email)
					}

					if (creatorEmail) {
						// Get current signers from DocoChain
						const projectDetails = await getProjectDetails(doc.docoChainProjectId, creatorEmail)
						type DocoChainSigner = {
							id?: number
							email?: string
							status?: string
							signedAt?: string | null
						}
						const currentDocoChainSigners: DocoChainSigner[] =
							(Array.isArray(projectDetails?.data?.signers)
								? (projectDetails.data.signers as DocoChainSigner[])
								: []) ?? []

						// Get emails of newly selected signers
						const selectedSignerEmails = new Set<string>()
						for (const userId of userIds) {
							const participant = meeting.participants.find(p => p.userId === userId)
							if (participant?.user?.email) {
								selectedSignerEmails.add(participant.user.email.toLowerCase())
							}
						}

						// Remove signers from DocoChain that are no longer selected (only if they haven't signed)
						for (const docoChainSigner of currentDocoChainSigners) {
							const signerEmail = docoChainSigner.email?.toLowerCase()
							if (!signerEmail) continue

							// Skip if this signer is still selected
							if (selectedSignerEmails.has(signerEmail)) continue

							// Only remove if they haven't signed yet
							const hasSigned =
								docoChainSigner.status?.toUpperCase() === "SIGNED" ||
								docoChainSigner.status?.toUpperCase() === "COMPLETED" ||
								!!docoChainSigner.signedAt

							if (!hasSigned && docoChainSigner.id) {
								try {
									console.log(
										`🔵 Removing deselected signer from DocoChain: ${signerEmail} (ID: ${docoChainSigner.id})`
									)
									await deleteSigner({
										projectUuid: doc.docoChainProjectId,
										signerId: docoChainSigner.id,
										userEmail: creatorEmail,
									})
									console.log(`✅ Removed ${signerEmail} from DocoChain project`)
								} catch (deleteError) {
									console.warn(
										`⚠️ Failed to remove signer ${signerEmail} from DocoChain:`,
										deleteError
									)
									// Continue - don't fail the whole operation
								}
							} else if (hasSigned) {
								console.log(`ℹ️ Skipping removal of ${signerEmail} - they have already signed`)
							}
						}
					}
				} catch (syncError) {
					console.warn("⚠️ Failed to sync DocoChain signers:", syncError)
					// Continue - don't fail the whole operation if sync fails
				}
			}

			await db.delete(documentSigners).where(eq(documentSigners.documentId, documentId))

			if (userIds.length > 0) {
				// Fetch user details to populate signerName and signerAddress for principals
				const signerUsers = await db.query.users.findMany({
					where: inArray(users.id, userIds),
					columns: {
						id: true,
						name: true,
						address: true,
						role: true,
					},
				})

				// Create a map for quick lookup
				const userMap = new Map(signerUsers.map(u => [u.id, u]))

				// Insert signers with name, address, and signing order
				// The array index + 1 represents the signing order (1 = first, 2 = second, etc.)
				await db.insert(documentSigners).values(
					userIds.map((userId, index) => {
						const user = userMap.get(userId)
						const isPrincipal = user?.role === "PRINCIPAL"

						// Extract name and address for principals only
						const signerName: string | null = isPrincipal && user?.name ? String(user.name) : null
						const signerAddress: string | null =
							isPrincipal && user?.address && typeof user.address === "string"
								? String(user.address)
								: null

						return {
							documentId,
							userId,
							signerName,
							signerAddress,
							signingOrder: index + 1, // 1-based order
						}
					})
				)
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
							name: true,
							email: true,
							image: true,
							role: true,
						},
					},
					participants: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
									role: true,
								},
							},
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
									name: true,
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
			const isAcceptedParticipant = meeting.participants.some(
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
					signer: req.signer ?? null,
				})
				signatureRequestsByDocumentId.set(req.documentId, list)
			}

			// Precompute DocoChain "fully signed" status per project UUID (cached)
			const userEmail = getDocoChainAuthEmailForMeeting(meeting, ctx.session.user.email)
			const projectUuidsToCheck = new Set<string>()
			for (const doc of meeting.documents ?? []) {
				if (doc.docoChainProjectId) projectUuidsToCheck.add(doc.docoChainProjectId)
			}

			const externalSignedByProjectUuid = new Map<string, boolean>()
			await asyncPool([...projectUuidsToCheck], 6, async projectUuid => {
				const isFullySigned = await getIsFullySignedCached(projectUuid, userEmail)
				externalSignedByProjectUuid.set(projectUuid, isFullySigned)
			})

			// Sort by order first (for manual reordering), then by createdAt (for upload sequence)
			const sortedDocuments = (meeting.documents ?? []).sort((a, b) => {
				const orderA = a.order ?? 0
				const orderB = b.order ?? 0

				if (orderA !== orderB) return orderA - orderB

				const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0
				const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0
				return createdAtA - createdAtB
			})

			const documentsWithSigning = sortedDocuments.map(doc => {
				const reqs = signatureRequestsByDocumentId.get(doc.id) ?? []
				const signerTotal = reqs.length
				const signerSigned = reqs.filter(r => r.status === "SIGNED").length

				const isSignedByRequests = signerTotal > 0 && signerSigned === signerTotal
				const isSignedByDocoChain =
					!!doc.docoChainProjectId &&
					(externalSignedByProjectUuid.get(doc.docoChainProjectId) ?? false)

				const isFullySigned = isSignedByRequests || isSignedByDocoChain

				return {
					id: doc.id,
					name: doc.name,
					status: doc.status,
					createdAt: doc.createdAt,
					docoChainProjectId: doc.docoChainProjectId ?? null,
					isFullySigned,
					signerSummary: {
						total: signerTotal,
						signed: signerSigned,
					},
					signatureRequests: reqs,
				}
			})

			const total = documentsWithSigning.length
			const signed = documentsWithSigning.filter(d => d.isFullySigned).length

			return {
				meeting: {
					id: meeting.id,
					title: meeting.title,
					status: meeting.status,
					createdAt: meeting.createdAt,
					createdBy: meeting.createdBy,
					participants: meeting.participants,
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
					participants: true,
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
			const isAcceptedParticipant = meeting.participants.some(
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
					message: "Only the meeting creator can lock/unlock document order",
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
				with: {
					participants: true,
				},
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

			const email = input.email.trim().toLowerCase()

			const user = await db.query.users.findFirst({
				where: eq(users.email, email),
				columns: {
					id: true,
					name: true,
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

			const existing = meeting.participants.find(p => p.userId === user.id)
			if (existing) {
				return {
					created: false,
					status: existing.status,
					user,
				}
			}

			await db.insert(meetingParticipants).values({
				meetingId: meeting.id,
				userId: user.id,
				status: "PENDING",
				invitedById: ctx.session.user.id,
			})

			return {
				created: true,
				status: "PENDING" as const,
				user,
			}
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
				with: {
					participants: true,
				},
			})

			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}

			const row = meeting.participants.find(p => p.userId === ctx.session.user.id)

			if (row?.status !== "PENDING") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No pending invite found for this meeting",
				})
			}

			const newStatus = input.response === "ACCEPT" ? "ACCEPTED" : "DECLINED"

			await db
				.update(meetingParticipants)
				.set({ status: newStatus })
				.where(eq(meetingParticipants.id, row.id))

			return { success: true, status: newStatus }
		}),
})
