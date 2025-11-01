import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { documents } from "@/services/drizzle/schema/document"
import { meetings, meetingParticipants } from "@/services/drizzle/schema/meetings"
import { getPublicClient } from "@/services/supabase"
import { createMeetingRoom, generateMeetingToken } from "@/services/video-sdk"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

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
					input.participantIds.map((userId) => ({
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
			where: eq(meetingParticipants.userId, ctx.session.user.id),
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

		return userMeetings.map((mp) => mp.meeting)
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

		// Check if user has access
		const hasAccess = meeting.participants.some((p) => p.userId === ctx.session.user.id)

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this meeting",
			})
		}

		return meeting
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

		// Check if user has access
		const hasAccess = meeting.participants.some((p) => p.userId === ctx.session.user.id)

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
				message: "Only the host can start the meeting",
			})
		}

		if (meeting.status === "ONGOING") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Meeting is already ongoing",
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

			// Check if user has access to the meeting
			const hasAccess = meeting.participants.some((p) => p.userId === ctx.session.user.id)

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this meeting",
				})
			}

			try {
				// Create document record in database
				const [document] = await db
					.insert(documents)
					.values({
						name,
						path: "", // Will be updated after upload
						type: mimeType,
						size,
						description: input.description || null,
						meetingId,
					})
					.returning()

				if (!document) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create document record",
					})
				}

				// Upload to Supabase storage
				const supabase = getPublicClient()
				const fileName = `meetings/${meetingId}/${document.id}/${name}`

				// Decode base64 file data
				const fileBuffer = Buffer.from(file, "base64")

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("documents")
					.upload(fileName, fileBuffer, {
						contentType: mimeType,
						cacheControl: "3600",
					})

				if (uploadError) {
					// Clean up database record if upload fails
					await db.delete(documents).where(eq(documents.id, document.id))
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Upload failed: ${uploadError.message}`,
					})
				}

				// Update document with storage path
				const [updatedDocument] = await db
					.update(documents)
					.set({ path: uploadData.path })
					.where(eq(documents.id, document.id))
					.returning()

				// Get public URL for the document
				const {
					data: { publicUrl },
				} = supabase.storage.from("documents").getPublicUrl(uploadData.path)

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

		// Check if user has access
		const hasAccess = meeting.participants.some((p) => p.userId === ctx.session.user.id)

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You don't have access to this meeting",
			})
		}

		return meeting.documents
	}),
})

