"use client"

import { useState } from "react"
import { Loader2, Video } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { type Route } from "next"
import { format } from "date-fns"

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
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"

import { trpc } from "@/services/trpc/client"

import { BookingDescription } from "./booking-description"
import { DateTimePickerSection } from "./date-time-picker-section"
import { SessionModeSelector } from "@/features/booking/components/session-mode-selector"
import { convertTo24Hour, type Time12Hour } from "./lib/time-utils"
import { SessionTypeSelector } from "@/features/booking/components/session-type-selector"

type WorkflowType = "REN" | "IEN"
type BookingMode = "CONSULTATION" | "NOTARIZATION"

interface ComprehensiveBookingDialogProps {
	enpId: string
	enpName?: string | null
	trigger?: React.ReactNode
}

export function ComprehensiveBookingDialog({
	enpId,
	enpName,
	trigger,
}: ComprehensiveBookingDialogProps) {
	const router = useRouter()
	const [open, setOpen] = useState(false)

	// State
	const [bookingMode, setBookingMode] = useState<BookingMode>("CONSULTATION")
	const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>("REN")
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState<Time12Hour>({
		hour: "09",
		minute: "00",
		period: "am",
	})
	const [description, setDescription] = useState<string>("")

	// Fetch ENP availability
	const { data: availabilitySlots, isLoading: isLoadingAvailability } =
		trpc.consultations.getEnpAvailability.useQuery(
			{
				enpId,
				workflowType: selectedWorkflow,
			},
			{
				enabled: !!enpId && open,
			}
		)

	// Book consultation mutation
	const bookConsultationMutation = trpc.consultations.bookConsultation.useMutation({
		onSuccess: () => {
			toast.success("Consultation Booked!", {
				description:
					"Your consultation request has been sent. The ENP will review and confirm your booking.",
			})
			setOpen(false)
			resetForm()
			router.push("/dashboard" as Route)
		},
		onError: (error) => {
			toast.error("Booking Failed", {
				description: error.message || "Failed to book consultation. Please try again.",
			})
		},
	})

	// Book signing session mutation
	const bookSigningMutation = trpc.appointments.createAppointment.useMutation({
		onSuccess: () => {
			toast.success("Signing session booked!")
			setOpen(false)
			resetForm()
			router.push("/appointments" as Route)
		},
		onError: (error) => {
			toast.error("Booking failed", {
				description: error.message || "Failed to book signing session. Please try again.",
			})
		},
	})

	const resetForm = () => {
		setSelectedDate(undefined)
		setSelectedTime({ hour: "09", minute: "00", period: "am" })
		setDescription("")
		setBookingMode("CONSULTATION")
		setSelectedWorkflow("REN")
	}

	const handleBooking = async () => {
		if (!selectedDate) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		const time24 = convertTo24Hour(selectedTime.hour, selectedTime.minute, selectedTime.period)

		if (bookingMode === "CONSULTATION") {
			await bookConsultationMutation.mutateAsync({
				enpId,
				workflowType: selectedWorkflow,
				appointmentDate: selectedDate,
				appointmentTime: time24,
				consultationType: "INITIAL",
				meetingPreference: undefined,
				specialRequirements: description.trim() || undefined,
				location: undefined,
			})
		} else {
			// Notarization session booking
			const [hours, minutes] = time24.split(":").map(Number)
			const appointmentDate = new Date(selectedDate)
			appointmentDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)

			await bookSigningMutation.mutateAsync({
				lawyerId: enpId,
				type: "DOCUMENT_SIGNING",
				appointmentDate,
				duration: selectedWorkflow === "REN" ? 45 : 60,
				notes: description.trim() || undefined,
				location: undefined,
				meetingLink: selectedWorkflow === "REN" ? "" : undefined,
			})
		}
	}

	const isBookingPending =
		bookConsultationMutation.isPending || bookSigningMutation.isPending
	const isSubmitDisabled = !selectedDate || isBookingPending

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger ?? <Button>Book Session</Button>}</DialogTrigger>
			<DialogContent className="max-h-[90vh] w-[90vw] max-w-2xl!">
			<DialogHeader>
				<DialogTitle>
					{bookingMode === "CONSULTATION" ? "Book Consultation" : "Book Notarization"}
					{enpName ? ` with ${enpName}` : ""}
				</DialogTitle>
				<DialogDescription>
					{bookingMode === "CONSULTATION"
						? "Schedule a consultation with an Electronic Notary Public for your notarization needs."
						: "Book a notarization session with an Electronic Notary Public for your documents."}
				</DialogDescription>
			</DialogHeader>

				<ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
					<div className="space-y-6 py-4">
						{/* Service Type Selection */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold">Service type</h3>
								<p className="text-muted-foreground text-sm">
									What do you need help with?
								</p>
							</div>
						<SessionTypeSelector
							value={bookingMode}
							onChange={setBookingMode}
							showHeading={false}
						/>
						</div>

						<Separator />

						{/* Session Mode Selection */}
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold">Session mode</h3>
								<p className="text-muted-foreground text-sm">
									Choose how you will meet with notary.
								</p>
							</div>
							<SessionModeSelector
								value={selectedWorkflow}
								onChange={setSelectedWorkflow}
								showHeading={false}
							/>
						</div>

						<Separator />

						{/* Date and Time Selection */}
						<div className="space-y-4">
							<DateTimePickerSection
								selectedDate={selectedDate}
								onDateChange={setSelectedDate}
								selectedTime={selectedTime}
								onTimeChange={setSelectedTime}
								availabilitySlots={availabilitySlots?.map(slot => ({
									date: slot.date ?? format(new Date(), "yyyy-MM-dd"),
									time: slot.time,
								})) ?? []}
								isLoadingAvailability={isLoadingAvailability}
								disabled={isBookingPending}
							/>
						</div>

						<Separator />

						{/* Description */}
						<div className="space-y-4">
							<BookingDescription
								value={description}
								onChange={setDescription}
								disabled={isBookingPending}
							/>
						</div>

						{!selectedDate && (
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
					<Button
						type="button"
						onClick={handleBooking}
						disabled={isSubmitDisabled}
					>
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
			</DialogContent>
		</Dialog>
	)
}
