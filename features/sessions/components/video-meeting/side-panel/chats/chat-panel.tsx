"use client"

import { useMemo, useState, type FormEvent } from "react"
import { MessageSquare, Send } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/core/components/ui/sheet"
import { useIsMobile } from "@/core/hooks/use-mobile"

export type ChatMessage = {
	id: string
	message: string
	senderName: string
	timestamp: number
	senderId?: string
}

interface ChatPanelProps {
	open: boolean
	messages: ChatMessage[]
	currentParticipantId?: string | null
	onSendMessage: (message: string) => void
	onOpenChange?: (open: boolean) => void
}

export function ChatPanel({
	open,
	messages,
	currentParticipantId,
	onSendMessage,
	onOpenChange,
}: ChatPanelProps) {
	const isMobile = useIsMobile()
	const [draft, setDraft] = useState("")

	const sortedMessages = useMemo(
		() => [...messages].sort((a, b) => a.timestamp - b.timestamp),
		[messages]
	)

	const handleSend = (e: FormEvent) => {
		e.preventDefault()
		const text = draft.trim()
		if (!text) return
		onSendMessage(text)
		setDraft("")
	}

	if (!open) return null

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent side="right" className="w-[20rem] p-0">
					<SheetHeader className="sr-only">
						<SheetTitle>Meeting Chat</SheetTitle>
					</SheetHeader>
					<div className="flex h-full min-h-0 flex-col">
						<div className="border-b px-4 py-3">
							<div className="flex items-center gap-2 text-sm font-semibold">
								<MessageSquare className="size-4" />
								<span>Meeting Chat</span>
							</div>
						</div>
						<div className="flex min-h-0 flex-1 flex-col">
							<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
								{sortedMessages.length === 0 ? (
									<p className="text-muted-foreground text-sm">No messages yet.</p>
								) : (
									sortedMessages.map(item => {
										const isSelf = item.senderId && currentParticipantId === item.senderId
										return (
											<div key={item.id} className="bg-muted/60 rounded-lg border px-3 py-2">
												<p className="text-xs font-medium">{isSelf ? "You" : item.senderName}</p>
												<p className="text-sm">{item.message}</p>
											</div>
										)
									})
								)}
							</div>
							<form onSubmit={handleSend} className="border-t p-2.5">
								<div className="flex items-center gap-2">
									<Input
										value={draft}
										onChange={e => setDraft(e.target.value)}
										placeholder="Type a message"
										className="min-h-9 py-2 text-sm"
									/>
									<Button
										type="submit"
										size="icon"
										disabled={!draft.trim()}
										className="size-9 shrink-0"
									>
										<Send className="size-4" />
									</Button>
								</div>
							</form>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		)
	}

	return (
		<aside className="bg-background hidden w-[20rem] shrink-0 border-l md:flex md:min-h-0 md:flex-col">
			<div className="border-b px-4 py-3">
				<div className="flex items-center gap-2 text-sm font-semibold">
					<MessageSquare className="size-4" />
					<span>Meeting Chat</span>
				</div>
			</div>
			<div className="flex min-h-0 flex-1 flex-col">
				<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
					{sortedMessages.length === 0 ? (
						<p className="text-muted-foreground text-sm">No messages yet.</p>
					) : (
						sortedMessages.map(item => {
							const isSelf = item.senderId && currentParticipantId === item.senderId
							return (
								<div key={item.id} className="bg-muted/60 rounded-lg border px-3 py-2">
									<p className="text-xs font-medium">{isSelf ? "You" : item.senderName}</p>
									<p className="text-sm">{item.message}</p>
								</div>
							)
						})
					)}
				</div>
				<form onSubmit={handleSend} className="border-t p-2.5">
					<div className="flex items-center gap-2">
						<Input
							value={draft}
							onChange={e => setDraft(e.target.value)}
							placeholder="Type a message"
							className="min-h-9 py-2 text-sm"
						/>
						<Button type="submit" size="icon" disabled={!draft.trim()} className="size-9 shrink-0">
							<Send className="size-4" />
						</Button>
					</div>
				</form>
			</div>
		</aside>
	)
}
