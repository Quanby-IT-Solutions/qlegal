import { useRouter } from "next/navigation"
import { useState } from "react"
import { type inferRouterOutputs } from "@trpc/server"
import { toast } from "sonner"

import type { CalendarEvent } from "@/core/components/calendar-schedule"

import { trpc } from "@/services/trpc/client"
import { type AppRouter } from "@/services/trpc/root"

import { addHoursToDate } from "./schedule-utils"

type IncomingRequest =
	inferRouterOutputs<AppRouter>["appointments"]["getEnpScheduleDashboard"]["incomingRequests"][number]
type IncomingAppointment =
	inferRouterOutputs<AppRouter>["appointments"]["getEnpScheduleDashboard"]["incomingAppointments"][number]

export type ScheduleIncomingItem =
	| { source: "request"; item: IncomingRequest }
	| { source: "appointment"; item: IncomingAppointment }

const toProcessingKey = (item: ScheduleIncomingItem) => `${item.source}:${item.item.id}`

export function useAppointmentsScheduleActions() {
	const router = useRouter()
	const utils = trpc.useUtils()
	const [selectedItem, setSelectedItem] = useState<ScheduleIncomingItem | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingKey, setProcessingKey] = useState<string | null>(null)

	const updateStatusMutation = trpc.appointments.updateRequestStatus.useMutation()
	const confirmAppointmentMutation = trpc.appointments.confirmAppointment.useMutation()
	const cancelAppointmentMutation = trpc.appointments.cancelAppointment.useMutation()
	const createEnpEvent = trpc.appointments.createEnpEvent.useMutation({
		onSuccess: () => {
			void utils.appointments.getEnpScheduleDashboard.invalidate()
			router.refresh()
			toast.success("Event created")
		},
		onError: error => {
			toast.error("Unable to create event", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		},
	})
	const deleteEnpEvent = trpc.appointments.deleteEnpEvent.useMutation()

	const revalidate = async () => {
		await utils.appointments.getEnpScheduleDashboard.invalidate()
		// Sessions page uses these queries; invalidate so redirect shows fresh data immediately.
		await utils.meetings.getUserMeetingsWithDocumentStats.invalidate()
		await utils.appointments.getUpcomingAppointments.invalidate()
		router.refresh()
	}

	const handleAccept = async (selection: ScheduleIncomingItem) => {
		setProcessingKey(toProcessingKey(selection))
		const toastId = toast.loading("Processing request...")
		try {
			if (selection.source === "appointment") {
				await confirmAppointmentMutation.mutateAsync({
					appointmentId: selection.item.id,
				})
			} else {
				await updateStatusMutation.mutateAsync({
					requestId: selection.item.id,
					status: "IN_PROGRESS",
				})
			}
			toast.success("Request accepted", { id: toastId })
			await revalidate()
			router.push("/sessions")
		} catch (error) {
			toast.error("Unable to accept request", {
				id: toastId,
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		} finally {
			setProcessingKey(null)
		}
	}

	const handleRejectClick = (selection: ScheduleIncomingItem) => {
		setSelectedItem(selection)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedItem) return
		setProcessingKey(toProcessingKey(selectedItem))

		const toastId = toast.loading("Processing request...")

		try {
			if (selectedItem.source === "appointment") {
				await cancelAppointmentMutation.mutateAsync({
					appointmentId: selectedItem.item.id,
					cancelReason: "Rejected by ENP",
				})
			} else {
				await updateStatusMutation.mutateAsync({
					requestId: selectedItem.item.id,
					status: "REJECTED",
				})
			}
			toast.success("Request rejected", { id: toastId })
			setRejectDialogOpen(false)
			setSelectedItem(null)
			await revalidate()
		} catch (error) {
			toast.error("Unable to reject request", {
				id: toastId,
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		} finally {
			setProcessingKey(null)
		}
	}

	const handleEventSave = (event: CalendarEvent, onComplete?: () => void) => {
		const endAt = event.endAt ?? addHoursToDate(event.startAt, 1)
		const duration = Math.round((endAt.getTime() - event.startAt.getTime()) / (60 * 1000))
		const startTime = `${event.startAt.getHours().toString().padStart(2, "0")}:${event.startAt.getMinutes().toString().padStart(2, "0")}`
		const endTime = `${endAt.getHours().toString().padStart(2, "0")}:${endAt.getMinutes().toString().padStart(2, "0")}`
		const type = event.appointmentType ?? "CONSULTATION"
		const workflow = event.workflow ?? (event.meta?.location ? "IEN" : "REN")

		// TODO: Add updateEnpEvent flow when frontend event editing is implemented.
		// Success: toast.success("Event updated")
		// Error: toast.error("Unable to update event", { description: error.message })
		// Differentiate create vs update based on event.id in this handler.

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
			},
			{ onSuccess: () => onComplete?.() }
		)
	}

	const handleEventDelete = async (eventId: string) => {
		const toastId = toast.loading("Processing request...")
		try {
			await deleteEnpEvent.mutateAsync({ appointmentId: eventId })
			toast.success("Event deleted", { id: toastId })
			await revalidate()
		} catch (error) {
			toast.error("Unable to delete event", {
				id: toastId,
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
			throw error
		}
	}

	return {
		rejectDialogOpen,
		processingKey,
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
