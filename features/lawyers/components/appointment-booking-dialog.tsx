"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
	Calendar as CalendarIcon,
	Clock,
	FileText,
	Loader2,
	Mail,
	MessageSquare,
	Phone,
	Video,
} from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
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
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import { SessionModeSelector } from "@/features/booking/components/session-mode-selector"

// Define Lawyer type based on the router return structure
export type Lawyer = RouterOutputs["lawyers"]["getLawyers"][number]

interface AppointmentBookingDialogProps {
	lawyer: Lawyer
	trigger?: React.ReactNode
}

type AppointmentType = "DOCUMENT_SIGNING" | "CONSULTATION"
type SessionMode = "REN" | "IEN"

export function AppointmentBookingDialog({ lawyer, trigger }: AppointmentBookingDialogProps) {
	const [open, setOpen] = useState(false)
	const [date, setDate] = useState<Date>()
	const [time, setTime] = useState("09:00")
	const [type, setType] = useState<AppointmentType>("CONSULTATION")
	const [sessionMode, setSessionMode] = useState<SessionMode>("REN")
	const [duration, setDuration] = useState(60)
	const [notes, setNotes] = useState("")
	const [location, setLocation] = useState("")

	const utils = trpc.useUtils()
	const createAppointment = trpc.appointments.createAppointment.useMutation({
		onSuccess: () => {
			toast.success("Appointment booked successfully!")
			void utils.appointments.getMyAppointments.invalidate()
			void utils.appointments.getUpcomingAppointments.invalidate()
			setOpen(false)
			resetForm()
		},
		onError: error => {
			toast.error(error.message ?? "Failed to book appointment")
		},
	})

	const resetForm = () => {
		setDate(undefined)
		setTime("09:00")
		setType("CONSULTATION")
		setSessionMode("REN")
		setDuration(60)
		setNotes("")
		setLocation("")
	}


	const isBookingPending = createAppointment.isPending
	const canSubmit = date && time

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger ?? <Button>Book Appointment</Button>}</DialogTrigger>
			<DialogContent className="max-h-[90vh] w-[90vw] !max-w-4xl">
				<DialogHeader>
					<DialogTitle>Book Consultation with {lawyer.name}</DialogTitle>
					<DialogDescription>
						Schedule a consultation with an Electronic Notary Public for your notarization needs.
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
					<div className="space-y-6 py-4">
						{/* Service Type Selection */}
						<Card>
							<CardHeader>
								<CardTitle>What do you need?</CardTitle>
								<CardDescription>
									Pick the service type so we can set the right flow and timing.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<RadioGroup
									value={type}
									onValueChange={value => setType(value as AppointmentType)}
								>
									<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
										<Card
											className="hover:border-primary h-full cursor-pointer border-2 transition-all"
											onClick={() => setType("CONSULTATION")}
											style={{
												borderColor:
													type === "CONSULTATION" ? "hsl(var(--primary))" : undefined,
												backgroundColor:
													type === "CONSULTATION"
														? "hsl(var(--primary) / 0.05)"
														: undefined,
											}}
										>
											<CardHeader className="pb-3">
												<div className="flex items-center gap-2">
													<RadioGroupItem value="CONSULTATION" id="consultation-type" />
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
											onClick={() => setType("DOCUMENT_SIGNING")}
											style={{
												borderColor:
													type === "DOCUMENT_SIGNING" ? "hsl(var(--primary))" : undefined,
												backgroundColor:
													type === "DOCUMENT_SIGNING"
														? "hsl(var(--primary) / 0.05)"
														: undefined,
											}}
										>
											<CardHeader className="pb-3">
												<div className="flex items-center gap-2">
													<RadioGroupItem value="DOCUMENT_SIGNING" id="signing-type" />
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
									value={sessionMode}
									onChange={setSessionMode}
									showHeading={false}
								/>
							</CardContent>
						</Card>

						{/* Notary Details */}
						<Card>
							<CardHeader>
								<CardTitle>Notary Details</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center gap-4">
									<Avatar className="size-16">
										<AvatarImage src={lawyer.image ?? undefined} alt={lawyer.name ?? "Notary"} />
										<AvatarFallback>
											{lawyer.name
												?.split(" ")
												.map(n => n[0])
												.join("")
												.toUpperCase() ?? "N"}
										</AvatarFallback>
									</Avatar>
									<div>
										<h4 className="font-medium">{lawyer.name}</h4>
										<p className="text-muted-foreground text-sm">Electronic Notary Public</p>
										<div className="mt-1 flex items-center gap-1">
											<span className="text-sm font-medium">
												{lawyer.rating > 0 ? lawyer.rating.toFixed(1) : "0"}
											</span>
											<span className="text-muted-foreground text-sm">
												({lawyer.reviewCount} reviews)
											</span>
										</div>
									</div>
								</div>

								<div className="space-y-3 text-sm">
									{lawyer.phoneNumber && (
										<div className="flex items-center gap-2">
											<Phone className="text-muted-foreground size-4" />
											<span>{lawyer.phoneNumber}</span>
										</div>
									)}
									<div className="flex items-center gap-2">
										<Mail className="text-muted-foreground size-4" />
										<span>{lawyer.email}</span>
									</div>
									{lawyer.specialization && (
										<div>
											<p className="font-medium">Specialization</p>
											<p className="text-muted-foreground">{lawyer.specialization}</p>
										</div>
									)}
									{lawyer.languages && lawyer.languages.length > 0 && (
										<div>
											<p className="font-medium">Languages</p>
											<p className="text-muted-foreground">
												{Array.isArray(lawyer.languages)
													? lawyer.languages.join(", ")
													: lawyer.languages}
											</p>
										</div>
									)}
									{lawyer.experience && (
										<div>
											<p className="font-medium">Experience</p>
											<p className="text-muted-foreground">{lawyer.experience}</p>
										</div>
									)}
									{lawyer.responseTime && (
										<div>
											<p className="font-medium">Response Time</p>
											<p className="text-muted-foreground">{lawyer.responseTime}</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Date and Time Selection */}
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
												className={cn(
													"mt-2 w-full justify-start text-left font-normal",
													!date && "text-muted-foreground"
												)}
											>
												<CalendarIcon className="mr-2 size-4" />
												{date ? format(date, "PPP") : "Pick a date"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={date}
												onSelect={setDate}
												disabled={date => date < new Date()}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
								</div>

								{/* Time & Duration */}
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="time" className="text-base font-medium">
											Pick a time
										</Label>
										<div className="relative">
											<Clock className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
											<Input
												id="time"
												type="time"
												value={time}
												onChange={e => setTime(e.target.value)}
												className="pl-9"
												required
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="duration" className="text-base font-medium">
											Duration
										</Label>
										<Select
											value={duration.toString()}
											onValueChange={value => setDuration(Number(value))}
										>
											<SelectTrigger id="duration">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="30">30 minutes</SelectItem>
												<SelectItem value="45">45 minutes</SelectItem>
												<SelectItem value="60">1 hour</SelectItem>
												<SelectItem value="90">1.5 hours</SelectItem>
												<SelectItem value="120">2 hours</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Location (for IEN) */}
								{sessionMode === "IEN" && (
									<div className="space-y-2">
										<Label htmlFor="location" className="text-base font-medium">
											Location (Optional)
										</Label>
										<Input
											id="location"
											placeholder="Enter meeting location"
											value={location}
											onChange={e => setLocation(e.target.value)}
										/>
									</div>
								)}

								{/* Notes */}
								<div className="space-y-2">
									<Label htmlFor="notes" className="text-base font-medium">
										Additional Notes (Optional)
									</Label>
									<Textarea
										id="notes"
										placeholder="Add any additional information or requirements..."
										value={notes}
										onChange={e => setNotes(e.target.value)}
										className="min-h-[100px] resize-none"
										rows={4}
									/>
								</div>

								{!canSubmit && (
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
						onClick={() => {
							if (!date) {
								toast.error("Please select a date and time to continue")
								return
							}

							// Combine date and time
							const timeParts = time.split(":").map(Number)
							const hours = timeParts[0] ?? 0
							const minutes = timeParts[1] ?? 0
							const appointmentDate = new Date(date)
							appointmentDate.setHours(hours, minutes)

							createAppointment.mutate({
								lawyerId: lawyer.id,
								type,
								appointmentDate,
								duration,
								notes: notes || undefined,
								location: location || undefined,
							})
						}}
						disabled={!canSubmit || isBookingPending}
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
