import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import type { CalendarEvent } from "@/core/components/calendar-schedule"

import { trpc } from "@/services/trpc/client"

import type { AppointmentItem } from "../api/appointments.router"
import { addHoursToDate } from "./schedule-utils"

interface UseAppointmentsScheduleActionsParams {
	incomingRequests: AppointmentItem[]
}

export function useAppointmentsScheduleActions({
	incomingRequests,
}: UseAppointmentsScheduleActionsParams) {
	const router = useRouter()
	const utils = trpc.useUtils()
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation()
	const confirmAppointmentMutation = trpc.appointments.confirmAppointment.useMutation()
	const cancelAppointmentMutation = trpc.appointments.cancelAppointment.useMutation()
	const createEnpEvent = trpc.schedule.createEnpEvent.useMutation({
		onSuccess: () => {
			void utils.requests.getEnpSchedule.invalidate()
			void utils.requests.getIncomingRequests.invalidate()
			void utils.requests.getIncomingAppointmentsForENP.invalidate()
			router.refresh()
			toast.success("Event created successfully")
		},
		onError: error => {
			toast.error("Failed to create event", { description: error.message })
		},
	})
	const deleteEnpEvent = trpc.schedule.deleteEnpEvent.useMutation()

	const revalidate = async () => {
		await utils.requests.getIncomingRequests.invalidate()
		await utils.requests.getIncomingAppointmentsForENP.invalidate()
		await utils.requests.getEnpSchedule.invalidate()
		router.refresh()
	}

	const handleAccept = async (item: AppointmentItem) => {
		setProcessingId(item.id)
		try {
			if (item.source === "appointment") {
				await confirmAppointmentMutation.mutateAsync({
					appointmentId: item.id,
					meetingLink: item.appointmentData?.meetingLink ?? "",
				})
			} else {
				await updateStatusMutation.mutateAsync({ requestId: item.id, status: "IN_PROGRESS" })
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

	const handleRejectClick = (item: AppointmentItem) => {
		setSelectedRequestId(item.id)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)

		const item = incomingRequests.find(request => request.id === selectedRequestId)
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

	const handleEventSave = (event: CalendarEvent, onComplete?: () => void) => {
		const endAt = event.endAt ?? addHoursToDate(event.startAt, 1)
		const duration = Math.round((endAt.getTime() - event.startAt.getTime()) / (60 * 1000))
		const startTime = `${event.startAt.getHours().toString().padStart(2, "0")}:${event.startAt.getMinutes().toString().padStart(2, "0")}`
		const endTime = `${endAt.getHours().toString().padStart(2, "0")}:${endAt.getMinutes().toString().padStart(2, "0")}`
		const type = event.appointmentType ?? "CONSULTATION"
		const workflow = event.workflow ?? (event.meta?.location ? "IEN" : "REN")

		createEnpEvent.mutate(
			{
				title: event.title.trim(),
				description: event.description?.trim(),
				appointmentDate: event.startAt,
				startTime,
				endTime,
				duration,
				allDay: event.allDay ?? false,
				location: (event.meta?.location as string | undefined)?.trim(),
				type,
				workflow,
				notes: event.description?.trim(),
			},
			{ onSuccess: () => onComplete?.() }
		)
	}

	const handleEventDelete = async (eventId: string) => {
		try {
			await deleteEnpEvent.mutateAsync({ appointmentId: eventId })
			toast.success("Event deleted successfully")
			await revalidate()
		} catch (error) {
			toast.error("Failed to delete event", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
			throw error
		}
	}

	return {
		rejectDialogOpen,
		processingId,
		isCreatingEvent: createEnpEvent.isPending,
		isDeletingEvent: deleteEnpEvent.isPending,
		handleAccept,
		handleRejectClick,
		handleReject,
		handleEventSave,
		handleEventDelete,
		setRejectDialogOpen,
	}
}
