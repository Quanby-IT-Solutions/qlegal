"use client"

import { useMemo, useState } from "react"
import { Calendar } from "lucide-react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import { transformScheduleToCalendarEvents } from "@/features/requests/lib/schedule-utils"

import { BlockTimeModal } from "./block-time-modal"
import { EnpScheduleCalendar } from "./enp-schedule-calendar"
import { ScheduleLegend } from "./schedule-legend"

interface ScheduleClientProps {
	scheduleData: {
		regular: unknown[]
		blocked: unknown[]
		recurringBlocked: unknown[]
		custom: unknown[]
	}
}

export function ScheduleClient({ scheduleData }: ScheduleClientProps) {
	const [selectedDay, setSelectedDay] = useState<Date | null>(null)
	const [blockModalOpen, setBlockModalOpen] = useState(false)
	const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
	const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

	// Fetch requests on client for calendar events
	const { data: incomingRequests = [] } = trpc.requests.getIncomingRequests.useQuery(undefined)

	const calendarEvents = useMemo(() => {
		if (!scheduleData || !incomingRequests) return []
		return transformScheduleToCalendarEvents(
			{
				regular: scheduleData.regular || [],
				blocked: scheduleData.blocked || [],
				recurringBlocked: scheduleData.recurringBlocked || [],
				custom: scheduleData.custom || [],
			},
			incomingRequests,
			currentMonth,
			currentYear
		)
	}, [scheduleData, incomingRequests, currentMonth, currentYear])

	const handleDayClick = (day: Date) => {
		setSelectedDay(day)
	}

	const handleBlockTimeClick = () => {
		setBlockModalOpen(true)
	}

	const handleSaveBlockTime = async (data: unknown) => {
		try {
			await trpc.requests.blockTimeSlot.useMutation().mutateAsync(data)
			toast.success("Time slot blocked successfully!")
			setBlockModalOpen(false)
		} catch (error) {
			toast.error("Failed to block time slot", {
				description: error instanceof Error ? error.message : "An unexpected error occurred",
			})
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
				<p className="text-muted-foreground mt-2">
					Manage your availability and blocked time slots
				</p>
			</div>

			<div className="space-y-4">
				{/* Legend */}
				<div>
					<ScheduleLegend />
				</div>

				{/* Calendar */}
				<EnpScheduleCalendar
					selectedDay={selectedDay}
					onDayClick={handleDayClick}
					onBlockTimeClick={handleBlockTimeClick}
				/>
			</div>

			{/* Block Time Modal */}
			{blockModalOpen && (
				<BlockTimeModal
					isOpen={blockModalOpen}
					onClose={() => setBlockModalOpen(false)}
					onSave={handleSaveBlockTime}
				/>
			)}
		</div>
	)
}
