"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

interface ConfirmRequestDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onConfirm: (data: { meetingLink?: string }) => Promise<void>
	isLoading?: boolean
}

export function ConfirmRequestDialog({
	open,
	onOpenChange,
	onConfirm,
	isLoading = false,
}: ConfirmRequestDialogProps) {
	const [meetingLink, setMeetingLink] = useState("")

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		await onConfirm({ meetingLink: meetingLink || undefined })
		setMeetingLink("")
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
						Confirm this appointment request. You can optionally provide a meeting link for remote sessions.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
							<Input
								id="meetingLink"
								type="url"
								placeholder="https://meet.example.com/..."
								value={meetingLink}
								onChange={(e) => setMeetingLink(e.target.value)}
								disabled={isLoading}
							/>
							<p className="text-sm text-muted-foreground">
								For remote appointments, provide a video conferencing link
							</p>
						</div>
					</div>

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
