"use client"

import Link from "next/link"
import { LogOutIcon } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { signOut, useSession } from "next-auth/react"

import { ModeToggleDropdown } from "@/core/components/mode-toggle-dropdown"
import { buttonVariants } from "@/core/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { Profile } from "@/core/components/user-profile"
import { useHydrated } from "@/core/hooks/use-hydrated"
import { getSiteUserItems } from "@/core/lib/nav/site.config"
import { cn, mapRoleToLabel } from "@/core/lib/utils"
import type { IconSvgObject } from "@/core/lib/nav/types"

export function SiteUser() {
	const { data: session, status } = useSession()
	const hydrated = useHydrated()
	const user = session?.user
	const config = getSiteUserItems(user?.role ?? null)

	// Helper to render icon - handles both React component and HugeIcons IconSvgObject
	const renderIcon = (icon?: typeof config[0]["icon"]) => {
		if (!icon) return null
		// Check if it's a React component (function) or HugeIcons IconSvgObject (array)
		if (typeof icon === 'function') {
			const IconComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>
			return <IconComponent className="h-4 w-4" />
		}
		// It's a HugeIcons IconSvgObject
		return <HugeiconsIcon icon={icon as IconSvgObject} size={16} />
	}

	if (status === "loading" || !hydrated) {
		return (
			<div
				className={cn(
					buttonVariants({ variant: "ghost", size: "icon" }),
					"bg-muted size-8 animate-pulse rounded-full"
				)}
			/>
		)
	}

	if (!user) {
		return null
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8 rounded-full")}
			>
				<Profile url={user?.image ?? null} name={user?.name ?? ""} />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
				align="end"
				sideOffset={4}
			>
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Profile url={user?.image ?? null} name={user?.name ?? ""} />
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">{user?.name}</span>
							<span className="truncate text-xs">{mapRoleToLabel(user?.role)}</span>
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{config.map(item => {
						return (
							<DropdownMenuItem key={item.url} asChild>
								{/* @ts-expect-error Next.js Link href type mismatch */}
								<Link href={item.url}>
									{renderIcon(item.icon)}
									{item.title}
								</Link>
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuGroup>
				<ModeToggleDropdown className="block md:hidden" />
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={async () => {
						try {
							// Clear KYC skip session cookie before logout
							document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
							await signOut({
								redirect: true,
								callbackUrl: "/",
							})
						} catch {
							// Clear KYC skip session cookie before logout
							document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
							void signOut()
						}
					}}
				>
					<LogOutIcon />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
