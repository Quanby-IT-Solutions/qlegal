"use client"

import { useSearchParams } from "next/navigation"
import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import type { CalendarEvent } from "@/core/components/calendar-schedule"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { isEnpMeetingCreationBlockedForKyc } from "@/core/lib/kyc-restriction-guards"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import { useMessages } from "@/features/messages/api/messages.hooks"
import { useMessagesSubscriptions } from "@/features/messages/api/use-messages-subscriptions"

export type ConversationParticipantDetails = {
	id: string
	name: string | null
	email: string | null
	image: string | null
	role?: string
	status?: "online" | "offline" | "away" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING"
	bio?: string | null
	joinedAt?: Date
}

type Conversation = RouterOutputs["messages"]["getConversations"][number]
type Message = RouterOutputs["messages"]["getMessages"][number]
type SearchUser = RouterOutputs["messages"]["searchUsers"][number]

type MessagesContextValue = {
	session: ReturnType<typeof useSession>["data"]
	isEnpConsultationBookingBlocked: boolean
	// Data
	conversations: Conversation[] | undefined
	filteredConversations: Conversation[] | undefined
	loadingConversations: boolean
	messages: Message[] | undefined
	loadingMessages: boolean
	isOtherUserTyping: boolean
	searchResults: SearchUser[] | undefined
	// Selection
	selectedConversationId: string | null
	draftConversationUser: ConversationParticipantDetails | null
	selectedConversation: Conversation | undefined
	activeParticipant: ConversationParticipantDetails | null
	isDraftConversation: boolean
	panelParticipant: ConversationParticipantDetails | undefined
	// Pending state
	isSendingTextMessage: boolean
	isSendingConsultationRequest: boolean
	// UI state
	searchQuery: string
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>
	userSearchQuery: string
	setUserSearchQuery: React.Dispatch<React.SetStateAction<string>>
	messageInput: string
	isSidebarOpen: boolean
	setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
	isParticipantPanelOpen: boolean
	setIsParticipantPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
	isNewChatDialogOpen: boolean
	setIsNewChatDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
	isBookingModalOpen: boolean
	setIsBookingModalOpen: React.Dispatch<React.SetStateAction<boolean>>
	kycBookingBlockOpen: boolean
	setKycBookingBlockOpen: React.Dispatch<React.SetStateAction<boolean>>
	// Refs
	messagesEndRef: React.RefObject<HTMLDivElement | null>
	// Handlers
	handleSelectConversation: (conversationId: string) => void
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	handleSendMessage: () => Promise<void>
	handleBookConsultationSave: (event: CalendarEvent) => Promise<void>
	handleNewChatDialogOpenChange: (open: boolean) => void
	handleStartConversation: (participant: ConversationParticipantDetails) => void
}

const MessagesContext = createContext<MessagesContextValue | null>(null)

