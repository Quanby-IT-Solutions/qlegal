import Link from "next/link"
import { Clock } from "lucide-react"

import { Button } from "@/core/components/ui/button"

import type { ENPAvailableSlot } from "@/features/browse/lib/enp-display.types"

interface EnpAvailableSlotsProps {
	slots: ENPAvailableSlot[]
	enpId: string
	dateParam?: string
	className?: string
}

export function EnpAvailableSlots({ slots, enpId, dateParam, className }: EnpAvailableSlotsProps) {
	if (slots.length === 0) {
		return <p className="text-muted-foreground text-sm">No open slots for this day.</p>
	}

	return (
		<div className={className}>
			<div className="mb-2 flex items-center justify-between text-sm">
				<span className="text-muted-foreground">Available slots ({slots.length})</span>
			</div>

			<div className="flex flex-wrap gap-2">
				{slots.map((slot, index) => {
					const searchParams = new URLSearchParams({
						enp: enpId,
						workflow: slot.workflow ?? "REN",
						date: dateParam ?? "",
						time: slot.time,
						mode: "CONSULTATION",
					})

					return (
						<Button
							key={`${slot.time}-${index}`}
							variant="outline"
							size="sm"
							className="gap-2"
							asChild
						>
							<Link href={`/consultations?${searchParams.toString()}`}>
								<Clock className="size-4" />
								{slot.time}
								<span className="text-muted-foreground text-xs">({slot.duration}m)</span>
							</Link>
						</Button>
					)
				})}
			</div>
		</div>
	)
}
