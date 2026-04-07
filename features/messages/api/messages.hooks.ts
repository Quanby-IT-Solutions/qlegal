"use client"

import { trpc } from "@/services/trpc/client"

export function useMessages() {
	const utils = trpc.useUtils()

	return {
		// Get all conversations
		getConversations: trpc.messages.getConversations.useQuery(undefined),

		// Get messages for a conversation (cursor-paginated)
		getMessages: (conversationId: string) =>
			trpc.messages.getMessages.useInfiniteQuery(
				{ conversationId, limit: 20 },
				{
					enabled: !!conversationId,
					getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
					initialCursor: null,
				}
			),

		// Get participant details for a conversation
		getParticipant: (conversationId: string) =>
			trpc.messages.getParticipant.useQuery(
				{ conversationId },
				{
					enabled: !!conversationId,
				}
			),

		// Send a message
		sendMessage: trpc.messages.sendMessage.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
			},
		}),

		createConversationAndSendMessage: trpc.messages.createConversationAndSendMessage.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
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

		// ENP sends a consultation request via chat
		sendConsultationRequest: trpc.messages.sendConsultationRequest.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
			},
		}),

		createConversationAndSendConsultationRequest:
			trpc.messages.createConversationAndSendConsultationRequest.useMutation({
				onSuccess: () => {
					void utils.messages.getConversations.invalidate()
				},
			}),

		// Principal accepts or declines a consultation request
		respondToConsultationRequest: trpc.messages.respondToConsultationRequest.useMutation({
			onSuccess: () => {
				void utils.messages.getConversations.invalidate()
				void utils.messages.getMessages.invalidate()
			},
		}),

		// Signal that the current user is typing (or stopped typing)
		setTyping: trpc.messages.setTyping.useMutation(),
	}
}
