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

interface CredentialsStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
}

export function CredentialsStep({ form }: CredentialsStepProps) {
	const currentYear = new Date().getFullYear()
	const minDate = new Date(currentYear - 10, 0, 1)
	const maxDate = new Date(currentYear + 10, 11, 31)

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="notaryInfo.commissionNo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Commission No.</FormLabel>
							<FormControl>
								<Input placeholder="e.g., 2024 - 024" autoComplete="off" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="notaryInfo.commissionNoValidUntil"
					render={({ field }) => {
						const dateValue = field.value ? new Date(field.value) : undefined
						const fieldId = `commissionNoValidUntil-${field.name}`

						return (
							<FormItem>
								<FormLabel htmlFor={fieldId}>Commission Valid Until</FormLabel>
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

			<div className="grid grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="notaryInfo.ptrNo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>PTR No.</FormLabel>
							<FormControl>
								<Input placeholder="e.g., 1234567890" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="notaryInfo.ptrNoLocation"
					render={({ field }) => (
						<FormItem>
							<FormLabel>PTR Location</FormLabel>
							<FormControl>
								<Input placeholder="e.g., Manila" autoComplete="address-line2" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<FormField
				control={form.control}
				name="notaryInfo.ptrNoDate"
				render={({ field }) => {
					const dateValue = field.value ? new Date(field.value) : undefined
					const fieldId = `ptrNoDate-${field.name}`

					return (
						<FormItem>
							<FormLabel htmlFor={fieldId}>PTR Date</FormLabel>
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

			<div className="grid grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="notaryInfo.ibpNo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>IBP No.</FormLabel>
							<FormControl>
								<Input placeholder="e.g., 123456" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="notaryInfo.ibpNoDate"
					render={({ field }) => {
						const dateValue = field.value ? new Date(field.value) : undefined
						const fieldId = `ibpNoDate-${field.name}`

						return (
							<FormItem>
								<FormLabel htmlFor={fieldId}>IBP Date</FormLabel>
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

			<FormField
				control={form.control}
				name="notaryInfo.notaryAddress"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Notary Address</FormLabel>
						<FormControl>
							<Input
								placeholder="Your notary office address"
								autoComplete="street-address"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="notaryInfo.mcleNoPeriod"
					render={({ field }) => (
						<FormItem>
							<FormLabel>MCLE Period</FormLabel>
							<FormControl>
								<Input placeholder="e.g., VIII" autoComplete="off" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="notaryInfo.mcleNo"
					render={({ field }) => (
						<FormItem>
							<FormLabel>MCLE No.</FormLabel>
							<FormControl>
								<Input placeholder="e.g., 1234567" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<FormField
				control={form.control}
				name="notaryInfo.mcleNoDate"
				render={({ field }) => {
					const dateValue = field.value ? new Date(field.value) : undefined
					const fieldId = `mcleNoDate-${field.name}`

					return (
						<FormItem>
							<FormLabel htmlFor={fieldId}>MCLE Date</FormLabel>
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
