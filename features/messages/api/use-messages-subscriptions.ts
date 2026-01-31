"use client"

import { skipToken } from "@tanstack/react-query"

import { trpc } from "@/services/trpc/client"

interface UseMessagesSubscriptionsParams {
	userId: string | undefined
	conversationId: string | null
	utils: ReturnType<typeof trpc.useUtils>
	lastMessageId?: string | null
}

export function useMessagesSubscriptions({
	userId,
	conversationId,
	utils,
	lastMessageId,
}: UseMessagesSubscriptionsParams) {
	trpc.messages.onConversationsUpdate.useSubscription(userId ? {} : skipToken, {
		...(userId && { enabled: true }),
		onData: () => {
			void utils.messages.getConversations.invalidate()
		},
		onError: error => {
			console.error("Conversations subscription error:", error)
		},
	})

	trpc.messages.onNewMessage.useSubscription(
		conversationId ? { conversationId, lastEventId: lastMessageId ?? undefined } : skipToken,
		{
			...(conversationId && { enabled: true }),
			onData: () => {
				void utils.messages.getConversations.invalidate()
				void utils.messages.getMessages.invalidate()
			},
			onError: error => {
				console.error("Message subscription error:", error)
			},
		}
	)

	trpc.messageFiles.onFilesUpdate.useSubscription(
		conversationId ? { conversationId, lastEventId: undefined } : skipToken,
		{
			...(conversationId && { enabled: true }),
			onData: () => {
				void utils.messageFiles.getFiles.invalidate()
			},
			onError: error => {
				console.error("Files subscription error:", error)
			},
		}
	)
}
