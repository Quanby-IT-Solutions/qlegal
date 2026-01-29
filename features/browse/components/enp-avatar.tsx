import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { getInitials } from "@/core/lib/utils"

interface EnpAvatarProps {
	name: string | null
	image?: string | null
	className?: string
	isAvailable?: boolean
}

export function EnpAvatar({ name, image, className, isAvailable }: EnpAvatarProps) {
	return (
		<Avatar className={className}>
			<AvatarImage src={image ?? undefined} alt={name ?? "ENP"} />
			<AvatarFallback>{getInitials(name ?? "ENP")}</AvatarFallback>
		</Avatar>
	)
}
