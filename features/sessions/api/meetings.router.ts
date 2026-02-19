import { TRPCError } from "@trpc/server"
import { and, asc, eq, inArray, ne, type InferSelectModel } from "drizzle-orm"
import { z } from "zod/v4"

import { addDoconchainProjectSigner } from "@/services/doconchain/projects/add-signer"
import { createDoconchainProject } from "@/services/doconchain/projects/create-project"
import { generateDoconchainSignLink } from "@/services/doconchain/projects/generate-sign-link"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { sendSigningLinkEmail } from "@/services/react-email/lib/send.signing-link"
import { getPublicClient, getServiceRoleClient } from "@/services/supabase"
import { getPublicUrl } from "@/services/supabase/signed-url"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { createMeetingRoom, fetchRecordings, generateMeetingToken } from "@/services/video-sdk"

import { populateNotarialRegistryOnMeetingEnd } from "@/features/notarial-book/server/populate-notarial-registry-on-meeting-end"

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

			const items = userMeetings.map(mp => {
				const meeting = mp.meeting
				const documentsList = meeting.documents ?? []
				const total = documentsList.length

				// A document is "signed" when all signature requests for it are SIGNED.
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
					if (isSignedByRequests) {
						signed += 1
					}
				}

				return {
					...meeting,
					createdBy: meeting.createdBy
						? { ...meeting.createdBy, image: resolveAvatarImage(meeting.createdBy.image) }
						: meeting.createdBy,
					participants: (meeting.participants ?? []).map(p => ({
						...p,
						user: p.user ? { ...p.user, image: resolveAvatarImage(p.user.image) } : p.user,
					})),
					documentStats: { total, signed, isComplete: true },
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
		// and also expose pending invites for host UI (lobby invite list). Resolve avatar paths to URLs.
		const resolveParticipant = (p: (typeof meeting.participants)[number]) => ({
			...p,
			user: p.user ? { ...p.user, image: resolveAvatarImage(p.user.image) } : p.user,
		})
		return {
			...meeting,
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

	// Ensure a fresh DocoChain token for the meeting (ENP only). Use to gate "Create Project"
	// so the button stays disabled with a loader until we have a valid fresh token.
	ensureDocoChainToken: protectedProcedure
		.input(z.object({ meetingId: z.string().min(1) }))
		.query(async ({ input, ctx }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				columns: { id: true, createdById: true },
				with: { participants: { columns: { userId: true, status: true } } },
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
			return { ready: true }
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

		const meetingEndedAt = new Date()
		const [updatedMeeting] = await db
			.update(meetings)
			.set({ status: "COMPLETED", updatedAt: meetingEndedAt })
			.where(eq(meetings.id, input))
			.returning()

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
				fees: z.number().nonnegative().optional(), // ENP-only, set during upload
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

				// Determine which DocOnChain user should own the project (ENP).
				const enpParticipant = meeting.participants.find(
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
						columns: { name: true, email: true },
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

				const enpName = (enpUser?.name ?? "").trim()
				const rollNo = (enpProfile?.rollNo ?? "").trim()
				const documentStamp =
					enpName && rollNo
						? {
								seal: {
									type: "seal",
									enp_name: enpName,
									enp_role_number: rollNo,
								},
								notary_info: {
									type: "notary",
									atty_name: enpName,
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

				// STEP 3: Create DocOnChain project using ENP token (this is the "portal parity" step).
				const safeFilename = name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`
				try {
					console.log(
						"🔵 DocOnChain payload:",
						JSON.stringify(
							{
								enpEmail,
								filename: safeFilename,
								mimeType,
								documentStamp,
							},
							null,
							2
						)
					)
					const project = await createDoconchainProject({
						enpEmail,
						fileBuffer,
						filename: safeFilename,
						mimeType,
						userListEditable: false,
						creatorAsViewer: false,
						documentStamp,
					})

					await db
						.update(documents)
						.set({
							docoChainProjectId: project.uuid,
							docoChainRedirectUrl: project.url,
						})
						.where(eq(documents.id, document.id))
				} catch (error) {
					// Keep our system consistent: remove uploaded file + DB record on project failure.
					if (uploadData?.path) {
						await supabase.storage
							.from("documents")
							.remove([uploadData.path])
							.catch(() => undefined)
					}
					await db
						.delete(documents)
						.where(eq(documents.id, document.id))
						.catch(() => undefined)
					throw error
				}

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

	// Mark a document as plotted/sent (ENP only).
	// We persist this using the existing document.status enum: READY = plotted & ready for signing.
	markDocumentPlotted: protectedProcedure
		.input(z.object({ meetingId: z.string().min(1), documentId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, input.meetingId),
				with: {
					participants: {
						with: {
							user: { columns: { id: true, role: true } },
						},
					},
				},
			})

			if (!meeting) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" })
			}

			const isHost = meeting.createdById === ctx.session.user.id
			const isAcceptedParticipant = meeting.participants.some(
				p => p.userId === ctx.session.user.id && p.status === "ACCEPTED"
			)
			if (!isHost && !isAcceptedParticipant) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this meeting" })
			}

			// ENP only can mark plotted.
			if (!isEnpRole(ctx.session.user.role)) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Only ENP can mark document as plotted" })
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
						columns: { id: true, email: true, name: true },
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
							recipientName: (signer?.name ?? signerEmail).trim(),
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

			await db.delete(documentSigners).where(eq(documentSigners.documentId, documentId))

			if (userIds.length > 0) {
				// Fetch user details to populate signerName and signerAddress for principals
				const signerUsers = await db.query.users.findMany({
					where: inArray(users.id, userIds),
					columns: {
						id: true,
						name: true,
						email: true,
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

				// If a DocOnChain project already exists, sync signers there using the ENP's token.
				if (doc.docoChainProjectId) {
					const enpParticipant = meeting.participants.find(
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
								name: String(user?.name ?? signerEmail),
								role: "Signer",
							},
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
					signer: req.signer ?? null,
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
					title: meeting.title,
					status: meeting.status,
					createdAt: meeting.createdAt,
					createdBy: meeting.createdBy
						? { ...meeting.createdBy, image: resolveAvatarImage(meeting.createdBy.image) }
						: meeting.createdBy,
					participants: (meeting.participants ?? []).map(p => ({
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

	// Remove a document from a meeting
	removeDocument: protectedProcedure
		.input(
			z.object({
				meetingId: z.string().min(1),
				documentId: z.string().min(1),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { meetingId, documentId } = input

			// Verify meeting exists and user has access
			const meeting = await db.query.meetings.findFirst({
				where: eq(meetings.id, meetingId),
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

			// Only the meeting creator can remove documents
			if (meeting.createdById !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the meeting creator can remove documents",
				})
			}

			// Verify document exists and belongs to this meeting
			const document = await db.query.documents.findFirst({
				where: eq(documents.id, documentId),
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			if (document.meetingId !== meetingId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Document does not belong to this meeting",
				})
			}

			// Delete file from Supabase storage (log error but continue — file may already be gone)
			if (document.path) {
				try {
					const supabase = getServiceRoleClient()
					const { error: storageError } = await supabase.storage
						.from("documents")
						.remove([document.path])

					if (storageError) {
						console.error("[removeDocument] Storage deletion error:", storageError)
					} else {
						console.log("[removeDocument] Storage file removed:", document.path)
					}
				} catch (err) {
					console.error("[removeDocument] Unexpected storage error:", err)
				}
			}

			// Delete document record — cascade deletes documentSigners automatically
			await db.delete(documents).where(eq(documents.id, documentId))

			return { success: true }
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
				participantRole: "WITNESS",
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
