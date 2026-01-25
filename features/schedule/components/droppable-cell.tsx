"use client"

import { useDroppable } from "@dnd-kit/core"

import type { CalendarEvent } from "../types"

interface DroppableCellProps {
	id: string
	date: Date
	onClick?: () => void
	children?: React.ReactNode
	event?: CalendarEvent
}

export function DroppableCell({ id, date, onClick, children, event }: DroppableCellProps) {
	const { setNodeRef, isOver } = useDroppable({
		id,
		data: { date, event },
	})

	return (
		<div
			ref={setNodeRef}
			className={`relative flex h-full flex-col p-1 transition-colors ${isOver ? "bg-accent/30" : ""}`}
			onClick={onClick}
		>
			{children}
		</div>
	)
}
