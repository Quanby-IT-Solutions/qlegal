import type { NavBadgeType } from "@/core/lib/nav/types"
import { cn } from "@/core/lib/utils"

export const Badge = ({ variant }: { variant: NavBadgeType }) => {
	return (
		<span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-medium", variant==="new" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    variant==="soon" && "bg-muted text-muted-foreground",
    variant==="beta" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    variant==="updated" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    variant==="popular" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    )}>
			{variant.charAt(0).toUpperCase() + variant.slice(1)}
		</span>
	)
}
