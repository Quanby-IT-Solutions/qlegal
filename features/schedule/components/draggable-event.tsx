"use client"

import { useDraggable } from "@dnd-kit/core"
import { useState } from "react"

import { EventItem, type CalendarEvent } from "./event-item"

interface DraggableEventProps {
	event: CalendarEvent
	view: "month" | "week" | "day" | "agenda"
	onClick?: (e: React.MouseEvent) => void
	isFirstDay?: boolean
	isLastDay?: boolean
}

export function DraggableEvent({ event, view, onClick, isFirstDay, isLastDay }: DraggableEventProps) {
	const [isDragging, setIsDragging] = useState(false)

	const { attributes, listeners, setNodeRef, transform, active } = useDraggable({
		id: event.id,
		data: { event, view },
		onDragStart: () => setIsDragging(true),
		onDragEnd: () => setIsDragging(false),
	})

	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
		  }
		: undefined

	return (
		<EventItem
			ref={setNodeRef}
			event={event}
			view={view}
			isDragging={isDragging || active?.id === event.id}
			onClick={onClick}
			isFirstDay={isFirstDay}
			isLastDay={isLastDay}
			style={style}
			className="cursor-grab active:cursor-grabbing"
			dndListeners={listeners}
			dndAttributes={attributes}
		/>
	)
}
