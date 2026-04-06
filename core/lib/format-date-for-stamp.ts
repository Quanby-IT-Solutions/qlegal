/**
 * Format date from ISO string or Date to readable stamp format (e.g. "10 February 2026").
 * Uses UTC so ISO strings like 2026-02-10T16:00:00.000Z never appear raw in document seals.
 */
export function formatDateForStamp(
	dateInput: string | Date | null | undefined
): string {
	if (dateInput === null) return ""
	const dateString = typeof dateInput === "string" ? dateInput.trim() : ""
	if (dateString === "" && !(dateInput instanceof Date)) return ""

	const date = dateInput instanceof Date ? dateInput : new Date(dateString)
	if (!Number.isNaN(date.getTime())) {
		const day = date.getUTCDate()
		const monthNames = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		]
		const month = monthNames[date.getUTCMonth()]
		const year = date.getUTCFullYear()
		return `${day} ${month} ${year}`
	}

	// If not a valid date, do not leak raw ISO into seal
	if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}T/.test(dateInput)) return ""
	return typeof dateInput === "string" ? dateInput : ""
}
