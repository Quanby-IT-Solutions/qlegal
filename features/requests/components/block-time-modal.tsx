"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { trpc } from "@/services/trpc/client"

export type BlockTimeData = {
	type: "ONE_TIME" | "RECURRING"
	date?: string // YYYY-MM-DD (for ONE_TIME)
	dayOfWeek?: number // 0-6 (for RECURRING)
	startTime: string // HH:MM
	endTime: string // HH:MM
	reason?: string
}

interface BlockTimeModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (data: BlockTimeData) => void
}

export function BlockTimeModal({ isOpen, onClose, onSave }: BlockTimeModalProps) {
	const [blockType, setBlockType] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME")
	const [date, setDate] = useState("")
	const [startTime, setStartTime] = useState("")
	const [endTime, setEndTime] = useState("")
	const [reason, setReason] = useState("")
	const [selectedDays, setSelectedDays] = useState<number[]>([])

	const blockTimeMutation = trpc.requests.blockTimeSlot.useMutation({
		onSuccess: () => {
			toast.success("Time slot blocked successfully!")
			handleClose()
		},
		onError: (error) => {
			toast.error("Failed to block time slot", {
				description: error?.message ?? "An unexpected error occurred",
			})
		},
	})

	const handleSave = async () => {
		// Validation
		if (blockType === "ONE_TIME" && !date) {
			toast.error("Please select a date")
			return
		}
		if (!startTime || !endTime) {
			toast.error("Please set start and end times")
			return
		}

		const data: BlockTimeData = {
			type: blockType,
			date: blockType === "ONE_TIME" ? date : undefined,
			dayOfWeek: blockType === "RECURRING" ? (selectedDays.length === 7 ? undefined : selectedDays[0]) : undefined,
			startTime,
			endTime,
			reason: reason || undefined,
		}

		await onSave(data)

		// Reset form
		setDate("")
		setStartTime("")
		setEndTime("")
		setReason("")
		setSelectedDays([])
	}

	const handleDayToggle = (day: number) => {
		if (selectedDays.includes(day)) {
			setSelectedDays((prev) => prev.filter((d) => d !== day))
		} else {
			setSelectedDays((prev) => [...prev, day])
		}
	}

	const handleSelectAllDays = () => {
		setSelectedDays([0, 1, 2, 3, 4, 5, 6])
	}

	const handleClose = () => {
		onClose()
		setDate("")
		setStartTime("")
		setEndTime("")
		setReason("")
		setSelectedDays([])
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="size-5" />
						Block Time Slot
					</DialogTitle>
					<DialogDescription>
						Block specific dates or create recurring time blocks when you're unavailable for notarizations.
					</DialogDescription>
				</DialogHeader>

				<Tabs value={blockType} onValueChange={setBlockType} className="w-full">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="ONE_TIME">Block Specific Date</TabsTrigger>
						<TabsTrigger value="RECURRING">Recurring Block</TabsTrigger>
					</TabsList>

					<TabsContent value="ONE_TIME" className="mt-4">
						<div className="space-y-4">
							<div>
								<Label htmlFor="date">Date</Label>
								<Input
									id="date"
									type="date"
									value={date}
									onChange={(e) => setDate(e.target.value)}
									className="w-full"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="start-time">Start Time</Label>
									<Input
										id="start-time"
										type="time"
										value={startTime}
										onChange={(e) => setStartTime(e.target.value)}
										className="w-full"
										step={900} // 15 minutes
									/>
								</div>
								<div>
									<Label htmlFor="end-time">End Time</Label>
									<Input
										id="end-time"
										type="time"
										value={endTime}
										onChange={(e) => setEndTime(e.target.value)}
										className="w-full"
										step={900} // 15 minutes
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="reason-one-time">Reason (optional)</Label>
								<Input
									id="reason-one-time"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="e.g., Personal time, Meeting, etc."
									className="w-full"
								/>
							</div>
						</div>
					</TabsContent>

					<TabsContent value="RECURRING" className="mt-4">
						<div className="space-y-6">
							<div className="rounded-lg border bg-muted/50 p-4">
								<div className="flex items-center justify-between mb-3">
									<h4 className="font-semibold">Select Days</h4>
									<button
										onClick={handleSelectAllDays}
										className="text-sm text-primary hover:underline"
										type="button"
									>
										Select All (Mon-Sun)
									</button>
								</div>
								<div className="grid grid-cols-7 gap-2">
									{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
										<div key={day}>
											<button
												onClick={() => handleDayToggle(index)}
												className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-colors ${
													selectedDays.includes(index)
														? "bg-primary text-primary-foreground"
														: "hover:bg-muted"
												}`}
												type="button"
											>
												<span className="font-medium">{day}</span>
											</button>
										</div>
									))}
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="start-time-recurring">Start Time</Label>
									<Input
										id="start-time-recurring"
										type="time"
										value={startTime}
										onChange={(e) => setStartTime(e.target.value)}
										className="w-full"
										step={900} // 15 minutes
									/>
								</div>
								<div>
									<Label htmlFor="end-time-recurring">End Time</Label>
									<Input
										id="end-time-recurring"
										type="time"
										value={endTime}
										onChange={(e) => setEndTime(e.target.value)}
										className="w-full"
										step={900} // 15 minutes
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="reason-recurring">Reason (optional)</Label>
								<Input
									id="reason-recurring"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="e.g., Daily personal time, Weekly lunch break"
									className="w-full"
								/>
							</div>

							{selectedDays.length > 0 && selectedDays.length < 7 && (
								<div className="text-sm text-muted-foreground">
									Selected: {selectedDays.length} day(s) of week
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>

				<DialogFooter>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							{blockType === "ONE_TIME" && "Blocks specific date/time"}
							{blockType === "RECURRING" && `Blocks ${selectedDays.length > 0 ? selectedDays.length : "all"} day(s) of week`}
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={handleClose} type="button">
								Cancel
							</Button>
							<Button onClick={handleSave} disabled={blockTimeMutation.isPending} type="button">
								{blockTimeMutation.isPending ? "Saving..." : "Block Time"}
							</Button>
						</div>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
