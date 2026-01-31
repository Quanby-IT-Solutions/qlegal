"use client"

import { format } from "date-fns"
import { CalendarIcon, Clock, FileText, LocateFixed, Video } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import type { CalendarEvent } from "../lib/schedule-types"

interface EventDetailsDialogProps {
	event: CalendarEvent | null
	isOpen: boolean
	onClose: () => void
}

export function EventDetailsDialog({ event, isOpen, onClose }: EventDetailsDialogProps) {
	if (!event) return null

	const isAllDay = event.allDay ?? false
	const eventTypeLabel = event.eventType === "consultation" ? "Consultation" : "Document Signing"
	const modeLabel =
		event.mode === "ren"
			? "Remote Electronic Notarization (REN)"
			: "In-Person Electronic Notarization (IEN)"
	const startTime = format(new Date(event.start), "h:mm a")
	const endTime = format(new Date(event.end), "h:mm a")
	const dateLabel = format(new Date(event.start), "EEEE, MMMM d, yyyy")
	const duration = Math.round(
		(new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60)
	)

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Event Details</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					{/* Title */}
					<div className="space-y-2">
						<h3 className="text-lg font-semibold">{event.title}</h3>
						{event.description && (
							<p className="text-muted-foreground text-sm">{event.description}</p>
						)}
					</div>

					{/* Date and Time */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<CalendarIcon className="h-4 w-4" />
								<span>Date</span>
							</div>
							<p className="text-sm font-medium">{dateLabel}</p>
						</div>
						<div className="space-y-1.5">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<Clock className="h-4 w-4" />
								<span>Time</span>
							</div>
							<p className="text-sm font-medium">
								{isAllDay ? "All day" : `${startTime} - ${endTime}`}
							</p>
						</div>
					</div>

					{/* Event Type */}
					<div className="space-y-1.5">
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<FileText className="h-4 w-4" />
							<span>Event Type</span>
						</div>
						<p className="text-sm font-medium">{eventTypeLabel}</p>
					</div>

					{/* Mode (if available) */}
					{event.mode && (
						<div className="space-y-1.5">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<Video className="h-4 w-4" />
								<span>Mode</span>
							</div>
							<p className="text-sm font-medium">{modeLabel}</p>
						</div>
					)}

					{/* Location (if available) */}
					{event.location && (
						<div className="space-y-1.5">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<LocateFixed className="h-4 w-4" />
								<span>Location</span>
							</div>
							<p className="text-sm font-medium">{event.location}</p>
						</div>
					)}

					{/* Duration */}
					<div className="space-y-1.5">
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<Clock className="h-4 w-4" />
							<span>Duration</span>
						</div>
						<p className="text-sm font-medium">{duration} minutes</p>
					</div>

					{/* Status (if available) */}
					{event.metadata?.status && (
						<div className="space-y-1.5">
							<Badge variant="outline">{event.metadata.status}</Badge>
						</div>
					)}

					{/* Color indicator (if available) */}
					{event.color && (
						<div className="space-y-1.5">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<span>Event Color</span>
								<div
									className={`size-4 rounded-full border-2 ${
										event.color === "sky"
											? "border-sky-500 bg-sky-500"
											: event.color === "amber"
												? "border-amber-500 bg-amber-500"
												: event.color === "violet"
													? "border-violet-500 bg-violet-500"
													: event.color === "rose"
														? "border-rose-500 bg-rose-500"
														: event.color === "emerald"
															? "border-emerald-500 bg-emerald-500"
															: "border-orange-500 bg-orange-500"
									}`}
								/>
							</div>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
