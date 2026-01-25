"use client"

import { useState } from "react"
import { toast } from "sonner"
import { trpc } from "@/services/trpc/client"

import { RequestsListView } from "./requests-list-view"
import { RejectDialog } from "./reject-dialog"

interface IncomingRequest {
	id: string
	title: string
	description: string | null
	status: string
	workflow: string
	priority?: string
	createdAt: Date
	updatedAt: Date
	enpId: string
	principalId: string
	appointmentId: string | null
	rejectReason: string | null
	principal?: {
		name?: string | null
		image?: string | null
	}
	documents?: number
}

interface RequestsClientProps {
	incomingRequests: IncomingRequest[]
	isENP: boolean
}

export function RequestsClient({ incomingRequests, isENP }: RequestsClientProps) {
	const utils = trpc.useUtils()
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation({
		onSuccess: async () => {
			await utils.requests.getIncomingRequests.invalidate()
			toast.success("Request status updated successfully!")
			setRejectDialogOpen(false)
			setProcessingId(null)
		},
		onError: error => {
			toast.error("Failed to update request", {
				description: error?.message ?? "An unexpected error occurred",
			})
			setProcessingId(null)
		},
	})

	const handleAccept = async (requestId: string) => {
		setProcessingId(requestId)
		await updateStatusMutation.mutateAsync({
			requestId,
			status: "IN_PROGRESS",
		})
	}

	const handleRejectClick = (requestId: string) => {
		setSelectedRequestId(requestId)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)
		await updateStatusMutation.mutateAsync({
			requestId: selectedRequestId,
			status: "REJECTED",
		})
	}

	const handleComplete = async (requestId: string) => {
		setProcessingId(requestId)
		await updateStatusMutation.mutateAsync({
			requestId,
			status: "COMPLETED",
		})
	}

	return (
		<>
			<RequestsListView
				incomingRequests={incomingRequests}
				isRequestsLoading={false}
				onAccept={handleAccept}
				onReject={handleRejectClick}
				onComplete={handleComplete}
				processingId={processingId}
			/>

			<RejectDialog
				isOpen={rejectDialogOpen}
				onOpenChange={setRejectDialogOpen}
				onConfirm={handleReject}
				isProcessing={processingId !== null}
			/>
		</>
	)
}
