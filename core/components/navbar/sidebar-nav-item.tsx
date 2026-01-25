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
import { type NavItem } from "@/core/lib/nav/types"
import { canAccessNavItem } from "@/core/lib/nav/utils"
import { Badge } from "@/core/components/navbar/badges/badge"
import { cn } from "@/core/lib/utils"

type SidebarNavItemProps = {
	item: NavItem
	userRole?: string
}

export const SidebarNavItem = ({ item, userRole }: SidebarNavItemProps) => {
	const { state: sidebarState } = useSidebar()

	const accessibleSubItems =
		item.items?.filter(subItem => canAccessNavItem(subItem.roles, userRole)) ?? []

	const isSoonBadge = item.badge === 'soon'

	const renderIcon = (icon?: typeof item.icon) => {
		if (!icon) return null
		if (typeof icon === "function") {
			const IconComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>
			return <IconComponent />
		}
		return <HugeiconsIcon icon={icon} size={16} />
	}

	const renderBadge = () => {
		if (!item.badge) return null
		return <Badge variant={item.badge as "new" | "soon" | "beta" | "updated" | "popular"} />
	}

	const NavContent = () => (
		<>
			{renderIcon(item.icon)}
			<span>{item.title}</span>
			{renderBadge()}
		</>
	)

	if (!item.items || accessibleSubItems.length === 0) {
		if (item.badge) {
			const buttonClassName = cn(isSoonBadge && "text-muted-foreground hover:text-foreground")

			return (
				<SidebarMenuItem>
					{sidebarState === "collapsed" ? (
						<Tooltip side="right" align="center">
							<TooltipTrigger asChild>
								<SidebarMenuButton asChild className={buttonClassName}>
									{isSoonBadge ? (
										<button type="button" onClick={(e) => e.preventDefault()}>
											<NavContent />
										</button>
									) : (
										<Link href={item.url as Route}>
											<NavContent />
										</Link>
									)}
								</SidebarMenuButton>
							</TooltipTrigger>
							<TooltipContent>
								<p>{item.title}</p>
							</TooltipContent>
						</Tooltip>
					) : (
						<SidebarMenuButton asChild className={buttonClassName}>
							{isSoonBadge ? (
								<button type="button" onClick={(e) => e.preventDefault()}>
									<NavContent />
								</button>
							) : (
								<Link href={item.url as Route}>
									<NavContent />
								</Link>
							)}
						</SidebarMenuButton>
					)}
				</SidebarMenuItem>
			)
		}

		return (
			<SidebarMenuItem>
				{sidebarState === "collapsed" ? (
					<Tooltip side="right" align="center">
						<TooltipTrigger asChild>
							<SidebarMenuButton asChild>
								<Link href={item.url as Route}>
									<NavContent />
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
							<NavContent />
						</Link>
					</SidebarMenuButton>
				)}
			</SidebarMenuItem>
		)
	}

	return (
		<Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
			<SidebarMenuItem>
				{sidebarState === "collapsed" ? (
					<Tooltip side="right" align="center">
						<TooltipTrigger asChild>
							<CollapsibleTrigger asChild>
								<SidebarMenuButton>
									<NavContent />
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
							<NavContent />
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
