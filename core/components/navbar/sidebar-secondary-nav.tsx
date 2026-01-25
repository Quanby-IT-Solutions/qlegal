"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
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
import { Badge } from "@/core/components/navbar/badges/badge"
import { isRouteActive } from "@/core/lib/nav/utils"
import { cn } from "@/core/lib/utils"

type SidebarSecondaryNavProps = {
	items: NavItem[]
}

export const SidebarSecondaryNav = ({ items }: SidebarSecondaryNavProps) => {
	const { state: sidebarState } = useSidebar()
	const pathname = usePathname()

	const renderIcon = (icon?: typeof items[0]["icon"]) => {
		if (!icon) return null
		if (typeof icon === 'function') {
			const IconComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>
			return <IconComponent />
		}
		return <HugeiconsIcon icon={icon as IconSvgObject} size={16} />
	}

	const NavContent = ({ item }: { item: NavItem }) => (
		<>
			{item.icon && renderIcon(item.icon)}
			<span>{item.title}</span>
			{item.badge && <Badge variant={item.badge} />}
		</>
	)

	return (
		<SidebarGroup className="mt-auto">
			<SidebarMenu>
				{items.map((item: NavItem) => {
					const isSoonBadge = item.badge === 'soon'
					const isActive = isRouteActive(item.url, pathname)
					const buttonClassName = cn(isSoonBadge && "text-muted-foreground hover:text-foreground")

					return (
						<SidebarMenuItem key={item.title}>
							{sidebarState === "collapsed" ? (
								<Tooltip side="right" align="center">
									<TooltipTrigger asChild>
										<SidebarMenuButton asChild className={buttonClassName} isActive={!isSoonBadge && isActive}>
											{isSoonBadge ? (
												<button type="button" onClick={(e) => e.preventDefault()}>
													<NavContent item={item} />
												</button>
											) : (
												<a href={item.url}>
													<NavContent item={item} />
												</a>
											)}
										</SidebarMenuButton>
									</TooltipTrigger>
									<TooltipContent>
										<p>{item.title}</p>
									</TooltipContent>
								</Tooltip>
							) : (
								<SidebarMenuButton asChild className={buttonClassName} isActive={!isSoonBadge && isActive}>
									{isSoonBadge ? (
										<button type="button" onClick={(e) => e.preventDefault()}>
											<NavContent item={item} />
										</button>
									) : (
										<a href={item.url}>
											<NavContent item={item} />
										</a>
									)}
								</SidebarMenuButton>
							)}
						</SidebarMenuItem>
					)
				})}
			</SidebarMenu>
		</SidebarGroup>
	)
}
