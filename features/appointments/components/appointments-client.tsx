"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { type inferRouterOutputs } from "@trpc/server"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"
import { type AppRouter } from "@/services/trpc/root"

import { AppointmentsListView } from "./appointments-list-view"
import { RejectDialog } from "./dialogs/reject-dialog"

type IncomingRequest = inferRouterOutputs<AppRouter>["appointments"]["getIncomingRequests"][number]

export function AppointmentsClient({ incomingRequests }: { incomingRequests: IncomingRequest[] }) {
	const router = useRouter()
	const utils = trpc.useUtils()
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const updateStatusMutation = trpc.appointments.updateRequestStatus.useMutation()

	const revalidate = async () => {
		await utils.appointments.getIncomingRequests.invalidate()
		router.refresh()
	}

	const handleAccept = async (item: IncomingRequest) => {
		setProcessingId(item.id)
		try {
			await updateStatusMutation.mutateAsync({
				requestId: item.id,
				status: "IN_PROGRESS",
			})
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

	const handleRejectClick = (item: IncomingRequest) => {
		setSelectedRequestId(item.id)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)

		const item = incomingRequests.find(r => r.id === selectedRequestId)
		if (!item) return

		try {
			await updateStatusMutation.mutateAsync({
				requestId: selectedRequestId,
				status: "REJECTED",
			})
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
			<AppointmentsListView
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
