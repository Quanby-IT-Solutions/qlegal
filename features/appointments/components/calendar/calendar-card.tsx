"use client"

import {
	CalendarScheduleBody,
	CalendarScheduleDatePagination,
	CalendarScheduleGoToToday,
	CalendarScheduleHeader,
	CalendarScheduleMonthPicker,
	CalendarScheduleYearPicker,
	useCalendarScheduleHeader,
	type CalendarEvent,
} from "@/core/components/calendar-schedule"
import { Badge } from "@/core/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

function CalendarCardHeader() {
	const { monthYear, eventCount } = useCalendarScheduleHeader()

	return (
		<>
			<CardTitle>{monthYear}</CardTitle>
			<CardDescription>
				{eventCount} {eventCount === 1 ? "event" : "events"} this month
			</CardDescription>
		</>
	)
}

interface CalendarCardProps {
	events: CalendarEvent[]
}

export function CalendarCard({ events }: CalendarCardProps) {
	return (
		<Card className="col-span-2 mb-4 lg:mb-0">
			<CardHeader>
				<CalendarCardHeader />
			</CardHeader>
			<Separator />
			<CardContent>
				<div className="mb-3 flex items-center justify-between">
					<div className="flex flex-wrap items-center gap-1">
						<CalendarScheduleMonthPicker />
						<CalendarScheduleYearPicker />
						<CalendarScheduleGoToToday />
					</div>
					<CalendarScheduleDatePagination />
				</div>

				<CalendarScheduleHeader />

				<CalendarScheduleBody>
					{({ event }) => {
						return (
							<div key={event.id} className="flex min-w-0 items-center gap-2">
								<Badge variant="outline" className="truncate">
									{event.title !== ""
										? event.title
										: event.appointmentType === "NOTARIZATION"
											? "Notarization"
											: "Consultation"}
								</Badge>
							</div>
						)
					}}
				</CalendarScheduleBody>
			</CardContent>
		</Card>
	)
}
