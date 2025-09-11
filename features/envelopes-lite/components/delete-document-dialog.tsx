"use client"

import { useState } from "react"
import { AlertTriangle, Trash2 } from "lucide-react"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/core/components/ui/alert-dialog"
import { Button } from "@/core/components/ui/button"

interface DeleteDocumentDialogProps {
	documentName: string
	onConfirm: () => void
	trigger: React.ReactNode
	isDeleting?: boolean
}

export function DeleteDocumentDialog({
	documentName,
	onConfirm,
	trigger,
	isDeleting = false
}: DeleteDocumentDialogProps) {
	const [isOpen, setIsOpen] = useState(false)

	const handleConfirm = () => {
		onConfirm()
		setIsOpen(false)
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-destructive" />
						Delete Document
					</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete &quot;{documentName}&quot;? This
						action cannot be undone and will permanently remove the document and
						all associated signatures.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleConfirm}
						disabled={isDeleting}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isDeleting ? (
							<>
								<Trash2 className="mr-2 h-4 w-4 animate-spin" />
								Deleting...
							</>
						) : (
							<>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete Document
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}