import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { cn, getInitials } from "@/core/lib/utils"

interface EnpAvatarProps {
	name: string | null
	image?: string | null
	className?: string
	// Note: I moved the availability logic to the parent card for better positioning control
}

export function EnpAvatar({ name, image, className }: EnpAvatarProps) {
	return (
		<Avatar className={cn("bg-muted", className)}>
			<AvatarImage src={image ?? undefined} alt={name ?? "ENP"} className="object-cover" />
			<AvatarFallback className="text-muted-foreground font-medium">
				{getInitials(name ?? "ENP")}
			</AvatarFallback>
		</Avatar>
	)
}
