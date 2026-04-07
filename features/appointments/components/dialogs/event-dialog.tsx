"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"

import type { CalendarEvent } from "@/core/components/calendar-schedule"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Button } from "@/core/components/ui/button"
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
import { Spinner } from "@/core/components/ui/spinner"
import { Textarea } from "@/core/components/ui/textarea"

import { TimeWheelPicker } from "../schedule/time-wheel-picker"
import { SessionModeSelector } from "../shared/session-mode-selector"
import { SessionTypeSelector } from "../shared/session-type-selector"

// Inline schema following booking-dialog.tsx pattern
const eventDialogSchema = z
	.object({
		serviceType: z.enum(["CONSULTATION", "NOTARIZATION"]),
		workflowType: z.enum(["REN", "IEN"]).optional(),
		hour: z.string(),
		minute: z.string(),
		period: z.enum(["am", "pm"]),
		location: z.string().optional(),
		description: z.string().optional(),
		roomId: z.string().optional(),
	})
	.refine(
		data => {
			// If service type is NOTARIZATION, workflowType is required
			if (data.serviceType === "NOTARIZATION") {
				return !!data.workflowType
			}
			return true
		},
		{
			message: "Session mode is required for notarization",
			path: ["workflowType"],
		}
	)

type EventDialogSchema = z.infer<typeof eventDialogSchema>

interface EventDialogProps {
	event: CalendarEvent | null
	isOpen: boolean
	onClose: () => void
	onSave: (event: CalendarEvent) => void | Promise<void>
	onDelete?: (eventId: string) => Promise<void>
	isSaving?: boolean
	isDeleting?: boolean
}

function constructDate(date: Date, hour: string, minute: string, period: "am" | "pm"): Date {
	let hours = parseInt(hour, 10)
	if (period === "am") {
		hours = hour === "12" ? 0 : hours
	} else {
		hours = hour === "12" ? 12 : hours + 12
	}
	const constructedDate = new Date(date)
	constructedDate.setHours(hours, parseInt(minute, 10), 0, 0)
	return constructedDate
}

// Auto-generate title based on service type and workflow
function generateEventTitle(
	serviceType: "CONSULTATION" | "NOTARIZATION",
	workflowType?: "REN" | "IEN"
): string {
	if (serviceType === "CONSULTATION") {
		return "Consultation"
	}
	if (workflowType === "REN") {
		return "Remote Electronic Notarization"
	}
	if (workflowType === "IEN") {
		return "In-Person Electronic Notarization"
	}
	return "Notarization"
}

