import { on } from "node:events"
import { tracked, TRPCError } from "@trpc/server"
import { and, asc, desc, eq, gt, ne, or, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { appointments } from "@/services/drizzle/schema/appointments"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import {
	conversationParticipants,
	conversations,
	messages,
} from "@/services/drizzle/schema/messages"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	emitConversationUpdate,
	emitMessageAdd,
	messagesEmitter,
	type MessageWithSender,
} from "@/features/messages/lib/messages.emitter"

export const messagesRouter = createTRPCRouter({
	// Get all conversations for current user
	getConversations: protectedProcedure.query(async ({ ctx }) => {
		// Get all conversation IDs where user is a participant
		const userConversations = await db.query.conversationParticipants.findMany({
			where: eq(conversationParticipants.userId, ctx.session.user.id),
			with: {
				conversation: {
					with: {
						participants: {
							with: {
								user: {
									columns: {
										id: true,
										name: true,
										email: true,
										image: true,
										role: true,
										commissionStatus: true,
									},
								},
							},
						},
						messages: {
							orderBy: [desc(messages.createdAt)],
							limit: 1, // Just for displaying the last message preview
						},
					},
				},
			},
		})

		// Format the response with proper unread counts
		const formattedConversations = await Promise.all(
			userConversations.map(async uc => {
				const conversation = uc.conversation
				// Get the other participant (not the current user)
				const otherParticipant = conversation.participants.find(
					p => p.userId !== ctx.session.user.id
				)
				const lastMessage = conversation.messages[0]

				const profile = otherParticipant
					? await db.query.enpProfiles.findFirst({
							where: eq(enpProfiles.userId, otherParticipant.userId),
							columns: { bio: true },
						})
					: null

				// Get user's last read time
				const userParticipant = conversation.participants.find(
					p => p.userId === ctx.session.user.id
				)

				// Count ALL unread messages for this conversation
				const whereConditions = [
					eq(messages.conversationId, conversation.id),
					ne(messages.senderId, ctx.session.user.id), // Not sent by current user
				]

				// Add date filter if user has read messages before
				if (userParticipant?.lastReadAt) {
					whereConditions.push(gt(messages.createdAt, userParticipant.lastReadAt))
				}

				const unreadMessages = await db.query.messages.findMany({
					where: and(...whereConditions),
				})

				return {
					id: conversation.id,
					otherUser: otherParticipant
						? {
							...otherParticipant.user,
							status: otherParticipant.user.commissionStatus,
							bio: profile?.bio ?? null,
							joinedAt: otherParticipant.joinedAt,
						}
						: null,
					lastMessage: lastMessage?.content,
					lastMessageTime: lastMessage?.createdAt,
					unreadCount: unreadMessages.length,
					updatedAt: conversation.updatedAt,
				}
			})
		)

		// Sort by updatedAt (most recent first)
		return formattedConversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
	}),

	// Get messages for a specific conversation
	getMessages: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				limit: z.number().min(1).max(100).default(50),
			})
		)
		.query(async ({ input, ctx }) => {
			// Verify user is participant in conversation
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, input.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a participant in this conversation",
				})
			}

			// Get messages
			const conversationMessages = await db.query.messages.findMany({
				where: eq(messages.conversationId, input.conversationId),
				orderBy: [desc(messages.createdAt)],
				limit: input.limit,
				with: {
					sender: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
				},
			})

			// Return in chronological order (oldest first)
			return conversationMessages.reverse()
		}),

	// Send a message
	sendMessage: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				content: z.string().min(1).max(5000),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Verify user is participant
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, input.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})

			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a participant in this conversation",
				})
			}

			// Insert message
			const [inserted] = await db
				.insert(messages)
				.values({
					conversationId: input.conversationId,
					senderId: ctx.session.user.id,
					content: input.content,
				})
				.returning()

			if (!inserted) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to insert message",
				})
			}

			// Update conversation updated_at
			await db
				.update(conversations)
				.set({ updatedAt: new Date() })
				.where(eq(conversations.id, input.conversationId))

			// Fetch message with sender for SSE
			const withSender = await db.query.messages.findFirst({
				where: eq(messages.id, inserted.id),
				with: {
					sender: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
				},
			})
			const messagePayload = withSender as unknown as MessageWithSender
			if (messagePayload) {
				emitMessageAdd(input.conversationId, messagePayload)
			}

			// Notify both participants that conversations list changed
			const participants = await db.query.conversationParticipants.findMany({
				where: eq(conversationParticipants.conversationId, input.conversationId),
				columns: { userId: true },
			})
			const affectedUserIds = participants.map(p => p.userId)
			emitConversationUpdate(affectedUserIds)

			return inserted
		}),

	// Start a new conversation with a user
	startConversation: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			if (input.userId === ctx.session.user.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cannot start conversation with yourself",
				})
			}

			// Check if user exists
			const otherUser = await db.query.users.findFirst({
				where: eq(users.id, input.userId),
			})

			if (!otherUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				})
			}

			// Check if conversation already exists between these two users
			const existingConversations = await db.query.conversationParticipants.findMany({
				where: eq(conversationParticipants.userId, ctx.session.user.id),
				with: {
					conversation: {
						with: {
							participants: true,
						},
					},
				},
			})

			// Find a conversation with exactly 2 participants (current user and target user)
			const existingConversation = existingConversations.find(cp => {
				const participants = cp.conversation.participants
				return (
					participants.length === 2 &&
					participants.some(p => p.userId === input.userId) &&
					participants.some(p => p.userId === ctx.session.user.id)
				)
			})

			if (existingConversation) {
				return { conversationId: existingConversation.conversationId }
			}

			// Create new conversation
			const [conversation] = await db.insert(conversations).values({}).returning()

			if (!conversation) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create conversation",
				})
			}

			// Add both users as participants
			await db.insert(conversationParticipants).values([
				{
					conversationId: conversation.id,
					userId: ctx.session.user.id,
				},
				{
					conversationId: conversation.id,
					userId: input.userId,
				},
			])

			emitConversationUpdate([ctx.session.user.id, input.userId])

			return { conversationId: conversation.id }
		}),

	// Mark conversation as read
	markAsRead: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			await db
				.update(conversationParticipants)
				.set({ lastReadAt: new Date() })
				.where(
					and(
						eq(conversationParticipants.conversationId, input.conversationId),
						eq(conversationParticipants.userId, ctx.session.user.id)
					)
				)

			const participants = await db.query.conversationParticipants.findMany({
				where: eq(conversationParticipants.conversationId, input.conversationId),
				columns: { userId: true },
			})
			const affectedUserIds = participants.map(p => p.userId)
			emitConversationUpdate(affectedUserIds)

			return { success: true }
		}),

	onNewMessage: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				lastEventId: z.string().nullish(),
			})
		)
		.subscription(async function* (opts) {
			const { conversationId, lastEventId } = opts.input

			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, conversationId),
					eq(conversationParticipants.userId, opts.ctx.session.user.id)
				),
			})
			if (!participant) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You are not a participant in this conversation",
				})
			}

			// Start listening FIRST to avoid missing events
			const iterable = on(messagesEmitter, "message:add", {
				signal: opts.signal,
			}) as AsyncIterable<[string, MessageWithSender]>

			let lastMessageCreatedAt: Date | null = null

			// Only fetch missed messages if lastEventId is provided
			// If no lastEventId, skip catch-up (getMessages query handles initial load)
			if (lastEventId) {
				const lastMsg = await db.query.messages.findFirst({
					where: eq(messages.id, lastEventId),
				})
				lastMessageCreatedAt = lastMsg?.createdAt ?? null

				if (lastMessageCreatedAt) {
					// Fetch ONLY messages created after lastMessageCreatedAt
					const newSinceLast = await db.query.messages.findMany({
						where: and(
							eq(messages.conversationId, conversationId),
							gt(messages.createdAt, lastMessageCreatedAt)
						),
						orderBy: [asc(messages.createdAt)],
						with: {
							sender: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					})

					for (const msg of newSinceLast) {
						const payload = msg as unknown as MessageWithSender
						yield tracked(payload.id, payload)
						lastMessageCreatedAt = payload.createdAt
					}
				}
			}

			// Listen for new events (already started listening above)
			for await (const [convId, msg] of iterable) {
				if (convId !== conversationId) continue
				if (lastMessageCreatedAt && msg.createdAt <= lastMessageCreatedAt) continue
				yield tracked(msg.id, msg)
				lastMessageCreatedAt = msg.createdAt
			}
		}),

	onConversationsUpdate: protectedProcedure
		.input(z.object({ lastEventId: z.string().nullish() }).optional())
		.subscription(async function* (opts) {
			const userId = opts.ctx.session.user.id
			const iterable = on(messagesEmitter, "conversation:update", {
				signal: opts.signal,
			}) as AsyncIterable<[string[]]>

			for await (const [affectedUserIds] of iterable) {
				if (!affectedUserIds.includes(userId)) continue
				yield tracked(`ts-${Date.now()}`, { type: "conversations_updated" as const })
			}
		}),

	// Search users to start conversation
	searchUsers: protectedProcedure
		.input(
			z.object({
				query: z.string().min(1),
			})
		)
		.query(async ({ input, ctx }) => {
			const searchResults = await db.query.users.findMany({
				where: and(
					ne(users.id, ctx.session.user.id), // Exclude current user
					or(
						sql`lower(${users.name}) like lower(${`%${input.query}%`})`,
						sql`lower(${users.email}) like lower(${`%${input.query}%`})`
					)
				),
				columns: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
				limit: 10,
			})

			return searchResults
		}),

	// ENP sends a consultation request card via chat
	sendConsultationRequest: protectedProcedure
		.input(
			z.object({
				conversationId: z.string(),
				title: z.string().min(1),
				description: z.string().optional(),
				appointmentDate: z.string(), // ISO string
				startTime: z.string(),
				endTime: z.string(),
				duration: z.number(),
				eventType: z.enum(["consultation", "notarization"]),
				mode: z.enum(["ren", "ien"]).optional(),
				location: z.string().optional(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Ensure sender is an ENP
			const sender = await db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
				columns: { id: true, role: true },
			})
			if (!sender || sender.role !== "ENP") {
				throw new TRPCError({ code: "FORBIDDEN", message: "Only ENP can send consultation requests" })
			}

			// Verify participant
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, input.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})
			if (!participant) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant in this conversation" })
			}

			const metadata = {
				title: input.title,
				description: input.description,
				appointmentDate: input.appointmentDate,
				startTime: input.startTime,
				endTime: input.endTime,
				duration: input.duration,
				eventType: input.eventType,
				mode: input.mode,
				location: input.location,
				status: "PENDING" as const, // PENDING | ACCEPTED | DECLINED
				enpId: ctx.session.user.id,
			}

			const [inserted] = await db
				.insert(messages)
				.values({
					conversationId: input.conversationId,
					senderId: ctx.session.user.id,
					content: `Consultation request: ${input.title}`,
					messageType: "consultation_request",
					metadata,
				})
				.returning()

			if (!inserted) {
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to insert message" })
			}

			await db
				.update(conversations)
				.set({ updatedAt: new Date() })
				.where(eq(conversations.id, input.conversationId))

			const withSender = await db.query.messages.findFirst({
				where: eq(messages.id, inserted.id),
				with: {
					sender: {
						columns: { id: true, name: true, email: true, image: true },
					},
				},
			})
			const messagePayload = withSender as unknown as MessageWithSender
			if (messagePayload) {
				emitMessageAdd(input.conversationId, messagePayload)
			}

			const participants = await db.query.conversationParticipants.findMany({
				where: eq(conversationParticipants.conversationId, input.conversationId),
				columns: { userId: true },
			})
			emitConversationUpdate(participants.map(p => p.userId))

			return inserted
		}),

	// Principal accepts or declines a consultation request
	respondToConsultationRequest: protectedProcedure
		.input(
			z.object({
				messageId: z.string(),
				response: z.enum(["ACCEPTED", "DECLINED"]),
			})
		)
		.mutation(async ({ input, ctx }) => {
			// Fetch the message
			const message = await db.query.messages.findFirst({
				where: eq(messages.id, input.messageId),
			})

			if (!message || message.messageType !== "consultation_request") {
				throw new TRPCError({ code: "NOT_FOUND", message: "Consultation request not found" })
			}

			// Verify responder is a participant
			const participant = await db.query.conversationParticipants.findFirst({
				where: and(
					eq(conversationParticipants.conversationId, message.conversationId),
					eq(conversationParticipants.userId, ctx.session.user.id)
				),
			})
			if (!participant) {
				throw new TRPCError({ code: "FORBIDDEN", message: "You are not a participant in this conversation" })
			}

			// Only the non-ENP (principal) can respond
			if (ctx.session.user.id === (message.metadata as Record<string, unknown>)?.enpId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "The ENP cannot respond to their own request" })
			}

			const currentStatus = (message.metadata as Record<string, unknown>)?.status
			if (currentStatus !== "PENDING") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Request already responded to" })
			}

			const meta = message.metadata as Record<string, unknown>

			// Update metadata status
			const updatedMetadata = { ...meta, status: input.response }
			await db
				.update(messages)
				.set({ metadata: updatedMetadata })
				.where(eq(messages.id, input.messageId))

			// If accepted → create the appointment
			if (input.response === "ACCEPTED") {
				const enpId = meta.enpId as string
				const appointmentDate = new Date(meta.appointmentDate as string)
				const duration = meta.duration as number
				const eventType = meta.eventType as string
				const mode = meta.mode as string | undefined
				const location = meta.location as string | undefined
				const title = meta.title as string

				await db.insert(appointments).values({
					userId: enpId,
					type: eventType === "notarization" ? "DOCUMENT_SIGNING" : "CONSULTATION",
					status: "CONFIRMED",
					title,
					description: `Consultation appointment with ${ctx.session.user.name || "Client"}`,
					appointmentDate,
					duration,
					modeOfNotarization: mode?.toUpperCase(),
					location,
				})
			}

			// Emit update so the message refreshes for both participants
			const participants = await db.query.conversationParticipants.findMany({
				where: eq(conversationParticipants.conversationId, message.conversationId),
				columns: { userId: true },
			})
			emitConversationUpdate(participants.map(p => p.userId))
			// Re-broadcast message update by emitting a fake send so UI refetches
			const withSender = await db.query.messages.findFirst({
				where: eq(messages.id, input.messageId),
				with: {
					sender: {
						columns: { id: true, name: true, email: true, image: true },
					},
				},
			})
			if (withSender) {
				emitMessageAdd(message.conversationId, withSender as unknown as MessageWithSender)
			}

			return { success: true, response: input.response }
		}),

	getParticipant: protectedProcedure
		.input(z.object({ conversationId: z.string() }))
		.query(async ({ input, ctx }) => {
			const participants = await db.query.conversationParticipants.findMany({
				where: eq(conversationParticipants.conversationId, input.conversationId),
				with: {
					user: {
						columns: {
							id: true,
							name: true,
							email: true,
							image: true,
							role: true,
							commissionStatus: true,
						},
					},
				},
			})

			const otherParticipant = participants.find(p => p.userId !== ctx.session.user.id)
			if (!otherParticipant) return null

			const enpProfile = await db.query.enpProfiles.findFirst({
				where: eq(enpProfiles.userId, otherParticipant.user.id),
				columns: { bio: true },
			})

			return {
				id: otherParticipant.user.id,
				name: otherParticipant.user.name,
				email: otherParticipant.user.email,
				image: otherParticipant.user.image,
				role: otherParticipant.user.role,
				status: otherParticipant.user.commissionStatus,
				bio: enpProfile?.bio ?? null,
				joinedAt: otherParticipant.joinedAt,
			}
		}),
})
