"use client"

import { type UseFormReturn } from "react-hook-form"
import { Check } from "lucide-react"

import { buttonVariants } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { cn } from "@/core/lib/utils"

import { type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"

interface ReviewStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
}

export function ReviewStep({ form }: ReviewStepProps) {
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
			<div className="bg-muted/40 rounded-lg border p-4">
				<div className="space-y-1">
					<h3 className="text-base font-semibold">Review your information</h3>
					<p className="text-muted-foreground text-sm">
						Confirm everything below. You can go back and edit before submitting.
					</p>
				</div>

				<div className="mt-4 grid gap-4">
					<div className="bg-background rounded-lg border p-4">
						<h4 className="text-sm font-semibold">Account</h4>
						<div className="text-muted-foreground mt-2 text-sm">
							<p className="font-medium text-foreground">{form.getValues("name") || "—"}</p>
							<p>{form.getValues("email") || "—"}</p>
						</div>
					</div>

					<div className="bg-background rounded-lg border p-4">
						<h4 className="text-sm font-semibold">Notary seal</h4>
						<div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
							<div>
								<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Seal name
								</p>
								<p className="mt-1 font-medium">{form.getValues("seal.enpName") || "—"}</p>
							</div>
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

					<div className="bg-background rounded-lg border p-4">
						<h4 className="text-sm font-semibold">Credentials</h4>

						<div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
							<div className="sm:col-span-2">
								<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Attorney name
								</p>
								<p className="mt-1 font-medium">{form.getValues("notaryInfo.attyName") || "—"}</p>
							</div>

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
								<p className="mt-1 font-medium">{form.getValues("notaryInfo.ptrNoLocation") || "—"}</p>
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
								<p className="mt-1 font-medium">{form.getValues("notaryInfo.notaryAddress") || "—"}</p>
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
			</div>

			{/* Enhanced Terms & Conditions Section */}
			<div className="rounded-xl border bg-card shadow-sm">
				<div className="border-b bg-muted/30 px-6 py-4">
					<h3 className="text-sm font-semibold">Terms & Certification</h3>
					<p className="text-muted-foreground mt-1 text-xs">
						Please review and accept our terms to complete registration
					</p>
				</div>

				<div className="p-6">
					<FormField
						control={form.control}
						name="agreeToTerms"
						render={({ field }) => (
							<FormItem>
								<label
									className={cn(
										"group relative flex items-start gap-4 rounded-lg border-2 p-5 transition-all duration-200",
										"cursor-pointer",
										field.value
											? "border-primary/50 bg-primary/5"
											: "border-border bg-muted/20 hover:border-muted-foreground/30"
									)}
								>
									{/* Custom Checkbox Container */}
									<div className="relative flex-shrink-0 pt-0.5">
										<FormControl>
											<Checkbox 
												checked={field.value} 
												onCheckedChange={field.onChange}
												className={cn(
													"h-5 w-5 transition-all duration-200",
													field.value && "border-primary data-[state=checked]:bg-primary"
												)}
											/>
										</FormControl>
									</div>

									{/* Text Content */}
									<div className="flex-1 space-y-2">
										<FormLabel className="text-sm font-normal leading-relaxed text-foreground cursor-pointer">
											<div className="flex flex-col gap-2">
												<div className="flex items-center gap-2">
													<div>
													I agree to the{" "}
											<a
												href="#"
												onClick={(e) => {
													e.preventDefault()
													// Add your Terms of Service modal/page logic here
												}}
												className={cn(
													"font-medium text-primary underline underline-offset-2",
													"hover:text-primary/80 transition-colors"
												)}
											>
												Terms of Service
											</a>{" "}
											and{" "}
											<a
												href="#"
												onClick={(e) => {
													e.preventDefault()
													// Add your Privacy Policy modal/page logic here
												}}
												className={cn(
													"font-medium text-primary underline underline-offset-2",
													"hover:text-primary/80 transition-colors"
												)}
											>
												Privacy Policy
											</a>
													</div>
												</div>
											</div>
										</FormLabel>

										<p className="text-muted-foreground text-xs leading-relaxed">
											I certify that all information provided is accurate and complete.
										</p>
									</div>

									{/* Check Icon Indicator */}
									{field.value && (
										<div className="flex-shrink-0">
											<div className="rounded-full bg-primary/10 p-1.5">
												<Check className="h-4 w-4 text-primary" strokeWidth={3} />
											</div>
										</div>
									)}
								</label>

								<FormMessage className="mt-3" />
							</FormItem>
						)}
					/>
				</div>
			</div>
		</div>
	)
}