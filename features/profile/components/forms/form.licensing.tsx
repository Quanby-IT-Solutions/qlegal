"use client"

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
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { licensingSchema, type LicensingSchema } from "@/features/profile/api/profile.schema"

export function LicensingForm() {
	const { data: enpProfile } = trpc.profile.getEnpProfile.useQuery()

	const form = useForm<LicensingSchema>({
		resolver: zodResolver(licensingSchema),
		values: {
			commissionNo: enpProfile?.commissionNo ?? "",
			commissionNoValidUntil: enpProfile?.commissionNoValidUntil ?? "",
			ptrNo: enpProfile?.ptrNo ?? "",
			ptrNoLocation: enpProfile?.ptrNoLocation ?? "",
			ptrNoDate: enpProfile?.ptrNoDate ?? "",
			ibpNo: enpProfile?.ibpNo ?? "",
			ibpNoDate: enpProfile?.ibpNoDate ?? "",
			notaryAddress: enpProfile?.notaryAddress ?? "",
		},
	})

	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.profile.updateLicensing.useMutation({
		onSuccess: async data => {
			await utils.profile.getEnpProfile.invalidate()
			toast.success(data.message)
			form.reset(form.getValues())
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: LicensingSchema) => mutate(values)

	const todayYmd = new Date().toISOString().slice(0, 10)
	const maxDate = new Date(todayYmd)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

				<Button type="submit" disabled={isPending}>
					{isPending ? "Updating Licensing..." : "Update Licensing"}
				</Button>
			</form>
		</Form>
	)
}
