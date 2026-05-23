"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

interface VaultShareFileCommentsSheetProps {
	token: string
	fileId: string
	displayPath: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function VaultShareFileCommentsSheet({
	token,
	fileId,
	displayPath,
	open,
	onOpenChange,
}: VaultShareFileCommentsSheetProps) {
	const [draft, setDraft] = useState("")
	const utils = trpc.useUtils()

	const listQuery = trpc.principalVault.listVaultShareFileComments.useQuery(
		{ token, fileId },
		{ enabled: open && fileId.length > 0 && token.length > 0 }
	)

	const addComment = trpc.principalVault.addVaultShareFileComment.useMutation({
		onSuccess: async () => {
			setDraft("")
			toast.success("Note added")
			await Promise.all([
				utils.principalVault.listVaultShareFileComments.invalidate({ token, fileId }),
				utils.principalVault.getFolderShareForEnp.invalidate({ token }),
			])
		},
		onError: err => toast.error(err.message),
	})

	useEffect(() => {
		if (!open) setDraft("")
	}, [open])

	const submit = () => {
		const body = draft.trim()
		if (!body) {
			toast.error("Write a note before sending")
			return
		}
		addComment.mutate({ token, fileId, body })
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
				<SheetHeader className="text-left">
					<SheetTitle>Notary notes</SheetTitle>
					<SheetDescription className="line-clamp-3">{displayPath}</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
					<div className="text-muted-foreground text-xs">
						Comments are visible to you and the folder owner when they open this file in My files.
					</div>

					<ScrollArea className="min-h-[200px] flex-1 rounded-md border p-3">
						{listQuery.isPending ? (
							<div className="flex justify-center py-8">
								<Loader2 className="text-muted-foreground size-6 animate-spin" />
							</div>
						) : listQuery.isError ? (
							<p className="text-destructive text-sm">{listQuery.error.message}</p>
						) : listQuery.data?.length === 0 ? (
							<p className="text-muted-foreground text-sm">No notes yet. Add one below.</p>
						) : (
							<ul className="space-y-4 pr-2">
								{listQuery.data?.map(c => (
									<li key={c.id} className="border-b pb-3 last:border-0">
										<div className="text-muted-foreground mb-1 flex flex-wrap items-baseline justify-between gap-2 text-xs">
											<span className="text-foreground font-medium">{c.authorName}</span>
											<span>{format(new Date(c.createdAt), "MMM d, yyyy · h:mm a")}</span>
										</div>
										<p className="text-sm whitespace-pre-wrap">{c.body}</p>
									</li>
								))}
							</ul>
						)}
					</ScrollArea>

					<div className="space-y-2 border-t pt-2">
						<Textarea
							placeholder="Add a note about this document (corrections, missing pages, etc.)"
							rows={4}
							value={draft}
							onChange={e => setDraft(e.target.value)}
							disabled={addComment.isPending}
							onKeyDown={e => {
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
									e.preventDefault()
									submit()
								}
							}}
						/>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								disabled={addComment.isPending || !draft.trim()}
								onClick={() => submit()}
							>
								{addComment.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<>
										<Send className="mr-2 size-4" />
										Add note
									</>
								)}
							</Button>
						</div>
						<p className="text-muted-foreground text-xs">Tip: Ctrl+Enter or ⌘+Enter to send</p>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	)
}
