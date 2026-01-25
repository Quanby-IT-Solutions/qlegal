"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { toast } from "sonner"

import { EventCalendar, type CalendarEvent } from "@/core/components/ui/event-calendar"

import { trpc } from "@/services/trpc/client"

import { transformScheduleToCalendarEvents } from "@/features/requests/lib/schedule-utils"

export interface EnpScheduleCalendarProps {
	selectedDay: Date | null
	onDayClick: (day: Date) => void
	onBlockTimeClick: () => void
}

export function EnpScheduleCalendar({
	selectedDay,
	onDayClick,
	onBlockTimeClick,
}: EnpScheduleCalendarProps) {
	const today = new Date()
	const [currentMonth, setCurrentMonth] = useState(today.getMonth())
	const [currentYear, setCurrentYear] = useState(today.getFullYear())

	const { data: incomingRequests = [], isLoading: isRequestsLoading } =
		trpc.requests.getIncomingRequests.useQuery(undefined, {
			enabled: false, // We'll use getEnpSchedule separately for calendar
			refetchOnMount: false,
		})

	const { data: scheduleData, isLoading: isScheduleLoading } =
		trpc.requests.getEnpSchedule.useQuery(
			{
				month: currentMonth,
				year: currentYear,
			},
			{
				enabled: !!currentMonth && !!currentYear,
				refetchOnMount: false,
			}
		)

	// Transform schedule and requests into calendar events
	const calendarEvents = useMemo(() => {
		if (!scheduleData || !incomingRequests) return []

		return transformScheduleToCalendarEvents(
			{
				regular: scheduleData.regular || [],
				blocked: scheduleData.locked || [],
				recurringBlocked: scheduleData.recurringBlocked || [],
				custom: scheduleData.custom || [],
			},
			incomingRequests,
			currentMonth,
			currentYear
		)
	}, [scheduleData, incomingRequests, currentMonth, currentYear])

	const unblockMutation = trpc.requests.unblockTimeSlot.useMutation({
		onSuccess: () => {
			toast.success("Time slot unblocked successfully")
		},
		onError: error => {
			toast.error("Failed to unblock time slot", {
				description: error?.message ?? "An unexpected error occurred",
			})
		},
	})

	const handleUnblock = async (availabilityId: string) => {
		await unblockMutation.mutateAsync({ availabilityId })
	}

	const handleEventClick = (event: CalendarEvent) => {
		if (event.metadata?.type === "blocked" || event.metadata?.type === "recurring-blocked") {
			handleUnblock(event.id)
		}
	}

	if (isRequestsLoading || isScheduleLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-muted-foreground">Loading calendar...</div>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div className="text-muted-foreground text-sm">
					{format(new Date(currentYear, currentMonth, 1), "MMMM yyyy")}
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={onBlockTimeClick}
						className="bg-destructive text-destructive hover:bg-destructive/90 flex items-center gap-2 rounded-md border px-4 py-2 transition-colors"
						type="button"
					>
						<CalendarIcon className="size-4" />
						<span className="font-medium">Block Time</span>
					</button>
				</div>
			</div>

			<EventCalendar
				events={calendarEvents}
				onDateClick={onDayClick}
				onEventClick={handleEventClick}
				onDateRangeChange={range => {
					setCurrentMonth(range.start.getMonth())
					setCurrentYear(range.start.getFullYear())
				}}
				defaultView="month"
				defaultDate={selectedDay || today}
				height={600}
				className="bg-card rounded-lg border"
			/>

			{selectedDay && (
				<div className="bg-card mt-4 rounded-lg border p-4">
					<h3 className="mb-2 font-semibold">
						{selectedDay.toLocaleDateString("en-US", {
							weekday: "long",
							month: "long",
							day: "numeric",
						})}
					</h3>
					<p className="text-muted-foreground mb-4 text-sm">
						Click on blocked events above to unblock time slots, or use "Block Time" to create new
						blocks.
					</p>
				</div>
			)}
		</div>
	)
}
