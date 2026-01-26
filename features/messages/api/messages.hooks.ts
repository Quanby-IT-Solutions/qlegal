"use client"

import { trpc } from "@/services/trpc/client"

export function useMessages() {
	const utils = trpc.useUtils()

	return {
		// Get all conversations
		getConversations: trpc.messages.getConversations.useQuery(undefined),

		// Get messages for a conversation
		getMessages: (conversationId: string) =>
			trpc.messages.getMessages.useQuery(
				{ conversationId, limit: 100 },
				{
					enabled: !!conversationId,
				}
			),

		// Send a message
		sendMessage: trpc.messages.sendMessage.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
				void utils.messages.getMessages.invalidate()
			},
		}),

		// Start a new conversation
		startConversation: trpc.messages.startConversation.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
			},
		}),

		// Mark conversation as read
		markAsRead: trpc.messages.markAsRead.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
			},
		}),

		// Search users
		searchUsers: (query: string) =>
			trpc.messages.searchUsers.useQuery(
				{ query: query || "" },
				{
					enabled: query.length > 0,
				}
			),
	}
}
