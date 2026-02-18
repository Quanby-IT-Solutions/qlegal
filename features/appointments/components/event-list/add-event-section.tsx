import { useMemo, useState } from "react"
import { isBefore, startOfDay } from "date-fns"

import {
	useCalendarSchedule,
	type CalendarEvent,
	type Status,
} from "@/core/components/calendar-schedule"
import { Button } from "@/core/components/ui/button"

import { EventDialog } from "../dialogs/event-dialog"

const STATUS_PENDING: Status = { id: "pending", name: "Pending", color: "#F59E0B" }

interface AddEventSectionProps {
	onSave: (event: CalendarEvent, onComplete?: () => void) => void
	onDelete?: (eventId: string) => Promise<void>
	isSaving?: boolean
	isDeleting?: boolean
}

export function AddEventSection({ onSave, onDelete, isSaving, isDeleting }: AddEventSectionProps) {
	const { selectedDate } = useCalendarSchedule()
	const [isOpen, setIsOpen] = useState(false)

	const defaultEvent: CalendarEvent | null = useMemo(() => {
		const d = selectedDate ? new Date(selectedDate) : new Date()
		d.setHours(9, 0, 0, 0)
		return {
			id: "",
			title: "",
			startAt: d,
			status: STATUS_PENDING,
		}
	}, [selectedDate])

	const isDateInPast = selectedDate
		? isBefore(startOfDay(new Date(selectedDate)), startOfDay(new Date()))
		: false

	return (
		<>
			{!isDateInPast && (
				<Button variant="outline" onClick={() => setIsOpen(true)}>
					Add Event
				</Button>
			)}
			<EventDialog
				event={defaultEvent}
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				onSave={ev => onSave(ev, () => setIsOpen(false))}
				onDelete={onDelete}
				isSaving={isSaving}
				isDeleting={isDeleting}
			/>
		</>
	)
}
