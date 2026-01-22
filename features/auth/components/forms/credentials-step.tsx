"use client"

import { type UseFormReturn } from "react-hook-form"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { DateInput } from "@/core/components/ui/date-input"
import { Input } from "@/core/components/ui/input"

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
			<div className="bg-muted/40 rounded-md border p-3 text-sm">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Attorney Name
				</p>
				<p className="font-medium">{attorneyName}</p>
				<p className="text-muted-foreground mt-1">
					This will be used across your notary credentials. Update it by editing your primary name.
				</p>
			</div>

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
					render={({ field }) => (
						<FormItem>
							<FormLabel>Commission Valid Until</FormLabel>
							<FormControl>
								<DateInput
									placeholder="e.g., 5 June 2018"
									value={field.value ?? undefined}
									onChange={(date: Date | undefined) => {
										field.onChange(date?.toISOString())
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
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
				render={({ field }) => (
					<FormItem>
						<FormLabel>PTR Date</FormLabel>
						<FormControl>
							<DateInput
								placeholder="e.g., 5 June 2018"
								max={todayYmd}
								value={field.value ?? undefined}
								onChange={(date: Date | undefined) => {
									field.onChange(date?.toISOString())
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
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
					render={({ field }) => (
						<FormItem>
							<FormLabel>IBP Date</FormLabel>
							<FormControl>
								<DateInput
									placeholder="e.g., 5 June 2018"
									max={todayYmd}
									value={field.value ?? undefined}
									onChange={(date: Date | undefined) => {
										field.onChange(date?.toISOString())
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
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
					render={({ field }) => (
						<FormItem>
							<FormLabel>MCLE Period</FormLabel>
							<FormControl>
								<DateInput
									placeholder="e.g., 5 June 2018"
									max={todayYmd}
									value={field.value ?? undefined}
									onChange={(date: Date | undefined) => {
										field.onChange(date?.toISOString())
									}}
								/>
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
				render={({ field }) => (
					<FormItem>
						<FormLabel>MCLE Date</FormLabel>
						<FormControl>
							<DateInput
								placeholder="e.g., 5 June 2018"
								max={todayYmd}
								value={field.value ?? undefined}
								onChange={(date: Date | undefined) => {
									field.onChange(date?.toISOString())
								}}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	)
}
