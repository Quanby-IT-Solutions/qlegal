import { Badge } from "@/core/components/ui/badge"

interface EnpSpecializationsProps {
	specializations: string[]
	className?: string
}

export function EnpSpecializations({ specializations, className }: EnpSpecializationsProps) {
	if (specializations.length === 0) {
		return null
	}

	const visibleSpecializations = specializations.slice(0, 3)
	const hasMore = specializations.length > 3

	return (
		<div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
			{visibleSpecializations.map(specialization => (
				<Badge key={specialization} variant="outline" className="text-xs">
					{specialization}
				</Badge>
			))}
			{hasMore && (
				<Badge variant="secondary" className="text-xs">
					+{specializations.length - 3}
				</Badge>
			)}
		</div>
	)
}
