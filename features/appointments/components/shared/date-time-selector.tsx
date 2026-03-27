"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { useController, type Control, type FieldValues, type Path } from "react-hook-form"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"

import { TimeWheelPicker } from "@/features/appointments/components/schedule/time-wheel-picker"

interface DateTimeSelectorProps<TFieldValues extends FieldValues = FieldValues> {
	control: Control<TFieldValues>
	disabled?: boolean
	minDate?: Date
}

export function DateTimeSelector<TFieldValues extends FieldValues = FieldValues>({
	control,
	disabled = false,
	minDate,
}: DateTimeSelectorProps<TFieldValues>) {
	const currentTime = useMemo(() => {
		const now = new Date()
		return {
			hour: format(now, "hh"),
			minute: format(now, "mm"),
			period: format(now, "a").toLowerCase() as "am" | "pm",
		}
	}, [])

	const { field: minuteField } = useController({
		control,
		name: "minute" as Path<TFieldValues>,
	})

	const { field: periodField } = useController({
		control,
		name: "period" as Path<TFieldValues>,
	})

	const minimumDate = useMemo(() => minDate ?? new Date(new Date().setHours(0, 0, 0, 0)), [minDate])

	return (
		<div className="flex gap-4">
			<FormField
				control={control}
				name={"selectedDate" as Path<TFieldValues>}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Date</FormLabel>
						<Popover>
							<PopoverTrigger asChild>
								<FormControl>
									<Button variant="outline" disabled={disabled}>
										<CalendarIcon className="mr-2 size-4" />
										{field.value ? format(field.value as Date, "PPP") : <span>Pick a date</span>}
									</Button>
								</FormControl>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={field.value as Date | undefined}
									onSelect={value => field.onChange(value ?? new Date())}
									disabled={date => date < minimumDate}
								/>
							</PopoverContent>
						</Popover>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name={"hour" as Path<TFieldValues>}
				render={({ field }) => (
					<FormItem>
						<FormLabel>Time</FormLabel>
						<FormControl>
							<TimeWheelPicker
								hour={(field.value as string | undefined) ?? currentTime.hour}
								minute={(minuteField.value as string | undefined) ?? currentTime.minute}
								period={(periodField.value as "am" | "pm" | undefined) ?? currentTime.period}
								onHourChange={field.onChange}
								onMinuteChange={minuteField.onChange}
								onPeriodChange={periodField.onChange}
								disabled={disabled}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	)
}
