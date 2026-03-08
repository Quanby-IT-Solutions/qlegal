"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

interface PlotConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	documentName: string | null
	isConfirming: boolean
	onConfirm: () => void
}

export function PlotConfirmDialog({
	open,
	onOpenChange,
	documentName,
	isConfirming,
	onConfirm,
}: PlotConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Confirm signature plotting</DialogTitle>
					<DialogDescription>
						Did you finish plotting signatures for <strong>{documentName ?? "this document"}</strong>?
						<br />
						Only confirm if you actually placed the required signature fields in DocOnChain.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:justify-end">
					<Button variant="outline" disabled={isConfirming} onClick={() => onOpenChange(false)}>
						Not yet
					</Button>
					<Button disabled={isConfirming} onClick={onConfirm}>
						{isConfirming ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Marking…
							</>
						) : (
							"Yes, I plotted"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
