"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { SidebarNavSection } from "@/core/components/navbar/sidebar-nav-section"
import { SidebarSecondaryNav } from "@/core/components/navbar/sidebar-secondary-nav"
import { UserDropdown } from "@/core/components/navbar/user-dropdown"
import { QuanbyLogo } from "@/core/components/quanby-logo"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { navSecondary } from "@/core/lib/nav/site.config"
import { getAppSidebarSections } from "@/core/lib/nav/utils"

export const SiteSidebar = () => {
	const { data: session } = useSession()
	const isMobile = useIsMobile()
	const userRole = session?.user?.role

	return (
		<Sidebar collapsible="icon" suppressHydrationWarning>
			<SidebarHeader suppressHydrationWarning>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/" className="flex items-center gap-2.5">
								<div className="flex size-8 shrink-0 items-center justify-center">
									<QuanbyLogo className="size-7" />
								</div>
								<span className="from-foreground to-foreground/80 bg-linear-to-r bg-clip-text text-base leading-tight font-bold tracking-tight text-transparent">
									QLEGAL
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="overflow-x-hidden">
				{getAppSidebarSections(userRole).map(section => (
					<SidebarNavSection key={section.label} section={section} userRole={userRole} />
				))}
				<SidebarSecondaryNav items={navSecondary} />
			</SidebarContent>

			<SidebarFooter>
				<UserDropdown isMobile={isMobile} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
