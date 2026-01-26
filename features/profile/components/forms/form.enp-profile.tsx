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
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { enpProfileSchema, type EnpProfileSchema } from "@/features/profile/api/profile.schema"

export function EnpProfileForm() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const { data: enpProfile } = trpc.profile.getEnpProfile.useQuery()

	const form = useForm<EnpProfileSchema>({
		resolver: zodResolver(enpProfileSchema),
		values: {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			enpName: enpProfile?.enpName ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			enpRoleNumber: enpProfile?.enpRoleNumber ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			rollNo: enpProfile?.rollNo ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			rollNoDate: enpProfile?.rollNoDate ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			attyName: enpProfile?.attyName ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			commissionNo: enpProfile?.commissionNo ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			commissionNoValidUntil: enpProfile?.commissionNoValidUntil ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			ptrNo: enpProfile?.ptrNo ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			ptrNoLocation: enpProfile?.ptrNoLocation ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			ptrNoDate: enpProfile?.ptrNoDate ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			ibpNo: enpProfile?.ibpNo ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			ibpNoDate: enpProfile?.ibpNoDate ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			notaryEmail: enpProfile?.notaryEmail ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			notaryAddress: enpProfile?.notaryAddress ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			mcleNoPeriod: enpProfile?.mcleNoPeriod ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			mcleNo: enpProfile?.mcleNo ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			mcleNoDate: enpProfile?.mcleNoDate ?? "",
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			modeOfNotarization: enpProfile?.modeOfNotarization ?? "",
		},
	})

	const utils = trpc.useUtils()

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const { mutate, isPending } = trpc.profile.updateEnpProfile.useMutation({
		onSuccess: async data => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await utils.profile.getEnpProfile.invalidate()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
			toast.success(data.message)
			form.reset(form.getValues())
		},
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
		onError: err => toast.error(err.message),
	})

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
	const onSubmit = (values: EnpProfileSchema) => mutate(values)

	const todayYmd = new Date().toISOString().slice(0, 10)
	const maxDate = new Date(todayYmd)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Notary Seal Section */}
				<div className="space-y-4">
					<h3 className="text-base font-semibold">Notary Seal</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="enpName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., Mariae Francine Geraldine Biglaen y Sibulop"
											autoComplete="name"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="enpRoleNumber"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role Number</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 123456" autoComplete="off" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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
				</div>

				<Separator />

				{/* Credentials Section */}
				<div className="space-y-4">
					<h3 className="text-base font-semibold">Credentials</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="attyName"
							render={({ field }) => (
								<FormItem className="md:col-span-2">
									<FormLabel>Attorney Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., ATTY. MARIA ANGELICA M. DELA CRUZ-SAN FELIPE"
											autoComplete="name"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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
							name="notaryEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notary Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="Enter your notary email"
											autoComplete="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
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

						<FormField
							control={form.control}
							name="modeOfNotarization"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Mode of Notarization</FormLabel>
									<FormControl>
										<Input placeholder="e.g., REN" autoComplete="off" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				{/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
				<Button type="submit" className="mt-4" disabled={isPending}>
					{isPending ? "Updating ENP Profile..." : "Update ENP Profile"}
				</Button>
			</form>
		</Form>
	)
}
