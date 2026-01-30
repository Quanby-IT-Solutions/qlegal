"use client"

import { type Route } from "next"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Video } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
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
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import { SessionModeSelector } from "@/features/appointments/components/session-mode-selector"
import { SessionTypeSelector } from "@/features/appointments/components/session-type-selector"

import { bookingDialogSchema, type BookingDialogSchema } from "./booking-dialog.schema"
import { DateTimePickerSection } from "./date-time-picker-section"
import { convertTo24Hour } from "./lib/time-utils"

interface BookingDialogProps {
	enpId: string
	enpName?: string | null
	trigger?: React.ReactNode
}

export function BookingDialog({ enpId, enpName, trigger }: BookingDialogProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)

	// Form state
	const form = useForm<BookingDialogSchema>({
		resolver: zodResolver(bookingDialogSchema),
		defaultValues: {
			bookingMode: "CONSULTATION",
			workflowType: "REN",
			selectedDate: new Date(),
			selectedTime: { hour: "09", minute: "00", period: "am" },
			description: "",
		},
	})

	const watchBookingMode = form.watch("bookingMode")
	const watchWorkflowType = form.watch("workflowType")
	const watchSelectedDate = form.watch("selectedDate")

	// Clear workflowType when switching to CONSULTATION
	useEffect(() => {
		if (watchBookingMode === "CONSULTATION" && watchWorkflowType !== undefined) {
			form.setValue("workflowType", undefined)
		}
	}, [watchBookingMode, watchWorkflowType, form])

	// Fetch ENP availability - only when needed and dialog is open
	const { data: availabilityData, isLoading: isLoadingAvailability } =
		trpc.browse.getEnpAvailability.useQuery(
			{ enpId, workflowType: watchWorkflowType ?? "REN" },
			{ enabled: !!enpId && open }
		)

	// Book consultation mutation
	const bookConsultationMutation = trpc.browse.bookConsultation.useMutation({
		onSuccess: () => {
			toast.success("Consultation Booked!", {
				description:
					"Your consultation request has been sent. The ENP will review and confirm your booking.",
			})
			closeDialog()
			router.push("/meetings" as Route)
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
			router.push("/meetings" as Route)
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

	const handleBooking = async (values: BookingDialogSchema) => {
		const { bookingMode, selectedDate, selectedTime, description, workflowType } = values

		// If switching to CONSULTATION, clear workflowType
		if (bookingMode === "CONSULTATION" && workflowType) {
			form.setValue("workflowType", undefined)
		}

		if (!selectedDate) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		const time24 = convertTo24Hour(selectedTime.hour, selectedTime.minute, selectedTime.period)

		if (bookingMode === "CONSULTATION") {
			// For consultation, we don't need workflowType (session mode)
			await bookConsultationMutation.mutateAsync({
				enpId,
				workflowType: workflowType ?? "REN", // Use REN as default if not provided
				appointmentDate: selectedDate,
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

			const [hours, minutes] = time24.split(":").map(Number)
			const appointmentDate = new Date(selectedDate)
			appointmentDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)

			await bookSigningMutation.mutateAsync({
				lawyerId: enpId,
				type: "DOCUMENT_SIGNING",
				appointmentDate,
				duration: workflowType === "REN" ? 45 : 60,
				notes: description?.trim() ?? undefined,
				location: undefined,
				meetingLink: workflowType === "REN" ? "" : undefined,
			})
		}
	}

	const isBookingPending = bookConsultationMutation.isPending || bookSigningMutation.isPending
	const isSubmitDisabled = !watchSelectedDate || isBookingPending

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger ?? <Button>Book Session</Button>}</DialogTrigger>
			<DialogContent className="max-h-[90vh] w-[90vw] max-w-2xl!">
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
					<form onSubmit={form.handleSubmit(handleBooking)} className="flex flex-1 flex-col">
						<ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
							<div className="space-y-6 py-4">
								{/* Service Type Selection */}
								<FormField
									control={form.control}
									name="bookingMode"
									render={({ field }) => (
										<div className="space-y-4">
											<div>
												<h3 className="text-lg font-semibold">Service type</h3>
												<p className="text-muted-foreground text-sm">What do you need help with?</p>
											</div>
											<SessionTypeSelector
												value={field.value}
												onChange={field.onChange}
												showHeading={false}
											/>
											<FormMessage />
										</div>
									)}
								/>

								<Separator />

								{/* Session Mode Selection - Only for NOTARIZATION */}
								{watchBookingMode === "NOTARIZATION" && (
									<>
										<FormField
											control={form.control}
											name="workflowType"
											render={({ field }) => (
												<div className="space-y-4">
													<div>
														<h3 className="text-lg font-semibold">Session mode</h3>
														<p className="text-muted-foreground text-sm">
															Choose how you will meet with notary.
														</p>
													</div>
													<SessionModeSelector
														value={field.value}
														onChange={field.onChange}
														showHeading={false}
													/>
													<FormMessage />
												</div>
											)}
										/>
										<Separator />
									</>
								)}

								{/* Date and Time Selection */}
								<div className="space-y-4">
									<DateTimePickerSection
										selectedDate={watchSelectedDate}
										onDateChange={date => form.setValue("selectedDate", date!)}
										selectedTime={{
											hour: form.watch("selectedTime.hour"),
											minute: form.watch("selectedTime.minute"),
											period: form.watch("selectedTime.period"),
										}}
										onTimeChange={time => form.setValue("selectedTime", time)}
										availabilitySlots={
											availabilityData
												?.filter(slot => slot.date !== undefined)
												.map(slot => ({
													date: slot.date!,
													time: slot.time,
												})) ?? []
										}
										isLoadingAvailability={isLoadingAvailability}
										disabled={isBookingPending}
									/>
								</div>

								<Separator />

								{/* Description */}
								<div className="space-y-4">
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
														rows={4}
														disabled={isBookingPending}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								{!watchSelectedDate && (
									<p className="text-muted-foreground text-center text-sm">
										Please select a date and time to continue
									</p>
								)}
							</div>
						</ScrollArea>

						<DialogFooter>
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
