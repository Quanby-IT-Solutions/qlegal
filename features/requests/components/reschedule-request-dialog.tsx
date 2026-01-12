"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
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
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { cn } from "@/core/lib/utils"

import type { AppointmentWithDetails } from "../types/requests.types"

interface RescheduleRequestDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	appointment: AppointmentWithDetails | null
	onSubmit: (values: { appointmentDate: Date; duration: number }) => void
	isSubmitting?: boolean
}

export function RescheduleRequestDialog({
	open,
	onOpenChange,
	appointment,
	onSubmit,
	isSubmitting = false,
}: RescheduleRequestDialogProps) {
	const [date, setDate] = useState<Date | undefined>()
	const [time, setTime] = useState("09:00")
	const [duration, setDuration] = useState(60)

	const timeOptions = useMemo(() => {
		const opts: string[] = []
		const pad = (n: number) => n.toString().padStart(2, "0")
		for (let h = 7; h <= 21; h++) {
			for (const m of [0, 15, 30, 45]) {
				opts.push(`${pad(h)}:${pad(m)}`)
			}
		}
		return opts
	}, [])

	useEffect(() => {
		if (appointment) {
			const d = new Date(appointment.appointmentDate)
			setDate(d)
			// Pre-fill time as HH:mm
			const hh = d.getHours().toString().padStart(2, "0")
			const mm = d.getMinutes().toString().padStart(2, "0")
			setTime(`${hh}:${mm}`)
			setDuration(appointment.duration || 60)
		}
	}, [appointment])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!date) return
		const [hours, minutes] = time.split(":").map(Number)
		const newDate = new Date(date)
		newDate.setHours(hours || 0, minutes || 0, 0, 0)
		const now = new Date()
		if (newDate <= now) {
			toast.error("Please select a future date and time")
			return
		}
		onSubmit({ appointmentDate: newDate, duration })
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Reschedule Appointment</DialogTitle>
					<DialogDescription>
						Pick a new date, time, and duration for this appointment.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
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
									disabled={d => d < new Date()}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					</div>

					{/* Time & Duration */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Time</Label>
							<Select value={time} onValueChange={setTime}>
								<SelectTrigger>
									<SelectValue placeholder="Select time" />
								</SelectTrigger>
								<SelectContent className="max-h-64">
									{timeOptions.map(t => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
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

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
