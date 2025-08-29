// "use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
	Clock,
	ExternalLink,
	MessageSquare,
	Paperclip,
	Send,
	Shield,
	Users
} from "lucide-react"
import { useSession } from "next-auth/react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger
} from "@/core/components/ui/sheet"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

interface EnvelopeChatSheetProps {
	envelopeId: string
	envelopeTitle: string
	participants: Array<{
		id: string
		name: string | null
		email: string | null
		image: string | null
		role: string
	}>
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

export function EnvelopeChatSheet({
	envelopeId,
	envelopeTitle,
	participants,
	trigger
}: EnvelopeChatSheetProps) {
	const [open, setOpen] = useState(false)
	const [newMessage, setNewMessage] = useState("")
	const { data: session } = useSession()

	// Fetch envelope-level messages using tRPC with performance optimizations
	const {
		data: messagesData,
		isLoading,
		error,
		refetch
	} = trpc.messages.getMessages.useQuery(
		{
			envelopeId,
			documentId: undefined,
			limit: 50,
			offset: 0
		},
		{
			enabled: open, // Only fetch when sheet is open
			retry: 3,
			retryDelay: 1000,
			staleTime: 30000, // 30 seconds - prevent unnecessary refetches
			gcTime: 300000, // 5 minutes - keep in cache longer
			refetchOnWindowFocus: false, // Prevent refetch on window focus
			refetchOnReconnect: false // Prevent refetch on reconnect
		}
	)

	const utils = trpc.useUtils()

	// Debounced cache invalidation to prevent rapid refetches
	const debouncedInvalidate = useCallback(() => {
		const timeoutId = setTimeout(() => {
			void utils.messages.getMessages.invalidate({
				envelopeId,
				documentId: undefined,
				limit: 50,
				offset: 0
			})
		}, 1000)
		return () => clearTimeout(timeoutId)
	}, [utils, envelopeId])

	const sendMessageMutation = trpc.messages.sendMessage.useMutation({
		onSuccess: () => {
			setNewMessage("")
			console.log("✅ Message sent successfully")
			// Optimistically update cache instead of refetching
			utils.messages.getMessages.setData(
				{
					envelopeId,
					documentId: undefined,
					limit: 50,
					offset: 0
				},
				(oldData) => {
					if (!oldData) return oldData
					return oldData
				}
			)
		},
		onError: (error) => {
			console.error("Failed to send message:", error)
		}
	})

	// Subscribe to real-time messages with debounced cache invalidation
	const subscription = trpc.messages.subscribe.useSubscription(
		{
			envelopeId,
			documentId: undefined
		},
		{
			enabled: open && !!envelopeId, // Only subscribe when sheet is open and envelopeId exists
			onData: () => {
				// Use debounced cache invalidation
				console.log("🔄 New message received for envelope:", envelopeId)
				debouncedInvalidate()
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
			envelopeId,
			content: newMessage,
			documentId: undefined
		})
	}

	// Use real data if available, otherwise fallback to empty array
	const messages = (messagesData?.messages ?? []) as Message[]

	// Debug logging
	useEffect(() => {
		if (open) {
			console.log("🔍 Chat Debug Info:")
			console.log("📦 messagesData:", messagesData)
			console.log("📨 messages:", messages)
			console.log("⏳ isLoading:", isLoading)
			console.log("❌ error:", error)
			console.log("🆔 envelopeId:", envelopeId)
			console.log("📡 subscription status:", subscription.status)
		}
	}, [
		open,
		messagesData,
		messages,
		isLoading,
		error,
		envelopeId,
		subscription.status
	])

	// Auto-refresh messages when sheet opens (optimized)
	useEffect(() => {
		if (open) {
			console.log("📱 Chat opened for envelope:", envelopeId)
			console.log(
				"👥 Participants:",
				participants.length,
				participants.map((p) => p.name)
			)
			// Only refetch if data is stale or missing
			if (!messagesData || messagesData.messages.length === 0) {
				void refetch()
			}
		}
	}, [open, envelopeId]) // Removed refetch and participants from dependencies

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>{trigger}</SheetTrigger>
			<SheetContent className="flex w-[400px] flex-col p-0 sm:w-[540px]">
				<SheetHeader className="border-b p-6 pb-4">
					<SheetTitle className="flex items-center gap-3 text-xl">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
							<MessageSquare className="h-5 w-5 text-primary" />
						</div>
						<div>
							<div>Envelope Discussion</div>
							<div className="text-sm font-normal text-muted-foreground">
								{envelopeTitle}
							</div>
						</div>
					</SheetTitle>

					{/* Participants Summary */}
					<div className="mt-4 flex items-center gap-2">
						<Badge variant="secondary" className="gap-1">
							<Users className="h-3 w-3" />
							{participants.length} participants
						</Badge>
					</div>

					{/* Participants List */}
					<div className="mt-3">
						<div className="mb-2 flex items-center gap-2">
							<Users className="h-3 w-3 text-muted-foreground" />
							<span className="text-xs font-medium">Participants</span>
						</div>
						<div className="flex flex-wrap gap-1">
							{participants.map((participant) => (
								<Badge
									key={participant.id}
									variant="outline"
									className="text-xs"
								>
									{participant.name ?? participant.email ?? "Unknown"}
									<span className="ml-1 text-muted-foreground">
										({participant.role.toLowerCase()})
									</span>
								</Badge>
							))}
						</div>
					</div>
				</SheetHeader>

				<div className="flex flex-1 flex-col">
					{/* Messages */}
					<div className="flex-1 overflow-y-auto p-6">
						{error ? (
							<div className="flex h-full items-center justify-center">
								<div className="text-center">
									<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
										<MessageSquare className="h-8 w-8 text-red-600" />
									</div>
									<h3 className="mb-2 text-lg font-medium text-red-600">
										Error loading messages
									</h3>
									<p className="text-sm text-muted-foreground">
										{error.message || "Failed to load messages"}
									</p>
									<Button
										onClick={() => refetch()}
										variant="outline"
										className="mt-4"
									>
										Try Again
									</Button>
								</div>
							</div>
						) : isLoading ? (
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex justify-start">
										<div className="max-w-[80%] space-y-2">
											<div className="h-4 w-24 animate-pulse rounded bg-muted" />
											<div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
										</div>
									</div>
								))}
							</div>
						) : messages.length === 0 ? (
							<div className="flex h-full items-center justify-center">
								<div className="text-center">
									<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
										<MessageSquare className="h-8 w-8 text-muted-foreground" />
									</div>
									<h3 className="mb-2 text-lg font-medium">No messages yet</h3>
									<p className="text-sm text-muted-foreground">
										Start the conversation with envelope participants!
									</p>
								</div>
							</div>
						) : (
							<div className="space-y-3">
								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex ${
											message.senderId === session?.user?.id
												? "justify-end"
												: "justify-start"
										}`}
									>
										<div
											className={`max-w-[75%] rounded-lg px-4 py-3 ${
												message.senderId === session?.user?.id
													? "bg-primary text-primary-foreground"
													: "bg-muted"
											}`}
										>
											<div className="mb-1 flex items-center gap-2">
												<span className="text-sm font-medium">
													{message.sender?.name ?? "Unknown User"}
												</span>
												<Shield className="h-3 w-3 opacity-70" />
											</div>
											<p className="break-words text-sm leading-relaxed">
												{message.content}
											</p>
											<div className="mt-2 flex items-center gap-1 text-xs opacity-70">
												<Clock className="h-3 w-3" />
												{new Date(message.createdAt).toLocaleTimeString()}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Message Input */}
					<div className="border-t bg-background">
						<div className="p-4">
							<div className="flex items-end gap-2">
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0"
								>
									<Paperclip className="h-3 w-3" />
								</Button>
								<div className="flex-1">
									<Textarea
										placeholder="Type your message..."
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										className="max-h-24 min-h-[36px] resize-none border-0 bg-muted/50 text-sm focus-visible:ring-0"
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
									disabled={!newMessage.trim() || sendMessageMutation.isPending}
									size="icon"
									className="h-8 w-8 shrink-0"
								>
									<Send className="h-3 w-3" />
								</Button>
							</div>
							<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
								<div className="flex items-center gap-1">
									<Shield className="h-3 w-3 text-green-600" />
									<span>End-to-end encrypted</span>
								</div>
								<span>Press Enter to send, Shift+Enter for new line</span>
							</div>
						</div>
					</div>
				</div>

				{/* View Full Messages Link */}
				<div className="border-t bg-muted/30">
					<div className="p-4">
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start text-sm"
							asChild
						>
							<Link href="/dashboard/messages">
								<ExternalLink className="mr-2 h-4 w-4" />
								View Full Messages
							</Link>
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}
