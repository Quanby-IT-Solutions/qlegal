"use client"

import { format } from "date-fns"
import { ChevronLeft, MessageSquare, Plus, Search } from "lucide-react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { cn } from "@/core/lib/utils"

import { useMessagesContext } from "@/features/messages/context/messages-context"

// Only used in the sidebar for last-message timestamps
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

export function MessagesSidebar() {
	const {
		filteredConversations,
		selectedConversationId,
		searchQuery,
		setSearchQuery,
		userSearchQuery,
		setUserSearchQuery,
		searchResults,
		isNewChatDialogOpen,
		setIsNewChatDialogOpen,
		isSidebarOpen,
		setIsSidebarOpen,
		handleSelectConversation,
		handleStartConversation,
		handleNewChatDialogOpenChange,
	} = useMessagesContext()

	return (
		<>
			{/* Mobile overlay backdrop */}
			{isSidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/50 md:hidden"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* Sidebar panel */}
			<div
				className={cn(
					"bg-background flex w-full flex-col overflow-hidden border-r md:w-80",
					"fixed inset-y-0 left-0 z-40 md:static md:z-auto",
					isSidebarOpen ? "block" : "hidden md:block"
				)}
			>
				{/* Page header — mobile only */}
				<div className="md:hidden">
					<PageHeader items={[{ label: "Messages" }]} />
				</div>

				{/* Header */}
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
							{/* Controlled trigger — no DialogTrigger wrapper */}
							<Button
								variant="ghost"
								size="icon"
								className="size-7 rounded-full"
								onClick={() => setIsNewChatDialogOpen(true)}
							>
								<Plus className="size-4" />
							</Button>
						</div>
					</div>
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

				{/* Conversations list */}
				<ScrollArea className="flex-1">
					<div className="p-1.5">
						{filteredConversations && filteredConversations.length > 0 ? (
							filteredConversations.map(conversation => {
								const hasUnread = conversation.unreadCount > 0
								return (
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
											{hasUnread && (
												<span className="bg-primary ring-background absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2" />
											)}
										</div>
										<div className="min-w-0 flex-1 overflow-hidden">
											<div className="flex items-center justify-between gap-2">
												<h3
													className={cn(
														"truncate text-sm",
														hasUnread ? "font-semibold" : "font-medium"
													)}
												>
													{conversation.otherUser?.name}
												</h3>
												<span
													className={cn(
														"shrink-0 text-[10px] whitespace-nowrap",
														hasUnread ? "text-primary font-medium" : "text-muted-foreground"
													)}
												>
													{formatTime(conversation.lastMessageTime)}
												</span>
											</div>
											<div className="mt-0.5 flex items-center justify-between gap-2">
												<p
													className={cn(
														"truncate text-xs",
														hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
													)}
												>
													{conversation.lastMessage ?? "No messages yet"}
												</p>
												{hasUnread && (
													<span className="bg-primary text-primary-foreground ml-1 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
														{conversation.unreadCount}
													</span>
												)}
											</div>
										</div>
									</button>
								)
							})
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

			{/* New chat dialog — controlled pattern (no DialogTrigger) */}
			<Dialog open={isNewChatDialogOpen} onOpenChange={handleNewChatDialogOpenChange}>
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
												<p className="text-muted-foreground truncate text-sm">{user.email}</p>
											</div>
										</button>
									))
								) : userSearchQuery.length > 0 ? (
									<p className="text-muted-foreground p-4 text-center text-sm">No users found</p>
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
		</>
	)
}
