"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
// import { SidebarCourseCard } from "@/core/components/navbar/sidebar-course-card"
import { SidebarNavSection } from "@/core/components/navbar/sidebar-nav-section"
import { SidebarSecondaryNav } from "@/core/components/navbar/sidebar-secondary-nav"
import { UserDropdown } from "@/core/components/navbar/user-dropdown"
import { QuanbyLogo } from "@/core/components/quanby-logo"
import { EnpAccreditationProgressSidebarBanner } from "@/features/legal-registration/components/enp-accreditation-progress-banner"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { navSecondary } from "@/core/lib/nav/site.config"
import { getAppSidebarSections } from "@/core/lib/nav/utils"

export const SiteSidebar = () => {
	const pathname = usePathname()
	const { data: session } = useSession()
	const isMobile = useIsMobile()
	const userRole = session?.user?.role
	const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/")

	return (
		<Sidebar collapsible="icon" variant="sidebar" suppressHydrationWarning>
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
				<div className="mt-auto flex flex-col gap-2">
					<SidebarSecondaryNav items={navSecondary} />
					<div className="flex flex-col gap-1 group-data-[collapsible=icon]:gap-0">
						{isDashboardRoute ? <EnpAccreditationProgressSidebarBanner /> : null}
						{/* <SidebarCourseCard /> */}
					</div>
				</div>
			</SidebarContent>

			<SidebarFooter>
				<UserDropdown isMobile={isMobile} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
