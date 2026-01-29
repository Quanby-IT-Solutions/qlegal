import { Star } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"

interface EnpRatingProps {
	rating: number
	reviewCount?: number
	variant?: "badge" | "inline"
	className?: string
}

export function EnpRating({ rating, reviewCount, variant = "inline", className }: EnpRatingProps) {
	if (variant === "badge") {
		return (
			<Badge variant="secondary" className={className}>
				⭐ {rating.toFixed(1)}
			</Badge>
		)
	}

	return (
		<div className={`flex items-center gap-1 ${className ?? ""}`}>
			<Star className="size-3.5 fill-amber-400 text-amber-400" />
			<span className="text-sm font-semibold">{rating.toFixed(1)}</span>
			{reviewCount !== undefined && (
				<span className="text-muted-foreground text-xs">({reviewCount})</span>
			)}
		</div>
	)
}
