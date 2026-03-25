"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Clock3Icon } from "lucide-react"

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

function normalizeHour(value: string, fallback: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 2)

	if (!digits) {
		return fallback
	}

	const parsedValue = Number(digits)
	if (Number.isNaN(parsedValue)) {
		return fallback
	}

	return String(Math.min(12, Math.max(1, parsedValue))).padStart(2, "0")
}

function normalizeMinute(value: string, fallback: string): string {
	const digits = value.replace(/\D/g, "").slice(0, 2)

	if (!digits) {
		return fallback
	}

	const parsedValue = Number(digits)
	if (Number.isNaN(parsedValue)) {
		return fallback
	}

	return String(Math.min(59, Math.max(0, parsedValue))).padStart(2, "0")
}

function normalizePeriod(value: string, fallback: "am" | "pm"): "am" | "pm" {
	const normalizedValue = value.trim().toLowerCase()

	if (normalizedValue.startsWith("p")) {
		return "pm"
	}

	if (normalizedValue.startsWith("a")) {
		return "am"
	}

	return fallback
}

function getDigitDraft(value: string): string {
	return value.replace(/\D/g, "").slice(0, 2)
}

function getPeriodDraft(value: string): string {
	return value
		.replace(/[^apm]/gi, "")
		.slice(0, 2)
		.toUpperCase()
}

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
	const [hourDraft, setHourDraft] = useState(hour)
	const [minuteDraft, setMinuteDraft] = useState(minute)
	const [periodDraft, setPeriodDraft] = useState(period.toUpperCase())
	const hourInputRef = useRef<HTMLInputElement>(null)
	const minuteInputRef = useRef<HTMLInputElement>(null)
	const periodInputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		setHourDraft(hour)
	}, [hour])

	useEffect(() => {
		setMinuteDraft(minute)
	}, [minute])

	useEffect(() => {
		setPeriodDraft(period.toUpperCase())
	}, [period])

	const inputBaseClassName = useMemo(
		() =>
			cn(
				"min-w-0 rounded-sm bg-transparent px-1 py-1 text-center text-sm font-medium tabular-nums uppercase outline-none transition-colors selection:bg-primary/20",
				disabled
					? "cursor-not-allowed text-muted-foreground"
					: "text-foreground hover:bg-accent/60 focus:bg-accent"
			),
		[disabled]
	)

	const moveFocus = (target: "hour" | "minute" | "period") => {
		const refMap = {
			hour: hourInputRef,
			minute: minuteInputRef,
			period: periodInputRef,
		}

		const input = refMap[target].current
		if (!input) {
			return
		}

		input.focus()
		input.select()
	}

	const commitHour = (value: string) => {
		const normalizedValue = normalizeHour(value, hour)
		setHourDraft(normalizedValue)
		if (normalizedValue !== hour) {
			onHourChange(normalizedValue)
		}
	}

	const commitMinute = (value: string) => {
		const normalizedValue = normalizeMinute(value, minute)
		setMinuteDraft(normalizedValue)
		if (normalizedValue !== minute) {
			onMinuteChange(normalizedValue)
		}
	}

	const commitPeriod = (value: string) => {
		const normalizedValue = normalizePeriod(value, period)
		const normalizedDraft = normalizedValue.toUpperCase()
		setPeriodDraft(normalizedDraft)
		if (normalizedValue !== period) {
			onPeriodChange(normalizedValue)
		}
	}

	const handleSegmentKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
		segment: "hour" | "minute" | "period"
	) => {
		if (event.key === "ArrowRight") {
			event.preventDefault()
			if (segment === "hour") {
				moveFocus("minute")
				return
			}

			if (segment === "minute") {
				moveFocus("period")
			}
			return
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault()
			if (segment === "period") {
				moveFocus("minute")
				return
			}

			if (segment === "minute") {
				moveFocus("hour")
			}
			return
		}

		if (event.key === "Enter") {
			event.preventDefault()
			event.currentTarget.blur()
		}
	}

	return (
		<div className={className}>
			<Popover>
				<div
					className={cn(
						"border-input bg-background ring-offset-background focus-within:border-ring focus-within:ring-ring/50 flex h-10 items-center rounded-md border px-2 shadow-xs transition-[box-shadow,border-color] focus-within:ring-[3px]",
						disabled && "cursor-not-allowed opacity-50"
					)}
					role="group"
					aria-label={`Time input, currently ${hour}:${minute} ${period.toUpperCase()}`}
				>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							disabled={disabled}
							className="text-muted-foreground hover:text-foreground hover:bg-accent/60 mr-1 -ml-1 size-8 shrink-0 rounded-sm shadow-none"
							aria-label={`Open time picker for ${hour}:${minute} ${period.toUpperCase()}`}
						>
							<Clock3Icon className="size-4" />
						</Button>
					</PopoverTrigger>

					<input
						ref={hourInputRef}
						type="text"
						inputMode="numeric"
						value={hourDraft}
						onChange={event => {
							const nextValue = getDigitDraft(event.target.value)
							setHourDraft(nextValue)
							if (nextValue.length === 2) {
								moveFocus("minute")
							}
						}}
						onFocus={event => event.currentTarget.select()}
						onBlur={event => commitHour(event.target.value)}
						onKeyDown={event => handleSegmentKeyDown(event, "hour")}
						disabled={disabled}
						className={cn(inputBaseClassName, "w-8")}
						aria-label="Hour"
						maxLength={2}
					/>

					<span className="text-muted-foreground px-0.5 text-sm">:</span>

					<input
						ref={minuteInputRef}
						type="text"
						inputMode="numeric"
						value={minuteDraft}
						onChange={event => {
							const nextValue = getDigitDraft(event.target.value)
							setMinuteDraft(nextValue)
							if (nextValue.length === 2) {
								moveFocus("period")
							}
						}}
						onFocus={event => event.currentTarget.select()}
						onBlur={event => commitMinute(event.target.value)}
						onKeyDown={event => handleSegmentKeyDown(event, "minute")}
						disabled={disabled}
						className={cn(inputBaseClassName, "w-8")}
						aria-label="Minute"
						maxLength={2}
					/>

					<input
						ref={periodInputRef}
						type="text"
						value={periodDraft}
						onChange={event => {
							const nextValue = getPeriodDraft(event.target.value)
							setPeriodDraft(nextValue)
							if (nextValue.length >= 1) {
								commitPeriod(nextValue)
							}
						}}
						onFocus={event => event.currentTarget.select()}
						onBlur={event => commitPeriod(event.target.value)}
						onKeyDown={event => handleSegmentKeyDown(event, "period")}
						disabled={disabled}
						className={cn(inputBaseClassName, "ml-1 w-11")}
						aria-label="AM or PM"
						maxLength={2}
					/>
				</div>

				<PopoverContent className="w-auto p-3" align="start">
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
							<SelectTrigger className="w-19">
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
