"use client"

import { CircleCheck, CircleDot } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"

interface KycStepProps {
	onNext: () => void
	onBack: () => void
	kycStatus?: string
	onGoToKyc: () => void
}

export function KycStep({ onNext, onBack, kycStatus, onGoToKyc }: KycStepProps) {
	const isVerified = kycStatus === "VERIFIED"

	return (
		<>
			<CardContent className="px-2!">
				<Alert variant={"success"}>
					<HugeiconsIcon icon={isVerified ? CircleCheck : CircleDot} />
					<AlertTitle>
						{isVerified ? "Your identity is verified" : "Identity verification pending"}
					</AlertTitle>
					<AlertDescription>
						{isVerified
							? "You can continue to the next step."
							: "Complete identity verification to continue with onboarding."}
					</AlertDescription>
				</Alert>
			</CardContent>

			<CardFooter className="flex items-center justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					Back
				</Button>
				{isVerified ? (
					<Button type="button" onClick={onNext} size="sm">
						Continue
					</Button>
				) : (
					<Button type="button" onClick={onGoToKyc} size="sm">
						Complete KYC
					</Button>
				)}
			</CardFooter>
		</>
	)
}
