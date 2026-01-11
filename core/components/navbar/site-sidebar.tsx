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
import { QuanbyLogo } from "@/core/components/quanby-logo"
import { SidebarNavSection } from "@/core/components/navbar/sidebar-nav-section"
import { SidebarSecondaryNav } from "@/core/components/navbar/sidebar-secondary-nav"
import { UserDropdown } from "@/core/components/navbar/user-dropdown"
import { WorkflowTabs } from "@/core/components/navbar/workflow-tabs"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { navSecondary, workflows } from "@/core/lib/nav/site.config"
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
								<div className="flex size-8 items-center justify-center shrink-0">
									<QuanbyLogo className="size-7" />
								</div>
								<span className="bg-linear-to-r from-foreground to-foreground/80 bg-clip-text font-bold leading-tight text-base tracking-tight text-transparent">
									Quanby Legal
								</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="overflow-x-hidden">
				<WorkflowTabs
					tabs={workflows.map(workflow => ({
						value: workflow.id,
						label: workflow.label,
						icon: workflow.icon,
					}))}
					defaultValue="REN"
					cookieName="workflow_preference"
					cookieMaxAge={60 * 60 * 24 * 180}
				>
					{currentWorkflow => (
						<>
							{getAppSidebarSections(userRole, currentWorkflow).map(section => (
								<SidebarNavSection
									key={section.label}
									section={section}
									userRole={userRole}
									currentWorkflow={currentWorkflow}
								/>
							))}
						</>
					)}
				</WorkflowTabs>
				<SidebarSecondaryNav items={navSecondary} />
			</SidebarContent>

			<SidebarFooter>
				<UserDropdown isMobile={isMobile} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
