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
import { Separator } from "@/core/components/ui/separator"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { enpProfileSchema, type EnpProfileSchema } from "@/features/profile/api/profile.schema"

// Helper function to safely parse and format dates
const parseDate = (dateString: string | null | undefined): Date | undefined => {
	if (!dateString) return undefined
	const parsed = new Date(dateString)
	return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function EnpProfileForm() {
	const { data: enpProfile } = trpc.profile.getEnpProfile.useQuery()

	const form = useForm<EnpProfileSchema>({
		resolver: zodResolver(enpProfileSchema),
		values: {
			enpName: enpProfile?.enpName ?? "",
			enpRoleNumber: enpProfile?.enpRoleNumber ?? "",
			rollNo: enpProfile?.rollNo ?? "",
			rollNoDate: enpProfile?.rollNoDate ?? "",
			attyName: enpProfile?.attyName ?? "",
			commissionNo: enpProfile?.commissionNo ?? "",
			commissionNoValidUntil: enpProfile?.commissionNoValidUntil ?? "",
			ptrNo: enpProfile?.ptrNo ?? "",
			ptrNoLocation: enpProfile?.ptrNoLocation ?? "",
			ptrNoDate: enpProfile?.ptrNoDate ?? "",
			ibpNo: enpProfile?.ibpNo ?? "",
			ibpNoDate: enpProfile?.ibpNoDate ?? "",
			notaryEmail: enpProfile?.notaryEmail ?? "",
			notaryAddress: enpProfile?.notaryAddress ?? "",
			mcleNoPeriod: enpProfile?.mcleNoPeriod ?? "",
			mcleNo: enpProfile?.mcleNo ?? "",
			mcleNoDate: enpProfile?.mcleNoDate ?? "",
			modeOfNotarization: enpProfile?.modeOfNotarization ?? "",
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
				{/* Notary Seal Section */}
				<div className="space-y-4">
					<h3 className="text-base font-semibold">Notary Seal</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<FormField
							control={form.control}
							name="enpName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>ENP Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g., Mariae Francine Geraldine Biglaen y Sibulop"
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
									<FormLabel>ENP Role Number</FormLabel>
									<FormControl>
										<Input placeholder="e.g., 123456" {...field} />
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
										<Input placeholder="e.g., 123456" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="rollNoDate"
							render={({ field }) => {
								const dateValue = parseDate(field.value)

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
										<Input placeholder="e.g., 2024 - 024" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="commissionNoValidUntil"
							render={({ field }) => {
								const dateValue = parseDate(field.value)

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

						<FormField
							control={form.control}
							name="ptrNo"
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
							name="ptrNoLocation"
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

						<FormField
							control={form.control}
							name="ptrNoDate"
							render={({ field }) => {
								const dateValue = parseDate(field.value)

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

						<FormField
							control={form.control}
							name="ibpNo"
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
							name="ibpNoDate"
							render={({ field }) => {
								const dateValue = parseDate(field.value)

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

						<FormField
							control={form.control}
							name="notaryEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notary Email</FormLabel>
									<FormControl>
										<Input type="email" placeholder="Enter your notary email" {...field} />
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
										<Input placeholder="Your notary office address" {...field} />
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
										<Input placeholder="e.g., VIII" {...field} />
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
										<Input placeholder="e.g., 1234567" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="mcleNoDate"
							render={({ field }) => {
								const dateValue = parseDate(field.value)

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

						<FormField
							control={form.control}
							name="modeOfNotarization"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Mode of Notarization</FormLabel>
									<FormControl>
										<Input placeholder="e.g., REN" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<Button type="submit" className="mt-4" disabled={isPending}>
					{isPending ? "Updating ENP Profile..." : "Update ENP Profile"}
				</Button>
			</form>
		</Form>
	)
}
