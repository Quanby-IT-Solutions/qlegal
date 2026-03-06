"use client"

import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface DoneStepProps {
	onComplete: () => void
	isCompleting: boolean
	recoveryEmailVerified: boolean
	recoveryEmailSubmitted: boolean
	onSnooze?: () => void
	isSnoozing?: boolean
}

export function DoneStep({
	onComplete,
	isCompleting,
	recoveryEmailVerified,
	recoveryEmailSubmitted,
	onSnooze,
	isSnoozing,
}: DoneStepProps) {
	const showReminder = recoveryEmailSubmitted && !recoveryEmailVerified

	return (
		<div className="text-center">
			<div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
				<CheckCircle2Icon className="size-7 text-green-600 dark:text-green-400" />
			</div>

			{showReminder && (
				<div className="mt-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
					<AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
					<span>
						Don&apos;t forget to verify your recovery email — check your inbox when you get a
						chance.
					</span>
				</div>
			)}

			<div className="flex items-center gap-2">
				<Button type="button" variant="outline" onClick={onSnooze} disabled={isSnoozing} size="lg">
					{isSnoozing ? "Pausing reminders…" : "Skip for 7 days"}
				</Button>
				<Button
					type="button"
					onClick={onComplete}
					disabled={isCompleting}
					className="flex-1"
					size="lg"
				>
					{isCompleting ? "Setting up…" : "Go to Dashboard"}
				</Button>
			</div>
		</div>
	)
}
