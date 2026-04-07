"use client"

import { MessagesChatArea } from "@/features/messages/components/messages-chat-area"
import { MessagesSidebar } from "@/features/messages/components/messages-sidebar"
import { MessagesProvider, useMessagesContext } from "@/features/messages/context/messages-context"

function MessagesContent() {
	const { loadingConversations } = useMessagesContext()

	if (loadingConversations) {
		return (
			<div className="bg-background flex h-svh max-h-svh">
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
		<div className="bg-background flex h-svh max-h-svh flex-col overflow-hidden md:flex-row">
			<div className="flex w-full flex-1 overflow-hidden">
				<MessagesSidebar />
				<MessagesChatArea />
			</div>
		</div>
	)
}

export function MessagesView() {
	return (
		<MessagesProvider>
			<MessagesContent />
		</MessagesProvider>
	)
}
