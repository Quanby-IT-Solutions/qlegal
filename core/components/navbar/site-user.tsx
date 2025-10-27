"use client"

import Link from "next/link"
import { LogOutIcon } from "lucide-react"
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
import { getSiteUserItems, iconMap } from "@/core/lib/nav/site.config"
import { cn } from "@/core/lib/utils"

export function SiteUser() {
	const { data: session, status } = useSession()
	const hydrated = useHydrated()
	const user = session?.user
	const config = getSiteUserItems(user?.role ?? null)

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
							<span className="truncate text-xs">{user?.email}</span>
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{config.map(item => {
						const IconComponent =
							item.icon && typeof item.icon === "string"
								? iconMap[item.icon as keyof typeof iconMap]
								: null

						return (
							<DropdownMenuItem key={item.url} asChild>
								{/* @ts-expect-error Next.js Link href type mismatch */}
								<Link href={item.url}>
									{IconComponent && <IconComponent className="h-4 w-4" />}
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
							await signOut({
								redirect: true,
								callbackUrl: "/",
							})
						} catch {
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
