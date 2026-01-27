"use client"

import { IdCard } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"

interface PrincipalIdDialogProps {
	isOpen: boolean
	onClose: () => void
	principalName: string
	principalIdImageBase64: string | null | undefined
}

export function PrincipalIdDialog({
	isOpen,
	onClose,
	principalName,
	principalIdImageBase64,
}: PrincipalIdDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="bg-muted rounded-lg p-2">
							<IdCard className="text-muted-foreground h-5 w-5" />
						</div>
						<DialogTitle className="text-lg font-medium">
							Principal ID - {principalName}
						</DialogTitle>
					</div>
				</DialogHeader>

				<div className="mt-4">
					{principalIdImageBase64 ? (
						<div className="flex flex-col items-center gap-4">
							<img
								src={principalIdImageBase64}
								alt={`${principalName} ID`}
								className="max-w-full rounded-lg border shadow-sm"
								style={{ maxHeight: "70vh" }}
							/>
							<Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
								Close
							</Button>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
							<div className="bg-muted rounded-lg p-3">
								<IdCard className="text-muted-foreground h-8 w-8" />
							</div>
							<p className="text-muted-foreground text-sm">
								No ID image available for this principal.
							</p>
							<Button variant="outline" onClick={onClose}>
								Close
							</Button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
