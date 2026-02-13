"use client"

import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/core/components/animate-ui/components/radix/sidebar"
import type { NavSection } from "@/core/lib/nav/types"

import { SidebarNavItem } from "./sidebar-nav-item"

type SidebarNavSectionProps = {
	section: NavSection
	userRole?: string
}

export const SidebarNavSection = ({ section, userRole }: SidebarNavSectionProps) => {
	// Sections returned from getAppSidebarSections are already filtered by role.
	if (section.items.length === 0) return null

	return (
		<SidebarGroup
			className={section.label === "Projects" ? "group-data-[collapsible=icon]:hidden" : ""}
		>
			<SidebarGroupLabel>{section.label}</SidebarGroupLabel>
			<SidebarMenu>
				{section.items.map(item => (
					<SidebarNavItem key={item.title} item={item} userRole={userRole} />
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
