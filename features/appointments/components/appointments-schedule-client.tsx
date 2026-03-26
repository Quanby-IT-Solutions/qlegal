"use client"

import { useMemo } from "react"
import { type inferRouterOutputs } from "@trpc/server"

import { CalendarScheduleProvider, type CalendarEvent } from "@/core/components/calendar-schedule"
import { Card, CardAction, CardContent, CardHeader } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

import type { Appointment } from "@/services/drizzle/schema/appointments"
import type { EnpAvailability } from "@/services/drizzle/schema/enp-profiles"
import { trpc } from "@/services/trpc/client"
import type { AppRouter } from "@/services/trpc/root"

import { buildCalendarEvents } from "../lib/calendar-events"
import { useAppointmentsScheduleActions } from "../lib/use-appointments-schedule-actions"
import { CalendarCard } from "./calendar/calendar-card"
import { CalendarSkeleton } from "./calendar/calendar-skeleton"
import { RejectDialog } from "./dialogs/reject-dialog"
import { AddEventSection } from "./event-list/add-event-section"
import { EventListHeader, UnifiedSidebarList } from "./event-list/event-list-card"
import { EventListSkeleton } from "./event-list/event-list-skeleton"

interface AppointmentsScheduleClientProps {
	scheduleMonth: number
	scheduleYear: number
}

type IncomingRequests = inferRouterOutputs<AppRouter>["appointments"]["getIncomingRequests"]
type IncomingAppointments =
	inferRouterOutputs<AppRouter>["appointments"]["getIncomingAppointmentsForENP"]
type ScheduleData = {
	regular: EnpAvailability[]
	blocked: EnpAvailability[]
	recurringBlocked: EnpAvailability[]
	custom: EnpAvailability[]
	myAppointments?: (Appointment & { lapsed?: boolean })[]
}

const emptyScheduleData: ScheduleData = {
	regular: [],
	blocked: [],
	recurringBlocked: [],
	custom: [],
	myAppointments: [],
}

function sortIncomingItems<T extends { createdAt: Date }>(items: T[]) {
	return [...items].sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime()
		const dateB = new Date(b.createdAt).getTime()
		return dateB - dateA
	})
}

function ScheduleBranchFallback() {
	return (
		<div className="mt-4 grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:items-start lg:gap-x-4 lg:gap-y-0">
			<CalendarSkeleton />
			<EventListSkeleton />
		</div>
	)
}

export function AppointmentsScheduleClient({
	scheduleMonth,
	scheduleYear,
}: AppointmentsScheduleClientProps) {
	const incomingRequestsQuery = trpc.appointments.getIncomingRequests.useQuery()
	const incomingAppointmentsQuery = trpc.appointments.getIncomingAppointmentsForENP.useQuery()
	const scheduleQuery = trpc.appointments.getEnpSchedule.useQuery({
		month: scheduleMonth,
		year: scheduleYear,
	})

	const incomingRequests = useMemo(
		(): IncomingRequests => sortIncomingItems(incomingRequestsQuery.data ?? []),
		[incomingRequestsQuery.data]
	)
	const incomingAppointments = useMemo(
		(): IncomingAppointments => sortIncomingItems(incomingAppointmentsQuery.data ?? []),
		[incomingAppointmentsQuery.data]
	)
	const scheduleData = scheduleQuery.data ?? emptyScheduleData

	const {
		rejectDialogOpen,
		processingKey,
		isCreatingEvent,
		isDeletingEvent,
		handleAccept,
		handleRejectClick,
		handleReject,
		handleEventSave,
		handleEventDelete,
		setRejectDialogOpen,
	} = useAppointmentsScheduleActions()

	const calendarEvents = useMemo((): CalendarEvent[] => {
		return buildCalendarEvents(
			incomingRequests,
			incomingAppointments,
			scheduleData?.myAppointments ?? []
		)
	}, [incomingRequests, incomingAppointments, scheduleData?.myAppointments])

	const missingInitialData =
		incomingRequestsQuery.data === undefined ||
		incomingAppointmentsQuery.data === undefined ||
		scheduleQuery.data === undefined
	const isInitialLoading =
		missingInitialData &&
		(incomingRequestsQuery.isPending ||
			incomingAppointmentsQuery.isPending ||
			scheduleQuery.isPending)
	const queryError =
		incomingRequestsQuery.error ?? incomingAppointmentsQuery.error ?? scheduleQuery.error

	if (isInitialLoading) {
		return <ScheduleBranchFallback />
	}

	if (missingInitialData && queryError) {
		return (
			<div className="border-border bg-card mt-4 rounded-lg border p-6">
				<h2 className="text-lg font-semibold">Unable to load appointments</h2>
				<p className="text-muted-foreground mt-2 text-sm">
					{queryError.message || "Please refresh the page and try again."}
				</p>
			</div>
		)
	}

	return (
		<>
			<CalendarScheduleProvider
				events={calendarEvents}
				className="mt-4 grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:items-start lg:gap-x-4 lg:gap-y-0"
			>
				<CalendarCard events={calendarEvents} />

				<Card className="animate-in fade-in order-first col-span-1 duration-300 motion-reduce:animate-none lg:order-0 lg:col-span-1 lg:flex lg:max-h-[calc(100vh-12rem)] lg:flex-col">
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
							incomingAppointments={incomingAppointments}
							onAccept={handleAccept}
							onReject={handleRejectClick}
							processingKey={processingKey}
						/>
					</CardContent>
				</Card>
			</CalendarScheduleProvider>

			<RejectDialog
				isOpen={rejectDialogOpen}
				onOpenChange={setRejectDialogOpen}
				onConfirm={handleReject}
				isProcessing={processingKey !== null}
			/>
		</>
	)
}
