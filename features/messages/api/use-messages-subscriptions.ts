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

	const onNewMessageData = useCallback(
		(tracked: {
			id: string
			data: {
				id: string
				conversationId: string
				senderId: string
				content: string
				createdAt: Date
				sender: { id: string; name: string | null; email: string | null; image: string | null }
			}
		}) => {
			const data = tracked.data

			// Always refresh conversation list (sort order, last message preview, unread counts)
			void utils.messages.getConversations.invalidate()

			if (!conversationId) return

			// Surgically insert the incoming message into the cache instead of
			// invalidating (which would refetch and wipe out any still-pending
			// optimistic messages from rapid consecutive sends).
			utils.messages.getMessages.setInfiniteData({ conversationId, limit: 20 }, old => {
				if (!old) return old

				// Check if the real message already exists (by server ID)
				const alreadyExists = old.pages.some(page => page.messages.some(m => m.id === data.id))
				if (alreadyExists) return old

				// Pad subscription payload to match the query cache shape
				const fullMessage = {
					...data,
					messageType: "text" as const,
					metadata: null as unknown,
					updatedAt: data.createdAt,
				}

				const pages = [...old.pages]
				if (!pages[0]) return old

				// If this message is from the current user, find the first optimistic
				// entry with matching content and replace it with the real version.
				if (data.senderId === userId) {
					let replaced = false
					const updatedPages = pages.map(page => ({
						...page,
						messages: page.messages.map(m => {
							if (
								!replaced &&
								m.id.startsWith("optimistic-") &&
								m.content === data.content &&
								m.senderId === data.senderId
							) {
								replaced = true
								return fullMessage
							}
							return m
						}),
					}))
					if (replaced) return { ...old, pages: updatedPages }
				}

				// Message from another user (or no matching optimistic entry) — append
				// to the most recent page (messages are chronological within each page).
				pages[0] = {
					...pages[0],
					messages: [...pages[0].messages, fullMessage],
				}
				return { ...old, pages }
			})
		},
		[conversationId, userId, utils.messages.getConversations, utils.messages.getMessages]
	)

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
