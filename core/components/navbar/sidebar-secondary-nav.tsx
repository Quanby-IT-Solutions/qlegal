"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import type { NavItem, IconSvgObject } from "@/core/lib/nav/types"

type SidebarSecondaryNavProps = {
	items: NavItem[]
}

export const SidebarSecondaryNav = ({ items }: SidebarSecondaryNavProps) => {
	const { state: sidebarState } = useSidebar()

	// Helper to render icon - handles both React component and HugeIcons IconSvgObject
	const renderIcon = (icon?: typeof items[0]["icon"]) => {
		if (!icon) return null
		// Check if it's a React component (function) or HugeIcons IconSvgObject (array)
		if (typeof icon === 'function') {
			const IconComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>
			return <IconComponent />
		}
		// It's a HugeIcons IconSvgObject
		return <HugeiconsIcon icon={icon as IconSvgObject} size={16} />
	}

	return (
		<SidebarGroup className="mt-auto">
			<SidebarMenu>
				{items.map((item: NavItem) => {
					const hasIcon = item.icon !== undefined
					return (
						<SidebarMenuItem key={item.title}>
							{sidebarState === "collapsed" ? (
								<Tooltip side="right" align="center">
									<TooltipTrigger asChild>
										<SidebarMenuButton asChild>
											<a href={item.url}>
												{hasIcon && renderIcon(item.icon)}
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
									<a href={item.url}>
										{hasIcon && renderIcon(item.icon)}
										<span>{item.title}</span>
									</a>
								</SidebarMenuButton>
							)}
						</SidebarMenuItem>
					)
				})}
			</SidebarMenu>
		</SidebarGroup>
	)
}
