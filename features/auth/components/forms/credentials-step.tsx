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
	primaryName: string
}

export function CredentialsStep({ form, primaryName }: CredentialsStepProps) {
	const attorneyName = primaryName?.trim() || "No name provided yet"
	const todayYmd = new Date().toISOString().slice(0, 10)

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
								<Input placeholder="e.g., 123456" {...field} />
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

						return (
							<FormItem>
								<FormLabel>Commission Valid Until</FormLabel>
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
								<Input placeholder="e.g., Manila" {...field} />
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
					const maxDate = new Date(todayYmd)

					return (
						<FormItem>
							<FormLabel>PTR Date</FormLabel>
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
						const maxDate = new Date(todayYmd)

						return (
							<FormItem>
								<FormLabel>IBP Date</FormLabel>
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

			<FormField
				control={form.control}
				name="notaryInfo.notaryAddress"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Notary Address</FormLabel>
						<FormControl>
							<Input placeholder="Your notary office address" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="notaryInfo.mcleNoPeriod"
					render={({ field }) => {
						const dateValue = field.value ? new Date(field.value) : undefined
						const maxDate = new Date(todayYmd)

						return (
							<FormItem>
								<FormLabel>MCLE Period</FormLabel>
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
					const maxDate = new Date(todayYmd)

					return (
						<FormItem>
							<FormLabel>MCLE Date</FormLabel>
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
