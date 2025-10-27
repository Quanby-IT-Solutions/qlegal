"use client"

import { format } from "date-fns"
import { MessageSquare, Paperclip, Phone, Plus, Search, Send, Smile, Video, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

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
import { useMessages } from "@/features/messages/api/messages.hooks"
import { toast } from "sonner"

export default function MessagesPage() {
	const { data: session } = useSession()
	const { getConversations, getMessages, sendMessage, startConversation, markAsRead, searchUsers } = useMessages()
	const { data: conversations, isLoading: loadingConversations } = getConversations

	const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
	const [messageInput, setMessageInput] = useState("")
	const [searchQuery, setSearchQuery] = useState("")
	const [userSearchQuery, setUserSearchQuery] = useState("")
	const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	// Get messages for selected conversation
	const { data: messages, isLoading: loadingMessages } = getMessages(selectedConversationId ?? "")

	// Get users for new chat search
	const { data: searchResults } = searchUsers(userSearchQuery)

	// Auto-select first conversation
	useEffect(() => {
		if (conversations && conversations.length > 0 && !selectedConversationId && conversations[0]) {
			setSelectedConversationId(conversations[0].id)
		}
	}, [conversations, selectedConversationId])

	// Mark conversation as read when selected
	useEffect(() => {
		if (selectedConversationId) {
			void markAsRead.mutateAsync({ conversationId: selectedConversationId })
		}
	}, [selectedConversationId])

	// Scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
	}, [messages])

	// Filter conversations
	const filteredConversations = conversations?.filter((conv) =>
		conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase())
	)

	const selectedConversation = conversations?.find((c) => c.id === selectedConversationId)

	const handleSendMessage = async () => {
		if (!messageInput.trim() || !selectedConversationId) return

		try {
			await sendMessage.mutateAsync({
				conversationId: selectedConversationId,
				content: messageInput.trim(),
			})
			setMessageInput("")
		} catch (error) {
			toast.error("Failed to send message")
		}
	}

	const handleStartConversation = async (userId: string) => {
		try {
			const result = await startConversation.mutateAsync({ userId })
			setSelectedConversationId(result.conversationId)
			setIsNewChatDialogOpen(false)
			setUserSearchQuery("")
		} catch (error) {
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
			<div className="flex h-screen bg-background">
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
		<div className="flex h-screen bg-background">
			{/* Sidebar - Conversations List */}
			<div className="flex w-80 flex-col border-r">
				{/* Sidebar Header */}
				<div className="border-b p-4">
					<div className="mb-4 flex items-center justify-between">
						<h1 className="text-2xl font-bold">Messages</h1>
						<Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
							<DialogTrigger asChild>
								<Button variant="ghost" size="icon" className="size-9 rounded-full">
									<Plus className="size-5" />
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>New Message</DialogTitle>
									<DialogDescription>Search for a user to start a conversation</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
										<Input
											placeholder="Search users..."
											value={userSearchQuery}
											onChange={(e) => setUserSearchQuery(e.target.value)}
											className="pl-10"
										/>
									</div>
									<ScrollArea className="h-64">
										<div className="space-y-2">
											{searchResults && searchResults.length > 0 ? (
												searchResults.map((user) => (
													<button
														key={user.id}
														onClick={() => void handleStartConversation(user.id)}
														className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent"
													>
														<Avatar className="size-10">
															<AvatarImage src={user.image ?? undefined} />
															<AvatarFallback className="bg-primary text-primary-foreground">
																{user.name
																	?.split(" ")
																	.map((n) => n[0])
																	.join("")}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1 overflow-hidden">
															<p className="font-semibold">{user.name}</p>
															<p className="truncate text-sm text-muted-foreground">{user.email}</p>
														</div>
													</button>
												))
											) : userSearchQuery.length > 0 ? (
												<p className="p-4 text-center text-sm text-muted-foreground">No users found</p>
											) : (
												<p className="p-4 text-center text-sm text-muted-foreground">
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
						<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search messages..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>

				{/* Conversations List */}
				<ScrollArea className="flex-1">
					<div className="p-2">
						{filteredConversations && filteredConversations.length > 0 ? (
							filteredConversations.map((conversation) => (
								<button
									key={conversation.id}
									onClick={() => setSelectedConversationId(conversation.id)}
									className={cn(
										"flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent",
										selectedConversationId === conversation.id && "bg-accent"
									)}
								>
									<div className="relative">
										<Avatar className="size-12">
											<AvatarImage src={conversation.otherUser?.image ?? undefined} />
											<AvatarFallback className="bg-primary text-primary-foreground">
												{conversation.otherUser?.name
													?.split(" ")
													.map((n) => n[0])
													.join("")}
											</AvatarFallback>
										</Avatar>
									</div>
									<div className="flex-1 overflow-hidden">
										<div className="flex items-center justify-between">
											<h3 className="font-semibold">{conversation.otherUser?.name}</h3>
											<span className="text-xs text-muted-foreground">
												{formatTime(conversation.lastMessageTime)}
											</span>
										</div>
										<div className="flex items-center justify-between">
										<p className="truncate text-sm text-muted-foreground">
											{conversation.lastMessage ?? "No messages yet"}
										</p>
											{conversation.unreadCount > 0 && (
												<span className="ml-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
													{conversation.unreadCount}
												</span>
											)}
										</div>
									</div>
								</button>
							))
						) : (
							<div className="p-8 text-center">
								<MessageSquare className="mx-auto mb-2 size-12 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">No conversations yet</p>
								<p className="mt-1 text-xs text-muted-foreground">Start a new chat to begin messaging</p>
							</div>
						)}
					</div>
				</ScrollArea>
			</div>

			{/* Main Chat Area */}
			{selectedConversation ? (
				<div className="flex flex-1 flex-col">
					{/* Chat Header */}
					<div className="flex items-center justify-between border-b p-4">
						<div className="flex items-center gap-3">
							<Avatar className="size-10">
								<AvatarImage src={selectedConversation.otherUser?.image ?? undefined} />
								<AvatarFallback className="bg-primary text-primary-foreground">
									{selectedConversation.otherUser?.name
										?.split(" ")
										.map((n) => n[0])
										.join("")}
								</AvatarFallback>
							</Avatar>
							<div>
								<h2 className="font-semibold">{selectedConversation.otherUser?.name}</h2>
								<p className="text-xs text-muted-foreground">{selectedConversation.otherUser?.email}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="icon" className="size-9 rounded-full">
								<Phone className="size-5" />
							</Button>
							<Button variant="ghost" size="icon" className="size-9 rounded-full">
								<Video className="size-5" />
							</Button>
						</div>
					</div>

					{/* Messages Area */}
					<ScrollArea className="flex-1 p-4">
						{loadingMessages ? (
							<div className="flex h-full items-center justify-center">
								<p className="text-muted-foreground">Loading messages...</p>
							</div>
						) : messages && messages.length > 0 ? (
							<div className="space-y-4">
								{messages.map((message) => {
									const isSent = message.senderId === session?.user?.id
									return (
										<div
											key={message.id}
											className={cn("flex", isSent ? "justify-end" : "justify-start")}
										>
											<div
												className={cn(
													"flex max-w-[70%] gap-2",
													isSent && "flex-row-reverse"
												)}
											>
												{!isSent && (
													<Avatar className="size-8">
														<AvatarImage
															src={selectedConversation.otherUser?.image ?? undefined}
														/>
														<AvatarFallback className="bg-primary text-xs text-primary-foreground">
															{selectedConversation.otherUser?.name
																?.split(" ")
																.map((n) => n[0])
																.join("")}
														</AvatarFallback>
													</Avatar>
												)}
												<div className="space-y-1">
													<Card
														className={cn(
															"px-4 py-2",
															isSent
																? "bg-primary text-primary-foreground"
																: "bg-muted"
														)}
													>
														<p className="text-sm">{message.content}</p>
													</Card>
													<p
														className={cn(
															"text-xs text-muted-foreground",
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
									<MessageSquare className="mx-auto mb-2 size-12 text-muted-foreground" />
									<p className="text-sm text-muted-foreground">No messages yet</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Start the conversation by sending a message
									</p>
								</div>
							</div>
						)}
					</ScrollArea>

					{/* Message Input */}
					<div className="border-t p-4">
						<div className="flex items-center gap-2">
							<Button variant="ghost" size="icon" className="size-9 rounded-full">
								<Paperclip className="size-5" />
							</Button>
							<div className="relative flex-1">
								<Input
									placeholder="Type a message..."
									value={messageInput}
									onChange={(e) => setMessageInput(e.target.value)}
									className="pr-10"
									onKeyDown={(e) => {
										if (e.key === "Enter" && messageInput.trim()) {
											void handleSendMessage()
										}
									}}
									disabled={sendMessage.isPending}
								/>
								<Button
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-full"
								>
									<Smile className="size-5" />
								</Button>
							</div>
							<Button
								size="icon"
								className="size-9 rounded-full"
								disabled={!messageInput.trim() || sendMessage.isPending}
								onClick={() => void handleSendMessage()}
							>
								<Send className="size-5" />
							</Button>
						</div>
					</div>
				</div>
			) : (
				<div className="flex flex-1 items-center justify-center">
					<div className="text-center">
						<MessageSquare className="mx-auto mb-4 size-16 text-muted-foreground" />
						<h3 className="text-xl font-semibold">Select a conversation</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Choose a conversation from the list or start a new one
						</p>
					</div>
				</div>
			)}
		</div>
	)
}
