"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { useSession } from "next-auth/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { cn, getInitials } from "@/core/lib/utils"

import { useAvatarUrl } from "@/features/profile/hooks/use-profile"

const iconvVariants = cva("rounded-full border flex items-center justify-center", {
	variants: {
		size: {
			default: "!size-8 min-w-8 rounded-full",
			sm: "!size-10 min-w-10 rounded-full",
			lg: "!size-12 min-w-12 rounded-full",
		},
	},
	defaultVariants: {
		size: "default",
	},
})

interface CurrentUserAvatarProps extends VariantProps<typeof iconvVariants> {
	className?: string
	name: string
}

export const CurrentUserAvatar = ({ className, name, size }: CurrentUserAvatarProps) => {
	const { data: avatarData } = useAvatarUrl()
	const { data: session } = useSession()
	const initials = getInitials(name)

	// Prefer uploaded Supabase avatar, otherwise fall back to SSO/profile image provided by session.user.image
	const imageSrc = avatarData?.avatarUrl ?? session?.user?.image ?? undefined

	return (
		<Avatar className={cn(iconvVariants({ size }), className)}>
			{imageSrc ? <AvatarImage src={imageSrc} /> : null}
			<AvatarFallback className="bg-secondary text-secondary-foreground rounded-md text-xs font-semibold">
				{initials}
			</AvatarFallback>
		</Avatar>
	)
}