export function EventDialog({
	event,
	isOpen,
	onClose,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
}: EventDialogProps) {
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
	const [pendingEvent, setPendingEvent] = useState<CalendarEvent | null>(null)
	const [isConfirmSaving, setIsConfirmSaving] = useState(false)

	const isDialogBusy = Boolean(isSaving || isDeleting || isConfirmSaving)
	const isConfirmPending = Boolean(isSaving || isConfirmSaving)

	useEffect(() => {
		if (!isOpen) {
			setIsConfirmDialogOpen(false)
			setPendingEvent(null)
			setIsConfirmSaving(false)
		}
	}, [isOpen])

	// Map existing event to form values
	const defaultServiceType: "CONSULTATION" | "NOTARIZATION" =
		event?.appointmentType === "CONSULTATION"
			? "CONSULTATION"
			: event?.appointmentType === "NOTARIZATION"
				? "NOTARIZATION"
				: "CONSULTATION"

	const defaultWorkflowType: "REN" | "IEN" | undefined = event?.workflow

	// Extract time from existing event start date
	const existingStart = event?.startAt ?? new Date()
	const defaultHour = format(existingStart, "hh")
	const defaultMinute = format(existingStart, "mm")
	const defaultPeriod = format(existingStart, "a").toLowerCase() as "am" | "pm"

	const form = useForm<EventDialogSchema>({
		resolver: zodResolver(eventDialogSchema),
		defaultValues: {
			serviceType: defaultServiceType,
			workflowType: defaultWorkflowType,
			hour: defaultHour,
			minute: defaultMinute,
			period: defaultPeriod,
			location: (event?.meta?.location as string) ?? "",
			description: event?.description ?? "",
			roomId: (event?.meta?.roomId as string) ?? undefined,
		},
	})

	const watchServiceType = form.watch("serviceType")
	const watchWorkflowType = form.watch("workflowType")

	const handleSave = (values: EventDialogSchema) => {
		if (isDialogBusy) {
			return
		}

		// Use the selected calendar date and combine with time
		const baseDate = event?.startAt ?? new Date()
		const startAt = constructDate(baseDate, values.hour, values.minute, values.period)

		// Generate event title based on service type
		const title = generateEventTitle(values.serviceType, values.workflowType)

		const isNewEvent = !event?.id
		const roomId = isNewEvent
			? `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
			: (values.roomId ?? (event?.meta?.roomId as string | undefined))

		// Store additional data in meta
		const meta: Record<string, unknown> = {
			...(roomId && { roomId }),
			...(values.location && { location: values.location.trim() }),
		}

		const updatedEvent: CalendarEvent = {
			id: event?.id ?? "",
			title,
			description: values.description?.trim() ? values.description.trim() : undefined,
			startAt,
			// No endAt - optional field
			status: event?.status ?? { id: "pending", name: "Pending", color: "#F59E0B" },
			appointmentType: values.serviceType,
			workflow: values.workflowType,
			meta,
		}

		// Show confirmation dialog before saving
		setPendingEvent(updatedEvent)
		setIsConfirmDialogOpen(true)
	}

	const handleConfirmDialogOpenChange = (open: boolean) => {
		if (isConfirmPending && !open) {
			return
		}

		setIsConfirmDialogOpen(open)

		if (!open) {
			setPendingEvent(null)
		}
	}

	const handleConfirmSave = async () => {
		if (!pendingEvent || isConfirmPending) {
			return
		}

		try {
			setIsConfirmSaving(true)
			await onSave(pendingEvent)
			setIsConfirmDialogOpen(false)
			setPendingEvent(null)
		} catch {
			// Parent onSave handles user-facing feedback and keeps the dialog retryable.
		} finally {
			setIsConfirmSaving(false)
		}
	}

	const handleDelete = async () => {
		if (event?.id && onDelete) {
			try {
				await onDelete(event.id)
				onClose()
			} catch {
				// Keep dialog open so users can retry after seeing error feedback
			}
			return
		}
		onClose()
	}

	return (
		<>
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="flex max-h-[90vh] flex-col sm:max-w-150">
					<DialogHeader>
						<DialogTitle>{event?.id ? "Edit Event" : "New Event"}</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSave)}
							className="flex flex-1 flex-col gap-4 overflow-y-auto px-1"
						>
							{/* Service Type Selector */}
							<FormField
								control={form.control}
								name="serviceType"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<SessionTypeSelector
												value={field.value}
												onChange={value => {
													field.onChange(value)
													// Reset workflow type when switching service type
													if (value === "CONSULTATION") {
														form.setValue("workflowType", undefined)
														form.setValue("location", "")
													}
												}}
												showHeading={true}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Session Mode Selector - Only for Notarization */}
							{watchServiceType === "NOTARIZATION" && (
								<FormField
									control={form.control}
									name="workflowType"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<SessionModeSelector
													value={field.value}
													onChange={value => {
														field.onChange(value)
														// Clear location when switching to REN
														if (value === "REN") {
															form.setValue("location", "")
														}
													}}
													showHeading={true}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{/* Date Display (Read-Only) */}
							<div className="space-y-2">
								<FormLabel>Date</FormLabel>
								<div className="border-input bg-muted rounded-md border px-3 py-2 text-sm">
									{event?.startAt ? format(event.startAt, "PPP") : format(new Date(), "PPP")}
								</div>
								<p className="text-muted-foreground text-xs">Date is set by calendar selection</p>
							</div>

							{/* Time Picker */}
							<div className="space-y-2">
								<FormLabel>Time</FormLabel>
								<FormField
									control={form.control}
									name="hour"
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<TimeWheelPicker
													hour={field.value}
													minute={form.watch("minute")}
													period={form.watch("period")}
													onHourChange={field.onChange}
													onMinuteChange={value => form.setValue("minute", value)}
													onPeriodChange={value => form.setValue("period", value)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							{watchServiceType === "NOTARIZATION" && watchWorkflowType === "IEN" && (
								<FormField
									control={form.control}
									name="location"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Location</FormLabel>
											<FormControl>
												<Input placeholder="Enter meeting location" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{/* Description */}
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description (Optional)</FormLabel>
										<FormControl>
											<Textarea placeholder="Add notes or additional details" rows={3} {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter className="mt-4">
								{event?.id && onDelete && (
									<Button
										type="button"
										variant="destructive"
										onClick={() => {
											void handleDelete()
										}}
										className="mr-auto"
										disabled={isDialogBusy}
									>
										{isDeleting ? (
											<>
												<Spinner className="size-4" />
												Deleting...
											</>
										) : (
											"Delete"
										)}
									</Button>
								)}
								<Button type="button" variant="outline" onClick={onClose} disabled={isDialogBusy}>
									Cancel
								</Button>
								<Button type="submit" disabled={isDialogBusy}>
									{isDialogBusy ? (
										<>
											<Spinner className="size-4" />
											Saving...
										</>
									) : (
										"Save"
									)}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			{/* Confirmation Dialog */}
			<AlertDialog open={isConfirmDialogOpen} onOpenChange={handleConfirmDialogOpenChange}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Booking</AlertDialogTitle>
						<AlertDialogDescription>
							Please review your booking details before confirming.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{pendingEvent &&
						(() => {
							const location =
								typeof pendingEvent.meta?.location === "string"
									? pendingEvent.meta.location
									: undefined

							return (
								<div className="space-y-2 py-4">
									<div className="bg-muted space-y-2 rounded-md p-3">
										<div>
											<p className="text-sm font-medium">Event Type</p>
											<p className="text-muted-foreground text-sm">{pendingEvent.title}</p>
										</div>
										<div>
											<p className="text-sm font-medium">Date & Time</p>
											<p className="text-muted-foreground text-sm">
												{format(pendingEvent.startAt, "PPP 'at' p")}
											</p>
										</div>
										{location && (
											<div>
												<p className="text-sm font-medium">Location</p>
												<p className="text-muted-foreground text-sm">{location}</p>
											</div>
										)}
										{pendingEvent.description && (
											<div>
												<p className="text-sm font-medium">Description</p>
												<p className="text-muted-foreground text-sm">{pendingEvent.description}</p>
											</div>
										)}
									</div>
								</div>
							)
						})()}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isConfirmPending}>Cancel</AlertDialogCancel>
						<Button
							type="button"
							onClick={() => void handleConfirmSave()}
							disabled={isConfirmPending}
						>
							{isConfirmPending ? (
								<>
									<Spinner className="size-4" />
									Saving...
								</>
							) : (
								"Confirm Booking"
							)}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
