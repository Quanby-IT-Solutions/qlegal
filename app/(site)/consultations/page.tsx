"use client"

import { type Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { format, startOfToday } from "date-fns"
import { Calendar, Clock, FileText, Loader2, Mail, MessageSquare, Phone, Video } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"

import { trpc } from "@/services/trpc/client"

import { SessionModeSelector } from "@/features/booking/components/session-mode-selector"

type WorkflowType = "REN" | "IEN"
type BookingMode = "CONSULTATION" | "SIGNING"

export default function ConsultationsPage() {
	const searchParams = useSearchParams()
	const router = useRouter()

	const modeParam = (searchParams.get("mode") ?? searchParams.get("booking") ?? "").toUpperCase()
	const initialBooking: BookingMode = modeParam === "SIGNING" ? "SIGNING" : "CONSULTATION"

	const [bookingMode, setBookingMode] = useState<BookingMode>("CONSULTATION")
	const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>("REN")
	const [selectedENP, setSelectedENP] = useState<string | null>(null)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState<string>("")
	const today = startOfToday()

	// Get ENP ID from URL params
	const enpId = searchParams.get("enp")
	const workflowParam = searchParams.get("workflow") as WorkflowType | null
	const dateParam = searchParams.get("date")
	const timeParam = searchParams.get("time")

	useEffect(() => {
		setBookingMode(initialBooking)
		if (enpId) {
			setSelectedENP(enpId)
		}
		if (workflowParam && (workflowParam === "REN" || workflowParam === "IEN")) {
			setSelectedWorkflow(workflowParam)
		}
		if (dateParam) {
			const parsedDate = new Date(dateParam)
			if (!Number.isNaN(parsedDate.getTime())) {
				const normalized = new Date(parsedDate)
				normalized.setHours(12, 0, 0, 0)
				setSelectedDate(normalized)
			}
		}
		if (timeParam) {
			setSelectedTime(timeParam)
		}
	}, [dateParam, enpId, initialBooking, timeParam, workflowParam])

	// Fetch available ENPs
	const { data: availableEnps, isLoading: isLoadingEnps } =
		trpc.consultations.getAvailableEnps.useQuery({
			workflowType: selectedWorkflow,
		})

	// Fetch ENP availability when ENP is selected
	const { data: availabilitySlots, isLoading: isLoadingAvailability } =
		trpc.consultations.getEnpAvailability.useQuery(
			{
				enpId: selectedENP ?? "",
				workflowType: selectedWorkflow,
			},
			{
				enabled: !!selectedENP,
			}
		)

	// Book consultation mutation
	const bookConsultationMutation = trpc.consultations.bookConsultation.useMutation({
		onSuccess: data => {
			console.log("🔍 Consultation booking success:", data)

			toast.success("Consultation Booked!", {
				description:
					"Your consultation request has been sent. The ENP will review and confirm your booking.",
			})

			// After booking, always redirect to dashboard - meeting/conversation is created when ENP confirms
			// The user can see their pending appointment and will be notified when it's confirmed
			console.log("✅ Redirecting to dashboard after booking")
			router.push("/dashboard" as Route)
		},
		onError: error => {
			toast.error("Booking Failed", {
				description: error.message || "Failed to book consultation. Please try again.",
			})
		},
	})
	// Book signing session (document signing) via appointments
	const bookSigningMutation = trpc.appointments.createAppointment.useMutation({
		onSuccess: () => {
			toast.success("Signing session booked!")
			router.push("/appointments" as Route)
		},
		onError: error => {
			toast.error("Booking failed", {
				description: error.message || "Failed to book signing session. Please try again.",
			})
		},
	})

	const enpDetails = availableEnps?.find(enp => enp.id === selectedENP)

	const handleBooking = async () => {
		if (!selectedENP || !selectedDate || !selectedTime) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		if (bookingMode === "CONSULTATION") {
			await bookConsultationMutation.mutateAsync({
				enpId: selectedENP,
				workflowType: selectedWorkflow,
				appointmentDate: selectedDate,
				appointmentTime: selectedTime,
				consultationType: "INITIAL",
				meetingPreference: undefined,
				specialRequirements: undefined,
				location: undefined,
			})
		} else {
			// Signing session booking
			// Combine date and time
			const [hours, minutes] = selectedTime.split(":").map(Number)
			const appointmentDate = new Date(selectedDate)
			appointmentDate.setHours(hours ?? 0, minutes ?? 0, 0, 0)

			await bookSigningMutation.mutateAsync({
				lawyerId: selectedENP,
				type: "DOCUMENT_SIGNING",
				appointmentDate,
				duration: selectedWorkflow === "REN" ? 45 : 60,
				notes: undefined,
				location: undefined,
				meetingLink: selectedWorkflow === "REN" ? "" : undefined,
			})
		}
	}

	const filteredSlots =
		selectedDate && availabilitySlots
			? availabilitySlots.filter(slot => slot.date === format(selectedDate, "yyyy-MM-dd"))
			: []

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Browse", href: "/browse" }, { label: "Consultations" }]} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					{/* Header */}
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">
							{bookingMode === "CONSULTATION" ? "Book Consultation" : "Book Signing Session"}
						</h1>
						<p className="text-muted-foreground">
							{bookingMode === "CONSULTATION"
								? "Schedule a consultation with an Electronic Notary Public for your notarization needs."
								: "Schedule a document signing session with an Electronic Notary Public."}
						</p>
					</div>

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
												bookingMode === "CONSULTATION" ? "hsl(var(--primary) / 0.05)" : undefined,
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

					{/* ENP Selection */}
					{!selectedENP && (
						<Card>
							<CardHeader>
								<CardTitle>Select a Notary</CardTitle>
								<CardDescription>Choose from available Electronic Notaries Public</CardDescription>
							</CardHeader>
							<CardContent>
								{isLoadingEnps ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
									</div>
								) : availableEnps && availableEnps.length > 0 ? (
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										{availableEnps.map(enp => (
											<Card
												key={enp.id}
												className="cursor-pointer transition-shadow hover:shadow-md"
												onClick={() => setSelectedENP(enp.id)}
											>
												<CardContent className="p-4">
													<div className="flex items-center gap-4">
														<Avatar className="h-12 w-12">
															<AvatarImage src={enp.image ?? undefined} alt={enp.name ?? "ENP"} />
															<AvatarFallback>
																{enp.name
																	?.split(" ")
																	.map(n => n[0])
																	.join("") ?? "EN"}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<h4 className="font-medium">{enp.name}</h4>
															<p className="text-muted-foreground text-sm">{enp.specialization}</p>
															<div className="mt-1 flex items-center gap-1">
																<span className="text-sm font-medium">{enp.rating}</span>
																<span className="text-muted-foreground text-sm">
																	({enp.reviewCount} reviews)
																</span>
															</div>
														</div>
														<Badge variant="outline">Available</Badge>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								) : (
									<p className="text-muted-foreground py-8 text-center">
										No Electronic Notaries Public available at the moment.
									</p>
								)}
							</CardContent>
						</Card>
					)}

					{/* ENP Details and Booking */}
					{selectedENP && enpDetails && (
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
							{/* ENP Information */}
							<div className="lg:col-span-1">
								<Card>
									<CardHeader>
										<CardTitle>Notary Details</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="flex items-center gap-4">
											<Avatar className="h-16 w-16">
												<AvatarImage
													src={enpDetails.image ?? undefined}
													alt={enpDetails.name ?? "ENP"}
												/>
												<AvatarFallback>
													{enpDetails.name
														?.split(" ")
														.map(n => n[0])
														.join("") ?? "EN"}
												</AvatarFallback>
											</Avatar>
											<div>
												<h4 className="font-medium">{enpDetails.name}</h4>
												<p className="text-muted-foreground text-sm">Electronic Notary Public</p>
												<div className="mt-1 flex items-center gap-1">
													<span className="text-sm font-medium">{enpDetails.rating}</span>
													<span className="text-muted-foreground text-sm">
														({enpDetails.reviewCount} reviews)
													</span>
												</div>
											</div>
										</div>

										<div className="space-y-3 text-sm">
											{enpDetails.phoneNumber && (
												<div className="flex items-center gap-2">
													<Phone className="text-muted-foreground h-4 w-4" />
													<span>{enpDetails.phoneNumber}</span>
												</div>
											)}
											<div className="flex items-center gap-2">
												<Mail className="text-muted-foreground h-4 w-4" />
												<span>{enpDetails.email}</span>
											</div>
											<div>
												<p className="font-medium">Specialization</p>
												<p className="text-muted-foreground">{enpDetails.specialization}</p>
											</div>
											<div>
												<p className="font-medium">Languages</p>
												<p className="text-muted-foreground">{enpDetails.languages.join(", ")}</p>
											</div>
											<div>
												<p className="font-medium">Experience</p>
												<p className="text-muted-foreground">{enpDetails.experience}</p>
											</div>
											<div>
												<p className="font-medium">Response Time</p>
												<p className="text-muted-foreground">{enpDetails.responseTime}</p>
											</div>
										</div>

										<Button
											variant="outline"
											onClick={() => setSelectedENP(null)}
											className="w-full"
										>
											Change Notary
										</Button>
									</CardContent>
								</Card>
							</div>

							{/* Booking Form */}
							<div className="lg:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle>Schedule your booking</CardTitle>
										<CardDescription>
											Select a date and time to confirm your booking.
										</CardDescription>
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
										{selectedDate && (
											<div className="space-y-3">
												<div className="space-y-1">
													<Label className="text-base font-medium">Pick a time</Label>
													<p className="text-muted-foreground text-xs">
														Choose a suggested slot or type a custom time (24h or 12h accepted).
													</p>
												</div>
												<input
													type="time"
													className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
													value={selectedTime || ""}
													onChange={e => setSelectedTime(e.target.value)}
												/>
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
															{filteredSlots.map((slot, index) => (
																<Button
																	key={index}
																	variant={selectedTime === slot.time ? "default" : "outline"}
																	onClick={() => setSelectedTime(slot.time)}
																	className="justify-start"
																>
																	<Clock className="mr-2 h-4 w-4" />
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

										{/* Booking Button */}
										<Button
											onClick={handleBooking}
											disabled={
												!selectedDate || !selectedTime || bookConsultationMutation.isPending
											}
											className="w-full"
											size="lg"
										>
											{bookConsultationMutation.isPending ? (
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

										{(!selectedDate || !selectedTime) && (
											<p className="text-muted-foreground text-center text-sm">
												Please select a date and time to continue
											</p>
										)}
									</CardContent>
								</Card>
							</div>
						</div>
					)}
				</div>
			</main>
		</div>
	)
}
