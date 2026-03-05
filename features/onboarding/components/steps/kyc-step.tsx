"use client"

import { ShieldCheckIcon } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface KycStepProps {
	onNext: () => void
	onBack: () => void
	kycStatus?: string
	onGoToKyc: () => void
}

export function KycStep({ onNext, onBack, kycStatus, onGoToKyc }: KycStepProps) {
	const isVerified = kycStatus === "VERIFIED"

	return (
		<div>
			<div className="mb-5 flex size-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/30">
				<ShieldCheckIcon className="size-7 text-blue-600 dark:text-blue-400" />
			</div>

			<h2 className="text-xl font-semibold">Identity verification (KYC)</h2>
			<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
				KYC is required before using the platform.{" "}
				{isVerified ? "Great news — you're verified." : "You still need to complete verification."}
			</p>

			<div className="mt-7 flex items-center justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					Back
				</Button>
				{isVerified ? (
					<Button onClick={onNext}>Continue</Button>
				) : (
					<Button onClick={onGoToKyc}>Complete KYC</Button>
				)}
			</div>
		</div>
	)
}
