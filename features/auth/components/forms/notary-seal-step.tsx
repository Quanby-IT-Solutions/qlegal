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
	primaryName: string
}

export function NotarySealStep({ form, primaryName }: NotarySealStepProps) {
	// const sealName = primaryName?.trim() || "No name provided yet"
	const todayYmd = new Date().toISOString().slice(0, 10)

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
					const maxDate = new Date(todayYmd)

					return (
						<FormItem>
							<FormLabel>Roll No. Date</FormLabel>
							<FormControl>
								<Popover>
									<PopoverTrigger asChild>
										<Button
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
											disabled={date => date > maxDate}
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
