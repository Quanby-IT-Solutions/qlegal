import { format } from "date-fns"

export interface Time12Hour {
	hour: string
	minute: string
	period: "am" | "pm"
}

export function getTime12Hour(date: Date = new Date()): Time12Hour {
	return {
		hour: format(date, "hh"),
		minute: format(date, "mm"),
		period: format(date, "a").toLowerCase() as "am" | "pm",
	}
}

/**
 * Converts 12-hour format to 24-hour format (HH:MM)
 * @param hour - Hour in 12-hour format (01-12)
 * @param minute - Minute (00-59)
 * @param period - Either "am" or "pm"
 * @returns Time string in 24-hour format
 */
export function convertTo24Hour(hour: string, minute: string, period: "am" | "pm"): string {
	let hours24 = parseInt(hour, 10)
	if (period === "pm" && hours24 !== 12) {
		hours24 += 12
	} else if (period === "am" && hours24 === 12) {
		hours24 = 0
	}
	return `${hours24.toString().padStart(2, "0")}:${minute}`
}

/**
 * Converts 24-hour format to 12-hour format
 * @param time24 - Time string in 24-hour format (HH:MM)
 * @returns Object with hour, minute, and period in 12-hour format
 */
export function convertTo12Hour(time24: string): Time12Hour {
	const [hours, minutes] = time24.split(":").map(Number)
	const hours24 = hours ?? 0
	const period = hours24 >= 12 ? "pm" : "am"
	let hours12 = hours24 % 12
	if (hours12 === 0) hours12 = 12
	return {
		hour: hours12.toString().padStart(2, "0"),
		minute: (minutes ?? 0).toString().padStart(2, "0"),
		period,
	}
}

/**
 * Formats 12-hour time into a display string
 * @param time12 - Time object in 12-hour format
 * @returns Formatted time string (e.g., "09:30 AM")
 */
export function formatTime12Hour(time12: Time12Hour): string {
	return `${time12.hour}:${time12.minute} ${time12.period.toUpperCase()}`
}
