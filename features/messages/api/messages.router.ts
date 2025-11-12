import { TRPCError } from "@trpc/server"
import { and, desc, eq, gt, ne, or, sql } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { conversations, conversationParticipants, messages } from "@/services/drizzle/schema/messages"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

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
			userConversations.map(async (uc) => {
				const conversation = uc.conversation
				// Get the other participant (not the current user)
				const otherParticipant = conversation.participants.find((p) => p.userId !== ctx.session.user.id)
				const lastMessage = conversation.messages[0]

				// Get user's last read time
				const userParticipant = conversation.participants.find((p) => p.userId === ctx.session.user.id)

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
					otherUser: otherParticipant?.user,
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
			const [message] = await db
				.insert(messages)
				.values({
					conversationId: input.conversationId,
					senderId: ctx.session.user.id,
					content: input.content,
				})
				.returning()

			// Update conversation updated_at
			await db
				.update(conversations)
				.set({ updatedAt: new Date() })
				.where(eq(conversations.id, input.conversationId))

			return message
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
			const existingConversation = existingConversations.find((cp) => {
				const participants = cp.conversation.participants
				return (
					participants.length === 2 &&
					participants.some((p) => p.userId === input.userId) &&
					participants.some((p) => p.userId === ctx.session.user.id)
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

			return { success: true }
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
})

