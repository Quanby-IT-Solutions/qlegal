"use client"

import { type UseFormReturn } from "react-hook-form"

import { buttonVariants } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { cn } from "@/core/lib/utils"

import { type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"

interface ReviewStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
}

export function ReviewStep({ form }: ReviewStepProps) {
	return (
		<div className="space-y-4">
			<div className="bg-muted/50 rounded-lg p-4">
				<h3 className="mb-3 font-medium">Review Your Information</h3>

				<div className="space-y-4">
					<div>
						<h4 className="text-muted-foreground text-sm font-medium">Account</h4>
						<p className="text-sm">
							{form.getValues("name")} ({form.getValues("email")})
						</p>
					</div>

					<div>
						<h4 className="text-muted-foreground text-sm font-medium">Notary Seal</h4>
						<p className="text-sm">
							{form.getValues("seal.enpName")} - Role #{form.getValues("seal.enpRoleNumber")}
						</p>
					</div>

					<div>
						<h4 className="text-muted-foreground text-sm font-medium">Credentials</h4>
						<div className="text-sm">
							<p>{form.getValues("notaryInfo.attyName")}</p>
							<p>Roll No: {form.getValues("notaryInfo.rollNo")}</p>
							<p>
								Commission: {form.getValues("notaryInfo.commissionNo")} (Valid until{" "}
								{form.getValues("notaryInfo.commissionNoValidUntil")})
							</p>
							<p>PTR: {form.getValues("notaryInfo.ptrNo")}</p>
							<p>IBP: {form.getValues("notaryInfo.ibpNo")}</p>
							<p>MCLE: {form.getValues("notaryInfo.mcleNo")}</p>
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
								<span
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
									)}
								>
									Terms of Service
								</span>
								and
								<span
									className={cn(
										buttonVariants({ variant: "link" }),
										"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
									)}
								>
									Privacy Policy
								</span>
								. I certify that all information provided is accurate and complete.
							</FormLabel>
							<FormMessage />
						</div>
					</FormItem>
				)}
			/>
		</div>
	)
}
