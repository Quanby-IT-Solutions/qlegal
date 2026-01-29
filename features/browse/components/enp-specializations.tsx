import { Tag } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"

interface EnpSpecializationsProps {
	specializations: string[]
	className?: string
}

export function EnpSpecializations({ specializations, className }: EnpSpecializationsProps) {
	if (specializations.length === 0) {
		return null
	}

	return (
		<div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
			{specializations.slice(0, 3).map(specialization => (
				<Badge
					key={specialization}
					variant="outline"
					className="border-primary/20 bg-primary/5 hover:bg-primary/10 text-xs"
				>
					<Tag className="mr-1 size-3" />
					{specialization}
				</Badge>
			))}
			{specializations.length > 3 && (
				<Badge variant="secondary" className="text-xs">
					+{specializations.length - 3} more
				</Badge>
			)}
		</div>
	)
}
