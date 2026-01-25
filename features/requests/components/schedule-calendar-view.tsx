"use client"

import { Calendar } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Alert, AlertDescription } from "@/core/components/ui/alert"

import { ScheduleLegend } from "./schedule-legend"
import { EnpScheduleCalendar } from "./enp-schedule-calendar"

interface ScheduleCalendarViewProps {
	selectedDay: Date | null
	onDayClick: (day: Date) => void
	onBlockTimeClick: () => void
	onSaveBlockTime: (data: unknown) => Promise<void>
	isBlockModalOpen: boolean
	setBlockModalOpen: (open: boolean) => void
}

export function ScheduleCalendarView({
	selectedDay,
	onDayClick,
	onBlockTimeClick,
	onSaveBlockTime,
	isBlockModalOpen,
	setBlockModalOpen,
}: ScheduleCalendarViewProps) {
	return (
		<div className="space-y-8">
			

			{/* Schedule & Calendar Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Calendar className="size-5" />
							Schedule & Calendar
						</CardTitle>
						<div className="flex items-center gap-2">
							<Button onClick={onBlockTimeClick} type="button">
								<Calendar className="mr-2 size-4" />
								Block Time
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-6 space-y-4">
					{/* Legend */}
					<div className="mb-4">
						<ScheduleLegend />
					</div>

					{/* Calendar Component */}
					<div>
						<div className="mb-4 text-sm text-muted-foreground">
							Click on a day to view details or manage availability for that date.
						</div>
						<EnpScheduleCalendar
							selectedDay={selectedDay}
							onDayClick={onDayClick}
							onBlockTimeClick={onBlockTimeClick}
						/>
					</div>

					{/* Selected Day Details Panel */}
					{selectedDay && (
						<div className="mt-4 rounded-lg border bg-muted/30 p-4">
							<h3 className="font-semibold mb-2">
								{selectedDay.toLocaleDateString("en-US", {
									weekday: "long",
									month: "long",
									day: "numeric",
								})}
							</h3>
							<p className="text-muted-foreground text-sm mb-4">
								Manage your availability for this date or view details.
							</p>
							<div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
								<div className="flex items-center gap-1">
									<Calendar className="size-3" />
									<span>Click day above to block/unblock</span>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
