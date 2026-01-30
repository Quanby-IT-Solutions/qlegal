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
import { Textarea } from "@/core/components/ui/textarea"

interface RejectDialogProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
	isProcessing: boolean
}

export function RejectDialog({ isOpen, onOpenChange, onConfirm, isProcessing }: RejectDialogProps) {
	const [rejectReason, setRejectReason] = useState("")

	const handleConfirm = () => {
		onConfirm()
		setRejectReason("")
	}

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setRejectReason("")
		}
		onOpenChange(open)
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Reject Request</DialogTitle>
					<DialogDescription>
						Are you sure you want to reject this notarization request? You can provide an optional
						reason.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					<div>
						<Label htmlFor="reject-reason">Reason (optional)</Label>
						<Textarea
							id="reject-reason"
							placeholder="Enter rejection reason..."
							value={rejectReason}
							onChange={e => setRejectReason(e.target.value)}
							className="mt-1"
							rows={3}
						/>
					</div>
				</div>
				<DialogFooter>
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={() => handleOpenChange(false)} type="button">
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleConfirm}
							disabled={isProcessing}
							type="button"
						>
							{isProcessing ? "Processing..." : "Reject Request"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
