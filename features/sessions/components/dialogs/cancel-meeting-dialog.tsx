"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Spinner } from "@/core/components/ui/spinner"
import { Textarea } from "@/core/components/ui/textarea"

interface CancelMeetingDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: (reason: string) => void
	isProcessing: boolean
}

export function CancelMeetingDialog({
	isOpen,
	onOpenChange,
	onConfirm,
	isProcessing,
}: CancelMeetingDialogProps) {
	const [cancelReason, setCancelReason] = useState("")

	const handleConfirm = () => {
		if (!cancelReason.trim()) return
		onConfirm(cancelReason.trim())
		setCancelReason("")
	}

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setCancelReason("")
		}
		onOpenChange(open)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Cancel Meeting</DialogTitle>
					<DialogDescription>
						Are you sure you want to cancel this notarization meeting? This action cannot be undone.
						Please provide a reason (e.g. no-show, suspected fraud, identity mismatch).
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div>
						<Label htmlFor="cancel-reason">Reason</Label>
						<Textarea
							id="cancel-reason"
							placeholder="Enter cancellation reason..."
							value={cancelReason}
							onChange={e => setCancelReason(e.target.value)}
							className="mt-1"
							rows={3}
						/>
					</div>
				</div>
				<DialogFooter>
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={() => handleOpenChange(false)} type="button">
							Go Back
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirm}
							disabled={isProcessing || !cancelReason.trim()}
							type="button"
						>
							{isProcessing ? (
								<>
									<Spinner className="size-4" />
									Cancelling...
								</>
							) : (
								"Cancel Meeting"
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
