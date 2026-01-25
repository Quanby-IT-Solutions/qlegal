"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"

import type { CalendarEvent } from "../types"

interface EventDialogProps {
	event: CalendarEvent | null
	isOpen: boolean
	onClose: () => void
	onSave: (event: CalendarEvent) => void
	onDelete?: (eventId: string) => void
}

export function EventDialog({ event, isOpen, onClose, onSave, onDelete }: EventDialogProps) {
	const [title, setTitle] = useState(event?.title || "")
	const [description, setDescription] = useState(event?.description || "")
	const [location, setLocation] = useState(event?.location || "")
	const [color, setColor] = useState(event?.color || "sky")
	const [allDay, setAllDay] = useState(event?.allDay || false)

	// Update form when event changes
	useEffect(() => {
		setTitle(event?.title || "")
		setDescription(event?.description || "")
		setLocation(event?.location || "")
		setColor(event?.color || "sky")
		setAllDay(event?.allDay || false)
	}, [event])

	const handleSave = () => {
		if (!title.trim()) return

		const updatedEvent: CalendarEvent = {
			id: event?.id || "",
			title: title.trim(),
			description: description.trim() || undefined,
			start: event?.start || new Date(),
			end: event?.end || new Date(),
			allDay,
			color: color as any,
			location: location.trim() || undefined,
			metadata: event?.metadata,
		}

		onSave(updatedEvent)
	}

	const handleDelete = () => {
		if (event?.id && onDelete) {
			onDelete(event.id)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{event?.id ? "Edit Event" : "New Event"}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="title">Title</Label>
						<Input
							id="title"
							value={title}
							onChange={e => setTitle(e.target.value)}
							placeholder="Event title"
							autoFocus
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="allDay"
							checked={allDay}
							onCheckedChange={checked => setAllDay(checked as boolean)}
						/>
						<Label htmlFor="allDay" className="cursor-pointer">
							All day
						</Label>
					</div>

					{!allDay && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="start">Start</Label>
								<Input
									id="start"
									type="datetime-local"
									value={event?.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : ""}
									onChange={e => {
										if (event) {
											event.start = new Date(e.target.value)
										}
									}}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="end">End</Label>
								<Input
									id="end"
									type="datetime-local"
									value={event?.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : ""}
									onChange={e => {
										if (event) {
											event.end = new Date(e.target.value)
										}
									}}
								/>
							</div>
						</div>
					)}

					{allDay && event?.start && event?.end && (
						<div className="text-muted-foreground text-sm">
							{format(new Date(event.start), "MMM d, yyyy")} -{" "}
							{format(new Date(event.end), "MMM d, yyyy")}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="location">Location</Label>
						<Input
							id="location"
							value={location}
							onChange={e => setLocation(e.target.value)}
							placeholder="Add location"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={e => setDescription(e.target.value)}
							placeholder="Add description"
							rows={3}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="color">Color</Label>
						<Select value={color} onValueChange={setColor}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="sky">Blue</SelectItem>
								<SelectItem value="emerald">Green</SelectItem>
								<SelectItem value="amber">Yellow</SelectItem>
								<SelectItem value="orange">Orange</SelectItem>
								<SelectItem value="rose">Red</SelectItem>
								<SelectItem value="violet">Purple</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					{event?.id && onDelete && (
						<Button variant="destructive" onClick={handleDelete} className="mr-auto">
							Delete
						</Button>
					)}
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
