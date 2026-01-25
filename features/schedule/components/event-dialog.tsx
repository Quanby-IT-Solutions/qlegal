"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/core/lib/utils"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { Calendar } from "@/core/components/ui/calendar"
import { TimeWheelPicker } from "@/features/schedule/components/time-wheel-picker"

import type { CalendarEvent } from "@/features/schedule/types"
import { eventDialogSchema, type EventDialogSchema } from "./event-dialog.schema"

const TIMEZONES = [
	"UTC",
	"America/New_York",
	"America/Chicago",
	"America/Los_Angeles",
	"America/Denver",
	"America/Phoenix",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"Asia/Tokyo",
	"Asia/Shanghai",
	"Asia/Singapore",
	"Australia/Sydney",
] as const

interface EventDialogProps {
	event: CalendarEvent | null
	isOpen: boolean
	onClose: () => void
	onSave: (event: CalendarEvent) => void
	onDelete?: (eventId: string) => void
}

function constructDate(
	date: Date,
	hour: string,
	minute: string,
	period: "am" | "pm"
): Date {
	const hours =
		period === "am"
			? hour === "12"
				? 0
				: parseInt(hour, 10)
			: parseInt(hour, 10) + 12
	const constructedDate = new Date(date)
	constructedDate.setHours(hours)
	constructedDate.setMinutes(parseInt(minute, 10))
	constructedDate.setSeconds(0)
	constructedDate.setMilliseconds(0)
	return constructedDate
}

