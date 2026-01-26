"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Calendar } from "@/core/components/ui/calendar"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { enpProfileSchema, type EnpProfileSchema } from "@/features/profile/api/profile.schema"

export function EnpProfileForm() {
	const { data: enpProfile } = trpc.profile.getEnpProfile.useQuery()

	const form = useForm<EnpProfileSchema>({
		resolver: zodResolver(enpProfileSchema),
		values: {
			rollNo: enpProfile?.rollNo ?? "",
			rollNoDate: enpProfile?.rollNoDate ?? "",
			commissionNo: enpProfile?.commissionNo ?? "",
			commissionNoValidUntil: enpProfile?.commissionNoValidUntil ?? "",
			ptrNo: enpProfile?.ptrNo ?? "",
			ptrNoLocation: enpProfile?.ptrNoLocation ?? "",
			ptrNoDate: enpProfile?.ptrNoDate ?? "",
			ibpNo: enpProfile?.ibpNo ?? "",
			ibpNoDate: enpProfile?.ibpNoDate ?? "",
			notaryAddress: enpProfile?.notaryAddress ?? "",
			mcleNoPeriod: enpProfile?.mcleNoPeriod ?? "",
			mcleNo: enpProfile?.mcleNo ?? "",
			mcleNoDate: enpProfile?.mcleNoDate ?? "",
		},
	})

	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.profile.updateEnpProfile.useMutation({
		onSuccess: async data => {
			
			await utils.profile.getEnpProfile.invalidate()
			
			toast.success(data.message)
			form.reset(form.getValues())
		},
		
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: EnpProfileSchema) => mutate(values)

	const todayYmd = new Date().toISOString().slice(0, 10)
	const maxDate = new Date(todayYmd)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			{/* Roll Registration Section */}
			<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
				<CardHeader className="px-8 pt-4">
					<CardTitle className="text-lg font-medium">Roll Registration</CardTitle>
				</CardHeader>
				<CardContent className="px-8">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="rollNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Roll Number</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 123456" autoComplete="off" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="rollNoDate"
							render={({ field }) => {
								const dateValue = field.value ? new Date(field.value) : undefined
								const fieldId = `rollNoDate-${field.name}`

								return (
									<FormItem>
										<FormLabel htmlFor={fieldId}>Roll No. Date</FormLabel>
										<div>
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
															disabled={date => date > maxDate}
															className="rounded-md border shadow-sm"
															captionLayout="dropdown"
													/>
												</PopoverContent>
											</Popover>
										</div>
										<FormMessage />
									</FormItem>
								)
							}}
						/>
					</div>
				</CardContent>
			</Card>

		{/* Licensing Section */}
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
				<CardHeader className="px-8 pt-4">
					<CardTitle className="text-lg font-medium">Licensing</CardTitle>
				</CardHeader>
				<CardContent className="px-8">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="commissionNo"
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
							name="commissionNoValidUntil"
							render={({ field }) => {
								const dateValue = field.value ? new Date(field.value) : undefined
								const fieldId = `commissionNoValidUntil-${field.name}`

								return (
									<FormItem>
										<FormLabel htmlFor={fieldId}>Commission Valid Until</FormLabel>
										<div>
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
															className="rounded-md border shadow-sm"
															captionLayout="dropdown"
													/>
												</PopoverContent>
											</Popover>
										</div>
										<FormMessage />
									</FormItem>
								)
							}}
						/>

						<FormField
							control={form.control}
							name="ptrNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>PTR No.</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 1234567890" autoComplete="off" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="ptrNoLocation"
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

						<FormField
							control={form.control}
							name="ptrNoDate"
							render={({ field }) => {
								const dateValue = field.value ? new Date(field.value) : undefined
								const fieldId = `ptrNoDate-${field.name}`

								return (
									<FormItem>
										<FormLabel htmlFor={fieldId}>PTR Date</FormLabel>
										<div>
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
															disabled={date => date > maxDate}
															className="rounded-md border shadow-sm"
															captionLayout="dropdown"
													/>
												</PopoverContent>
											</Popover>
										</div>
										<FormMessage />
									</FormItem>
								)
							}}
						/>

						<FormField
							control={form.control}
							name="ibpNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>IBP No.</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 123456" autoComplete="off" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="ibpNoDate"
							render={({ field }) => {
								const dateValue = field.value ? new Date(field.value) : undefined
								const fieldId = `ibpNoDate-${field.name}`

								return (
									<FormItem>
										<FormLabel htmlFor={fieldId}>IBP Date</FormLabel>
										<div>
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
															disabled={date => date > maxDate}
															className="rounded-md border shadow-sm"
															captionLayout="dropdown"
													/>
												</PopoverContent>
											</Popover>
										</div>
										<FormMessage />
									</FormItem>
								)
							}}
						/>

						<FormField
							control={form.control}
							name="notaryAddress"
							render={({ field }) => (
								<FormItem className="md:col-span-2">
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
					</div>
				</CardContent>
			</Card>

			{/* Certifications Section */}
			<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
				<CardHeader className="px-8 pt-4">
					<CardTitle className="text-lg font-medium">Certifications</CardTitle>
				</CardHeader>
				<CardContent className="px-8">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="mcleNoPeriod"
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
							name="mcleNo"
							render={({ field }) => (
								<FormItem>
									<FormLabel>MCLE No.</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 1234567" autoComplete="off" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="mcleNoDate"
							render={({ field }) => {
								const dateValue = field.value ? new Date(field.value) : undefined
								const fieldId = `mcleNoDate-${field.name}`

								return (
									<FormItem>
										<FormLabel htmlFor={fieldId}>MCLE Date</FormLabel>
										<div>
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
															disabled={date => date > maxDate}
															className="rounded-md border shadow-sm"
															captionLayout="dropdown"
													/>
												</PopoverContent>
											</Popover>
										</div>
										<FormMessage />
									</FormItem>
								)
							}}
						/>
					</div>
				</CardContent>
			</Card>

				<div className="flex justify-end">
					<Button type="submit" disabled={isPending}>
						{isPending ? "Updating ENP Profile..." : "Update ENP Profile"}
					</Button>
				</div>
			</form>
		</Form>
	)
}
