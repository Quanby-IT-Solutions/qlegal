"use client"

import { useMemo } from "react"
import { Calendar, CalendarBody, CalendarDatePicker, CalendarMonthPicker, CalendarYearPicker, CalendarDate, CalendarDatePagination, CalendarItem, type Status, type Feature, CalendarProvider, useCalendarMonth, useCalendarYear } from "@/core/components/kibo-ui/calendar"
import { CalendarIcon, X } from "lucide-react"

import { trpc } from "@/services/trpc/client"
import { transformScheduleToCalendarFeatures } from "@/features/requests/lib/schedule-utils"
import { toast } from "sonner"

export interface EnpScheduleCalendarProps {
	selectedDay: Date | null
	onDayClick: (day: Date) => void
	onBlockTimeClick: () => void
}

export function EnpScheduleCalendar({ selectedDay, onDayClick, onBlockTimeClick }: EnpScheduleCalendarProps) {
	const [month, setMonth] = useCalendarMonth()
	const [year, setYear] = useCalendarYear()

		const { data: incomingRequests = [], isLoading: isRequestsLoading } =
			trpc.requests.getIncomingRequests.useQuery(undefined, {
				enabled: false, // We'll use getEnpSchedule separately for calendar
				refetchOnMount: false,
			})

	const { data: scheduleData, isLoading: isScheduleLoading } = trpc.requests.getEnpSchedule.useQuery(
		{
			month: month,
			year: year,
		},
		{
			enabled: !!month && !!year,
			refetchOnMount: false,
		},
	)

	// Transform schedule and requests into calendar features
	const calendarFeatures = useMemo(() => {
		if (!scheduleData || !incomingRequests) return []

		return transformScheduleToCalendarFeatures(
			{
				regular: scheduleData.regular || [],
				blocked: scheduleData.locked || [],
				recurringBlocked: scheduleData.recurringBlocked || [],
				custom: scheduleData.custom || [],
			},
			incomingRequests,
			month,
			year,
		)
	}, [scheduleData, incomingRequests, month, year])

	const unblockMutation = trpc.requests.unblockTimeSlot.useMutation({
		onSuccess: () => {
			toast.success("Time slot unblocked successfully")
		},
		onError: (error) => {
			toast.error("Failed to unblock time slot", {
				description: error?.message ?? "An unexpected error occurred",
			})
		},
	})

	const handleUnblock = async (availabilityId: string) => {
		await unblockMutation.mutateAsync({ availabilityId })
	}

	if (isRequestsLoading || isScheduleLoading) {
		return (
			<CalendarProvider locale="en-US" startDay={0}>
				<div className="flex h-full items-center justify-center">
					<div className="text-muted-foreground">Loading calendar...</div>
				</div>
			</CalendarProvider>
		)
	}

	return (
		<CalendarProvider locale="en-US" startDay={0}>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<CalendarDate>
						<CalendarMonthPicker className="w-32" />
						<CalendarYearPicker start={2023} end={2030} className="w-24" />
					</CalendarDate>
					<div className="flex items-center gap-2">
						<button
							onClick={onBlockTimeClick}
							className="flex items-center gap-2 rounded-md border bg-destructive px-4 py-2 text-destructive hover:bg-destructive/90 transition-colors"
							type="button"
						>
							<CalendarIcon className="h-4 w-4" />
							<span className="font-medium">Block Time</span>
						</button>
					</div>
				</div>

				<CalendarBody features={calendarFeatures}>
					{(props) => (
						<CalendarItem feature={props.feature}>
							{props.feature.status.id === "blocked" || props.feature.status.id === "recurring-blocked" ? (
								<button
									onClick={() => handleUnblock(props.feature.id)}
									className="flex items-center gap-2 text-destructive hover:underline"
									type="button"
								>
									<X className="h-3 w-3" />
									<span className="text-xs">Unblock</span>
								</button>
							) : null}
						</CalendarItem>
					)}
				</CalendarBody>

				{selectedDay && (
					<div className="mt-4 rounded-lg border bg-card p-4">
						<h3 className="font-semibold mb-2">
							{selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
						</h3>
						<p className="text-muted-foreground text-sm mb-4">
							Click on the calendar above to manage availability for this date.
						</p>
					</div>
				)}
			</div>
		</CalendarProvider>
	)
}
