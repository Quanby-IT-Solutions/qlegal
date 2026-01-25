"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod/v4"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Calendar } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

import type { BlockTime } from "../types"
import { TimeWheelPicker } from "./time-wheel-picker"

const blockTimeSchema = z
	.object({
		blockType: z.enum(["full-day", "time-slot"]),
		date: z.coerce.date({ errorMap: () => ({ message: "Date is required" }) }),
		// Time fields - only used for time-slot blocking
		startHour: z.string().optional(),
		startMinute: z.string().optional(),
		startPeriod: z.enum(["am", "pm"]).optional(),
		endHour: z.string().optional(),
		endMinute: z.string().optional(),
		endPeriod: z.enum(["am", "pm"]).optional(),
		reason: z.string().optional().or(z.literal("")),
	})
	.refine(data => {
		// If time-slot blocking, time fields are required
		if (data.blockType === "time-slot") {
			return (
				data.startHour !== undefined &&
				data.startMinute !== undefined &&
				data.startPeriod !== undefined &&
				data.endHour !== undefined &&
				data.endMinute !== undefined &&
				data.endPeriod !== undefined
			)
		}
		return true
	}, "Time fields are required for time-slot blocking")

export type BlockTimeSchema = z.infer<typeof blockTimeSchema>

interface BlockingDialogProps {
	isOpen: boolean
	onClose: () => void
	onSave: (blockTime: BlockTime) => void
}

// Helper function to construct a Date from date, hour, minute, and period
const constructDate = (date: Date, hour: string, minute: string, period: "am" | "pm"): Date => {
	let h = Number.parseInt(hour, 10)
	if (period === "pm" && h !== 12) {
		h += 12
	} else if (period === "am" && h === 12) {
		h = 0
	}

	const newDate = new Date(date)
	newDate.setHours(h, Number.parseInt(minute, 10), 0, 0)
	return newDate
}

export function BlockingDialog({ isOpen, onClose, onSave }: BlockingDialogProps) {
	const [startDateOpen, setStartDateOpen] = useState(false)

	const form = useForm<BlockTimeSchema>({
		resolver: zodResolver(blockTimeSchema),
		defaultValues: {
			blockType: "full-day",
			date: new Date(),
			startHour: "09",
			startMinute: "00",
			startPeriod: "am",
			endHour: "10",
			endMinute: "00",
			endPeriod: "am",
			reason: "",
		},
	})

	const watchBlockType = form.watch("blockType")

	const handleSave = (values: BlockTimeSchema) => {
		const blockTime: BlockTime = {
			id: `block-${Date.now()}`,
			date: values.date,
			reason: values.reason?.trim() || undefined,
			blockType: values.blockType,
		}

		if (values.blockType === "time-slot") {
			blockTime.startTime = constructDate(
				values.date,
				values.startHour!,
				values.startMinute!,
				values.startPeriod!
			)
			blockTime.endTime = constructDate(
				values.date,
				values.endHour!,
				values.endMinute!,
				values.endPeriod!
			)
		}

		onSave(blockTime)
		form.reset()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Block Availability</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
						{/* Block Type Selection */}
						<FormField
							control={form.control}
							name="blockType"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Block Type</FormLabel>
									<FormControl>
										<RadioGroup
											value={field.value}
											onValueChange={value => field.onChange(value as "full-day" | "time-slot")}
											className="flex flex-col gap-2"
										>
											<div className="flex items-center space-x-2 space-y-0">
												<RadioGroupItem value="full-day" id="full-day" />
												<FormLabel htmlFor="full-day" className="cursor-pointer font-normal">
													Full Day
												</FormLabel>
											</div>
											<div className="flex items-center space-x-2 space-y-0">
												<RadioGroupItem value="time-slot" id="time-slot" />
												<FormLabel htmlFor="time-slot" className="cursor-pointer font-normal">
													Time Slot
												</FormLabel>
											</div>
										</RadioGroup>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Date Selection */}
						<FormField
							control={form.control}
							name="date"
							render={({ field }) => (
								<FormItem className="flex flex-col gap-2">
									<FormLabel>Date</FormLabel>
									<Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-start text-left font-normal",
														!field.value && "text-muted-foreground"
													)}
												>
													<CalendarIcon className="mr-2 size-4" />
													{field.value ? format(field.value, "PPP") : "Pick a date"}
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={field.value}
												onSelect={date => {
													field.onChange(date)
													setStartDateOpen(false)
												}}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Time Selection - Only for time-slot blocking */}
						{watchBlockType === "time-slot" && (
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<FormLabel>Start Time</FormLabel>
									<FormField
										control={form.control}
										name="startHour"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input type="hidden" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="startMinute"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input type="hidden" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="startPeriod"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input type="hidden" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<TimeWheelPicker
										hour={form.watch("startHour") || "09"}
										minute={form.watch("startMinute") || "00"}
										period={form.watch("startPeriod") || "am"}
										onHourChange={value => form.setValue("startHour", value)}
										onMinuteChange={value => form.setValue("startMinute", value)}
										onPeriodChange={value => form.setValue("startPeriod", value)}
									/>
								</div>

								<div className="space-y-2">
									<FormLabel>End Time</FormLabel>
									<FormField
										control={form.control}
										name="endHour"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input type="hidden" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="endMinute"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input type="hidden" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="endPeriod"
										render={({ field }) => (
											<FormItem>
												<FormControl>
													<Input type="hidden" {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<TimeWheelPicker
										hour={form.watch("endHour") || "10"}
										minute={form.watch("endMinute") || "00"}
										period={form.watch("endPeriod") || "am"}
										onHourChange={value => form.setValue("endHour", value)}
										onMinuteChange={value => form.setValue("endMinute", value)}
										onPeriodChange={value => form.setValue("endPeriod", value)}
									/>
								</div>
							</div>
						)}

						{/* Reason */}
						<FormField
							control={form.control}
							name="reason"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Reason (Optional)</FormLabel>
									<FormControl>
										<Textarea placeholder="Add a reason for blocking this time" rows={3} {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button type="button" variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit">Block Time</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
