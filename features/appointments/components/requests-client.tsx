"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import type { IncomingItem } from "../api/requests.router"
import { RejectDialog } from "./reject-dialog"
import { RequestsListView } from "./requests-list-view"

export function RequestsClient({ incomingRequests }: { incomingRequests: IncomingItem[] }) {
	const router = useRouter()
	const utils = trpc.useUtils()
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation()
	const confirmAppointmentMutation = trpc.appointments.confirmAppointment.useMutation()
	const cancelAppointmentMutation = trpc.appointments.cancelAppointment.useMutation()

	const revalidate = async () => {
		await utils.requests.getIncomingRequests.invalidate()
		await utils.requests.getIncomingAppointmentsForENP.invalidate()
		router.refresh()
	}

	const handleAccept = async (item: IncomingItem) => {
		setProcessingId(item.id)
		try {
			if (item.source === "appointment") {
				await confirmAppointmentMutation.mutateAsync({
					appointmentId: item.id,
					meetingLink: item.appointmentData?.meetingLink ?? "",
				})
			} else {
				await updateStatusMutation.mutateAsync({
					requestId: item.id,
					status: "IN_PROGRESS",
				})
			}
			toast.success("Request accepted successfully!")
			await revalidate()
			router.push("/sessions")
		} catch (error) {
			toast.error("Failed to accept request", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		} finally {
			setProcessingId(null)
		}
	}

	const handleRejectClick = (item: IncomingItem) => {
		setSelectedRequestId(item.id)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)

		const item = incomingRequests.find(r => r.id === selectedRequestId)
		if (!item) return

		try {
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
			toast.success("Request rejected!")
			setRejectDialogOpen(false)
			await revalidate()
		} catch (error) {
			toast.error("Failed to reject request", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		} finally {
			setProcessingId(null)
		}
	}

	return (
		<>
			<RequestsListView
				incomingRequests={incomingRequests}
				isRequestsLoading={false}
				onAccept={handleAccept}
				onReject={handleRejectClick}
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
