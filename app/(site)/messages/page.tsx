"use client"

import type { Route } from "next"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { MessageSquare, Paperclip, Phone, Plus, Search, Send, Smile, Video } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Card } from "@/core/components/ui/card"
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
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { useMessages } from "@/features/messages/api/messages.hooks"
import { useMessagesSubscriptions } from "@/features/messages/api/use-messages-subscriptions"
import { FileUploadPanel } from "@/features/messages/components/file-upload-panel"

export default function MessagesPage() {
	const { data: session } = useSession()
	const searchParams = useSearchParams()
	const utils = trpc.useUtils()
	const { getConversations, getMessages, sendMessage, startConversation, markAsRead, searchUsers } =
		useMessages()
	const { data: conversations, isLoading: loadingConversations } = getConversations

	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
	const [messageInput, setMessageInput] = useState("")
	const [searchQuery, setSearchQuery] = useState("")
	const [userSearchQuery, setUserSearchQuery] = useState("")
	const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
	const [hasStartedFromQuery, setHasStartedFromQuery] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const autoStartInFlightRef = useRef(false)
	const autoStartHandledUserIdRef = useRef<string | null>(null)

	// Get messages for selected conversation
	const messagesQuery = getMessages(selectedConversationId ?? "")
	const { data: messages, isLoading: loadingMessages } = messagesQuery

	// Real-time subscriptions (SSE)
	useMessagesSubscriptions({
		userId: session?.user?.id,
		conversationId: selectedConversationId,
		utils,
		lastMessageId: messages && messages.length > 0 ? messages.at(-1)?.id : undefined,
	})

	// Get users for new chat search
	const { data: searchResults } = searchUsers(userSearchQuery)

	// Auto-select conversation (prefer URL param)
	useEffect(() => {
		const conversationFromQuery = searchParams.get("conversationId")

		if (conversationFromQuery && conversations?.some(c => c.id === conversationFromQuery)) {
			setSelectedConversationId(conversationFromQuery)
			return
		}

		if (conversations && conversations.length > 0 && !selectedConversationId && conversations[0]) {
			setSelectedConversationId(conversations[0].id)
		}
	}, [conversations, selectedConversationId, searchParams])

	// Mark conversation as read when selected
	// Only depend on selectedConversationId; markAsRead is stable but comes from a new object each render.
	useEffect(() => {
		if (!selectedConversationId) return
		markAsRead.mutate({ conversationId: selectedConversationId })
	}, [selectedConversationId]) // eslint-disable-line react-hooks/exhaustive-deps -- markAsRead from useMessages() is new ref each render; we only want to run when conversation changes

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages])

	// Filter conversations
	const filteredConversations = conversations?.filter(conv =>
		conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const selectedConversation = conversations?.find(c => c.id === selectedConversationId)

	const handleSendMessage = async () => {
		if (!messageInput.trim() || !selectedConversationId) return

		try {
			await sendMessage.mutateAsync({
				conversationId: selectedConversationId,
				content: messageInput.trim(),
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
					setSelectedConversationId(existing.id)
					await getConversations.refetch()
					await messagesQuery.refetch()
				} else {
					const result = await startConversation.mutateAsync({ userId: targetUserId })
					setSelectedConversationId(result.conversationId)
					await sendMessage.mutateAsync({
						conversationId: result.conversationId,
						content: "Hello! I'd like to chat with you.",
					})
					await getConversations.refetch()
					await messagesQuery.refetch()
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
		messagesQuery,
		searchParams,
		sendMessage,
		startConversation,
	])

	const handleShareBookingLink = async () => {
		if (!selectedConversationId || !selectedConversation?.otherUser?.id) return
		try {
			const bookingLink = `/consultations?enp=${selectedConversation.otherUser.id}` as Route
			await sendMessage.mutateAsync({
				conversationId: selectedConversationId,
				content: `Book a consultation here: ${bookingLink}`,
			})
			// Note: No manual refetch needed - mutation invalidation + subscription handles updates
		} catch {
			toast.error("Failed to share booking link")
		}
	}

	const handleStartConversation = async (userId: string) => {
		try {
			const result = await startConversation.mutateAsync({ userId })
			setSelectedConversationId(result.conversationId)
			await getConversations.refetch()
			await messagesQuery.refetch()
			setIsNewChatDialogOpen(false)
			setUserSearchQuery("")
		} catch {
			toast.error("Failed to start conversation")
		}
	}

	const formatTime = (date: Date | undefined) => {
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

	if (loadingConversations) {
		return (
			<div className="bg-background flex h-screen">
				<div className="flex w-80 flex-col border-r p-4">
					<Skeleton className="mb-4 h-10 w-full" />
					<Skeleton className="mb-2 h-16 w-full" />
					<Skeleton className="mb-2 h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Loading messages...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-background flex h-screen overflow-hidden">
			{/* Sidebar - Conversations List */}
			<div className="flex w-80 flex-col overflow-hidden border-r">
				{/* Sidebar Header */}
				<div className="border-b p-3">
					<div className="mb-3 flex items-center justify-between">
						<h1 className="text-lg font-semibold">Messages</h1>
						<Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
							<DialogTrigger asChild>
								<Button variant="ghost" size="icon" className="size-7 rounded-full">
									<Plus className="size-4" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>New Message</DialogTitle>
									<DialogDescription>Search for a user to start a conversation</DialogDescription>
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
														onClick={() => void handleStartConversation(user.id)}
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
															<p className="text-muted-foreground truncate text-sm">{user.email}</p>
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
									onClick={() => setSelectedConversationId(conversation.id)}
									className={cn(
										"hover:bg-accent flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors",
										selectedConversationId === conversation.id && "bg-accent"
									)}
								>
									<div className="relative flex-shrink-0">
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
											<span className="text-muted-foreground flex-shrink-0 text-[10px] whitespace-nowrap">
												{formatTime(conversation.lastMessageTime)}
											</span>
										</div>
										<div className="mt-0.5 flex items-center justify-between gap-2">
											<p className="text-muted-foreground truncate text-xs">
												{conversation.lastMessage ?? "No messages yet"}
											</p>
											{conversation.unreadCount > 0 && (
												<span className="bg-primary text-primary-foreground ml-1 flex size-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
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
			{selectedConversation ? (
				<>
					<div className="flex flex-1 flex-col overflow-hidden">
						{/* Chat Header */}
						<div className="flex flex-shrink-0 items-center justify-between border-b p-3">
							<div className="flex items-center gap-2.5">
								<Avatar className="size-8">
									<AvatarImage src={selectedConversation.otherUser?.image ?? undefined} />
									<AvatarFallback className="bg-primary text-primary-foreground text-xs">
										{selectedConversation.otherUser?.name
											?.split(" ")
											.map(n => n[0])
											.join("")}
									</AvatarFallback>
								</Avatar>
								<div>
									<h2 className="text-sm font-medium">{selectedConversation.otherUser?.name}</h2>
									<p className="text-muted-foreground text-[10px]">
										{selectedConversation.otherUser?.email}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1.5">
								{session?.user?.role === "ENP" && (
									<Button variant="ghost" size="sm" onClick={() => void handleShareBookingLink()}>
										Share booking link
									</Button>
								)}
								<Button variant="ghost" size="icon" className="size-7 rounded-full">
									<Phone className="size-4" />
								</Button>
								<Button variant="ghost" size="icon" className="size-7 rounded-full">
									<Video className="size-4" />
								</Button>
							</div>
						</div>

						{/* Messages Area */}
						<div className="flex-1 overflow-y-auto p-3">
							{loadingMessages ? (
								<div className="flex h-full items-center justify-center">
									<p className="text-muted-foreground text-xs">Loading messages...</p>
								</div>
							) : messages && messages.length > 0 ? (
								<div className="space-y-2.5 pb-3">
									{messages.map(message => {
										const isSent = message.senderId === session?.user?.id
										return (
											<div
												key={message.id}
												className={cn("flex", isSent ? "justify-end" : "justify-start")}
											>
												<div className={cn("flex max-w-[70%] gap-2", isSent && "flex-row-reverse")}>
													{!isSent && (
														<Avatar className="size-7 flex-shrink-0">
															<AvatarImage
																src={selectedConversation.otherUser?.image ?? undefined}
															/>
															<AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
																{selectedConversation.otherUser?.name
																	?.split(" ")
																	.map(n => n[0])
																	.join("")}
															</AvatarFallback>
														</Avatar>
													)}
													<div className="space-y-0.5">
														<Card
															className={cn(
																"px-3 py-1.5",
																isSent ? "bg-primary text-primary-foreground" : "bg-muted"
															)}
														>
															<p className="text-xs leading-relaxed">{message.content}</p>
														</Card>
														<p
															className={cn(
																"text-muted-foreground text-[10px]",
																isSent && "text-right"
															)}
														>
															{format(new Date(message.createdAt), "p")}
														</p>
													</div>
												</div>
											</div>
										)
									})}
									<div ref={messagesEndRef} />
								</div>
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
						<div className="flex-shrink-0 border-t p-2.5">
							<div className="flex items-center gap-1.5">
								<Button variant="ghost" size="icon" className="size-7 rounded-full">
									<Paperclip className="size-4" />
								</Button>
								<div className="relative flex-1">
									<Input
										placeholder="Type a message..."
										value={messageInput}
										onChange={e => setMessageInput(e.target.value)}
										className="h-9 pr-8 text-sm"
										onKeyDown={e => {
											if (e.key === "Enter" && messageInput.trim()) {
												void handleSendMessage()
											}
										}}
										disabled={sendMessage.isPending}
									/>
									<Button
										variant="ghost"
										size="icon"
										className="absolute top-1/2 right-1 size-6 -translate-y-1/2 rounded-full"
									>
										<Smile className="size-3.5" />
									</Button>
								</div>
								<Button
									size="icon"
									className="size-7 rounded-full"
									disabled={!messageInput.trim() || sendMessage.isPending}
									onClick={() => void handleSendMessage()}
								>
									<Send className="size-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Right Panel - File Uploads */}
					<FileUploadPanel conversationId={selectedConversationId ?? ""} />
				</>
			) : (
				<div className="flex flex-1 items-center justify-center">
					<div className="text-center">
						<MessageSquare className="text-muted-foreground mx-auto mb-3 size-10" />
						<h3 className="text-sm font-medium">Select a conversation</h3>
						<p className="text-muted-foreground mt-1.5 text-xs">
							Choose a conversation from the list or start a new one
						</p>
					</div>
				</div>
			)}
		</div>
	)
}
