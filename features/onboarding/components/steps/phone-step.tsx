"use client"

import type { Control } from "react-hook-form"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"

import { type OnboardingWizardSchema } from "@/features/onboarding/api/onboarding.schemas"

interface PhoneStepProps {
	onBack: () => void
	onSkip: () => void
	control: Control<OnboardingWizardSchema>
	isSubmitting: boolean
}

export function PhoneStep({ onBack, onSkip, control, isSubmitting }: PhoneStepProps) {
	return (
		<>
			<CardContent className="px-2!">
				<FieldGroup className="bg-background/70 rounded-md border p-4">
					<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
						Profile
					</p>

					<FormField
						control={control}
						name="phoneNumber"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Phone number</FormLabel>
								<FormControl>
									<Input
										{...field}
										id="phone-number"
										type="tel"
										autoComplete="tel"
										placeholder="e.g. +63 912 345 6789"
										disabled={isSubmitting}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</FieldGroup>
			</CardContent>

			<CardFooter className="justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onSkip}>
					Skip for now
				</Button>
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onBack}>
						Back
					</Button>
					<Button type="submit" disabled={isSubmitting} size="sm">
						{isSubmitting ? "Saving…" : "Continue"}
					</Button>
				</div>
			</CardFooter>
		</>
	)
}
