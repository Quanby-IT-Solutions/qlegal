"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
	const [isOtherUserTyping, setIsOtherUserTyping] = useState(false)
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

	useEffect(() => {
		setIsOtherUserTyping(false)
		clearTimeout(typingTimeoutRef.current)
	}, [conversationId])

	const onConversationsData = useCallback(() => {
		void utils.messages.getConversations.invalidate()
	}, [utils.messages.getConversations])

	const onNewMessageData = useCallback(() => {
		void utils.messages.getConversations.invalidate()
		void utils.messages.getMessages.invalidate()
	}, [utils.messages.getConversations, utils.messages.getMessages])

	const onFilesData = useCallback(() => {
		void utils.messageFiles.getFiles.invalidate()
	}, [utils.messageFiles.getFiles])

	const onTypingData = useCallback(
		(data: { userId: string; isTyping: boolean }) => {
			clearTimeout(typingTimeoutRef.current)
			if (data.isTyping) {
				setIsOtherUserTyping(true)
				typingTimeoutRef.current = setTimeout(() => {
					setIsOtherUserTyping(false)
				}, 3000)
			} else {
				setIsOtherUserTyping(false)
			}
		},
		[] // setIsOtherUserTyping is a stable setter from useState
	)

	trpc.messages.onConversationsUpdate.useSubscription(userId ? {} : skipToken, {
		...(userId && { enabled: true }),
		onData: onConversationsData,
		onError: error => {
			console.error("Conversations subscription error:", error)
		},
	})

	trpc.messages.onNewMessage.useSubscription(
		conversationId ? { conversationId, lastEventId: lastMessageId ?? undefined } : skipToken,
		{
			...(conversationId && { enabled: true }),
			onData: onNewMessageData,
			onError: error => {
				console.error("Message subscription error:", error)
			},
		}
	)

	trpc.messageFiles.onFilesUpdate.useSubscription(
		conversationId ? { conversationId, lastEventId: undefined } : skipToken,
		{
			...(conversationId && { enabled: true }),
			onData: onFilesData,
			onError: error => {
				console.error("Files subscription error:", error)
			},
		}
	)

	trpc.messages.onTyping.useSubscription(conversationId ? { conversationId } : skipToken, {
		...(conversationId && { enabled: true }),
		onData: onTypingData,
		onError: error => {
			console.error("Typing subscription error:", error)
		},
	})

	return { isOtherUserTyping }
}
