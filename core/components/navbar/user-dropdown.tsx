"use client"

import { useRouter } from "next/navigation"
import { BadgeCheck, Bell, ChevronsUpDown, LogOut, Settings } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/animate-ui/components/radix/dropdown-menu"
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"

type UserDropdownProps = {
	isMobile: boolean
}

export const UserDropdown = ({ isMobile }: UserDropdownProps) => {
	const { data: session } = useSession()
	const router = useRouter()

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
								<AvatarFallback className="rounded-lg">
									{session?.user?.name?.[0] ?? ""}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{session?.user?.name ?? ""}</span>
								<span className="truncate text-xs">{session?.user?.email ?? ""}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
									<AvatarFallback className="rounded-lg">
										{session?.user?.name?.[0] ?? ""}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{session?.user?.name ?? ""}</span>
									<span className="truncate text-xs">{session?.user?.email ?? ""}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => router.push("/profile")}>
								<BadgeCheck />
								Profile
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => router.push("/notifications")}>
								<Bell />
								Notifications
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => router.push("/settings")}>
								<Settings />
								Settings
							</DropdownMenuItem>
						</DropdownMenuGroup>
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
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
