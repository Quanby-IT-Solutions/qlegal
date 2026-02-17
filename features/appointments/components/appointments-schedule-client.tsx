"use client"

import { useMemo } from "react"

import { CalendarScheduleProvider, type CalendarEvent } from "@/core/components/calendar-schedule"
import { Card, CardAction, CardContent, CardHeader } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"

import type { AppointmentItem } from "../api/appointments.router"
import { buildCalendarEvents } from "../lib/calendar-events"
import { useAppointmentsScheduleActions } from "../lib/use-appointments-schedule-actions"
import { CalendarCard } from "./calendar/calendar-card"
import { AddEventSection } from "./event-list/add-event-section"
import { EventListHeader, UnifiedSidebarList } from "./event-list/event-list-card"
import { RejectDialog } from "./reject-dialog"

interface AppointmentsScheduleClientProps {
	scheduleData: {
		regular: EnpAvailability[]
		blocked: EnpAvailability[]
		recurringBlocked: EnpAvailability[]
		custom: EnpAvailability[]
		myAppointments?: (Appointment & { lapsed?: boolean })[]
	}
	incomingRequests: AppointmentItem[]
}

export function AppointmentsScheduleClient({
	scheduleData,
	incomingRequests,
}: AppointmentsScheduleClientProps) {
	const {
		rejectDialogOpen,
		processingId,
		isCreatingEvent,
		isDeletingEvent,
		handleAccept,
		handleRejectClick,
		handleReject,
		handleEventSave,
		handleEventDelete,
		setRejectDialogOpen,
	} = useAppointmentsScheduleActions({ incomingRequests })

	const calendarEvents = useMemo((): CalendarEvent[] => {
		return buildCalendarEvents(incomingRequests, scheduleData?.myAppointments ?? [])
	}, [incomingRequests, scheduleData?.myAppointments])

	return (
		<>
			<CalendarScheduleProvider
				events={calendarEvents}
				className="mt-4 grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:items-start lg:gap-x-4 lg:gap-y-0"
			>
				<CalendarCard events={calendarEvents} />

				<Card className="order-first col-span-1 lg:order-0 lg:col-span-1 lg:flex lg:max-h-[calc(100vh-12rem)] lg:flex-col">
					<CardHeader className="shrink-0">
						<EventListHeader />
						<CardAction>
							<AddEventSection
								onSave={handleEventSave}
								onDelete={handleEventDelete}
								isSaving={isCreatingEvent}
								isDeleting={isDeletingEvent}
							/>
						</CardAction>
					</CardHeader>
					<Separator />
					<CardContent className="min-h-0 flex-1 overflow-y-auto">
						<UnifiedSidebarList
							incomingRequests={incomingRequests}
							onAccept={handleAccept}
							onReject={handleRejectClick}
							processingId={processingId}
						/>
					</CardContent>
				</Card>
			</CalendarScheduleProvider>

			<RejectDialog
				isOpen={rejectDialogOpen}
				onOpenChange={setRejectDialogOpen}
				onConfirm={handleReject}
				isProcessing={processingId !== null}
			/>
		</>
	)
}
