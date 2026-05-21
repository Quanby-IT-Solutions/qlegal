"use client"

import { format } from "date-fns"
import { Loader2, MessageSquareText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/core/components/ui/sheet"

import { trpc } from "@/services/trpc/client"

interface PrincipalVaultFileFeedbackSheetProps {
	fileId: string
	fileName: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function PrincipalVaultFileFeedbackSheet({
	fileId,
	fileName,
	open,
	onOpenChange,
}: PrincipalVaultFileFeedbackSheetProps) {
	const listQuery = trpc.principalVault.listVaultFileCommentsForPrincipal.useQuery(
		{ fileId },
		{ enabled: open && fileId.length > 0 }
	)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
				<SheetHeader className="text-left">
					<SheetTitle className="flex items-center gap-2">
						<MessageSquareText className="size-5" />
						Notary feedback
					</SheetTitle>
					<SheetDescription className="line-clamp-2">{fileName}</SheetDescription>
				</SheetHeader>

				<ScrollArea className="min-h-[280px] flex-1 px-4 pb-4">
					{listQuery.isPending ? (
						<div className="flex justify-center py-12">
							<Loader2 className="text-muted-foreground size-6 animate-spin" />
						</div>
					) : listQuery.isError ? (
						<p className="text-destructive text-sm">{listQuery.error.message}</p>
					) : listQuery.data?.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No notary notes on this file yet. They appear here when an ENP adds comments on a
							folder shared from My files.
						</p>
					) : (
						<ul className="space-y-4 pr-2">
							{listQuery.data?.map(c => (
								<li key={c.id} className="bg-card rounded-lg border p-3">
									<div className="mb-2 flex flex-wrap items-center gap-2">
										<span className="text-sm font-medium">{c.authorName}</span>
										<Badge variant="secondary" className="text-xs font-normal">
											{c.sharedFolderName}
										</Badge>
									</div>
									<p className="text-muted-foreground mb-2 text-xs">
										{format(new Date(c.createdAt), "MMM d, yyyy · h:mm a")}
									</p>
									<p className="text-sm whitespace-pre-wrap">{c.body}</p>
								</li>
							))}
						</ul>
					)}
				</ScrollArea>
			</SheetContent>
		</Sheet>
	)
}
