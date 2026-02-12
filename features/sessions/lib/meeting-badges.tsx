import { Calendar, PlayCircle } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"

export function getMeetingStatusBadge(status: string) {
	switch (status) {
		case "SCHEDULED":
			return (
				<Badge variant="secondary">
					<Calendar className="mr-1 size-3" /> Scheduled
				</Badge>
			)
		case "ONGOING":
			return (
				<Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
					<PlayCircle className="mr-1 size-3" /> Live
				</Badge>
			)
		case "COMPLETED":
			return <Badge variant="outline">Completed</Badge>
		case "CANCELLED":
			return (
				<Badge variant="outline" className="border-rose-600 text-rose-600">
					Cancelled
				</Badge>
			)
		default:
			return null
	}
}

export function getDocumentSigningBadge(isFullySigned: boolean) {
	if (isFullySigned) {
		return (
			<Badge variant="outline" className="border-emerald-600 text-emerald-700">
				Signed
			</Badge>
		)
	}

	return <Badge variant="secondary">Pending</Badge>
}
