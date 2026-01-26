"use client"

import { useState } from "react"
import { format, startOfToday } from "date-fns"
import { Calendar, Clock, FileText, Loader2, Mail, MessageSquare, Phone, Video } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { type Route } from "next"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
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
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import { TimeWheelPicker } from "@/features/schedule/components/time-wheel-picker"

import { SessionModeSelector } from "@/features/booking/components/session-mode-selector"

type WorkflowType = "REN" | "IEN"
type BookingMode = "CONSULTATION" | "SIGNING"

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
	const [bookingMode, setBookingMode] = useState<BookingMode>("CONSULTATION")
	const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>("REN")
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedHour, setSelectedHour] = useState<string>("09")
	const [selectedMinute, setSelectedMinute] = useState<string>("00")
	const [selectedPeriod, setSelectedPeriod] = useState<"am" | "pm">("am")
	const [description, setDescription] = useState<string>("")
	const today = startOfToday()

	// Helper function to convert 12-hour format to 24-hour format (HH:MM)
	const convertTo24Hour = (hour: string, minute: string, period: "am" | "pm"): string => {
		let hours24 = parseInt(hour, 10)
		if (period === "pm" && hours24 !== 12) {
			hours24 += 12
		} else if (period === "am" && hours24 === 12) {
			hours24 = 0
		}
		return `${hours24.toString().padStart(2, "0")}:${minute}`
	}

	// Helper function to convert 24-hour format to 12-hour format
	const convertTo12Hour = (time24: string): { hour: string; minute: string; period: "am" | "pm" } => {
		const [hours, minutes] = time24.split(":").map(Number)
		const hours24 = hours ?? 0
		const period = hours24 >= 12 ? "pm" : "am"
		let hours12 = hours24 % 12
		if (hours12 === 0) hours12 = 12
		return {
			hour: hours12.toString().padStart(2, "0"),
			minute: (minutes ?? 0).toString().padStart(2, "0"),
			period,
		}
	}

	// Get selected time in 24-hour format for API
	const selectedTime = convertTo24Hour(selectedHour, selectedMinute, selectedPeriod)

	// Fetch ENP details
	const { data: enpDetails } = trpc.consultations.getAvailableEnps.useQuery(
		{
			workflowType: selectedWorkflow,
		},
		{
			enabled: open,
		}
	)

	const currentEnp = enpDetails?.find(enp => enp.id === enpId)

	// Fetch ENP availability when date is selected
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
			setOpen(false)
			resetForm()
			router.push("/appointments" as Route)
		},
		onError: error => {
			toast.error("Booking failed", {
				description: error.message || "Failed to book signing session. Please try again.",
			})
		},
	})

	const resetForm = () => {
		setSelectedDate(undefined)
		setSelectedHour("09")
		setSelectedMinute("00")
		setSelectedPeriod("am")
		setDescription("")
		setBookingMode("CONSULTATION")
		setSelectedWorkflow("REN")
	}

	const handleBooking = async () => {
		if (!selectedDate || !selectedHour || !selectedMinute) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		const time24 = convertTo24Hour(selectedHour, selectedMinute, selectedPeriod)

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
			// Signing session booking
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

	const filteredSlots =
		selectedDate && availabilitySlots
			? availabilitySlots.filter(slot => slot.date === format(selectedDate, "yyyy-MM-dd"))
			: []

	const isBookingPending =
		bookConsultationMutation.isPending || bookSigningMutation.isPending

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger || <Button>Book Session</Button>}</DialogTrigger>
			<DialogContent className="max-h-[90vh] w-[90vw] !max-w-none">
				<DialogHeader>
					<DialogTitle>
						{bookingMode === "CONSULTATION" ? "Book Consultation" : "Book Signing Session"}
						{enpName ? ` with ${enpName}` : ""}
					</DialogTitle>
					<DialogDescription>
						{bookingMode === "CONSULTATION"
							? "Schedule a consultation with an Electronic Notary Public for your notarization needs."
							: "Schedule a document signing session with an Electronic Notary Public."}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
					<div className="space-y-6 py-4">
						{/* Booking Mode Selection */}
						<Card>
							<CardHeader>
								<CardTitle>What do you need?</CardTitle>
								<CardDescription>
									Pick the service type so we can set the right flow and timing.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<RadioGroup
									value={bookingMode}
									onValueChange={value => setBookingMode(value as BookingMode)}
								>
									<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
										<Card
											className="hover:border-primary h-full cursor-pointer border-2 transition-all"
											onClick={() => setBookingMode("CONSULTATION")}
											style={{
												borderColor:
													bookingMode === "CONSULTATION" ? "hsl(var(--primary))" : undefined,
												backgroundColor:
													bookingMode === "CONSULTATION"
														? "hsl(var(--primary) / 0.05)"
														: undefined,
											}}
										>
											<CardHeader className="pb-3">
												<div className="flex items-center gap-2">
													<RadioGroupItem value="CONSULTATION" id="consultation-mode" />
													<div className="flex items-center gap-2">
														<MessageSquare className="size-5 text-indigo-600" />
														<CardTitle className="text-base">Consultation</CardTitle>
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-2">
												<CardDescription>
													Ask questions, review documents, and get guidance before any notarization.
												</CardDescription>
												<ul className="text-muted-foreground space-y-1 text-sm">
													<li>✓ Prep documents and IDs</li>
													<li>✓ Legal/requirements clarifications</li>
													<li>✓ Usually 30-45 minutes</li>
												</ul>
											</CardContent>
										</Card>

										<Card
											className="hover:border-primary h-full cursor-pointer border-2 transition-all"
											onClick={() => setBookingMode("SIGNING")}
											style={{
												borderColor: bookingMode === "SIGNING" ? "hsl(var(--primary))" : undefined,
												backgroundColor:
													bookingMode === "SIGNING" ? "hsl(var(--primary) / 0.05)" : undefined,
											}}
										>
											<CardHeader className="pb-3">
												<div className="flex items-center gap-2">
													<RadioGroupItem value="SIGNING" id="signing-mode" />
													<div className="flex items-center gap-2">
														<FileText className="size-5 text-emerald-600" />
														<CardTitle className="text-base">Signing session</CardTitle>
													</div>
												</div>
											</CardHeader>
											<CardContent className="space-y-2">
												<CardDescription>
													Formal notarization of prepared documents with all signers present.
												</CardDescription>
												<ul className="text-muted-foreground space-y-1 text-sm">
													<li>✓ ID verification for all signers</li>
													<li>✓ Execute and notarize documents</li>
													<li>✓ Allow 45-60 minutes</li>
												</ul>
											</CardContent>
										</Card>
									</div>
								</RadioGroup>
							</CardContent>
						</Card>

						{/* Session Mode Selection */}
						<Card>
							<CardHeader>
								<CardTitle>Session mode</CardTitle>
								<CardDescription>Choose how you will meet with the notary.</CardDescription>
							</CardHeader>
							<CardContent>
								<SessionModeSelector
									value={selectedWorkflow}
									onChange={setSelectedWorkflow}
									showHeading={false}
								/>
							</CardContent>
						</Card>

						{/* ENP Details */}
						{currentEnp && (
							<Card>
								<CardHeader>
									<CardTitle>Notary Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center gap-4">
										<Avatar className="h-16 w-16">
											<AvatarImage
												src={currentEnp.image ?? undefined}
												alt={currentEnp.name ?? "ENP"}
											/>
											<AvatarFallback>
												{currentEnp.name
													?.split(" ")
													.map(n => n[0])
													.join("") ?? "EN"}
											</AvatarFallback>
										</Avatar>
										<div>
											<h4 className="font-medium">{currentEnp.name}</h4>
											<p className="text-muted-foreground text-sm">Electronic Notary Public</p>
											<div className="mt-1 flex items-center gap-1">
												<span className="text-sm font-medium">{currentEnp.rating}</span>
												<span className="text-muted-foreground text-sm">
													({currentEnp.reviewCount} reviews)
												</span>
											</div>
										</div>
									</div>

									<div className="space-y-3 text-sm">
										{currentEnp.phoneNumber && (
											<div className="flex items-center gap-2">
												<Phone className="text-muted-foreground h-4 w-4" />
												<span>{currentEnp.phoneNumber}</span>
											</div>
										)}
										<div className="flex items-center gap-2">
											<Mail className="text-muted-foreground h-4 w-4" />
											<span>{currentEnp.email}</span>
										</div>
										<div>
											<p className="font-medium">Specialization</p>
											<p className="text-muted-foreground">{currentEnp.specialization}</p>
										</div>
										<div>
											<p className="font-medium">Languages</p>
											<p className="text-muted-foreground">{currentEnp.languages.join(", ")}</p>
										</div>
										{currentEnp.experience && (
											<div>
												<p className="font-medium">Experience</p>
												<p className="text-muted-foreground">{currentEnp.experience}</p>
											</div>
										)}
										{currentEnp.responseTime && (
											<div>
												<p className="font-medium">Response Time</p>
												<p className="text-muted-foreground">{currentEnp.responseTime}</p>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}

						{/* Date and Time Selection */}
						<Card>
							<CardHeader>
								<CardTitle>Schedule your booking</CardTitle>
								<CardDescription>Select a date and time to confirm your booking.</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Date Selection */}
								<div>
									<Label className="text-base font-medium">Select Date</Label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className="mt-2 w-full justify-start text-left font-normal"
											>
												<Calendar className="mr-2 h-4 w-4" />
												{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0">
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
								<div className="space-y-3">
									<div className="space-y-1">
										<Label className="text-base font-medium">Pick a time</Label>
										<p className="text-muted-foreground text-xs">
											Choose a suggested slot or select a custom time.
										</p>
									</div>
									<div className="flex items-center gap-4">
										<TimeWheelPicker
											hour={selectedHour}
											minute={selectedMinute}
											period={selectedPeriod}
											onHourChange={setSelectedHour}
											onMinuteChange={setSelectedMinute}
											onPeriodChange={setSelectedPeriod}
										/>
									</div>
									{selectedDate && (
										<div className="space-y-2">
											<Label className="text-muted-foreground text-sm font-medium">
												Suggested slots
											</Label>
											{isLoadingAvailability ? (
												<div className="flex items-center justify-center py-4">
													<Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
												</div>
											) : filteredSlots.length > 0 ? (
												<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
													{filteredSlots.map((slot, index) => {
														const slot12Hour = convertTo12Hour(slot.time)
														const isSelected =
															selectedHour === slot12Hour.hour &&
															selectedMinute === slot12Hour.minute &&
															selectedPeriod === slot12Hour.period
														return (
															<Button
																key={index}
																variant={isSelected ? "default" : "outline"}
																onClick={() => {
																	setSelectedHour(slot12Hour.hour)
																	setSelectedMinute(slot12Hour.minute)
																	setSelectedPeriod(slot12Hour.period)
																}}
																className="justify-start"
																size="sm"
															>
																<Clock className="mr-2 h-4 w-4" />
																{`${slot12Hour.hour}:${slot12Hour.minute} ${slot12Hour.period.toUpperCase()}`}
															</Button>
														)
													})}
												</div>
											) : (
												<p className="text-muted-foreground text-sm">
													No suggested slots for this date. Select a custom time above.
												</p>
											)}
										</div>
									)}
								</div>

								{/* Description */}
								<div className="space-y-2">
									<Label className="text-base font-medium">Description (Optional)</Label>
									<Textarea
										placeholder="Add any additional notes or requirements for this booking..."
										value={description}
										onChange={e => setDescription(e.target.value)}
										className="min-h-[100px] resize-none"
										rows={4}
									/>
								</div>

								{(!selectedDate || !selectedHour || !selectedMinute) && (
									<p className="text-muted-foreground text-center text-sm">
										Please select a date and time to continue
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</ScrollArea>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleBooking}
						disabled={!selectedDate || !selectedHour || !selectedMinute || isBookingPending}
					>
						{isBookingPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Booking...
							</>
						) : (
							<>
								<Video className="mr-2 h-4 w-4" />
								Confirm booking
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
