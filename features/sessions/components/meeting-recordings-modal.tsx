"use client"

import { format } from "date-fns"
import { Download, Film, Loader2 } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { ScrollArea } from "@/core/components/ui/scroll-area"

import { trpc } from "@/services/trpc/client"

function formatDuration(seconds: number | undefined): string {
	if (seconds === null || !Number.isFinite(seconds)) return "—"
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
}

function formatFileSize(bytes: number | undefined): string {
	if (bytes === null || !Number.isFinite(bytes)) return ""
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface MeetingRecordingsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	meeting: { id: string; title: string } | null
}

export function MeetingRecordingsModal({
	open,
	onOpenChange,
	meeting,
}: MeetingRecordingsModalProps) {
	const {
		data: recordings,
		isLoading,
		error,
	} = trpc.meetings.getRecordings.useQuery(
		{ meetingId: meeting?.id ?? "" },
		{ enabled: open && !!meeting?.id }
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Film className="size-5" />
						Video recordings
					</DialogTitle>
					<DialogDescription>
						{meeting?.title ? (
							<>Recordings for &quot;{meeting.title}&quot;</>
						) : (
							"Select a meeting to view recordings"
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-[200px]">
					{!meeting ? (
						<p className="text-muted-foreground py-8 text-center text-sm">No meeting selected</p>
					) : isLoading ? (
						<div className="flex flex-col items-center justify-center gap-3 py-12">
							<Loader2 className="text-muted-foreground size-8 animate-spin" />
							<p className="text-muted-foreground text-sm">Loading recordings…</p>
						</div>
					) : error ? (
						<p className="text-destructive py-8 text-center text-sm">{error.message}</p>
					) : !recordings?.length ? (
						<p className="text-muted-foreground py-8 text-center text-sm">
							No recordings yet. Start a meeting and use cloud recording to capture videos.
						</p>
					) : (
						<ScrollArea className="h-[min(50vh,400px)] pr-4">
							<ul className="space-y-3">
								{recordings.map((rec, i) => {
									const fileUrl = rec.file?.fileUrl
									const duration = rec.file?.meta?.duration
									const size = rec.file?.size
									const createdAt = rec.createdAt ?? rec.file?.createdAt

									return (
										<li
											key={rec.id}
											className="bg-muted/50 flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="min-w-0 flex-1">
												<p className="font-medium">
													Recording {recordings.length > 1 ? i + 1 : ""}
												</p>
												<div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
													{createdAt && <span>{format(new Date(createdAt), "PPp")}</span>}
													{duration != null && <span>{formatDuration(duration)}</span>}
													{size != null && formatFileSize(size) && (
														<span>{formatFileSize(size)}</span>
													)}
												</div>
											</div>
											{fileUrl ? (
												<Button
													variant="outline"
													size="sm"
													className="shrink-0 gap-2"
													onClick={() => window.open(fileUrl, "_blank")}
												>
													<Download className="size-4" />
													Download
												</Button>
											) : (
												<span className="text-muted-foreground text-sm">Processing…</span>
											)}
										</li>
									)
								})}
							</ul>
						</ScrollArea>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
