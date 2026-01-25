"use client"

import { CalendarIcon, Clock, X } from "lucide-react"

export function ScheduleLegend() {
	return (
		<div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
		<div className="flex items-center gap-2">
			<CalendarIcon className="size-4 text-muted-foreground" />
				<span className="text-sm font-medium">Calendar View</span>
			</div>

			<div className="h-px bg-border/30 w-px" />

			<div className="flex flex-wrap items-center gap-2">
				<div className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-sm bg-green-500" />
					<span className="text-sm">Available</span>
				</div>

				<div className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-sm bg-red-500" />
					<span className="text-sm">Blocked (one-time)</span>
				</div>

				<div className="flex items-center gap-2">
					<div className="h-2 w-2 rounded-sm bg-red-700" />
					<span className="text-sm">Blocked (recurring)</span>
				</div>

				<div className="flex items-center gap-2">
					<Clock className="size-4 text-blue-500" />
					<span className="text-sm">Incoming Request</span>
				</div>
			</div>

			<div className="h-px bg-border/30 w-px" />

			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					<CalendarIcon className="size-3" />
					<span>Click day to view details or block time</span>
				</div>
				<div className="flex items-center gap-1">
					<X className="h-3 w-3" />
					<span>Click X to unblock time slot</span>
				</div>
			</div>
		</div>
	)
}
