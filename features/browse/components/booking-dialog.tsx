"use client"

import { type Route } from "next"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2, Video } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { TimeWheelPicker } from "@/features/appointments/components/schedule/time-wheel-picker"
import { SessionModeSelector } from "@/features/appointments/components/shared/session-mode-selector"
import { SessionTypeSelector } from "@/features/appointments/components/shared/session-type-selector"
import {
	bookingDialogSchema,
	type BookingDialogSchema,
} from "@/features/browse/components/booking-dialog.schema"
import { convertTo24Hour } from "@/features/browse/lib/time-utils"

interface BookingDialogProps {
	enpId: string
	enpName?: string | null
	trigger?: React.ReactNode
}

export function BookingDialog({ enpId, enpName, trigger }: BookingDialogProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [dateOpen, setDateOpen] = useState(false)

	// Form state
	const form = useForm<BookingDialogSchema>({
		resolver: zodResolver(bookingDialogSchema),
		defaultValues: {
			bookingMode: "CONSULTATION",
			workflowType: undefined,
			selectedDate: new Date(),
			hour: "09",
			minute: "00",
			period: "am" as const,
			description: "",
		},
	})

	const watchBookingMode = form.watch("bookingMode")
	const watchSelectedDate = form.watch("selectedDate")

	// Book consultation mutation
	const bookConsultationMutation = trpc.browse.bookConsultation.useMutation({
		onSuccess: () => {
			toast.success("Consultation Booked!", {
				description:
					"Your consultation request has been sent. The ENP will review and confirm your booking.",
			})
			closeDialog()
			router.push("/sessions" as Route)
		},
		onError: error => {
			toast.error("Booking Failed", {
				description: error.message || "Failed to book consultation. Please try again.",
			})
		},
	})

	// Book signing session mutation
	const bookSigningMutation = trpc.appointments.createAppointment.useMutation({
		onSuccess: () => {
			toast.success("Signing session booked!")
			closeDialog()
			router.push("/sessions" as Route)
		},
		onError: error => {
			toast.error("Booking failed", {
				description: error.message || "Failed to book signing session. Please try again.",
			})
		},
	})

	const closeDialog = () => {
		setOpen(false)
		form.reset()
	}

	function constructDate(date: Date, hour: string, minute: string, period: "am" | "pm"): Date {
		const hours =
			period === "am" ? (hour === "12" ? 0 : parseInt(hour, 10)) : parseInt(hour, 10) + 12
		const constructedDate = new Date(date)
		constructedDate.setHours(hours)
		constructedDate.setMinutes(parseInt(minute, 10))
		constructedDate.setSeconds(0)
		constructedDate.setMilliseconds(0)
		return constructedDate
	}

	const handleBooking = async (values: BookingDialogSchema) => {
		const { bookingMode, selectedDate, hour, minute, period, description, workflowType } = values

		if (!selectedDate) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		const time24 = convertTo24Hour(hour ?? "09", minute ?? "00", period ?? "am")

		if (bookingMode === "CONSULTATION") {
			// For consultation, we don't pass workflowType - it's only for NOTARIZATION
			const [hours, minutes] = time24.split(":").map(Number)
			const appointmentDate = new Date(selectedDate)
			appointmentDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)

			await bookConsultationMutation.mutateAsync({
				enpId,
				workflowType: undefined, // No workflow type for consultations
				appointmentDate,
				appointmentTime: time24,
				consultationType: "INITIAL",
				meetingPreference: undefined,
				specialRequirements: description?.trim() ?? undefined,
				location: undefined,
			})
		} else {
			// For notarization, workflowType must be set
			if (!workflowType) {
				toast.error("Missing Information", {
					description: "Please select a session mode to continue.",
				})
				return
			}

			const appointmentDate = constructDate(
				selectedDate,
				hour ?? "09",
				minute ?? "00",
				period ?? "am"
			)

			await bookSigningMutation.mutateAsync({
				enpId,
				title: enpName ? `Notarization with ${enpName}` : "Notarization Session",
				type: "NOTARIZATION",
				appointmentDate,
				duration: workflowType === "REN" ? 45 : 60,
				modeOfNotarization: workflowType,
				description: description?.trim() ?? undefined,
				location: workflowType === "IEN" ? "In-person location to be confirmed" : undefined,
			})
		}
	}

	const isBookingPending = bookConsultationMutation.isPending || bookSigningMutation.isPending
	const isSubmitDisabled = !form.watch("selectedDate") || isBookingPending

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger ?? <Button>Book Session</Button>}</DialogTrigger>
			<DialogContent className="flex h-[85vh] max-h-[90vh] w-screen max-w-350 flex-col">
				<DialogHeader>
					<DialogTitle>
						{watchBookingMode === "CONSULTATION" ? "Book Consultation" : "Book Notarization"}
						{enpName ? ` with ${enpName}` : ""}
					</DialogTitle>
					<DialogDescription>
						{watchBookingMode === "CONSULTATION"
							? "Schedule a consultation with an Electronic Notary Public for your notarization needs."
							: "Book a notarization session with an Electronic Notary Public for your documents."}
					</DialogDescription>
				</DialogHeader>

				<Form {...form} key={open ? "booking-form" : "closed"}>
					<form
						onSubmit={form.handleSubmit(handleBooking)}
						className="flex flex-1 flex-col overflow-hidden"
					>
						{/* Scrollable form content */}
						<div className="flex-1 overflow-y-auto px-1">
							<div className="space-y-2 pr-1 pb-6">
								{/* Service Type Selection */}
								<FormField
									control={form.control}
									name="bookingMode"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-base font-medium">Service Type</FormLabel>
											<FormControl>
												<SessionTypeSelector
													value={field.value}
													onChange={field.onChange}
													showHeading={false}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Session Mode Selection - Only for NOTARIZATION */}
								{watchBookingMode === "NOTARIZATION" && (
									<FormField
										control={form.control}
										name="workflowType"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-base font-medium">Session Mode</FormLabel>
												<FormControl>
													<div className="space-y-2">
														<SessionModeSelector
															value={field.value}
															onChange={field.onChange}
															showHeading={false}
														/>
													</div>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								{/* Date Selection */}
								<FormField
									control={form.control}
									name="selectedDate"
									render={({ field }) => (
										<FormItem className="flex flex-col gap-2">
											<FormLabel className="text-base font-medium">Date</FormLabel>
											<Popover open={dateOpen} onOpenChange={setDateOpen}>
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
															{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
														</Button>
													</FormControl>
												</PopoverTrigger>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={field.value}
														onSelect={value => {
															field.onChange(value ?? new Date())
															setDateOpen(false)
														}}
														initialFocus
														disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
													/>
												</PopoverContent>
											</Popover>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Time Selection */}
								{watchSelectedDate && (
									<div className="space-y-4">
										<div>
											<label className="text-base font-medium">Time</label>
										</div>
										<FormField
											control={form.control}
											name="hour"
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<div>
															<FormField
																control={form.control}
																name="minute"
																render={({ field: minuteField }) => (
																	<FormItem>
																		<FormControl>
																			<Input type="hidden" {...minuteField} />
																		</FormControl>
																	</FormItem>
																)}
															/>
															<FormField
																control={form.control}
																name="period"
																render={({ field: periodField }) => (
																	<FormItem>
																		<FormControl>
																			<Input type="hidden" {...periodField} />
																		</FormControl>
																	</FormItem>
																)}
															/>
															<TimeWheelPicker
																hour={field.value ?? "09"}
																minute={form.watch("minute") ?? "00"}
																period={form.watch("period") ?? "am"}
																onHourChange={field.onChange}
																onMinuteChange={value => form.setValue("minute", value)}
																onPeriodChange={value => form.setValue("period", value)}
																disabled={isBookingPending}
															/>
														</div>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								)}

								{/* Description */}
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-base font-medium">
												Description (Optional)
											</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Add any additional notes or requirements for this booking..."
													rows={3}
													disabled={isBookingPending}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Fixed Footer */}
						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={isBookingPending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitDisabled}>
								{isBookingPending ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" />
										Booking...
									</>
								) : (
									<>
										<Video className="mr-2 size-4" />
										Confirm booking
									</>
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
