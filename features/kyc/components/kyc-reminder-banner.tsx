"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertCircle, ShieldCheck, X } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"

interface KycReminderBannerProps {
	kycStatus?: string | null
}

export function KycReminderBanner({ kycStatus }: KycReminderBannerProps) {
	const [dismissed, setDismissed] = useState(false)

	// Only show banner if KYC is NOT_STARTED and user hasn't dismissed it
	if (kycStatus !== "NOT_STARTED" || dismissed) {
		return null
	}

	return (
		<Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100">
			<div className="flex items-start gap-3">
				<ShieldCheck className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
				<div className="flex-1">
					<AlertTitle className="mb-1 text-base font-semibold">
						Complete Your KYC Verification
					</AlertTitle>
					<AlertDescription className="mb-3 text-sm">
						To access all features and ensure secure transactions, please complete your identity
						verification. This process only takes a few minutes.
					</AlertDescription>
					<div className="flex gap-2">
						<Button asChild size="sm" variant="default">
							<Link href="/auth/kyc">
								<ShieldCheck className="mr-1.5 h-4 w-4" />
								Verify Now
							</Link>
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setDismissed(true)}
							className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
						>
							Remind me later
						</Button>
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-5 w-5 p-0 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100"
					onClick={() => setDismissed(true)}
				>
					<X className="h-4 w-4" />
					<span className="sr-only">Dismiss</span>
				</Button>
			</div>
		</Alert>
	)
}
