/* COMMENTED OUT - Using notarial-act-document-dialog-2 instead
"use client"

import { Download, FileText, Loader2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"

import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "@/features/envelopes-lite/components/simple-pdf-viewer"

interface NotarialActDocumentDialogProps {
	isOpen: boolean
	onClose: () => void
	actId: string
	documentName: string
}

export function NotarialActDocumentDialog({
	isOpen,
	onClose,
	actId,
	documentName,
}: NotarialActDocumentDialogProps) {
	// ... entire implementation commented out ...
}
*/

// Re-export the new component
export { NotarialActDocumentDialog2 as NotarialActDocumentDialog } from "./notarial-act-document-dialog-2"
