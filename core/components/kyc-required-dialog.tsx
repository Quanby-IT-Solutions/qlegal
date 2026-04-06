"use client"

import { type Route } from "next"
import Link from "next/link"

import { buildOnboardingKycUrl } from "@/core/lib/onboarding-return-path"

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
	/** Full verification URL. When set, `returnToPath` is ignored. */
	verificationHref?: Route
	/** App path to return to when the user presses Back on the Identity step (e.g. `/browse`). */
	returnToPath?: string
	primaryLabel?: string
}

export function KycRequiredDialog({
	open,
	onOpenChange,
	title = "Identity verification required",
	description = "Finish identity verification before continuing. You can complete it from your profile anytime.",
	verificationHref,
	returnToPath,
	primaryLabel = "Go to verification",
}: KycRequiredDialogProps) {
	const linkHref = verificationHref ?? (buildOnboardingKycUrl(returnToPath) as Route)

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Close</AlertDialogCancel>
					<Button asChild>
						<Link href={linkHref}>{primaryLabel}</Link>
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
