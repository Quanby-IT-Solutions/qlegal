"use client"

import type { Route } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/animate-ui/primitives/radix/collapsible"
import {
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { canAccessNavItem, resolveIcon } from "@/core/lib/nav/utils"
import type { NavItem, NotaryRole } from "@/core/lib/nav/types"

type SidebarNavItemProps = {
	item: NavItem
	userRole?: string
	currentWorkflow?: string
}

export const SidebarNavItem = ({ item, userRole, currentWorkflow }: SidebarNavItemProps) => {
	const { state: sidebarState } = useSidebar()

	// Filter sub-items by role and workflow
	const accessibleSubItems =
		item.items?.filter(subItem =>
			canAccessNavItem(subItem.roles, userRole, subItem.workflows, currentWorkflow)
		) ?? []

	// If no sub-items or no accessible sub-items, render as simple link
	if (!item.items || accessibleSubItems.length === 0) {
		const IconComponent = resolveIcon(item.icon)
		return (
			<SidebarMenuItem>
				{sidebarState === "collapsed" ? (
					<Tooltip side="right" align="center">
						<TooltipTrigger asChild>
							<SidebarMenuButton asChild>
								<a href={item.url}>
									{IconComponent && <IconComponent />}
									<span>{item.title}</span>
								</a>
							</SidebarMenuButton>
						</TooltipTrigger>
						<TooltipContent>
							<p>{item.title}</p>
						</TooltipContent>
					</Tooltip>
				) : (
					<SidebarMenuButton asChild>
						<Link href={item.url as Route}>
							{IconComponent && <IconComponent />}
							<span>{item.title}</span>
						</Link>
					</SidebarMenuButton>
				)}
			</SidebarMenuItem>
		)
	}

	// Render as collapsible with sub-items
	const IconComponent = resolveIcon(item.icon)
	return (
		<Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
			<SidebarMenuItem>
				{sidebarState === "collapsed" ? (
					<Tooltip side="right" align="center">
						<TooltipTrigger asChild>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton>
									{IconComponent && <IconComponent />}
									<span>{item.title}</span>
									<ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
								</SidebarMenuButton>
							</CollapsibleTrigger>
						</TooltipTrigger>
						<TooltipContent>
							<p>{item.title}</p>
						</TooltipContent>
					</Tooltip>
				) : (
					<CollapsibleTrigger asChild>
						<SidebarMenuButton>
							{IconComponent && <IconComponent />}
							<span>{item.title}</span>
							<ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
						</SidebarMenuButton>
					</CollapsibleTrigger>
				)}
				<CollapsibleContent>
					<SidebarMenuSub>
						{accessibleSubItems.map(subItem => (
							<SidebarMenuSubItem key={subItem.title}>
								<SidebarMenuSubButton asChild>
									<a href={subItem.url}>
										<span>{subItem.title}</span>
									</a>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	)
}
