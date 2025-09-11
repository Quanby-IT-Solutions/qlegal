import { cva, type VariantProps } from "class-variance-authority"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { cn, getInitials } from "@/core/lib/utils"

const iconvVariants = cva("rounded-full border flex items-center justify-center", {
	variants: {
		size: {
			default: "!size-8 min-w-8 rounded-full",
			sm: "!size-10 min-w-10 rounded-full",
			lg: "!size-12 min-w-12 rounded-full",
			xl: "!size-36 min-w-36 rounded-full",
		},
	},
	defaultVariants: {
		size: "default",
	},
})

interface ProfileProps extends VariantProps<typeof iconvVariants> {
	className?: string
	url: string | null
	name: string
}

export const Profile = ({ className, url, name, size }: ProfileProps) => {
	const initials = getInitials(name)

	return (
		<Avatar className={cn(iconvVariants({ size }), className)}>
			{url && <AvatarImage src={url} />}
			<AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-xs font-semibold">
				{initials}
			</AvatarFallback>
		</Avatar>
	)
}
