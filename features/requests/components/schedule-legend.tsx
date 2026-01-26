"use client"

import { CalendarIcon, Clock, X } from "lucide-react"

export function ScheduleLegend() {
	return (
		<div className="bg-card flex flex-wrap items-center gap-4 rounded-lg border p-4">
			<div className="flex items-center gap-2">
				<CalendarIcon className="text-muted-foreground size-4" />
				<span className="text-sm font-medium">Calendar View</span>
			</div>

			<div className="bg-border/30 h-px w-px" />

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

			<div className="bg-border/30 h-px w-px" />

			<div className="text-muted-foreground flex items-center gap-2 text-xs">
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
