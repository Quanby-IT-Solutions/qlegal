"use client"

import { Clock } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { cn } from "@/core/lib/utils"

interface TimeWheelPickerProps {
	hour: string
	minute: string
	period: "am" | "pm"
	onHourChange: (value: string) => void
	onMinuteChange: (value: string) => void
	onPeriodChange: (value: "am" | "pm") => void
	disabled?: boolean
	className?: string
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))
const PERIODS: Array<"am" | "pm"> = ["am", "pm"]

export function TimeWheelPicker({
	hour,
	minute,
	period,
	onHourChange,
	onMinuteChange,
	onPeriodChange,
	disabled = false,
	className,
}: TimeWheelPickerProps) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className={cn(
							"w-full justify-start text-left font-normal",
							disabled && "cursor-not-allowed opacity-50"
						)}
						disabled={disabled}
					>
						<Clock className="mr-2 size-4" />
						{`${hour}:${minute} ${period.toUpperCase()}`}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-4" align="start">
					<div className="flex items-center gap-2">
						<Select value={hour} onValueChange={onHourChange} disabled={disabled}>
							<SelectTrigger className="w-20">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{HOURS.map(h => (
									<SelectItem key={h} value={h}>
										{h}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<span className="text-muted-foreground">:</span>

						<Select value={minute} onValueChange={onMinuteChange} disabled={disabled}>
							<SelectTrigger className="w-20">
								<SelectValue />
							</SelectTrigger>
							<SelectContent className="max-h-64">
								{MINUTES.map(m => (
									<SelectItem key={m} value={m}>
										{m}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={period} onValueChange={onPeriodChange} disabled={disabled}>
							<SelectTrigger className="w-16">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{PERIODS.map(p => (
									<SelectItem key={p} value={p}>
										{p.toUpperCase()}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	)
}