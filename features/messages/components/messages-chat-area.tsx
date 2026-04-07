"use client"

import React from "react"
import { differenceInMinutes, format, isToday, isYesterday } from "date-fns"
import {
	CalendarPlus,
	ChevronLeft,
	Info,
	MessageSquare,
	Paperclip,
	Send,
	Smile,
} from "lucide-react"

import { Chat } from "@/core/components/chat"
import { KycRequiredDialog } from "@/core/components/kyc-required-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

import { EventDialog } from "@/features/appointments/components/dialogs/event-dialog"
import {
	ConsultationRequestCard,
	type ConsultationRequestMetadata,
} from "@/features/messages/components/consultation-request-card"
import { FileUploadPanel } from "@/features/messages/components/file-upload-panel"
import { MessageContent } from "@/features/messages/components/message-content"
import { useMessagesContext } from "@/features/messages/context/messages-context"

function EmptyConversationState() {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="text-center">
				<MessageSquare className="text-muted-foreground mx-auto mb-2 size-8" />
				<p className="text-muted-foreground text-xs">No messages yet</p>
				<p className="text-muted-foreground mt-1 text-[10px]">
					Start the conversation by sending a message
				</p>
			</div>
		</div>
	)
}

export function MessagesChatArea() {
	const inputRef = React.useRef<HTMLInputElement>(null)

	const {
		session,
		activeParticipant,
		isDraftConversation,
		messages,
		loadingMessages,
		isOtherUserTyping,
		messageInput,
		handleInputChange,
		handleSendMessage,
		isSendingTextMessage,
		isSendingConsultationRequest,
		selectedConversationId,
		selectedConversation,
		messagesEndRef,
		setIsSidebarOpen,
		isParticipantPanelOpen,
		setIsParticipantPanelOpen,
		isBookingModalOpen,
		setIsBookingModalOpen,
		kycBookingBlockOpen,
		setKycBookingBlockOpen,
		handleBookConsultationSave,
		isEnpConsultationBookingBlocked,
		panelParticipant,
	} = useMessagesContext()

	const otherUserLastReadAt =
		(selectedConversation?.otherUserLastReadAt as Date | null | undefined) ?? null
	const lastSeenByOtherIndex =
		otherUserLastReadAt && messages
			? [...messages].reduce<number>(
					(lastIdx, msg, i) =>
						new Date(msg.createdAt) <= new Date(otherUserLastReadAt) ? i : lastIdx,
					-1
				)
			: -1

	return (
		<>
			{activeParticipant ? (
				<>
					{/* Main chat column */}
					<div className="flex w-full flex-1 flex-col overflow-hidden">
						{/* Chat header */}
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

						{/* Messages area */}
						<div className="flex-1 overflow-y-auto p-3 pb-1">
							{isDraftConversation ? (
								<EmptyConversationState />
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
											prevMessage?.senderId !== message.senderId ||
											differenceInMinutes(
												new Date(message.createdAt),
												new Date(prevMessage.createdAt)
											) >= 10

										const isLastInSequence =
											nextMessage?.senderId !== message.senderId ||
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
												{index === lastSeenByOtherIndex && otherUserLastReadAt && (
													<div className="mt-2 mb-0.5 flex justify-end pr-1">
														<Tooltip>
															<TooltipTrigger asChild>
																<Avatar className="size-3 cursor-default">
																	<AvatarImage src={activeParticipant.image ?? undefined} />
																	<AvatarFallback className="bg-primary text-primary-foreground text-[6px]">
																		{activeParticipant.name
																			?.split(" ")
																			.map(n => n[0])
																			.join("")}
																	</AvatarFallback>
																</Avatar>
															</TooltipTrigger>
															<TooltipContent side="left">
																<p className="text-xs">
																	Seen by {activeParticipant.name}{" "}
																	{isToday(new Date(otherUserLastReadAt))
																		? `at ${format(new Date(otherUserLastReadAt), "p")}`
																		: isYesterday(new Date(otherUserLastReadAt))
																			? `Yesterday at ${format(new Date(otherUserLastReadAt), "p")}`
																			: format(new Date(otherUserLastReadAt), "EEE 'at' p")}
																</p>
															</TooltipContent>
														</Tooltip>
													</div>
												)}
											</React.Fragment>
										)
									})}
									{isOtherUserTyping && (
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
								<EmptyConversationState />
							)}
						</div>

						{/* Message input */}
						<div className="shrink-0 border-t p-2.5">
							<div className="flex items-center gap-1.5">
								<Button variant="ghost" size="icon" className="hidden size-7 rounded-full sm:flex">
									<Paperclip className="size-4" />
								</Button>
								<div className="relative flex-1">
									<Input
										ref={inputRef}
										placeholder="Type a message..."
										value={messageInput}
										onChange={handleInputChange}
										className="h-9 pr-8 text-sm"
										onKeyDown={e => {
											if (e.key === "Enter" && messageInput.trim()) {
												void handleSendMessage().then(() => inputRef.current?.focus())
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
									onClick={() => void handleSendMessage().then(() => inputRef.current?.focus())}
								>
									<Send className="size-4" />
								</Button>
							</div>
						</div>
					</div>

					{/* Secondary sidebar — participant/file panel, desktop */}
					<div className="hidden lg:flex">
						<FileUploadPanel
							conversationId={selectedConversationId ?? ""}
							participant={panelParticipant}
						/>
					</div>

					{/* Secondary sidebar — mobile overlay */}
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

			{/* Dialogs — portaled so DOM position is irrelevant */}
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
		</>
	)
}
