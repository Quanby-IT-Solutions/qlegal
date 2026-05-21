"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"

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
