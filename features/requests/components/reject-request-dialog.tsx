"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"
import { Textarea } from "@/core/components/ui/textarea"
import { Label } from "@/core/components/ui/label"

interface RejectRequestDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onReject: (data: { cancelReason: string }) => Promise<void>
	isLoading?: boolean
}

export function RejectRequestDialog({
	open,
	onOpenChange,
	onReject,
	isLoading = false,
}: RejectRequestDialogProps) {
	const [cancelReason, setCancelReason] = useState("")
	const [error, setError] = useState("")

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!cancelReason.trim()) {
			setError("Please provide a reason for rejection")
			return
		}

		await onReject({ cancelReason: cancelReason.trim() })
		setCancelReason("")
		setError("")
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-destructive">
						<X className="h-5 w-5" />
						Reject Appointment
					</DialogTitle>
					<DialogDescription>
						Please provide a reason for rejecting this appointment request. The client will be notified.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="cancelReason">
								Rejection Reason <span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="cancelReason"
								placeholder="e.g., Schedule conflict, incomplete documentation..."
								value={cancelReason}
								onChange={(e) => {
									setCancelReason(e.target.value)
									setError("")
								}}
								disabled={isLoading}
								rows={4}
								className={error ? "border-destructive" : ""}
							/>
							{error && (
								<p className="text-sm text-destructive">{error}</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								onOpenChange(false)
								setCancelReason("")
								setError("")
							}}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" variant="destructive" disabled={isLoading}>
							{isLoading ? "Rejecting..." : "Reject Appointment"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
