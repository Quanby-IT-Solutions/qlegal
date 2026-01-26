"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { type UseFormReturn } from "react-hook-form"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { cn } from "@/core/lib/utils"

import { type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"

interface NotarySealStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
}

export function NotarySealStep({ form }: NotarySealStepProps) {
	const currentYear = new Date().getFullYear()
	const minDate = new Date(currentYear - 10, 0, 1)
	const maxDate = new Date(currentYear + 10, 11, 31)

	return (
		<div className="space-y-4">
			<FormField
				control={form.control}
				name="seal.enpRollNumber"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Roll Number</FormLabel>
						<FormControl>
							<Input
								placeholder="e.g., 123456"
								inputMode="numeric"
								autoComplete="off"
								maxLength={6}
								pattern="\d{6}"
								{...field}
								onChange={e => {
									const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6)
									field.onChange(digitsOnly)
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="seal.rollNoDate"
				render={({ field }) => {
					const dateValue = field.value ? new Date(field.value) : undefined
					const fieldId = `rollNoDate-${field.name}`

					return (
						<FormItem>
							<FormLabel htmlFor={fieldId}>Roll No. Date</FormLabel>
							<FormControl>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											id={fieldId}
											type="button"
											variant="outline"
											data-empty={!dateValue}
											className={cn(
												"data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal",
												!dateValue && "text-muted-foreground"
											)}
										>
											<CalendarIcon className="mr-2 size-4" />
											{dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={dateValue}
											onSelect={date => {
												field.onChange(date?.toISOString())
											}}
											defaultMonth={dateValue}
											fromDate={minDate}
											toDate={maxDate}
											fromYear={currentYear - 10}
											toYear={currentYear + 10}
											className="rounded-md border shadow-sm"
											captionLayout="dropdown"
										/>
									</PopoverContent>
								</Popover>
							</FormControl>
							<FormMessage />
						</FormItem>
					)
				}}
			/>
		</div>
	)
}
