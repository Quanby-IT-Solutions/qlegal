"use client"

import { CircleDot } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import type { RecordingConsentRequest } from "@/features/sessions/lib/utils"

interface RecordingConsentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	consentRequest: RecordingConsentRequest | null
	acceptedIds: Set<string>
	declined: boolean
	localParticipantId: string | null
	currentUserName: string
	isInitiator: boolean
	onAccept: () => Promise<void>
	onDecline: () => void
	onCancel: () => void
}

export function RecordingConsentDialog({
	open,
	onOpenChange,
	consentRequest,
	acceptedIds,
	declined,
	localParticipantId,
	currentUserName,
	isInitiator,
	onAccept,
	onDecline,
	onCancel,
}: RecordingConsentDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CircleDot className="text-destructive size-5" />
						Start meeting recording?
					</DialogTitle>
					<DialogDescription>
						{consentRequest?.initiatorName ?? "Someone"} wants to start a screen recording.
						Recording will begin only after everyone agrees.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-2 text-sm">
					<div className="bg-muted/50 rounded-lg border p-3">
						<div className="flex items-center justify-between">
							<span className="font-medium">Consents</span>
							<span className="text-muted-foreground text-xs">
								{consentRequest
									? `${acceptedIds.size}/${consentRequest.requiredParticipantIds.length}`
									: "0/0"}
							</span>
						</div>
						{declined ? (
							<p className="mt-2 text-sm text-red-600 dark:text-red-400">
								Someone declined. Recording will not start.
							</p>
						) : (
							<p className="text-muted-foreground mt-2 text-xs">
								Click <span className="font-semibold">Agree</span> to consent, or{" "}
								<span className="font-semibold">Decline</span> to cancel.
							</p>
						)}
					</div>
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						variant="outline"
						onClick={() => {
							if (isInitiator || consentRequest?.initiatorName === currentUserName) onCancel()
							else onDecline()
						}}
					>
						Decline
					</Button>
					<Button
						disabled={declined || !localParticipantId}
						onClick={async () => {
							await onAccept()
						}}
					>
						Agree
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
