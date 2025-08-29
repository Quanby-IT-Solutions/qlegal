"use client"

import Link from "next/link"
import { LogOutIcon } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

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
import { getSiteUserItems, iconMap } from "@/core/lib/nav.config"
import { cn } from "@/core/lib/utils"

import type { UserRole } from "@/services/drizzle/schema/auth"

import { ModeToggleDropdown } from "../mode-toggle-dropdown"

function isValidUserRole(role: string | undefined | null): role is UserRole {
	if (!role) {
		return false
	}
	return ["client", "admin", "super_admin"].includes(role)
}

export function SiteUser() {
	const { data: session, status } = useSession()
	const user = session?.user
	const config = getSiteUserItems(user?.role || null)

	// Show loading state or nothing if session is loading
	if (status === "loading") {
		return (
			<div
				className={cn(
					buttonVariants({ variant: "ghost", size: "icon" }),
					"bg-muted size-8 animate-pulse rounded-full"
				)}
			/>
		)
	}

	// Don't render if no user
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
						const IconComponent = item.icon ? iconMap[item.icon] : null

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
					<LogOutIcon className="mr-2 h-4 w-4" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
