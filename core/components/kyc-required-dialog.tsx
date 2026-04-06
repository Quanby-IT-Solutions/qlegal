"use client"

import { type Route } from "next"
import Link from "next/link"

import { useStartKycVerification } from "@/features/kyc/hooks/use-start-kyc-verification"

import { Button } from "@/core/components/ui/button"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"

interface KycRequiredDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title?: string
	description?: string
	/** When set, primary action navigates here instead of launching the Web SDK. */
	verificationHref?: Route
	/** Unused when using default SDK launch; kept for API compatibility. */
	returnToPath?: string
	primaryLabel?: string
}

export function KycRequiredDialog({
	open,
	onOpenChange,
	title = "Identity verification required",
	description = "Finish identity verification before continuing. Verification opens on this device—no need to visit a separate page.",
	verificationHref,
	primaryLabel = "Start identity verification",
}: KycRequiredDialogProps) {
	const { start, isLoading } = useStartKycVerification()

	const handlePrimary = () => {
		if (verificationHref) return
		onOpenChange(false)
		void start()
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isLoading}>Close</AlertDialogCancel>
					{verificationHref ? (
						<Button asChild>
							<Link href={verificationHref}>{primaryLabel}</Link>
						</Button>
					) : (
						<Button type="button" disabled={isLoading} onClick={handlePrimary}>
							{isLoading ? "Opening…" : primaryLabel}
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
