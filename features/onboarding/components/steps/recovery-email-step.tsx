"use client"

import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Control } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"

import { type OnboardingWizardSchema } from "@/features/onboarding/api/onboarding.schemas"

interface RecoveryEmailStepProps {
	onBack: () => void
	onSkip: () => void
	control: Control<OnboardingWizardSchema>
	isSubmitting: boolean
	hasPendingRecoveryEmail: boolean
	cooldownRemaining: number
}

function formatCooldown(seconds: number) {
	const m = Math.floor(seconds / 60)
	const s = seconds % 60
	return `${m}:${String(s).padStart(2, "0")}`
}

export function RecoveryEmailStep({
	onBack,
	onSkip,
	control,
	isSubmitting,
	hasPendingRecoveryEmail,
	cooldownRemaining,
}: RecoveryEmailStepProps) {
	const isCooldownActive = cooldownRemaining > 0
	return (
		<>
			<div className="space-y-2">
				<CardContent className="px-2!">
					<FieldGroup className="bg-background/70 rounded-md border p-4">
						<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
							Account Security
						</p>

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

									<FormMessage />
								</FormItem>
							)}
						/>
					</FieldGroup>
				</CardContent>

				{hasPendingRecoveryEmail ? (
					<CardContent className="px-2!">
						<Alert variant={"info"}>
							<HugeiconsIcon icon={InformationCircleIcon} />
							<AlertTitle>Pending recovery email verification</AlertTitle>
							<AlertDescription>
								A verification link is already pending for this recovery email. You can continue
								setup now and verify it from your inbox anytime.
							</AlertDescription>
						</Alert>
					</CardContent>
				) : null}

				{!hasPendingRecoveryEmail ? (
					<CardContent className="px-2!">
						<Alert variant="info">
							<HugeiconsIcon icon={InformationCircleIcon} />
							<AlertTitle>Optional step</AlertTitle>
							<AlertDescription>
								You can skip this for now and add a recovery email later from your profile
								settings.
							</AlertDescription>
						</Alert>
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
					<Button
						type="submit"
						disabled={isSubmitting || isCooldownActive}
						size="sm"
					>
						{isSubmitting
							? "Sending…"
							: isCooldownActive
								? `Resend in ${formatCooldown(cooldownRemaining)}`
								: hasPendingRecoveryEmail
									? "Resend verification"
									: "Continue"}
					</Button>
				</div>
			</CardFooter>
		</>
	)
}
