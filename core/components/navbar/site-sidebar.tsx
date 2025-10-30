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
import { getTeams, iconMap, navSecondary, workflows } from "@/core/lib/nav/site.config"
import { type NavItem, type NavSection, type NotaryRole, type Team } from "@/core/lib/nav/types"
import { canAccessNavItem, getAppSidebarSections } from "@/core/lib/nav/utils"

// Helper function to resolve icon names to components
const resolveIcon = (icon?: LucideIcon | string) => {
	if (!icon) return undefined
	if (typeof icon === "string") {
		return iconMap[icon as keyof typeof iconMap]
	}
	return icon
}

// SidebarNavItem Component
type SidebarNavItemProps = {
	item: NavItem
	userRole?: string
	currentWorkflow?: string
}

const SidebarNavItem = ({ item, userRole, currentWorkflow }: SidebarNavItemProps) => {
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
								<Link href={item.url as Route}>
									{IconComponent && <IconComponent />}
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

// SidebarNavSection Component
type SidebarNavSectionProps = {
	section: NavSection
	userRole?: string
	currentWorkflow?: string
}

const SidebarNavSection = ({ section, userRole, currentWorkflow }: SidebarNavSectionProps) => {
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
				{/* Secondary Navigation */}
				<SidebarMenu className="mt-auto">
					{navSecondary.map((item: NavItem) => {
						const IconComponent = resolveIcon(item.icon)
						return (
							<SidebarMenuItem key={item.title}>
								{sidebarState === "collapsed" ? (
									<Tooltip side="right" align="center">
										<TooltipTrigger asChild>
											<SidebarMenuButton asChild>
												<Link href={item.url as Route}>
													{IconComponent && <IconComponent />}
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
											{IconComponent && <IconComponent />}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								)}
							</SidebarMenuItem>
						)
					})}
				</SidebarMenu>
				{/* Nav User */}
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<Avatar className="h-8 w-8 rounded-lg">
										<AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
										<AvatarFallback className="rounded-lg">
											{session?.user?.name?.[0] ?? ""}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">{session?.user?.name ?? ""}</span>
										<span className="truncate text-xs">{session?.user?.email ?? ""}</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
								side={isMobile ? "bottom" : "right"}
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="h-8 w-8 rounded-lg">
											<AvatarImage
												src={session?.user?.image ?? ""}
												alt={session?.user?.name ?? ""}
											/>
											<AvatarFallback className="rounded-lg">
												{session?.user?.name?.[0] ?? ""}
											</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">{session?.user?.name ?? ""}</span>
											<span className="truncate text-xs">{session?.user?.email ?? ""}</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem>
										<Sparkles />
										Upgrade to Pro
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem>
										<BadgeCheck />
										Account
									</DropdownMenuItem>
									<DropdownMenuItem>
										<CreditCard />
										Billing
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Bell />
										Notifications
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem>
									<LogOut />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
