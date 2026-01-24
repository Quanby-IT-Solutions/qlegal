"use client"

import type { Route } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import {
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/animate-ui/primitives/radix/collapsible"
import type { NavItem } from "@/core/lib/nav/types"
import { canAccessNavItem } from "@/core/lib/nav/utils"
import type { IconSvgObject } from "@/core/lib/nav/types"

type SidebarNavItemProps = {
	item: NavItem
	userRole?: string
}

export const SidebarNavItem = ({ item, userRole }: SidebarNavItemProps) => {
	const { state: sidebarState } = useSidebar()

	// Filter sub-items by role
	const accessibleSubItems =
		item.items?.filter(subItem =>
			canAccessNavItem(subItem.roles, userRole)
		) ?? []

	// Helper to render icon - handles both React component and HugeIcons IconSvgObject
	const renderIcon = (icon?: typeof item.icon) => {
		if (!icon) return null
		// Check if it's a React component (function) or HugeIcons IconSvgObject (array)
		if (typeof icon === 'function') {
			const IconComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>
			return <IconComponent />
		}
		// It's a HugeIcons IconSvgObject
		return <HugeiconsIcon icon={icon as IconSvgObject} size={16} />
	}

	// If no sub-items or no accessible sub-items, render as simple link
	if (!item.items || accessibleSubItems.length === 0) {
		return (
			<SidebarMenuItem>
				{sidebarState === "collapsed" ? (
					<Tooltip side="right" align="center">
						<TooltipTrigger asChild>
							<SidebarMenuButton asChild>
								<Link href={item.url as Route}>
									{renderIcon(item.icon)}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</TooltipTrigger>
						<TooltipContent>
							<p>{item.title}</p>
						</TooltipContent>
					</Tooltip>
				) : (
					<SidebarMenuButton asChild>
						<Link href={item.url as Route}>
							{renderIcon(item.icon)}
							<span>{item.title}</span>
						</Link>
					</SidebarMenuButton>
				)}
			</SidebarMenuItem>
		)
	}

	// Render as collapsible with sub-items
	return (
		<Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
			<SidebarMenuItem>
				{sidebarState === "collapsed" ? (
					<Tooltip side="right" align="center">
						<TooltipTrigger asChild>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton>
									{renderIcon(item.icon)}
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
							{renderIcon(item.icon)}
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
									<Link href={subItem.url as Route}>
										<span>{subItem.title}</span>
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	)
}
