"use client"

import { type Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { type UseFormReturn } from "react-hook-form"

import { buttonVariants } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel } from "@/core/components/ui/form"
import { cn } from "@/core/lib/utils"

import { type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"

import { FormResponse } from "../ui/form-response"

interface ReviewStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
	error?: { message?: string } | null
	data?: { message?: string } | null
}

export function ReviewStep({ form, error, data }: ReviewStepProps) {
	const pathname = usePathname()
	const formatMmDdYyyy = (value: string | null | undefined) => {
		if (!value) return "—"

		// Supports ISO strings and YYYY-MM-DD.
		const d = new Date(value)
		if (Number.isNaN(d.getTime())) return value

		const mm = String(d.getMonth() + 1).padStart(2, "0")
		const dd = String(d.getDate()).padStart(2, "0")
		const yyyy = String(d.getFullYear())
		return `${mm}-${dd}-${yyyy}`
	}

	const sealRollNoDate = formatMmDdYyyy(form.getValues("seal.rollNoDate"))
	const commissionValidUntil = formatMmDdYyyy(form.getValues("notaryInfo.commissionNoValidUntil"))
	const ptrDate = formatMmDdYyyy(form.getValues("notaryInfo.ptrNoDate"))
	const ibpDate = formatMmDdYyyy(form.getValues("notaryInfo.ibpNoDate"))
	const mclePeriod = formatMmDdYyyy(form.getValues("notaryInfo.mcleNoPeriod"))
	const mcleDate = formatMmDdYyyy(form.getValues("notaryInfo.mcleNoDate"))

	return (
		<div className="space-y-6">
			<div className="space-y-1">
				<h3 className="text-base font-semibold">Review your information</h3>
				<p className="text-muted-foreground text-sm">
					Confirm everything below. You can go back and edit before submitting.
				</p>
			</div>

			<div className="mt-4 grid gap-4">
				<div className="bg-muted/40 rounded-lg border p-4">
					<h4 className="text-sm font-semibold">Account</h4>
					<div className="text-muted-foreground mt-2 text-sm">
						<p className="text-foreground font-medium">
							{[form.getValues("firstName"), form.getValues("middleName"), form.getValues("lastName")]
								.filter(Boolean)
								.join(" ") || "—"}
						</p>
						<p>{form.getValues("email") || "—"}</p>
					</div>
				</div>

				<div className="bg-muted/40 rounded-lg border p-4">
					<h4 className="text-sm font-semibold">Notary seal</h4>
					<div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								Roll number
							</p>
							<p className="mt-1 font-medium">{form.getValues("seal.enpRollNumber") || "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								Roll no. date
							</p>
							<p className="mt-1 font-medium">{sealRollNoDate}</p>
						</div>
					</div>
				</div>

				<div className="bg-muted/40 rounded-lg border p-4">
					<h4 className="text-sm font-semibold">Credentials</h4>

					<div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								Commission no.
							</p>
							<p className="mt-1 font-medium">{form.getValues("notaryInfo.commissionNo") || "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								Valid until
							</p>
							<p className="mt-1 font-medium">{commissionValidUntil}</p>
						</div>

						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								PTR no.
							</p>
							<p className="mt-1 font-medium">{form.getValues("notaryInfo.ptrNo") || "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								PTR location
							</p>
							<p className="mt-1 font-medium">
								{form.getValues("notaryInfo.ptrNoLocation") || "—"}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								PTR date
							</p>
							<p className="mt-1 font-medium">{ptrDate}</p>
						</div>

						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								IBP no.
							</p>
							<p className="mt-1 font-medium">{form.getValues("notaryInfo.ibpNo") || "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								IBP date
							</p>
							<p className="mt-1 font-medium">{ibpDate}</p>
						</div>

						<div className="sm:col-span-2">
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								Notary address
							</p>
							<p className="mt-1 font-medium">
								{form.getValues("notaryInfo.notaryAddress") || "—"}
							</p>
						</div>

						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								MCLE period
							</p>
							<p className="mt-1 font-medium">{mclePeriod}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								MCLE no.
							</p>
							<p className="mt-1 font-medium">{form.getValues("notaryInfo.mcleNo") || "—"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
								MCLE date
							</p>
							<p className="mt-1 font-medium">{mcleDate}</p>
						</div>
					</div>
				</div>
			</div>

			<FormField
				control={form.control}
				name="agreeToTerms"
				render={({ field }) => (
					<FormItem className="flex flex-row items-start space-y-0 space-x-2 rounded-md px-4">
						<FormControl>
							<Checkbox checked={field.value} onCheckedChange={field.onChange} />
						</FormControl>
						<div className="space-y-1 leading-none">
							<FormLabel className="text-muted-foreground text-xs">
								I agree to the
								<Link
									href={{
										pathname: "/auth/terms-of-service" as Route,
										query: { from: pathname },
									}}
									target="_blank"
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
									)}
								>
									Terms of Service
								</Link>
								and
								<Link
									href={{
										pathname: "/auth/privacy-policy" as Route,
										query: { from: pathname },
									}}
									target="_blank"
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
									)}
								>
									Privacy Policy
								</Link>
							</FormLabel>
						</div>
					</FormItem>
				)}
			/>
		</div>
	)
}