export function EventDialog({
	event,
	isOpen,
	onClose,
	onSave,
	onDelete,
}: EventDialogProps) {
	const [dateRangeOpen, setDateRangeOpen] = useState(false)

	const form = useForm<EventDialogSchema>({
		resolver: zodResolver(eventDialogSchema),
		defaultValues: {
			title: "",
			description: "",
			allDay: false,
			dateRange: {
				from: new Date(),
				to: new Date(),
			},
			startHour: "09",
			startMinute: "00",
			startPeriod: "am",
			endHour: "10",
			endMinute: "00",
			endPeriod: "am",
			timezone: "UTC",
			color: "sky",
			recurrence: "does-not-repeat",
			eventType: "consultation",
			mode: undefined,
			location: "",
		},
	})

	const watchAllDay = form.watch("allDay")
	const watchEventType = form.watch("eventType")
	const watchMode = form.watch("mode")

	const ROOM_ID_PREFIX = "room-"

	const handleSave = (values: EventDialogSchema) => {
		let start: Date
		let end: Date

		if (values.allDay) {
			start = new Date(values.dateRange.from)
			start.setHours(0, 0, 0, 0)
			end = new Date(values.dateRange.to)
			end.setHours(23, 59, 59, 999)
		} else {
			start = constructDate(
				values.dateRange.from,
				values.startHour!,
				values.startMinute!,
				values.startPeriod!
			)
			end = constructDate(
				values.dateRange.to,
				values.endHour!,
				values.endMinute!,
				values.endPeriod!
			)
		}

		const isNewEvent = !event?.id
		const roomId = isNewEvent
			? `${ROOM_ID_PREFIX}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
			: undefined

		const updatedEvent: CalendarEvent = {
			id: event?.id ?? "",
			title: values.title.trim(),
			description: values.description?.trim() ?? undefined,
			start,
			end,
			allDay: values.allDay,
			color: values.color,
			location: values.location?.trim() ?? undefined,
			recurrence: values.recurrence,
			eventType: values.eventType,
			mode: values.mode,
			metadata: {
				...event?.metadata,
				timezone: values.timezone,
				...(isNewEvent && roomId && { roomId }),
			},
		}

		onSave(updatedEvent)
	}

	const handleDelete = () => {
		if (event?.id && onDelete) {
			onDelete(event.id)
		}
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{event?.id ? "Edit Event" : "New Event"}</DialogTitle>
				</DialogHeader>

				<Form {...form} key={event?.id ?? "new"}>
					<form
						onSubmit={form.handleSubmit(handleSave)}
						className="flex-1 space-y-4 overflow-y-auto px-1"
					>
						{/* Title */}
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title</FormLabel>
									<FormControl>
										<Input placeholder="Event title" autoFocus {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Description */}
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea placeholder="Add description" rows={3} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Duration */}
						<FormField
							control={form.control}
							name="allDay"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Duration</FormLabel>
									<Select
										onValueChange={value => field.onChange(value === "Time Range")}
										defaultValue={field.value ? "Time Range" : "All Day"}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select duration" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="Time Range">Time Range</SelectItem>
											<SelectItem value="All Day">All Day</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Date Range */}
						<FormField
							control={form.control}
							name="dateRange"
							render={({ field }) => (
								<FormItem className="flex flex-col gap-2">
									<FormLabel>Date Range</FormLabel>
									<Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.value && "text-muted-foreground"
													)}
												>
													<CalendarIcon className="mr-2 size-4" />
													{field.value?.from && field.value?.to ? (
														<>
															{format(field.value.from, "PPP")} - {format(field.value.to, "PPP")}
														</>
													) : (
														<span>Pick a date range</span>
													)}
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="range"
												selected={field.value}
												onSelect={value => {
													field.onChange(value)
													setDateRangeOpen(false)
												}}
												initialFocus
												numberOfMonths={2}
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Time Selection - Only when not all day */}
						{!watchAllDay && (
							<div className="space-y-4">
								<div className="grid grid-cols-[1fr_1fr_auto] items-center gap-4">
									<div>
										<FormLabel>Start Time</FormLabel>
										<FormField
											control={form.control}
											name="startHour"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="hidden" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="startMinute"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="hidden" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="startPeriod"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="hidden" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
										<TimeWheelPicker
											hour={form.watch("startHour") ?? "09"}
											minute={form.watch("startMinute") ?? "00"}
											period={form.watch("startPeriod") ?? "am"}
											onHourChange={(value: string) => form.setValue("startHour", value)}
											onMinuteChange={(value: string) => form.setValue("startMinute", value)}
											onPeriodChange={(value: "am" | "pm") => form.setValue("startPeriod", value)}
										/>
									</div>

									<div>
										<FormLabel>End Time</FormLabel>
										<FormField
											control={form.control}
											name="endHour"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="hidden" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="endMinute"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="hidden" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="endPeriod"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input type="hidden" {...field} />
													</FormControl>
												</FormItem>
											)}
										/>
										<TimeWheelPicker
											hour={form.watch("endHour") ?? "10"}
											minute={form.watch("endMinute") ?? "00"}
											period={form.watch("endPeriod") ?? "am"}
											onHourChange={(value: string) => form.setValue("endHour", value)}
											onMinuteChange={(value: string) => form.setValue("endMinute", value)}
											onPeriodChange={(value: "am" | "pm") => form.setValue("endPeriod", value)}
										/>
									</div>

									{/* Timezone - Below time pickers */}
									<FormField
										control={form.control}
										name="timezone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Timezone</FormLabel>
												<Select onValueChange={(value: string) => field.onChange(value)} defaultValue={field.value}>
													<FormControl>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{TIMEZONES.map(tz => (
															<SelectItem key={tz} value={tz}>
																{tz}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>
						)}

						{/* Event Type */}
						<FormField
							control={form.control}
							name="eventType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Event Type</FormLabel>
									<Select onValueChange={(value: string) => field.onChange(value)} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="consultation">Consultation</SelectItem>
											<SelectItem value="notarization">Notarization</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Mode - Only for notarization */}
						{watchEventType === "notarization" && (
							<FormField
								control={form.control}
								name="mode"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Mode</FormLabel>
										<Select
											onValueChange={value => field.onChange(value as "ren" | "ien")}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="ren">Remote Electronic Notarization (REN)</SelectItem>
												<SelectItem value="ien">In-Person Electronic Notarization (IEN)</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Location - Only for IEN mode */}
						{watchMode === "ien" && (
							<FormField
								control={form.control}
								name="location"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Location</FormLabel>
										<FormControl>
											<Input placeholder="Add location" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<DialogFooter>
							{event?.id && onDelete && (
								<Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
									Delete
								</Button>
							)}
							<Button type="button" variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit">Save</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
