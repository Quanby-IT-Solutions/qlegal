"use client"

import { useDraggable } from "@dnd-kit/core"

import type { CalendarEvent } from "../lib/schedule-types"
import { EventItem } from "./schedule/event-item"

interface DraggableEventProps {
	event: CalendarEvent
	view: "month" | "week" | "day" | "agenda"
	onClick?: (e: React.MouseEvent) => void
	isFirstDay?: boolean
	isLastDay?: boolean
}

export function DraggableEvent({
	event,
	view,
	onClick,
	isFirstDay = true,
	isLastDay = true,
}: DraggableEventProps) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: event.id,
		data: {
			event,
		},
	})

	return (
		<div
			ref={setNodeRef}
			style={{ touchAction: "none" }}
		>
			<EventItem
				event={event}
				view={view}
				onClick={onClick}
				dndListeners={listeners}
				dndAttributes={attributes}
				isFirstDay={isFirstDay}
				isLastDay={isLastDay}
				isDragging={isDragging}
			/>
		</div>
	)
}
