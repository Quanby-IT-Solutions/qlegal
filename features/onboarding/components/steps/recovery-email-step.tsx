"use client"

import { InfoIcon } from "lucide-react"
import type { Control } from "react-hook-form"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"

import { type OnboardingWizardSchema } from "@/features/onboarding/api/onboarding.schemas"

interface RecoveryEmailStepProps {
	onBack: () => void
	onSkip: () => void
	control: Control<OnboardingWizardSchema>
	isSubmitting: boolean
	hasPendingRecoveryEmail: boolean
}

export function RecoveryEmailStep({
	onBack,
	onSkip,
	control,
	isSubmitting,
	hasPendingRecoveryEmail,
}: RecoveryEmailStepProps) {
	return (
		<>
			<div className="space-y-2">
				<CardContent className="px-2!">
					<FieldGroup className="bg-background/70 rounded-md border p-4">
						{/* <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
						Account Security
					</p> */}

						<FormField
							control={control}
							name="recoveryEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Recovery email address</FormLabel>
									<FormControl>
										<Input
											{...field}
											id="recovery-email"
											type="email"
											autoComplete="email"
											placeholder="e.g. yourname@gmail.com"
											disabled={isSubmitting}
										/>
									</FormControl>
									{/* <FormDescription>
									Optional. We&apos;ll send a verification link here so you can recover your account
									if you lose access to your primary email.
								</FormDescription> */}
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* {hasPendingRecoveryEmail ? (
						<div className="mt-0 px-2!">
							<div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
								<InfoIcon className="mt-0.5 size-4 shrink-0" />
								<span>
									A verification link is already pending for this recovery email. You can continue
									setup now and verify it from your inbox anytime.
								</span>
							</div>
						</div>
					) : null} */}
					</FieldGroup>
				</CardContent>

				{hasPendingRecoveryEmail ? (
					<CardContent className="mt-0 px-2!">
						<div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
							<InfoIcon className="mt-0.5 size-4 shrink-0" />
							<span>
								A verification link is already pending for this recovery email. You can continue
								setup now and verify it from your inbox anytime.
							</span>
						</div>
					</CardContent>
				) : null}
			</div>

			<CardFooter className="justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onSkip}>
					Skip for now
				</Button>
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onBack}>
						Back
					</Button>
					<Button type="submit" disabled={isSubmitting} size="sm">
						{isSubmitting ? "Sending…" : "Continue"}
					</Button>
				</div>
			</CardFooter>
		</>
	)
}
