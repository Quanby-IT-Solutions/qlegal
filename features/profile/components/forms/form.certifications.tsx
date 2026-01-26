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

import {
	certificationsSchema,
	type CertificationsSchema,
} from "@/features/profile/api/profile.schema"

export function CertificationsForm() {
	const { data: enpProfile } = trpc.profile.getEnpProfile.useQuery()

	const form = useForm<CertificationsSchema>({
		resolver: zodResolver(certificationsSchema),
		values: {
			mcleNoPeriod: enpProfile?.mcleNoPeriod ?? "",
			mcleNo: enpProfile?.mcleNo ?? "",
			mcleNoDate: enpProfile?.mcleNoDate ?? "",
		},
	})

	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.profile.updateCertifications.useMutation({
		onSuccess: async data => {
			await utils.profile.getEnpProfile.invalidate()
			toast.success(data.message)
			form.reset(form.getValues())
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: CertificationsSchema) => mutate(values)

	const currentYear = new Date().getFullYear()
	const minDate = new Date(currentYear - 10, 0, 1)
	const maxDate = new Date(currentYear + 10, 11, 31)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
													fromDate={minDate}
													toDate={maxDate}
													fromYear={currentYear - 10}
													toYear={currentYear + 10}
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

				<Button type="submit" disabled={isPending}>
					{isPending ? "Updating Certifications..." : "Update Certifications"}
				</Button>
			</form>
		</Form>
	)
}
