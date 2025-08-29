"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
	ExternalLink,
	MessageSquare,
	Paperclip,
	Send,
	Shield,
	Users
} from "lucide-react"
import { useSession } from "next-auth/react"

import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from "@/core/components/ui/sheet"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import { UserSearch } from "./user-search"

interface DocumentMessageSheetProps {
	documentId: string
	documentName: string
	envelopeId: string
	envelopeTitle: string
	trigger: React.ReactNode
}

interface Message {
	id: string
	senderId: string
	sender: {
		id: string
		name: string | null
		email: string | null
		image: string | null
	} | null
	content: string
	createdAt: string
}

interface User {
	id: string
	name: string | null
	email: string | null
	image: string | null
	organization: string | null
	role: string
}

export function DocumentMessageSheet({
	documentId,
	documentName,
	envelopeId,
	envelopeTitle,
	trigger
}: DocumentMessageSheetProps) {
	const [open, setOpen] = useState(false)
	const [newMessage, setNewMessage] = useState("")
	const [subscriptionTimeout, setSubscriptionTimeout] =
		useState<NodeJS.Timeout | null>(null)
	const { data: session } = useSession()

	const messageType = documentId === "envelope" ? "ENVELOPE" : "DOCUMENT"

	// Fetch messages and participants using tRPC
	const {
		data: messagesData,
		isLoading,
		refetch
	} = trpc.messages.getMessages.useQuery(
		{
			documentId: documentId === "envelope" ? undefined : documentId,
			envelopeId,
			limit: 50,
			offset: 0
		},
		{
			enabled: open // Only fetch when sheet is open
		}
	)

	const utils = trpc.useUtils()

	const sendMessageMutation = trpc.messages.sendMessage.useMutation({
		onSuccess: () => {
			setNewMessage("")
			// Refetch messages to ensure they appear immediately
			void refetch()
		},
		onError: (error) => {
			console.error("Failed to send message:", error)
		}
	})

	// Create or get conversation mutation
	const createOrGetConversationMutation =
		trpc.messages.createOrGetConversation.useMutation({
			onSuccess: (conversation) => {
				console.log("Created conversation:", conversation.id)
				// You might want to update the UI to show the new conversation
				// For now, we'll just log it
			},
			onError: (error) => {
				console.error("Failed to create conversation:", error)
			}
		})

	// Subscribe to real-time messages with timeout
	trpc.messages.subscribe.useSubscription(
		{
			envelopeId,
			documentId: documentId === "envelope" ? undefined : documentId
		},
		{
			enabled: open, // Only subscribe when sheet is open
			onData: () => {
				// Refetch messages when new message arrives
				void utils.messages.getMessages.invalidate({
					documentId: documentId === "envelope" ? undefined : documentId,
					envelopeId,
					limit: 50,
					offset: 0
				})
			},
			onError: (error) => {
				console.error("❌ Subscription error:", error)
				// Don't show error to user, just log it
			}
		}
	)

	const handleSendMessage = () => {
		if (!newMessage.trim()) return

		sendMessageMutation.mutate({
			documentId: documentId === "envelope" ? undefined : documentId,
			envelopeId,
			content: newMessage,
			messageType
		})
	}

	// Use real data if available, otherwise fallback to empty array
	const messages = (messagesData?.messages ?? []) as Message[]
	const participants = messagesData?.participants ?? []

	const handleUserSelect = async (user: User) => {
		try {
			// Create or get conversation with selected user
			createOrGetConversationMutation.mutate({
				participantId: user.id,
				title: `Chat with ${user.name ?? user.email}`
			})
		} catch (error) {
			console.error("Failed to create conversation:", error)
		}
	}

	// Auto-refresh messages when sheet opens
	useEffect(() => {
		if (open) {
			void refetch()

			// Set a timeout to prevent subscription from hanging indefinitely
			const timeout = setTimeout(() => {
				console.log(
					"⚠️ Subscription timeout - closing sheet to prevent hanging"
				)
				setOpen(false)
			}, 30000) // 30 seconds timeout

			setSubscriptionTimeout(timeout)
		} else {
			// Clear timeout when sheet closes
			if (subscriptionTimeout) {
				clearTimeout(subscriptionTimeout)
				setSubscriptionTimeout(null)
			}
		}

		// Cleanup timeout on unmount
		return () => {
			if (subscriptionTimeout) {
				clearTimeout(subscriptionTimeout)
			}
		}
	}, [open, refetch, subscriptionTimeout])

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent className="flex w-[400px] flex-col sm:w-[540px]">
				<SheetHeader className="border-b pb-4">
					<SheetTitle className="flex items-center gap-2">
						<MessageSquare className="h-5 w-5" />
						Document Discussion
					</SheetTitle>
					<div className="space-y-1 text-sm text-muted-foreground">
						<p>
							<strong>Document:</strong> {documentName}
						</p>
						<p>
							<strong>Envelope:</strong> {envelopeTitle}
						</p>
						{participants.length > 0 && (
							<p>
								<strong>Participants:</strong> {participants.length}
							</p>
						)}
					</div>
					{/* User Search */}
					<div className="mt-4">
						<UserSearch
							onUserSelect={handleUserSelect}
							placeholder="Search users to chat with..."
							trigger={
								<Button variant="outline" size="sm" className="w-full">
									<Users className="mr-2 h-4 w-4" />
									Search Users
								</Button>
							}
						/>
					</div>
				</SheetHeader>

				<div className="flex flex-1 flex-col">
					{/* Messages */}
					<div className="flex-1 space-y-4 overflow-y-auto p-4">
						{isLoading ? (
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex gap-3">
										<div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
										<div className="flex-1 space-y-2">
											<div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
											<div className="h-16 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
										</div>
									</div>
								))}
							</div>
						) : messages.length === 0 ? (
							<div className="py-8 text-center">
								<MessageSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
								<p className="text-gray-500">No messages yet</p>
								<p className="text-sm text-gray-400">Start the conversation!</p>
							</div>
						) : (
							<>
								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex gap-3 ${
											message.senderId === session?.user?.id
												? "flex-row-reverse"
												: ""
										}`}
									>
										<Avatar className="h-8 w-8">
											<AvatarImage src={message.sender?.image ?? undefined} />
											<AvatarFallback>
												{message.sender?.name
													?.split(" ")
													.map((n) => n[0])
													.join("") ?? "U"}
											</AvatarFallback>
										</Avatar>
										<div
											className={`flex-1 space-y-1 ${
												message.senderId === session?.user?.id
													? "text-right"
													: ""
											}`}
										>
											<div
												className={`inline-block rounded-lg px-3 py-2 text-sm ${
													message.senderId === session?.user?.id
														? "bg-primary text-primary-foreground"
														: "bg-muted"
												}`}
											>
												<div className="mb-1 flex items-center gap-2">
													<span className="text-xs font-medium">
														{message.sender?.name ?? "Unknown User"}
													</span>
													<Shield className="h-3 w-3 text-muted-foreground" />
												</div>
												<p>{message.content}</p>
												<span className="mt-1 block text-xs opacity-70">
													{new Date(message.createdAt).toLocaleTimeString()}
												</span>
											</div>
										</div>
									</div>
								))}
							</>
						)}
					</div>

					{/* Message Input */}
					<div className="border-t p-4">
						<div className="flex items-center space-x-2">
							<Button variant="ghost" size="icon">
								<Paperclip className="h-4 w-4" />
							</Button>
							<div className="flex-1">
								<Textarea
									placeholder="Type your message..."
									value={newMessage}
									onChange={(e) => setNewMessage(e.target.value)}
									className="max-h-32 min-h-[40px] resize-none"
									onKeyPress={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault()
											handleSendMessage()
										}
									}}
								/>
							</div>
							<Button
								onClick={handleSendMessage}
								// disabled={!newMessage.trim() || sendMessageMutation.isPending}
							>
								<Send className="h-4 w-4" />
							</Button>
						</div>
						<div className="mt-2 flex items-center justify-between text-xs text-gray-500">
							<div className="flex items-center space-x-1">
								<Shield className="h-3 w-3 text-green-600" />
								<span>End-to-end encrypted</span>
							</div>
							<span>Press Enter to send, Shift+Enter for new line</span>
						</div>
					</div>
				</div>

				{/* View Full Messages Link */}
				<div className="border-t p-4">
					<Button variant="ghost" size="sm" className="w-full text-xs" asChild>
						<Link href="/dashboard/messages">
							<ExternalLink className="mr-2 h-3 w-3" />
							View Full Messages
						</Link>
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	)
}
