"use client"

import React from "react"
import { AlertCircle, Clock, FileText, Loader2 } from "lucide-react"

import { DropdownMenuItem } from "@/core/components/ui/dropdown-menu"

import { trpc } from "@/services/trpc/client"

interface NotarizedDocumentMenuItemProps {
	projectUuid: string
	isOpening: boolean
	onOpen: (projectUuid: string) => Promise<void>
}

export const NotarizedDocumentMenuItem = React.memo(function NotarizedDocumentMenuItem({
	projectUuid,
	isOpening,
	onOpen,
}: NotarizedDocumentMenuItemProps) {
	const statusQuery = trpc.signatureRequests.checkSigningStatus.useQuery(
		{ projectUuid },
		{
			enabled: projectUuid.trim().length > 0,
			retry: false,
			refetchInterval: query => {
				const statusUpper = String(query.state.data?.projectStatus ?? "").toUpperCase()
				const isCompleted =
					statusUpper === "COMPLETED" || (query.state.data?.completedAt ?? null) !== null
				return isCompleted ? false : 4_000
			},
			staleTime: 4_000,
			refetchOnWindowFocus: false,
		}
	)

	const statusUpper = String(statusQuery.data?.projectStatus ?? "").toUpperCase()
	const isCompleted =
		statusUpper === "COMPLETED" || (statusQuery.data?.completedAt ?? null) !== null
	const hasError = Boolean(statusQuery.error)
	const isDisabled = isOpening || hasError || !isCompleted

	return (
		<DropdownMenuItem
			disabled={isDisabled}
			onClick={() => {
				void onOpen(projectUuid)
			}}
		>
			{isOpening ? (
				<Loader2 className="size-4 animate-spin" />
			) : hasError ? (
				<AlertCircle className="size-4" />
			) : !isCompleted ? (
				<Clock className="size-4" />
			) : (
				<FileText className="size-4" />
			)}
			<span className="ml-2">
				{isOpening
					? "Preparing sealed document..."
					: hasError
						? "Notarized document unavailable"
						: !isCompleted
							? "Notarized document processing..."
							: "View Notarized Document"}
			</span>
		</DropdownMenuItem>
	)
})
