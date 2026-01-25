"use client"

import { useEffect, useState } from "react"
import { format, getDay } from "date-fns"
import { Calendar as CalendarIcon, Link as LinkIcon, Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Calendar } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

import type { CalendarEvent, RecurrenceType } from "../types"
import { eventDialogSchema, type EventDialogSchema } from "./event-dialog.schema"
import { TimeWheelPicker } from "./time-wheel-picker"

interface EventDialogProps {
	event: CalendarEvent | null
	isOpen: boolean
	onClose: () => void
	onSave: (event: CalendarEvent) => void
	onDelete?: (eventId: string) => void
	onGenerateShareLink?: () => void
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const getRecurrenceOptions = (date: Date | undefined): Array<{ value: RecurrenceType; label: string }> => {
	if (!date) {
		return [
			{ value: "does-not-repeat", label: "Does not repeat" },
			{ value: "daily", label: "Daily" },
			{ value: "weekdays", label: "Every weekday (Monday to Friday)" },
			{ value: "custom", label: "Custom..." },
		]
	}

	const dayName = DAYS_OF_WEEK[getDay(date)]

	return [
		{ value: "does-not-repeat", label: "Does not repeat" },
		{ value: "daily", label: "Daily" },
		{ value: "weekly", label: `Weekly on ${dayName}` },
		{ value: "monthly", label: `Monthly on ${dayName}` },
		{ value: "annually", label: `Annually on ${format(date, "MMMM d")}` },
		{ value: "weekdays", label: "Every weekday (Monday to Friday)" },
		{ value: "custom", label: "Custom..." },
	]
}

const TIMEZONES = [
	"UTC-12",
	"UTC-11",
	"UTC-10",
	"UTC-9",
	"UTC-8",
	"UTC-7",
	"UTC-6",
	"UTC-5",
	"UTC-4",
	"UTC-3",
	"UTC-2",
	"UTC-1",
	"UTC",
	"UTC+1",
	"UTC+2",
	"UTC+3",
	"UTC+4",
	"UTC+5",
	"UTC+6",
	"UTC+7",
	"UTC+8",
	"UTC+9",
	"UTC+10",
	"UTC+11",
	"UTC+12",
]

// Helper function to construct a Date from date, hour, minute, and period
const constructDate = (date: Date, hour: string, minute: string, period: "am" | "pm"): Date => {
	let h = Number.parseInt(hour, 10)
	if (period === "pm" && h !== 12) {
		h += 12
	} else if (period === "am" && h === 12) {
		h = 0
	}

	const newDate = new Date(date)
	newDate.setHours(h, Number.parseInt(minute, 10), 0, 0)
	return newDate
}

export function EventDialog({
	event,
	isOpen,
	onClose,
	onSave,
	onDelete,
	onGenerateShareLink,
}: EventDialogProps) {
	const [dateRangeOpen, setDateRangeOpen] = useState(false)

	const form = useForm<EventDialogSchema>({
		resolver: zodResolver(eventDialogSchema),
		defaultValues: {
			title: event?.title || "",
			description: event?.description || "",
			allDay: false,
			dateRange: {
				from: event?.start || new Date(),
				to: event?.end || new Date(),
			},
			startHour: event?.start ? String(new Date(event.start).getHours() % 12 || 12).padStart(2, "0") : "09",
			startMinute: event?.start ? String(new Date(event.start).getMinutes()).padStart(2, "0") : "00",
			startPeriod: event?.start && new Date(event.start).getHours() >= 12 ? "pm" : "am",
			endHour: event?.end ? String(new Date(event.end).getHours() % 12 || 12).padStart(2, "0") : "10",
			endMinute: event?.end ? String(new Date(event.end).getMinutes()).padStart(2, "0") : "00",
			endPeriod: event?.end && new Date(event.end).getHours() >= 12 ? "pm" : "am",
			timezone: event?.metadata?.timezone || "UTC",
			color: event?.color || "sky",
			recurrence: event?.recurrence || "does-not-repeat",
			eventType: event?.eventType || "consultation",
			mode: event?.mode || undefined,
			location: event?.location || "",
			guests: event?.guests || [],
		},
	})

	// Watch form values to update recurrence options dynamically
	const watchAllDay = form.watch("allDay")
	const watchDateRange = form.watch("dateRange")
	const watchEventType = form.watch("eventType")
	const watchMode = form.watch("mode")

	const recurrenceOptions = getRecurrenceOptions(watchDateRange?.from)

	const {
		fields: guestFields,
		append: appendGuest,
		remove: removeGuest,
	} = useFieldArray({
		control: form.control,
		name: "guests",
	})

	// Reset form when event changes
	useEffect(() => {
		if (event) {
			form.reset({
				title: event.title || "",
				description: event.description || "",
				allDay: event.allDay || false,
				dateRange: {
					from: new Date(event.start),
					to: new Date(event.end),
				},
				startHour: String(new Date(event.start).getHours() % 12 || 12).padStart(2, "0"),
				startMinute: String(new Date(event.start).getMinutes()).padStart(2, "0"),
				startPeriod: new Date(event.start).getHours() >= 12 ? "pm" : "am",
				endHour: String(new Date(event.end).getHours() % 12 || 12).padStart(2, "0"),
				endMinute: String(new Date(event.end).getMinutes()).padStart(2, "0"),
				endPeriod: new Date(event.end).getHours() >= 12 ? "pm" : "am",
				timezone: event.metadata?.timezone || "UTC",
				color: event.color || "sky",
				recurrence: event.recurrence || "does-not-repeat",
				eventType: event.eventType || "consultation",
				mode: event.mode || undefined,
				location: event.location || "",
				guests: event.guests || [],
			})
		} else {
			form.reset({
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
				guests: [],
			})
		}
	}, [event, form])

	const handleSave = (values: EventDialogSchema) => {
		let start: Date
		let end: Date

		if (values.allDay) {
			// For all-day events, set start to midnight and end to end of day
			start = new Date(values.dateRange.from)
			start.setHours(0, 0, 0, 0)
			end = new Date(values.dateRange.to)
			end.setHours(23, 59, 59, 999)
		} else {
			// Construct dates from time fields
			start = constructDate(values.dateRange.from, values.startHour!, values.startMinute!, values.startPeriod!)
			end = constructDate(values.dateRange.to, values.endHour!, values.endMinute!, values.endPeriod!)
		}

		const updatedEvent: CalendarEvent = {
			id: event?.id || "",
			title: values.title.trim(),
			description: values.description?.trim() || undefined,
			start,
			end,
			allDay: values.allDay,
			color: values.color,
			location: values.location?.trim() || undefined,
			recurrence: values.recurrence,
			eventType: values.eventType,
			mode: values.mode,
			guests: values.guests.length > 0 ? values.guests : undefined,
			metadata: {
				...event?.metadata,
				timezone: values.timezone,
			},
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
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{event?.id ? "Edit Event" : "New Event"}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
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

						{/* All Day Checkbox */}
						<FormField
							control={form.control}
							name="allDay"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3 space-y-0">
									<FormControl>
										<Checkbox checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<FormLabel className="cursor-pointer pt-1">All day</FormLabel>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Date Range Picker */}
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
								<div className="grid grid-cols-2 gap-4 items-start">
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
											hour={form.watch("startHour") || "09"}
											minute={form.watch("startMinute") || "00"}
											period={form.watch("startPeriod") || "am"}
											onHourChange={value => form.setValue("startHour", value)}
											onMinuteChange={value => form.setValue("startMinute", value)}
											onPeriodChange={value => form.setValue("startPeriod", value)}
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
											hour={form.watch("endHour") || "10"}
											minute={form.watch("endMinute") || "00"}
											period={form.watch("endPeriod") || "am"}
											onHourChange={value => form.setValue("endHour", value)}
											onMinuteChange={value => form.setValue("endMinute", value)}
											onPeriodChange={value => form.setValue("endPeriod", value)}
										/>
									</div>

									{/* Timezone - Same row as time pickers */}
									<FormField
										control={form.control}
										name="timezone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Timezone</FormLabel>
												<Select onValueChange={field.onChange} defaultValue={field.value}>
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

						{/* Guests */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<FormLabel>Guests</FormLabel>
								{onGenerateShareLink && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={onGenerateShareLink}
										className="gap-2"
									>
										<LinkIcon className="size-4" />
										Share Link
									</Button>
								)}
							</div>
							{guestFields.length === 0 && (
								<p className="text-muted-foreground text-sm">No guests added</p>
							)}
							<div className="space-y-2">
								{guestFields.map((field, index) => (
									<div key={field.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
										<FormField
											control={form.control}
											name={`guests.${index}.name`}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input placeholder="Guest name" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name={`guests.${index}.email`}
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input placeholder="Email address" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => removeGuest(index)}
											className="mt-0"
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								))}
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => appendGuest({ name: "", email: "" })}
								className="w-full"
							>
								<Plus className="mr-2 size-4" />
								Add Guest
							</Button>
						</div>

						{/* Event Type */}
						<FormField
							control={form.control}
							name="eventType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Event Type</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
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
								cancel
							</Button>
							<Button type="submit">Save</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
