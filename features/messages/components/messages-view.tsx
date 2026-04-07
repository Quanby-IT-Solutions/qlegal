"use client"

import { useSearchParams } from "next/navigation"
import React, { useEffect, useRef, useState } from "react"
import { differenceInMinutes, format, isToday, isYesterday } from "date-fns"
import {
	CalendarPlus,
	ChevronLeft,
	Info,
	MessageSquare,
	Paperclip,
	Plus,
	Search,
	Send,
	Smile,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import type { CalendarEvent } from "@/core/components/calendar-schedule"
import { Chat } from "@/core/components/chat"
import { KycRequiredDialog } from "@/core/components/kyc-required-dialog"
import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { isEnpMeetingCreationBlockedForKyc } from "@/core/lib/kyc-restriction-guards"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { EventDialog } from "@/features/appointments/components/dialogs/event-dialog"
import { useMessages } from "@/features/messages/api/messages.hooks"
import { useMessagesSubscriptions } from "@/features/messages/api/use-messages-subscriptions"
import {
	ConsultationRequestCard,
	type ConsultationRequestMetadata,
} from "@/features/messages/components/consultation-request-card"
import { FileUploadPanel } from "@/features/messages/components/file-upload-panel"
import { MessageContent } from "@/features/messages/components/message-content"

type ConversationParticipantDetails = {
	id: string
	name: string | null
	email: string | null
	image: string | null
	role?: string
	status?: "online" | "offline" | "away" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING"
	bio?: string | null
	joinedAt?: Date
}

function formatTime(date: Date | undefined): string {
	if (!date) return ""
	const now = new Date()
	const messageDate = new Date(date)
	const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60))

	if (diffInMinutes < 1) return "Just now"
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`
	if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
	if (diffInMinutes < 2880) return "Yesterday"
	return format(messageDate, "MMM d")
}

export function MessagesView() {
	const { data: session } = useSession()
	const searchParams = useSearchParams()
	const utils = trpc.useUtils()
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

	// On mobile, show conversations list first when opening Messages page
	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 767px)")

		const syncSidebarForViewport = (event?: MediaQueryListEvent) => {
			const isMobile = event ? event.matches : mediaQuery.matches
			setIsSidebarOpen(isMobile)
		}

		syncSidebarForViewport()
		mediaQuery.addEventListener("change", syncSidebarForViewport)

		return () => {
			mediaQuery.removeEventListener("change", syncSidebarForViewport)
		}
	}, [])

	// Get messages for selected conversation
	const messagesQuery = getMessages(selectedConversationId ?? "")
	const { data: messages, isLoading: loadingMessages } = messagesQuery

	// Real-time subscriptions (SSE)
	const { isOtherUserTyping } = useMessagesSubscriptions({
		userId: session?.user?.id,
		conversationId: selectedConversationId,
		utils,
		lastMessageId: messages && messages.length > 0 ? messages.at(-1)?.id : undefined,
	})

	// Get users for new chat search
	const { data: searchResults } = searchUsers(userSearchQuery)

	const sessionKycStatus =
		typeof session?.user?.kycStatus === "string" ? session.user.kycStatus : undefined
	const isEnpConsultationBookingBlocked = isEnpMeetingCreationBlockedForKyc(
		session?.user?.role,
		sessionKycStatus
	)

	// Auto-select conversation (prefer URL param)
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

	// Mark conversation as read when selected
	// Only depend on selectedConversationId; markAsRead is stable but comes from a new object each render.
	useEffect(() => {
		if (!selectedConversationId) return
		markAsRead.mutate({ conversationId: selectedConversationId })
	}, [selectedConversationId]) // eslint-disable-line react-hooks/exhaustive-deps -- markAsRead from useMessages() is new ref each render; we only want to run when conversation changes

	useEffect(() => {
		setMessageInput("")
	}, [draftConversationUser?.id, selectedConversationId])

	// Scroll to bottom when messages change or typing indicator appears
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages, isOtherUserTyping])

	// Filter conversations
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

	const openDraftConversation = (participant: ConversationParticipantDetails) => {
		setDraftConversationUser(participant)
		setSelectedConversationId(null)
		setIsSidebarOpen(false)
	}

	const handleSelectConversation = (conversationId: string) => {
		setDraftConversationUser(null)
		setSelectedConversationId(conversationId)
		setIsSidebarOpen(false)
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setMessageInput(e.target.value)
		if (!selectedConversationId) return
		clearTimeout(typingTimeoutRef.current)
		if (e.target.value.trim()) {
			setTyping.mutate({ conversationId: selectedConversationId, isTyping: true })
			typingTimeoutRef.current = setTimeout(() => {
				setTyping.mutate({ conversationId: selectedConversationId, isTyping: false })
			}, 2000)
		} else {
			setTyping.mutate({ conversationId: selectedConversationId, isTyping: false })
		}
	}

	const handleSendMessage = async () => {
		const trimmedMessage = messageInput.trim()
		if (!trimmedMessage) return
		if (selectedConversationId) {
			clearTimeout(typingTimeoutRef.current)
			setTyping.mutate({ conversationId: selectedConversationId, isTyping: false })
		}

		try {
			if (draftConversationUser) {
				const result = await startConversation.mutateAsync({
					userId: draftConversationUser.id,
				})
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
			// Note: No manual refetch needed - mutation invalidation + subscription handles updates
		} catch {
			toast.error("Failed to send message")
		}
	}

	// Auto-start conversation from URL (e.g. /messages?userId=ENP_ID)
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
					handleSelectConversation(existing.id)
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
			const error = new Error("No conversation selected")
			toast.error("Select a conversation before booking a session")
			throw error
		}

		if (isEnpConsultationBookingBlocked) {
			setKycBookingBlockOpen(true)
			throw new Error("Identity verification required")
		}

		// Derive time strings and duration from the CalendarEvent
		const startHour = event.startAt.getHours().toString().padStart(2, "0")
		const startMin = event.startAt.getMinutes().toString().padStart(2, "0")
		const endAt = event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000)
		const endHour = endAt.getHours().toString().padStart(2, "0")
		const endMin = endAt.getMinutes().toString().padStart(2, "0")
		const duration = Math.round((endAt.getTime() - event.startAt.getTime()) / (1000 * 60))
		const consultationRequestPayload = {
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
				const result = await startConversation.mutateAsync({
					userId: draftConversationUser.id,
				})
				await sendConsultationRequest.mutateAsync({
					conversationId: result.conversationId,
					...consultationRequestPayload,
				})
				await getConversations.refetch()
				setDraftConversationUser(null)
				setSelectedConversationId(result.conversationId)
				setIsSidebarOpen(false)
			} else if (selectedConversationId) {
				await sendConsultationRequest.mutateAsync({
					conversationId: selectedConversationId,
					...consultationRequestPayload,
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

		if (!open) {
			setUserSearchQuery("")
		}
	}

	const handleStartConversation = (participant: ConversationParticipantDetails) => {
		handleNewChatDialogOpenChange(false)

		const existingConversation = conversations?.find(
			conversation => conversation.otherUser?.id === participant.id
		)

		if (existingConversation) {
			handleSelectConversation(existingConversation.id)
			return
		}

		openDraftConversation(participant)
	}

	if (loadingConversations) {
		return (
			<div className="bg-background flex h-screen">
				<div className="flex w-80 flex-col border-r p-4">
					<div className="bg-muted mb-4 h-10 w-full animate-pulse rounded-md" />
					<div className="bg-muted mb-2 h-16 w-full animate-pulse rounded-md" />
					<div className="bg-muted mb-2 h-16 w-full animate-pulse rounded-md" />
					<div className="bg-muted h-16 w-full animate-pulse rounded-md" />
				</div>
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Loading messages...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-background flex h-screen flex-col overflow-hidden md:flex-row">
			{/* Main Layout Container */}
			<div className="flex w-full flex-1 overflow-hidden">
				{/* Mobile Sidebar Overlay Backdrop */}
				{isSidebarOpen && (
					<div
						className="fixed inset-0 z-30 bg-black/50 md:hidden"
						onClick={() => setIsSidebarOpen(false)}
					/>
				)}

				{/* Sidebar - Conversations List */}
				<div
					className={cn(
						"bg-background flex w-full flex-col overflow-hidden border-r md:w-80",
						"fixed inset-y-0 left-0 z-40 md:static md:z-auto",
						isSidebarOpen ? "block" : "hidden md:block"
					)}
				>
					{/* Page Header - Mobile only inside sidebar */}
					<div className="md:hidden">
						<PageHeader items={[{ label: "Messages" }]} />
					</div>

					{/* Sidebar Header */}
					<div className="border-b p-3">
						<div className="mb-3 flex items-center justify-between">
							<h1 className="text-lg font-semibold">Messages</h1>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									className="md:hidden"
									onClick={() => setIsSidebarOpen(false)}
								>
									<ChevronLeft className="size-4" />
								</Button>
								<Dialog open={isNewChatDialogOpen} onOpenChange={handleNewChatDialogOpenChange}>
									<DialogTrigger asChild>
										<Button variant="ghost" size="icon" className="size-7 rounded-full">
											<Plus className="size-4" />
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>New Message</DialogTitle>
											<DialogDescription>
												Search for a user to start a conversation
											</DialogDescription>
										</DialogHeader>
										<div className="space-y-4">
											<div className="relative">
												<Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
												<Input
													placeholder="Search users..."
													value={userSearchQuery}
													onChange={e => setUserSearchQuery(e.target.value)}
													className="pl-10"
												/>
											</div>
											<ScrollArea className="h-64">
												<div className="space-y-2">
													{searchResults && searchResults.length > 0 ? (
														searchResults.map(user => (
															<button
																key={user.id}
																onClick={() => handleStartConversation(user)}
																className="hover:bg-accent flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors"
															>
																<Avatar className="size-10">
																	<AvatarImage src={user.image ?? undefined} />
																	<AvatarFallback className="bg-primary text-primary-foreground">
																		{user.name
																			?.split(" ")
																			.map(n => n[0])
																			.join("")}
																	</AvatarFallback>
																</Avatar>
																<div className="flex-1 overflow-hidden">
																	<p className="font-semibold">{user.name}</p>
																	<p className="text-muted-foreground truncate text-sm">
																		{user.email}
																	</p>
																</div>
															</button>
														))
													) : userSearchQuery.length > 0 ? (
														<p className="text-muted-foreground p-4 text-center text-sm">
															No users found
														</p>
													) : (
														<p className="text-muted-foreground p-4 text-center text-sm">
															Start typing to search users
														</p>
													)}
												</div>
											</ScrollArea>
										</div>
									</DialogContent>
								</Dialog>
							</div>
						</div>
						{/* Search Bar */}
						<div className="relative">
							<Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
							<Input
								placeholder="Search messages..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className="h-9 pl-8 text-sm"
							/>
						</div>
					</div>

					{/* Conversations List */}
					<ScrollArea className="flex-1">
						<div className="p-1.5">
							{filteredConversations && filteredConversations.length > 0 ? (
								filteredConversations.map(conversation => (
									<button
										key={conversation.id}
										onClick={() => handleSelectConversation(conversation.id)}
										className={cn(
											"hover:bg-accent flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors",
											selectedConversationId === conversation.id && "bg-accent"
										)}
									>
										<div className="relative shrink-0">
											<Avatar className="size-10">
												<AvatarImage src={conversation.otherUser?.image ?? undefined} />
												<AvatarFallback className="bg-primary text-primary-foreground text-xs">
													{conversation.otherUser?.name
														?.split(" ")
														.map(n => n[0])
														.join("")}
												</AvatarFallback>
											</Avatar>
										</div>
										<div className="min-w-0 flex-1 overflow-hidden">
											<div className="flex items-center justify-between gap-2">
												<h3 className="truncate text-sm font-medium">
													{conversation.otherUser?.name}
												</h3>
												<span className="text-muted-foreground shrink-0 text-[10px] whitespace-nowrap">
													{formatTime(conversation.lastMessageTime)}
												</span>
											</div>
											<div className="mt-0.5 flex items-center justify-between gap-2">
												<p className="text-muted-foreground truncate text-xs">
													{conversation.lastMessage ?? "No messages yet"}
												</p>
												{conversation.unreadCount > 0 && (
													<span className="bg-primary text-primary-foreground ml-1 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
														{conversation.unreadCount}
													</span>
												)}
											</div>
										</div>
									</button>
								))
							) : (
								<div className="p-6 text-center">
									<MessageSquare className="text-muted-foreground mx-auto mb-2 size-8" />
									<p className="text-muted-foreground text-xs">No conversations yet</p>
									<p className="text-muted-foreground mt-1 text-[10px]">
										Start a new chat to begin messaging
									</p>
								</div>
							)}
						</div>
					</ScrollArea>
				</div>

				{/* Main Chat Area */}
				{activeParticipant ? (
					<>
						<div className="flex w-full flex-1 flex-col overflow-hidden">
							{/* Chat Header */}
							<div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
								<div className="flex min-w-0 flex-1 items-center gap-2">
									<Button
										variant="ghost"
										size="icon"
										className="shrink-0 md:hidden"
										onClick={() => setIsSidebarOpen(true)}
									>
										<ChevronLeft className="size-4" />
									</Button>
									<Avatar className="size-8 shrink-0">
										<AvatarImage src={activeParticipant.image ?? undefined} />
										<AvatarFallback className="bg-primary text-primary-foreground text-xs">
											{activeParticipant.name
												?.split(" ")
												.map(n => n[0])
												.join("")}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1">
										<h2 className="truncate text-sm font-medium">{activeParticipant.name}</h2>
										<p className="text-muted-foreground truncate text-[10px]">
											{activeParticipant.email}
										</p>
									</div>
								</div>
								<div className="flex shrink-0 items-center gap-1.5">
									{session?.user?.role === "ENP" && (
										<>
											<Button
												variant="ghost"
												size="sm"
												className="hidden gap-1 sm:flex"
												onClick={() => {
													if (isEnpConsultationBookingBlocked) {
														setKycBookingBlockOpen(true)
														return
													}
													setIsBookingModalOpen(true)
												}}
											>
												<CalendarPlus className="size-4" />
												<span>Book</span>
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="size-7 rounded-full sm:hidden"
												onClick={() => {
													if (isEnpConsultationBookingBlocked) {
														setKycBookingBlockOpen(true)
														return
													}
													setIsBookingModalOpen(true)
												}}
											>
												<CalendarPlus className="size-4" />
											</Button>
										</>
									)}
									{/* <Button variant="ghost" size="icon" className="size-7 rounded-full hidden sm:flex">
									<Phone className="size-4" />
								</Button>
								<Button variant="ghost" size="icon" className="size-7 rounded-full hidden sm:flex">
									<Video className="size-4" />
								</Button> */}
									<Button
										variant="ghost"
										size="icon"
										className="size-7 rounded-full sm:hidden"
										onClick={() => setIsParticipantPanelOpen(true)}
									>
										<Info className="size-4" />
									</Button>
								</div>
							</div>

							{/* Messages Area */}
							<div className="flex-1 overflow-y-auto p-3">
								{isDraftConversation ? (
									<div className="flex h-full items-center justify-center">
										<div className="text-center">
											<MessageSquare className="text-muted-foreground mx-auto mb-2 size-8" />
											<p className="text-muted-foreground text-xs">No messages yet</p>
											<p className="text-muted-foreground mt-1 text-[10px]">
												Start the conversation by sending a message
											</p>
										</div>
									</div>
								) : loadingMessages ? (
									<div className="flex h-full items-center justify-center">
										<p className="text-muted-foreground text-xs">Loading messages...</p>
									</div>
								) : messages && messages.length > 0 ? (
									<Chat.List>
										{messages.map((message, index) => {
											const isSent = message.senderId === session?.user?.id
											const isConsultationRequest = message.messageType === "consultation_request"
											const variant = isSent ? "sent" : "received"

											const prevMessage = messages[index - 1]
											const nextMessage = messages[index + 1]

											const isFirstInSequence =
												!prevMessage ||
												prevMessage.senderId !== message.senderId ||
												differenceInMinutes(
													new Date(message.createdAt),
													new Date(prevMessage.createdAt)
												) >= 10

											const isLastInSequence =
												!nextMessage ||
												nextMessage.senderId !== message.senderId ||
												differenceInMinutes(
													new Date(nextMessage.createdAt),
													new Date(message.createdAt)
												) >= 10

											const showTimeSeparator =
												index === 0 ||
												(prevMessage &&
													differenceInMinutes(
														new Date(message.createdAt),
														new Date(prevMessage.createdAt)
													) >= 10)

											const separatorLabel = (() => {
												const d = new Date(message.createdAt)
												if (isToday(d)) return format(d, "p")
												if (isYesterday(d)) return `Yesterday ${format(d, "p")}`
												return format(d, "EEE p")
											})()

											return (
												<React.Fragment key={message.id}>
													{showTimeSeparator && (
														<Chat.TimeSeparator>{separatorLabel}</Chat.TimeSeparator>
													)}
													<Chat.Bubble
														variant={variant}
														isFirst={isFirstInSequence}
														isLast={isLastInSequence}
														timestamp={format(new Date(message.createdAt), "p")}
													>
														<Chat.BubbleAvatar
															src={activeParticipant.image ?? undefined}
															fallback={
																activeParticipant.name
																	?.split(" ")
																	.map(n => n[0])
																	.join("") ?? ""
															}
															showAvatar={isLastInSequence}
														/>
														<div className="space-y-0.5">
															{isConsultationRequest ? (
																<ConsultationRequestCard
																	messageId={message.id}
																	metadata={message.metadata as ConsultationRequestMetadata}
																	isOwnMessage={isSent}
																/>
															) : (
																<Chat.BubbleMessage>
																	<MessageContent
																		content={message.content}
																		className="text-xs leading-relaxed"
																	/>
																</Chat.BubbleMessage>
															)}
														</div>
													</Chat.Bubble>
												</React.Fragment>
											)
										})}
										{isOtherUserTyping && activeParticipant && (
											<Chat.Bubble variant="received" isFirst isLast>
												<Chat.BubbleAvatar
													src={activeParticipant.image ?? undefined}
													fallback={
														activeParticipant.name
															?.split(" ")
															.map(n => n[0])
															.join("") ?? ""
													}
													showAvatar
												/>
												<Chat.BubbleMessage typing />
											</Chat.Bubble>
										)}
										<div ref={messagesEndRef} />
									</Chat.List>
								) : (
									<div className="flex h-full items-center justify-center">
										<div className="text-center">
											<MessageSquare className="text-muted-foreground mx-auto mb-2 size-8" />
											<p className="text-muted-foreground text-xs">No messages yet</p>
											<p className="text-muted-foreground mt-1 text-[10px]">
												Start the conversation by sending a message
											</p>
										</div>
									</div>
								)}
							</div>

							{/* Message Input */}
							<div className="shrink-0 border-t p-2.5">
								<div className="flex items-center gap-1.5">
									<Button
										variant="ghost"
										size="icon"
										className="hidden size-7 rounded-full sm:flex"
									>
										<Paperclip className="size-4" />
									</Button>
									<div className="relative flex-1">
										<Input
											placeholder="Type a message..."
											value={messageInput}
											onChange={handleInputChange}
											className="h-9 pr-8 text-sm"
											onKeyDown={e => {
												if (e.key === "Enter" && messageInput.trim()) {
													void handleSendMessage()
												}
											}}
											disabled={isSendingTextMessage}
										/>
										<Button
											variant="ghost"
											size="icon"
											className="absolute top-1/2 right-1 hidden size-6 -translate-y-1/2 rounded-full sm:flex"
										>
											<Smile className="size-3.5" />
										</Button>
									</div>
									<Button
										size="icon"
										className="size-7 rounded-full"
										disabled={!messageInput.trim() || isSendingTextMessage}
										onClick={() => void handleSendMessage()}
									>
										<Send className="size-4" />
									</Button>
								</div>
							</div>
						</div>

						{/* Right Panel - File Uploads (Hidden on mobile and tablet, visible on lg+) */}
						<div className="hidden lg:flex">
							<FileUploadPanel
								conversationId={selectedConversationId ?? ""}
								participant={panelParticipant}
							/>
						</div>

						{/* Mobile Participant Panel Overlay */}
						{isParticipantPanelOpen && (
							<div
								className="fixed inset-0 z-30 bg-black/50 sm:hidden"
								onClick={() => setIsParticipantPanelOpen(false)}
							/>
						)}
						<div
							className={cn(
								"fixed inset-y-0 right-0 z-40 w-full max-w-sm overflow-y-auto sm:hidden",
								isParticipantPanelOpen ? "block" : "hidden"
							)}
						>
							<div className="flex h-full flex-col">
								<FileUploadPanel
									conversationId={selectedConversationId ?? ""}
									participant={panelParticipant}
									onClose={() => setIsParticipantPanelOpen(false)}
								/>
							</div>
						</div>
					</>
				) : (
					<div className="flex flex-1 items-center justify-center">
						<div className="px-4 text-center">
							<MessageSquare className="text-muted-foreground mx-auto mb-3 size-10" />
							<h3 className="text-sm font-medium">Select a conversation</h3>
							<p className="text-muted-foreground mt-1.5 text-xs">
								Choose a conversation from the list or start a new one
							</p>
						</div>
					</div>
				)}

				{/* Book Consultation modal – ENP only */}
				<EventDialog
					event={null}
					isOpen={isBookingModalOpen}
					onClose={() => setIsBookingModalOpen(false)}
					onSave={handleBookConsultationSave}
					isSaving={isSendingConsultationRequest}
				/>
				<KycRequiredDialog
					open={kycBookingBlockOpen}
					onOpenChange={setKycBookingBlockOpen}
					returnToPath="/messages"
					description="Complete identity verification before sending a booking request from Messages. You can finish verification from here."
				/>
			</div>
		</div>
	)
}
