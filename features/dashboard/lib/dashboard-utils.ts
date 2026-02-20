export function getStatusVariant(
	status: string
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "COMPLETED":
		case "CONFIRMED":
			return "default"
		case "PENDING":
			return "secondary"
		case "CANCELLED":
			return "destructive"
		default:
			return "outline"
	}
}