export function useMessagesContext() {
	const ctx = useContext(MessagesContext)
	if (!ctx) throw new Error("useMessagesContext must be used within MessagesProvider")
	return ctx
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
	const { data: session } = useSession()
	const searchParams = useSearchParams()
	const utils = trpc.useUtils()
	const isMobile = useIsMobile()

	const {
		getConversations,
		getMessages,
		sendMessage,
		startConversation,
		markAsRead,
		searchUsers,
		sendConsultationRequest,
		setTyping,
	} = useMessages()

	const { data: conversations, isLoading: loadingConversations } = getConversations

	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
	const [draftConversationUser, setDraftConversationUser] =
		useState<ConversationParticipantDetails | null>(null)
	const [messageInput, setMessageInput] = useState("")
	const [searchQuery, setSearchQuery] = useState("")
	const [userSearchQuery, setUserSearchQuery] = useState("")
	const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
	const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
	const [kycBookingBlockOpen, setKycBookingBlockOpen] = useState(false)
	const [hasStartedFromQuery, setHasStartedFromQuery] = useState(false)
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)
	const [isParticipantPanelOpen, setIsParticipantPanelOpen] = useState(false)

	const messagesEndRef = useRef<HTMLDivElement>(null)
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
	const autoStartInFlightRef = useRef(false)
	const autoStartHandledUserIdRef = useRef<string | null>(null)

	// Sync sidebar open state with viewport via shared useIsMobile hook
	// (replaces the raw matchMedia useEffect from before)
	useEffect(() => {
		setIsSidebarOpen(isMobile)
	}, [isMobile])

	const messagesQuery = getMessages(selectedConversationId ?? "")
	const { data: messages, isLoading: loadingMessages } = messagesQuery

	const { isOtherUserTyping } = useMessagesSubscriptions({
		userId: session?.user?.id,
		conversationId: selectedConversationId,
		utils,
		lastMessageId: messages?.at(-1)?.id,
	})

	const { data: searchResults } = searchUsers(userSearchQuery)

	const sessionKycStatus =
		typeof session?.user?.kycStatus === "string" ? session.user.kycStatus : undefined
	const isEnpConsultationBookingBlocked = isEnpMeetingCreationBlockedForKyc(
		session?.user?.role,
		sessionKycStatus
	)

	// Auto-select conversation from URL param, or fall back to first conversation
	useEffect(() => {
		if (draftConversationUser) return

		const conversationFromQuery = searchParams.get("conversationId")
		if (conversationFromQuery && conversations?.some(c => c.id === conversationFromQuery)) {
			setSelectedConversationId(conversationFromQuery)
			return
		}

		if (conversations && conversations.length > 0 && !selectedConversationId && conversations[0]) {
			setSelectedConversationId(conversations[0].id)
		}
	}, [conversations, draftConversationUser, selectedConversationId, searchParams])

	// Scroll to bottom when messages change or typing indicator changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages, isOtherUserTyping])

	// Mark conversation as read whenever a new message arrives — but only if the tab is visible.
	const lastIncomingMessageId = messages?.at(-1)?.id
	useEffect(() => {
		if (!selectedConversationId || !lastIncomingMessageId) return
		if (typeof document !== "undefined" && document.visibilityState !== "visible") return
		markAsRead.mutate({ conversationId: selectedConversationId })
		// eslint-disable-next-line react-hooks/exhaustive-deps -- markAsRead mutation is stable but accessed from a new wrapper object each render
	}, [lastIncomingMessageId, selectedConversationId])

	// Re-mark as read when the user switches back to this tab.
	useEffect(() => {
		if (!selectedConversationId) return
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				markAsRead.mutate({ conversationId: selectedConversationId })
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange)
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- markAsRead mutation is stable but accessed from a new wrapper object each render
	}, [selectedConversationId])

	// Derived values
	const filteredConversations = conversations?.filter(conv =>
		conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase())
	)
	const selectedConversation = conversations?.find(c => c.id === selectedConversationId)
	const isDraftConversation = Boolean(draftConversationUser)
	const activeParticipant: ConversationParticipantDetails | null =
		selectedConversation?.otherUser ?? draftConversationUser ?? null
	const panelParticipant = activeParticipant ?? undefined
	const isSendingTextMessage = sendMessage.isPending || startConversation.isPending
	const isSendingConsultationRequest =
		sendConsultationRequest.isPending || startConversation.isPending

	// Handlers — markAsRead and setMessageInput("") are called directly here,
	// eliminating the two separate useEffects that watched selectedConversationId.
	const handleSelectConversation = (conversationId: string) => {
		setDraftConversationUser(null)
		setSelectedConversationId(conversationId)
		setMessageInput("")
		setIsSidebarOpen(false)
		markAsRead.mutate({ conversationId })
	}

	const openDraftConversation = (participant: ConversationParticipantDetails) => {
		setDraftConversationUser(participant)
		setSelectedConversationId(null)
		setMessageInput("")
		setIsSidebarOpen(false)
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setMessageInput(e.target.value)
		if (!selectedConversationId) return
		clearTimeout(typingTimeoutRef.current)
		if (e.target.value.trim()) {
			setTyping.mutate({ conversationId: selectedConversationId, isTyping: true }) // eslint-disable-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			typingTimeoutRef.current = setTimeout(() => {
				setTyping.mutate({ conversationId: selectedConversationId, isTyping: false }) // eslint-disable-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			}, 2000)
		} else {
			setTyping.mutate({ conversationId: selectedConversationId, isTyping: false }) // eslint-disable-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		}
	}

	const handleSendMessage = async () => {
		const trimmedMessage = messageInput.trim()
		if (!trimmedMessage) return
		if (selectedConversationId) {
			clearTimeout(typingTimeoutRef.current)
			setTyping.mutate({ conversationId: selectedConversationId, isTyping: false }) // eslint-disable-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		}
		try {
			if (draftConversationUser) {
				const result = await startConversation.mutateAsync({ userId: draftConversationUser.id })
				await sendMessage.mutateAsync({
					conversationId: result.conversationId,
					content: trimmedMessage,
				})
				await getConversations.refetch()
				setDraftConversationUser(null)
				setSelectedConversationId(result.conversationId)
				setMessageInput("")
				setIsSidebarOpen(false)
				return
			}
			if (!selectedConversationId) return
			await sendMessage.mutateAsync({
				conversationId: selectedConversationId,
				content: trimmedMessage,
			})
			setMessageInput("")
		} catch {
			toast.error("Failed to send message")
		}
	}

	// Auto-start conversation from URL (e.g. /messages?userId=ENP_ID)
	// Selection logic is inlined here to avoid stale closure on handleSelectConversation.
	useEffect(() => {
		const targetUserId = searchParams.get("userId") ?? searchParams.get("enpId")
		if (!targetUserId || !conversations) return
		if (hasStartedFromQuery) return
		if (autoStartInFlightRef.current) return
		if (autoStartHandledUserIdRef.current === targetUserId) return

		const existing = conversations.find(c => c.otherUser?.id === targetUserId)

		const run = async () => {
			autoStartInFlightRef.current = true
			autoStartHandledUserIdRef.current = targetUserId
			setHasStartedFromQuery(true)
			try {
				if (existing) {
					setDraftConversationUser(null)
					setSelectedConversationId(existing.id)
					setMessageInput("")
					setIsSidebarOpen(false)
					markAsRead.mutate({ conversationId: existing.id })
				} else {
					const result = await startConversation.mutateAsync({ userId: targetUserId })
					await sendMessage.mutateAsync({
						conversationId: result.conversationId,
						content: "Hello! I'd like to chat with you.",
					})
					await getConversations.refetch()
					setSelectedConversationId(result.conversationId)
					setIsSidebarOpen(false)
				}
			} catch {
				toast.error("Failed to start conversation")
			} finally {
				autoStartInFlightRef.current = false
			}
		}

		void run()
		// eslint-disable-next-line react-hooks/exhaustive-deps -- markAsRead mutation is stable but accessed from a new wrapper object each render
	}, [
		conversations,
		getConversations,
		hasStartedFromQuery,
		searchParams,
		sendMessage,
		startConversation,
	])

	const handleBookConsultationSave = async (event: CalendarEvent) => {
		if (!selectedConversationId && !draftConversationUser) {
			toast.error("Select a conversation before booking a session")
			throw new Error("No conversation selected")
		}
		if (isEnpConsultationBookingBlocked) {
			setKycBookingBlockOpen(true)
			throw new Error("Identity verification required")
		}

		const startHour = event.startAt.getHours().toString().padStart(2, "0")
		const startMin = event.startAt.getMinutes().toString().padStart(2, "0")
		const endAt = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000)
		const endHour = endAt.getHours().toString().padStart(2, "0")
		const endMin = endAt.getMinutes().toString().padStart(2, "0")
		const duration = Math.round((endAt.getTime() - event.startAt.getTime()) / (1000 * 60))
		const payload = {
			title: event.title.trim(),
			description: event.description?.trim(),
			appointmentDate: event.startAt.toISOString(),
			startTime: `${startHour}:${startMin}`,
			endTime: `${endHour}:${endMin}`,
			duration,
			eventType:
				(event.appointmentType?.toLowerCase() as "consultation" | "notarization") ?? "consultation",
			mode: (event.workflow?.toLowerCase() as "ren" | "ien") ?? "ren",
			location: (event.meta?.location as string | undefined)?.trim(),
		}

		try {
			if (draftConversationUser) {
				const result = await startConversation.mutateAsync({ userId: draftConversationUser.id })
				await sendConsultationRequest.mutateAsync({
					conversationId: result.conversationId,
					...payload,
				})
				await getConversations.refetch()
				setDraftConversationUser(null)
				setSelectedConversationId(result.conversationId)
				setIsSidebarOpen(false)
			} else if (selectedConversationId) {
				await sendConsultationRequest.mutateAsync({
					conversationId: selectedConversationId,
					...payload,
				})
			}
			setIsBookingModalOpen(false)
			toast.success("Consultation request sent!")
		} catch (error) {
			toast.error("Failed to send consultation request")
			throw error
		}
	}

	const handleNewChatDialogOpenChange = (open: boolean) => {
		setIsNewChatDialogOpen(open)
		if (!open) setUserSearchQuery("")
	}

	const handleStartConversation = (participant: ConversationParticipantDetails) => {
		handleNewChatDialogOpenChange(false)
		const existingConversation = conversations?.find(conv => conv.otherUser?.id === participant.id)
		if (existingConversation) {
			handleSelectConversation(existingConversation.id)
			return
		}
		openDraftConversation(participant)
	}

	return (
		<MessagesContext.Provider
			value={{
				session,
				isEnpConsultationBookingBlocked,
				conversations,
				filteredConversations,
				loadingConversations,
				messages,
				loadingMessages,
				isOtherUserTyping, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
				searchResults,
				selectedConversationId,
				draftConversationUser,
				selectedConversation,
				activeParticipant,
				isDraftConversation,
				panelParticipant,
				isSendingTextMessage,
				isSendingConsultationRequest,
				searchQuery,
				setSearchQuery,
				userSearchQuery,
				setUserSearchQuery,
				messageInput,
				isSidebarOpen,
				setIsSidebarOpen,
				isParticipantPanelOpen,
				setIsParticipantPanelOpen,
				isNewChatDialogOpen,
				setIsNewChatDialogOpen,
				isBookingModalOpen,
				setIsBookingModalOpen,
				kycBookingBlockOpen,
				setKycBookingBlockOpen,
				messagesEndRef,
				handleSelectConversation,
				handleInputChange,
				handleSendMessage,
				handleBookConsultationSave,
				handleNewChatDialogOpenChange,
				handleStartConversation,
			}}
		>
			{children}
		</MessagesContext.Provider>
	)
}
