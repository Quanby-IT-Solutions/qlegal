export function formatRelativeTime(date: Date): string {
	const now = new Date()
	const diffInMs = now.getTime() - date.getTime()
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
	const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
	const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

	if (diffInDays > 0) {
		return `${diffInDays}d ago`
	} else if (diffInHours > 0) {
		return `${diffInHours}h ago`
	} else if (diffInMinutes > 0) {
		return `${diffInMinutes}m ago`
	} else {
		return "Just now"
	}
}

export function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

export function formatDateTime(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}
