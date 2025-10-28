"use client"

import { useState } from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
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
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
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

import { trpc } from "@/services/trpc/client"

import type { RouterOutputs } from "@/services/trpc/client"

type Lawyer = RouterOutputs["lawyers"]["getLawyers"][number]

interface AppointmentBookingDialogProps {
	lawyer: Lawyer
	trigger?: React.ReactNode
}

export function AppointmentBookingDialog({ lawyer, trigger }: AppointmentBookingDialogProps) {
	const [open, setOpen] = useState(false)
	const [date, setDate] = useState<Date>()
	const [time, setTime] = useState("09:00")
	const [type, setType] = useState<"DOCUMENT_SIGNING" | "CONSULTATION">("CONSULTATION")
	const [duration, setDuration] = useState(60)
	const [notes, setNotes] = useState("")
	const [location, setLocation] = useState("")

	const utils = trpc.useUtils()
	const createAppointment = trpc.appointments.createAppointment.useMutation({
		onSuccess: () => {
			toast.success("Appointment booked successfully!")
			utils.appointments.getMyAppointments.invalidate()
			utils.appointments.getUpcomingAppointments.invalidate()
			setOpen(false)
			resetForm()
		},
		onError: error => {
			toast.error(error.message || "Failed to book appointment")
		},
	})

	const resetForm = () => {
		setDate(undefined)
		setTime("09:00")
		setType("CONSULTATION")
		setDuration(60)
		setNotes("")
		setLocation("")
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (!date) {
			toast.error("Please select a date")
			return
		}

		// Combine date and time
		const [hours, minutes] = time.split(":").map(Number)
		const appointmentDate = new Date(date)
		appointmentDate.setHours(hours!, minutes!)

		createAppointment.mutate({
			lawyerId: lawyer.id,
			type,
			appointmentDate,
			duration,
			notes: notes || undefined,
			location: location || undefined,
		})
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || <Button>Book Appointment</Button>}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Book Appointment with {lawyer.name}</DialogTitle>
					<DialogDescription>
						Schedule a consultation or document signing session
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Appointment Type */}
					<div className="space-y-2">
						<Label htmlFor="type">Appointment Type</Label>
						<Select value={type} onValueChange={(value: typeof type) => setType(value)}>
							<SelectTrigger id="type">
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="CONSULTATION">Consultation</SelectItem>
								<SelectItem value="DOCUMENT_SIGNING">Document Signing</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Date */}
					<div className="space-y-2">
						<Label>Date</Label>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className={cn(
										"w-full justify-start text-left font-normal",
										!date && "text-muted-foreground"
									)}
								>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{date ? date.toLocaleDateString() : "Pick a date"}
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
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="time">Time</Label>
							<div className="relative">
								<Clock className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
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
							<Label htmlFor="duration">Duration (min)</Label>
							<Select
								value={duration.toString()}
								onValueChange={value => setDuration(Number(value))}
							>
								<SelectTrigger id="duration">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="30">30 minutes</SelectItem>
									<SelectItem value="60">1 hour</SelectItem>
									<SelectItem value="90">1.5 hours</SelectItem>
									<SelectItem value="120">2 hours</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Location */}
					<div className="space-y-2">
						<Label htmlFor="location">Location (Optional)</Label>
						<Input
							id="location"
							placeholder="Enter location or leave empty for online"
							value={location}
							onChange={e => setLocation(e.target.value)}
						/>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<Label htmlFor="notes">Notes (Optional)</Label>
						<Textarea
							id="notes"
							placeholder="Add any additional information..."
							value={notes}
							onChange={e => setNotes(e.target.value)}
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={createAppointment.isPending}>
							{createAppointment.isPending ? "Booking..." : "Book Appointment"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
