"use client"

import { EllipsisVertical, FileText, MessageSquare } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface MeetingSidePanelControlsProps {
	sidePanel: "documents" | "chat" | null
	onSidePanelChange: (panel: "documents" | "chat" | null) => void
}

export function MeetingSidePanelControls({
	sidePanel,
	onSidePanelChange,
}: MeetingSidePanelControlsProps) {
	const showDocuments = sidePanel === "documents"

	return (
		<div className="flex items-center rounded-2xl border border-white/10 bg-zinc-900/90 px-2 py-2 shadow-xl backdrop-blur-md">
			<Button
				variant="ghost"
				className={
					showDocuments
						? "h-10 rounded-xl bg-white/10 px-3 text-white hover:bg-white/15"
						: "h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
				}
				onClick={() => onSidePanelChange(showDocuments ? null : "documents")}
				title="Toggle documents"
			>
				<FileText className="size-4" />
			</Button>
			<Button
				variant="ghost"
				className={
					sidePanel === "chat"
						? "h-10 rounded-xl bg-white/10 px-3 text-white hover:bg-white/15"
						: "h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
				}
				onClick={() => onSidePanelChange(sidePanel === "chat" ? null : "chat")}
				title="Messages"
			>
				<MessageSquare className="size-4" />
			</Button>
			<Button
				variant="ghost"
				className="h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
				title="More tools"
			>
				<EllipsisVertical className="size-4" />
			</Button>
		</div>
	)
}
