"use client"

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { canAccessNavItem } from "@/core/lib/nav/utils"
import type { NavItem, NavSection, NotaryRole } from "@/core/lib/nav/types"
import { SidebarNavItem } from "./sidebar-nav-item"

type SidebarNavSectionProps = {
	section: NavSection
	userRole?: string
	currentWorkflow?: string
}

export const SidebarNavSection = ({ section, userRole, currentWorkflow }: SidebarNavSectionProps) => {
	// Filter items by role and workflow
	const accessibleItems = section.items.filter(item => {
		// Handle union type: roles can be NotaryRole[] | UserRole[]
		return canAccessNavItem(
			item.roles as NotaryRole[] | undefined,
			userRole,
			item.workflows,
			currentWorkflow
		)
	})

	// Don't render section if no accessible items
	if (accessibleItems.length === 0) return null

	return (
		<SidebarGroup
			className={section.label === "Projects" ? "group-data-[collapsible=icon]:hidden" : ""}
		>
			<SidebarGroupLabel>{section.label}</SidebarGroupLabel>
			<SidebarMenu>
				{accessibleItems.map(item => (
					<SidebarNavItem
						key={item.title}
						item={item}
						userRole={userRole}
						currentWorkflow={currentWorkflow}
					/>
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
