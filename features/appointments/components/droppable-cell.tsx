"use client"

import { useDroppable } from "@dnd-kit/core"
import type { ReactNode } from "react"

interface DroppableCellProps {
	id: string
	date: Date
	children: ReactNode
	onClick?: () => void
}

export function DroppableCell({ id, date, children, onClick }: DroppableCellProps) {
	const { isOver, setNodeRef } = useDroppable({
		id,
		data: {
			date,
		},
	})

	return (
		<div
			ref={setNodeRef}
			onClick={onClick}
			className={`h-full w-full ${isOver ? "bg-muted/30" : ""}`}
		>
			{children}
		</div>
	)
}
