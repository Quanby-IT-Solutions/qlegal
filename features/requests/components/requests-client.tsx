"use client"

import { useState } from "react"
import { toast } from "sonner"

import { trpc, type IncomingItem } from "@/services/trpc/client"
import { RejectDialog } from "./reject-dialog"
import { RequestsListView } from "./requests-list-view"

export function RequestsClient({ incomingRequests, isENP }: { incomingRequests: IncomingItem[]; isENP: boolean }) {
	const utils = trpc.useUtils()
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation({
		onSuccess: async () => {
			await utils.requests.getIncomingRequests.invalidate()
			await utils.requests.getIncomingAppointmentsForENP.invalidate()
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

	const confirmAppointmentMutation = trpc.appointments.confirmAppointment.useMutation({
		onSuccess: async () => {
			await utils.requests.getIncomingRequests.invalidate()
			await utils.requests.getIncomingAppointmentsForENP.invalidate()
			toast.success("Appointment accepted successfully!")
			setProcessingId(null)
		},
		onError: error => {
			toast.error("Failed to accept appointment", {
				description: error?.message ?? "An unexpected error occurred",
			})
			setProcessingId(null)
		},
	})

	const cancelAppointmentMutation = trpc.appointments.cancelAppointment.useMutation({
		onSuccess: async () => {
			await utils.requests.getIncomingRequests.invalidate()
			await utils.requests.getIncomingAppointmentsForENP.invalidate()
			toast.success("Appointment rejected!")
			setRejectDialogOpen(false)
			setProcessingId(null)
		},
		onError: error => {
			toast.error("Failed to reject appointment", {
				description: error?.message ?? "An unexpected error occurred",
			})
			setProcessingId(null)
		},
	})

	const handleAccept = async (item: IncomingRequest) => {
		setProcessingId(item.id)
		// Check if it's an appointment or request
		if (item.source === "appointment") {
			await confirmAppointmentMutation.mutateAsync({
				appointmentId: item.id,
				meetingLink: item.appointmentData?.meetingLink || "",
			})
		} else {
			await updateStatusMutation.mutateAsync({
				requestId: item.id,
				status: "IN_PROGRESS",
			})
		}
	}

	const handleRejectClick = (item: IncomingRequest) => {
		setSelectedRequestId(item.id)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)
		
		// Find the item to determine if it's an appointment or request
		const item = incomingRequests.find(r => r.id === selectedRequestId)
		if (!item) return

		if (item.source === "appointment") {
			await cancelAppointmentMutation.mutateAsync({
				appointmentId: item.id,
				cancelReason: "Rejected by ENP",
			})
		} else {
			await updateStatusMutation.mutateAsync({
				requestId: selectedRequestId,
				status: "REJECTED",
			})
		}
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
