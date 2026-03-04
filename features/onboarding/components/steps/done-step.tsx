"use client"

import { useEffect } from "react"
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface DoneStepProps {
	onComplete: () => void
	isCompleting: boolean
	recoveryEmailVerified: boolean
	recoveryEmailSubmitted: boolean
	onRefreshStatus: () => void
}

export function DoneStep({
	onComplete,
	isCompleting,
	recoveryEmailVerified,
	recoveryEmailSubmitted,
	onRefreshStatus,
}: DoneStepProps) {
	// Re-fetch status on mount to check if recovery email was verified
	useEffect(() => {
		onRefreshStatus()
	}, [onRefreshStatus])

	const showReminder = recoveryEmailSubmitted && !recoveryEmailVerified

	return (
		<div className="text-center">
			<div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
				<CheckCircle2Icon className="size-7 text-green-600 dark:text-green-400" />
			</div>

			<h2 className="text-xl font-semibold">You&apos;re all set!</h2>
			<p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
				Your account is ready. You can update any of this information later from your profile
				and settings.
			</p>

			{showReminder && (
				<div className="mt-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
					<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
					<span>
						Don&apos;t forget to verify your recovery email — check your inbox when you
						get a chance.
					</span>
				</div>
			)}

			<Button
				onClick={onComplete}
				disabled={isCompleting}
				className="mt-8 w-full"
				size="lg"
			>
				{isCompleting ? "Setting up…" : "Go to Dashboard"}
			</Button>
		</div>
	)
}
