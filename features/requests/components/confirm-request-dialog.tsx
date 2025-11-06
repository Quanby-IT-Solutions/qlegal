"use client"

import { Check } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"

interface ConfirmRequestDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: () => Promise<void>
	isLoading?: boolean
}

export function ConfirmRequestDialog({
	open,
	onOpenChange,
	onConfirm,
	isLoading = false,
}: ConfirmRequestDialogProps) {
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		await onConfirm()
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Check className="h-5 w-5 text-green-600" />
						Confirm Appointment
					</DialogTitle>
					<DialogDescription>
						Confirm this appointment request.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "Confirming..." : "Confirm Appointment"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
