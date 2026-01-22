"use client"

import * as React from "react"

import { Input } from "@/core/components/ui/input"

type DateInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
	/**
	 * ISO string (e.g. "2018-06-05T00:00:00.000Z") or "YYYY-MM-DD".
	 * Stored as string to play nicely with form libs like react-hook-form.
	 */
	value?: string
	onChange?: (date: Date | undefined) => void
}

function isoOrYmdToYmd(value: string): string {
	// If it's already YYYY-MM-DD, keep it.
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

	const d = new Date(value)
	if (Number.isNaN(d.getTime())) return ""
	return d.toISOString().slice(0, 10)
}

export function DateInput({ value, onChange, ...props }: DateInputProps) {
	const ymdValue = typeof value === "string" ? isoOrYmdToYmd(value) : ""

	return (
		<Input
			{...props}
			type="date"
			value={ymdValue}
			onChange={(e) => {
				const next = e.target.value
				if (!next) {
					onChange?.(undefined)
					return
				}

				// Force UTC midnight to keep round-tripping stable with toISOString().
				onChange?.(new Date(`${next}T00:00:00.000Z`))
			}}
		/>
	)
}

