import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod/v4"

import { createDocoChainProject } from "@/services/doconchain"
import { normalizeDocoChainUrl } from "@/services/doconchain/url-normalizer"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { meetingParticipants, meetings } from "@/services/drizzle/schema/meetings"
import { getServiceRoleClient } from "@/services/supabase"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"
import { createMeetingRoom, generateMeetingToken } from "@/services/video-sdk"

function isEnpRole(role: unknown): boolean {
	if (typeof role !== "string") return false
	return role.trim().toUpperCase() === "ENP"
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
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { meetingId, name, file, mimeType, size } = input

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

			// CRITICAL: DocoChain project creation MUST use an ENP (enterprise) token.
			// In prod, per-user tokens can cause "Unauthorized access" if we accidentally use a Principal's email.
			let creatorEmail: string | undefined

			// First, check if meeting creator is ENP
			if (isEnpRole(meeting.createdBy?.role)) {
				creatorEmail = asNonEmptyEmail(meeting.createdBy?.email)
			}

			// Otherwise, find ENP among participants
			if (!creatorEmail) {
				const enpParticipant = meeting.participants.find(
					p => isEnpRole(p.user?.role) && !!p.user?.email
				)
				creatorEmail = asNonEmptyEmail(enpParticipant?.user?.email)
			}

			// Finally, allow ENP uploader as a fallback (rare but safe)
			if (!creatorEmail && isEnpRole(ctx.session.user.role) && ctx.session.user.email) {
				creatorEmail = asNonEmptyEmail(ctx.session.user.email)
			}

			if (!creatorEmail) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"ENP email not found for document signing. This meeting must include an ENP participant to upload signing documents.",
				})
			}

			console.log("🔵 Using ENP email for DocoChain project:", creatorEmail)

			try {
				// Validate file type - only PDF is supported by DocoChain Create Project API
				if (mimeType !== "application/pdf") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Only PDF files are supported for document signing via DocoChain",
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

				// STEP 1: Create DocoChain project FIRST using Create Project API
				// This is the PRIMARY upload - the project UUID is critical for identifying the document
				console.log("🔵 Creating DocoChain project for:", name)
				console.log("   - Using creator email (meeting creator):", creatorEmail)

				// DocoChain Create Project optional multipart param:
				// document_stamp (JSON string) - applies seal + notary cert info on completed document
				const documentStamp = {
					seal: {
						type: "seal",
						enp_name: "Juan Dela Cruz",
						enp_role_number: "123456",
					},
					notary_info: {
						type: "notary",
						atty_name: "ATTY. JUAN DELA CRUZ",
						roll_no: "123456",
						roll_no_date: "5 June 2018",
						commission_no: "2024 - 024",
						commission_no_valid_until: "Dec 31, 2025",
						PTR_no: "1234567",
						PTR_no_location: "Manila",
						PTR_no_date: "Jan 02, 2025",
						IBP_no: "123456",
						IBP_no_date: "Dec 18, 2024 (for 2025)",
						email: "juan.cruz@email.com",
						address: "123, The Actual Bldg., 1234 Avenue, Malate, Manila",
						MCLE_no_period: "VIII",
						MCLE_no: "1234567",
						MCLE_no_date: "Jun 12, 2024",
						mode_of_notarization: "REN",
					},
				}
				const docoChainProject = await createDocoChainProject({
					title: name,
					documentFile: fileBuffer,
					fileName: name.endsWith(".pdf") ? name : `${name}.pdf`,
					userListEditable: false, // Recipients cannot be edited after creation
					creatorAsViewer: false, // Creator is not added as a viewer
					documentStamp,
					creatorEmail, // Use meeting creator's email, not the uploader's email
				})
				const docoChainProjectId = docoChainProject.uuid // THIS IS THE CRITICAL PROJECT UUID
				// ALWAYS normalize the redirect URL before storing - ensure api=true is set
				const docoChainRedirectUrl = normalizeDocoChainUrl(docoChainProject.redirectUrl) ?? null
				console.log("✅ DocoChain project created!")
				console.log("   - Project UUID:", docoChainProjectId)
				console.log("   - Project ID:", docoChainProject.id)
				console.log("   - Redirect URL (normalized):", docoChainRedirectUrl)

				// STEP 1.5: Don't add any signers yet
				// Signers will be added dynamically when they click "Start Signing"
				// This ensures each signer only sees themselves + creator when plotting
				console.log("ℹ️ Signers will be added dynamically when they click 'Start Signing'")

				// STEP 2: Create document record in database with DocoChain project UUID
				const [document] = await db
					.insert(documents)
					.values({
						name,
						path: "", // Will be updated after Supabase upload
						type: mimeType,
						size,
						description: input.description ?? null,
						meetingId,
						docoChainProjectId, // Store the critical project UUID
						docoChainRedirectUrl,
						order: nextOrder, // Set order based on upload sequence
					})
					.returning()

				if (!document) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create document record",
					})
				}

				// STEP 3: Upload to Supabase storage for backup/access
				const supabase = getServiceRoleClient()
				const fileName = `meetings/${meetingId}/${document.id}/${name}`

				console.log("🔵 Uploading to Supabase storage (backup)...")
				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("documents")
					.upload(fileName, fileBuffer, {
						contentType: mimeType,
						cacheControl: "3600",
					})

				if (uploadError) {
					console.warn("⚠️ Supabase upload failed but DocoChain project created successfully")
				} else {
					console.log("✅ Uploaded to Supabase:", uploadData.path)
				}

				// Get public URL for the document
				const publicUrl = uploadData?.path
					? supabase.storage.from("documents").getPublicUrl(uploadData.path).data.publicUrl
					: null

				// Update document with storage path
				const [updatedDocument] = await db
					.update(documents)
					.set({
						path: uploadData?.path ?? "",
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

	// Get meeting documents
	getMeetingDocuments: protectedProcedure.input(z.string()).query(async ({ input, ctx }) => {
		const meeting = await db.query.meetings.findFirst({
			where: eq(meetings.id, input),
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

		// Sort by order first (for manual reordering), then by createdAt (for upload sequence)
		return meeting.documents.sort((a, b) => {
			const orderA = a.order ?? 0
			const orderB = b.order ?? 0

			// If orders are different, sort by order
			if (orderA !== orderB) {
				return orderA - orderB
			}

			// If orders are the same (or both 0), sort by createdAt to maintain upload sequence
			const createdAtA = a.createdAt ? new Date(a.createdAt).getTime() : 0
			const createdAtB = b.createdAt ? new Date(b.createdAt).getTime() : 0
			return createdAtA - createdAtB
		})
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
