"use client"

import { useState } from "react"
import { format, startOfToday } from "date-fns"
import { Calendar, Clock, Loader2, Video } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"

import { trpc } from "@/services/trpc/client"

interface ConsultationBookingDialogProps {
	enpId: string
	enpName?: string | null
	trigger?: React.ReactNode
}

export function ConsultationBookingDialog({
	enpId,
	enpName,
	trigger,
}: ConsultationBookingDialogProps) {
	const [open, setOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState<string>("")
	const today = startOfToday()
	const workflowType = "REN" // Default workflow type

	// Fetch ENP availability when date is selected
	const { data: availabilitySlots, isLoading: isLoadingAvailability } =
		trpc.browse.getEnpAvailability.useQuery(
			{
				enpId,
				workflowType,
			},
			{
				enabled: !!enpId && open,
			}
		)

	// Book consultation mutation
	const bookConsultationMutation = trpc.browse.bookConsultation.useMutation({
		onSuccess: () => {
			toast.success("Consultation Booked!", {
				description:
					"Your consultation request has been sent. The ENP will review and confirm your booking.",
			})
			setOpen(false)
			resetForm()
		},
		onError: error => {
			toast.error("Booking Failed", {
				description: error.message || "Failed to book consultation. Please try again.",
			})
		},
	})

	const resetForm = () => {
		setSelectedDate(undefined)
		setSelectedTime("")
	}

	const handleBooking = async () => {
		if (!selectedDate || !selectedTime) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		await bookConsultationMutation.mutateAsync({
			enpId,
			workflowType,
			appointmentDate: selectedDate,
			appointmentTime: selectedTime,
			consultationType: "INITIAL",
			meetingPreference: undefined,
			specialRequirements: undefined,
			location: undefined,
		})
	}

	const filteredSlots =
		selectedDate && availabilitySlots
			? availabilitySlots.filter(slot => slot.date === format(selectedDate, "yyyy-MM-dd"))
			: []

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || <Button>Book Consultation</Button>}</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Book Consultation{enpName ? ` with ${enpName}` : ""}</DialogTitle>
					<DialogDescription>
						Schedule a consultation with an Electronic Notary Public for your notarization needs.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Date Selection */}
					<div className="space-y-2">
						<Label className="text-base font-medium">Select Date</Label>
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline" className="w-full justify-start text-left font-normal">
									<Calendar className="mr-2 size-4" />
									{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<CalendarComponent
									mode="single"
									selected={selectedDate}
									onSelect={setSelectedDate}
									disabled={date => date < today}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* Time Selection */}
					{selectedDate && (
						<div className="space-y-3">
							<div className="space-y-1">
								<Label className="text-base font-medium">Pick a time</Label>
								<p className="text-muted-foreground text-xs">
									Choose a suggested slot or type a custom time.
								</p>
							</div>
							<input
								type="time"
								className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								value={selectedTime || ""}
								onChange={e => setSelectedTime(e.target.value)}
							/>
							<div className="space-y-2">
								<Label className="text-muted-foreground text-sm font-medium">Suggested slots</Label>
								{isLoadingAvailability ? (
									<div className="flex items-center justify-center py-4">
										<Loader2 className="text-muted-foreground size-5 animate-spin" />
									</div>
								) : filteredSlots.length > 0 ? (
									<div className="grid grid-cols-2 gap-2">
										{filteredSlots.map((slot, index) => (
											<Button
												key={index}
												variant={selectedTime === slot.time ? "default" : "outline"}
												onClick={() => setSelectedTime(slot.time)}
												className="justify-start"
												size="sm"
											>
												<Clock className="mr-2 size-4" />
												{slot.time}
											</Button>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										No suggested slots for this date. Enter a custom time above.
									</p>
								)}
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleBooking}
						disabled={!selectedDate || !selectedTime || bookConsultationMutation.isPending}
					>
						{bookConsultationMutation.isPending ? (
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
