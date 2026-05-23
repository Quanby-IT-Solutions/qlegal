"use client"

import { Award } from "lucide-react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"

interface CertificatePreviewDialogProps {
	isOpen: boolean
	onClose: () => void
	projectUuid: string
	certificateName: string
}

export function CertificatePreviewDialog({
	isOpen,
	onClose,
	projectUuid,
	certificateName,
}: CertificatePreviewDialogProps) {
	// `projectUuid` kept for API parity; preview disabled while integration is rebuilt.
	void projectUuid

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent
				className="!m-0 !flex !h-[96vh] !w-[96vw] !max-w-none flex-col !gap-0 overflow-hidden !rounded-lg !p-0"
				style={{ maxWidth: "96vw" }}
			>
				<DialogHeader className="bg-background flex shrink-0 flex-row items-center justify-between border-b p-4">
					<div className="flex items-center gap-3">
						<div className="bg-muted rounded-lg p-2">
							<Award className="text-muted-foreground h-5 w-5" />
						</div>
						<div className="min-w-0 text-left">
							<DialogTitle className="text-foreground truncate text-lg font-medium">
								{certificateName}
							</DialogTitle>
							<p className="text-muted-foreground text-sm">Certificate of Completion</p>
						</div>
					</div>
				</DialogHeader>

				{/* Content Area - Fixed height to prevent layout shifts */}
				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="flex h-full items-center justify-center p-8">
						<div className="text-center">
							<div className="bg-muted mb-4 rounded-lg p-3">
								<Award className="text-muted-foreground mx-auto h-8 w-8" />
							</div>
							<p className="text-muted-foreground text-sm">
								Certificate preview is temporarily unavailable while we rebuild the signing
								integration.
							</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
