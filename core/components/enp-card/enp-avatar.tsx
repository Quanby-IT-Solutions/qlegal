import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { getInitials } from "@/core/lib/utils"

interface EnpAvatarProps {
	name: string | null
	image?: string | null
	size?: "sm" | "md" | "lg"
	className?: string
}

const sizeClasses = {
	sm: "size-8",
	md: "size-12",
	lg: "size-16",
}

export function EnpAvatar({ name, image, size = "md", className }: EnpAvatarProps) {
	return (
		<Avatar className={`${sizeClasses[size]} ${className ?? ""}`}>
			<AvatarImage src={image ?? undefined} alt={name ?? "ENP"} />
			<AvatarFallback>{getInitials(name ?? "ENP")}</AvatarFallback>
		</Avatar>
	)
}
