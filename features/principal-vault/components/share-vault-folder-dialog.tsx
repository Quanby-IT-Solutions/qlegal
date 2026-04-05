"use client"

import { useState } from "react"
import { Copy, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

interface ShareVaultFolderDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	folderId: string
	folderName: string
}

export function ShareVaultFolderDialog({
	open,
	onOpenChange,
	folderId,
	folderName,
}: ShareVaultFolderDialogProps) {
	const [recipientEmail, setRecipientEmail] = useState("")
	const [note, setNote] = useState("")

	const utils = trpc.useUtils()

	const createShare = trpc.principalVault.createFolderShare.useMutation({
		onError: err => toast.error(err.message),
	})

	const copyLinkOnly = async () => {
		if (!recipientEmail.trim()) {
			toast.error("Enter the notary’s email first")
			return
		}
		try {
			const data = await createShare.mutateAsync({
				folderId,
				recipientEmail: recipientEmail.trim(),
				note: note.trim() || undefined,
				sendEmail: false,
			})
			await utils.principalVault.list.invalidate()
			const origin = typeof window !== "undefined" ? window.location.origin : ""
			const link = `${origin}/vault-share/${data.token}`
			await navigator.clipboard.writeText(link)
			toast.success("Link copied to clipboard")
			setRecipientEmail("")
			setNote("")
			onOpenChange(false)
		} catch {
			/* onError toast */
		}
	}

	const sendEmail = async () => {
		if (!recipientEmail.trim()) {
			toast.error("Enter the notary’s email")
			return
		}
		try {
			await createShare.mutateAsync({
				folderId,
				recipientEmail: recipientEmail.trim(),
				note: note.trim() || undefined,
				sendEmail: true,
			})
			await utils.principalVault.list.invalidate()
			toast.success("Email sent to the notary")
			setRecipientEmail("")
			setNote("")
			onOpenChange(false)
		} catch {
			/* onError toast */
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Share folder with notary</DialogTitle>
					<DialogDescription>
						The entire folder <strong>{folderName}</strong> (all files and subfolders) will be shared.
						Enter the ENP’s account email — they must use that account to open the link.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="share-enp-email">Notary (ENP) email</Label>
						<Input
							id="share-enp-email"
							type="email"
							autoComplete="email"
							placeholder="notary@example.com"
							value={recipientEmail}
							onChange={e => setRecipientEmail(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="share-note">Optional note</Label>
						<Textarea
							id="share-note"
							placeholder="Context for the notary (e.g. which deed to focus on)"
							rows={3}
							value={note}
							onChange={e => setNote(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button
						type="button"
						className="w-full gap-2"
						disabled={createShare.isPending}
						onClick={() => void sendEmail()}
					>
						{createShare.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Mail className="size-4" />
						)}
						Send email with link
					</Button>
					<Button
						type="button"
						variant="outline"
						className="w-full gap-2"
						disabled={createShare.isPending}
						onClick={() => void copyLinkOnly()}
					>
						<Copy className="size-4" />
						Create link and copy
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
