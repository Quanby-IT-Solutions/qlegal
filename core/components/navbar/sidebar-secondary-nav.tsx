"use client"

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
import type { NavItem } from "@/core/lib/nav/types"
import { resolveIcon } from "@/core/lib/nav/utils"

type SidebarSecondaryNavProps = {
	items: NavItem[]
}

export const SidebarSecondaryNav = ({ items }: SidebarSecondaryNavProps) => {
	const { state: sidebarState } = useSidebar()

	return (
		<SidebarGroup className="mt-auto">
			<SidebarMenu>
				{items.map((item: NavItem) => {
					const IconComponent = resolveIcon(item.icon)
					return (
						<SidebarMenuItem key={item.title}>
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
									<a href={item.url}>
										{IconComponent && <IconComponent />}
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
