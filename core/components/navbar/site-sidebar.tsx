"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { SidebarNavSection } from "@/core/components/navbar/sidebar-nav-section"
import { SidebarSecondaryNav } from "@/core/components/navbar/sidebar-secondary-nav"
import { TeamSwitcher } from "@/core/components/navbar/team-switcher"
import { UserDropdown } from "@/core/components/navbar/user-dropdown"
import { WorkflowTabs } from "@/core/components/navbar/workflow-tabs"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { getTeams, navSecondary, workflows } from "@/core/lib/nav/site.config"
import { type Team } from "@/core/lib/nav/types"
import { getAppSidebarSections } from "@/core/lib/nav/utils"

export const SiteSidebar = () => {
	const { data: session } = useSession()
	const isMobile = useIsMobile()
	const [activeTeam, setActiveTeam] = useState<Team>(getTeams()[0]!)
	const userRole = session?.user?.role

	if (!activeTeam) return null

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<TeamSwitcher
					activeTeam={activeTeam}
					setActiveTeam={setActiveTeam}
					isMobile={isMobile}
					teams={getTeams()}
				/>
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
