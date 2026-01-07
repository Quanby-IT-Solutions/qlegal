"use client"

import { Calendar, Clock, Handshake, Loader2, Mail, Video } from "lucide-react"
import { format, startOfToday } from "date-fns"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Textarea } from "@/core/components/ui/textarea"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import type { 
	AvailabilitySlot, 
	BookingState, 
	ConsultationType, 
	MeetingPreference, 
	WorkflowType 
} from "../types/find-notary.types"

interface BookingFormProps {
	bookingState: BookingState
	availabilitySlots: AvailabilitySlot[] | undefined
	isLoadingAvailability: boolean
	isBookingInProgress: boolean
	onBookingStateChange: (updates: Partial<BookingState>) => void
	onSubmitBooking: () => void
}

export function BookingForm({
	bookingState,
	availabilitySlots,
	isLoadingAvailability,
	isBookingInProgress,
	onBookingStateChange,
	onSubmitBooking,
}: BookingFormProps) {
	const today = startOfToday()
	const {
		bookingWorkflow,
		selectedDate,
		selectedTime,
		consultationType,
		meetingPreference,
		specialRequirements,
		location,
	} = bookingState

	const filteredSlots = selectedDate && availabilitySlots
		? availabilitySlots.filter((slot) => 
			slot.date === format(selectedDate, "yyyy-MM-dd") && slot.available
		)
		: []

	return (
		<Card>
			<CardHeader>
				<CardTitle>Schedule Your Consultation</CardTitle>
				<CardDescription>
					{bookingWorkflow === "REN" 
						? "Select a time for your remote consultation"
						: "Select a time for your in-person consultation"
					}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Date Selection */}
				<div>
					<Label className="text-base font-medium">Select Date</Label>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" className="w-full justify-start text-left font-normal mt-2">
								<Calendar className="mr-2 h-4 w-4" />
								{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0">
							<CalendarComponent
								mode="single"
								selected={selectedDate}
								onSelect={(date) => onBookingStateChange({ selectedDate: date })}
								disabled={(date) => date < today}
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
							<p className="text-xs text-muted-foreground">
								Choose a suggested slot or type a custom time (24h or 12h accepted).
							</p>
						</div>
						<input
							type="time"
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							value={selectedTime || ""}
							onChange={(e) => onBookingStateChange({ selectedTime: e.target.value })}
						/>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-muted-foreground">Suggested slots</Label>
							{isLoadingAvailability ? (
								<div className="flex items-center justify-center py-4">
									<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
								</div>
							) : filteredSlots.length > 0 ? (
								<div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
									{filteredSlots.map((slot, index) => (
										<Button
											key={index}
											variant={selectedTime === slot.time ? "default" : "outline"}
											onClick={() => onBookingStateChange({ selectedTime: slot.time })}
											className="justify-start"
										>
											<Clock className="mr-2 h-4 w-4" />
											{slot.time}
										</Button>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									No suggested slots for this date. Enter a custom time above.
								</p>
							)}
						</div>
					</div>
				)}

				{/* Consultation Type */}
				<div>
					<Label className="text-base font-medium">Consultation Type</Label>
					<RadioGroup 
						value={consultationType} 
						onValueChange={(value) => onBookingStateChange({ consultationType: value as ConsultationType })} 
						className="mt-2"
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="INITIAL" id="initial" />
							<Label htmlFor="initial" className="font-normal">Initial Consultation</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="FOLLOWUP" id="followup" />
							<Label htmlFor="followup" className="font-normal">Follow-up Consultation</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="URGENT" id="urgent" />
							<Label htmlFor="urgent" className="font-normal">Urgent Consultation</Label>
						</div>
					</RadioGroup>
				</div>

				{/* Meeting Preference (REN only) */}
				{bookingWorkflow === "REN" && (
					<div>
						<Label className="text-base font-medium">Meeting Preference</Label>
						<RadioGroup 
							value={meetingPreference} 
							onValueChange={(value) => onBookingStateChange({ meetingPreference: value as MeetingPreference })} 
							className="mt-2"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="VIDEO_CALL" id="video" />
								<Label htmlFor="video" className="font-normal">
									<div className="flex items-center gap-2">
										<Video className="h-4 w-4" />
										<div>
											<div className="font-medium">Video Call</div>
											<div className="text-xs text-muted-foreground">Full video consultation with screen sharing</div>
										</div>
									</div>
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="CHAT_ONLY" id="chat" />
								<Label htmlFor="chat" className="font-normal">
									<div className="flex items-center gap-2">
										<Mail className="h-4 w-4" />
										<div>
											<div className="font-medium">Chat Only</div>
											<div className="text-xs text-muted-foreground">Text-based consultation via messaging</div>
										</div>
									</div>
								</Label>
							</div>
						</RadioGroup>
					</div>
				)}

				{/* Location for IEN */}
				{bookingWorkflow === "IEN" && (
					<div>
						<Label htmlFor="location" className="text-base font-medium">
							Meeting Location <span className="text-red-500">*</span>
						</Label>
						<input
							id="location"
							type="text"
							placeholder="Enter the meeting location address..."
							value={location}
							onChange={(e) => onBookingStateChange({ location: e.target.value })}
							className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						/>
					</div>
				)}

				{/* Special Requirements */}
				<div>
					<Label htmlFor="requirements" className="text-base font-medium">
						Special Requirements (Optional)
					</Label>
					<Textarea
						id="requirements"
						placeholder="Any special requirements or documents you need notarized..."
						value={specialRequirements}
						onChange={(e) => onBookingStateChange({ specialRequirements: e.target.value })}
						className="mt-2"
					/>
				</div>

				{/* Booking Button */}
				<Button
					onClick={onSubmitBooking}
					disabled={!selectedDate || !selectedTime || isBookingInProgress}
					className="w-full"
					size="lg"
				>
					{isBookingInProgress ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Booking...
						</>
					) : (
						<>
							{bookingWorkflow === "REN" ? (
								<>
									<Video className="mr-2 h-4 w-4" />
									Book Remote Consultation
								</>
							) : (
								<>
									<Handshake className="mr-2 h-4 w-4" />
									Book In-Person Consultation
								</>
							)}
						</>
					)}
				</Button>

				{(!selectedDate || !selectedTime) && (
					<p className="text-sm text-muted-foreground text-center">
						Please select a date and time to continue
					</p>
				)}
			</CardContent>
		</Card>
	)
}