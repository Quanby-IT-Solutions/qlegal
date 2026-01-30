"use client"

import { format, startOfToday } from "date-fns"
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import { Label } from "@/core/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"

import { TimeWheelPicker } from "@/features/appointments/components/time-wheel-picker"

import { convertTo12Hour, formatTime12Hour, type Time12Hour } from "./lib/time-utils"

interface DateTimePickerSectionProps {
	selectedDate: Date | undefined
	onDateChange: (date: Date | undefined) => void
	selectedTime: Time12Hour
	onTimeChange: (time: Time12Hour) => void
	availabilitySlots?: Array<{ date: string; time: string }>
	isLoadingAvailability?: boolean
	disabled?: boolean
}

export function DateTimePickerSection({
	selectedDate,
	onDateChange,
	selectedTime,
	onTimeChange,
	availabilitySlots = [],
	isLoadingAvailability = false,
	disabled = false,
}: DateTimePickerSectionProps) {
	const today = startOfToday()

	// Filter slots for the selected date
	const filteredSlots =
		selectedDate && availabilitySlots.length > 0
			? availabilitySlots.filter(slot => slot.date === format(selectedDate, "yyyy-MM-dd"))
			: []

	const handleSlotClick = (slotTime: string) => {
		const slot12Hour = convertTo12Hour(slotTime)
		onTimeChange(slot12Hour)
	}

	const isSlotSelected = (slotTime: string): boolean => {
		const slot12Hour = convertTo12Hour(slotTime)
		return (
			selectedTime.hour === slot12Hour.hour &&
			selectedTime.minute === slot12Hour.minute &&
			selectedTime.period === slot12Hour.period
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Schedule your booking</h3>
				<p className="text-muted-foreground text-sm">
					Select a date and time to confirm your booking.
				</p>
			</div>

			{/* Date Selection */}
			<div className="space-y-2">
				<Label className="text-base font-medium">Select Date</Label>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="w-full justify-start text-left font-normal"
							disabled={disabled}
						>
							<CalendarIcon className="mr-2 size-4" />
							{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<CalendarComponent
							mode="single"
							selected={selectedDate}
							onSelect={onDateChange}
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

				<TimeWheelPicker
					hour={selectedTime.hour}
					minute={selectedTime.minute}
					period={selectedTime.period}
					onHourChange={hour => onTimeChange({ ...selectedTime, hour })}
					onMinuteChange={minute => onTimeChange({ ...selectedTime, minute })}
					onPeriodChange={period => onTimeChange({ ...selectedTime, period })}
					disabled={disabled}
				/>

				{/* Suggested Slots */}
				{selectedDate && (
					<div className="space-y-2">
						<Label className="text-muted-foreground text-sm font-medium">Suggested slots</Label>
						{isLoadingAvailability ? (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="text-muted-foreground size-5 animate-spin" />
							</div>
						) : filteredSlots.length > 0 ? (
							<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
								{filteredSlots.map((slot, index) => {
									const slot12Hour = convertTo12Hour(slot.time)
									return (
										<Button
											key={index}
											variant={isSlotSelected(slot.time) ? "default" : "outline"}
											onClick={() => handleSlotClick(slot.time)}
											className="justify-start"
											size="sm"
											disabled={disabled}
										>
											<Clock className="mr-2 size-4" />
											{formatTime12Hour(slot12Hour)}
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
		</div>
	)
}
