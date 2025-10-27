"use client"

import { useState } from "react"
import {
	BadgeCheck,
	Bell,
	ChevronRight,
	ChevronsUpDown,
	CreditCard,
	Globe,
	Handshake,
	LogOut,
	Plus,
	Sparkles,
} from "lucide-react"
import { useSession } from "next-auth/react"

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/core/components/animate-ui/components/radix/dropdown-menu"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@/core/components/animate-ui/components/radix/sidebar"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/animate-ui/primitives/radix/collapsible"
import { WorkflowTabPanel } from "@/core/components/navbar/workflow-tab-panel"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { getTeams } from "@/core/lib/nav/site.config"
// Import navigation configs
import { type NavItem, type NavSection, type NotaryRole, type Team } from "@/core/lib/nav/types"
import { canAccessNavItem, getAppSidebarSections } from "@/core/lib/nav/utils"

// Use imported data instead of local DATA object

// SidebarNavItem Component
type SidebarNavItemProps = {
	item: NavItem
	userRole?: string
	currentWorkflow?: string
}

const SidebarNavItem = ({ item, userRole, currentWorkflow }: SidebarNavItemProps) => {
	// Filter sub-items by role and workflow
	const accessibleSubItems =
		item.items?.filter(subItem =>
			canAccessNavItem(subItem.roles, userRole, subItem.workflows, currentWorkflow)
		) ?? []

	// If no sub-items or no accessible sub-items, render as simple link
	if (!item.items || accessibleSubItems.length === 0) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton asChild tooltip={item.title}>
					<a href={item.url}>
						{item.icon && <item.icon />}
						<span>{item.title}</span>
					</a>
				</SidebarMenuButton>
			</SidebarMenuItem>
		)
	}

	// Render as collapsible with sub-items
	return (
		<Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton tooltip={item.title}>
						{item.icon && <item.icon />}
						<span>{item.title}</span>
						<ChevronRight className="ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90" />
					</SidebarMenuButton>
				</CollapsibleTrigger>
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
				{/* Team Switcher */}
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
										<activeTeam.logo className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">{activeTeam.name}</span>
										<span className="truncate text-xs">{activeTeam.plan}</span>
									</div>
									<ChevronsUpDown className="ml-auto" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
								align="start"
								side={isMobile ? "bottom" : "right"}
								sideOffset={4}
							>
								<DropdownMenuLabel className="text-muted-foreground text-xs">
									Teams
								</DropdownMenuLabel>
								{getTeams().map((team, index) => (
									<DropdownMenuItem
										key={team.name}
										onClick={() => setActiveTeam(team)}
										className="gap-2 p-2"
									>
										<div className="flex size-6 items-center justify-center rounded-sm border">
											<team.logo className="size-4 shrink-0" />
										</div>
										{team.name}
										<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
									</DropdownMenuItem>
								))}
								<DropdownMenuSeparator />
								<DropdownMenuItem className="gap-2 p-2">
									<div className="bg-background flex size-6 items-center justify-center rounded-md border">
										<Plus className="size-4" />
									</div>
									<div className="text-muted-foreground font-medium">Add team</div>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
				{/* Team Switcher */}
			</SidebarHeader>

			<SidebarContent>
				{/* Navigation Sections */}
				<WorkflowTabPanel
					tabs={[
						{ value: "REN", label: "REN", icon: Globe },
						{ value: "IEN", label: "IEN", icon: Handshake },
					]}
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
				</WorkflowTabPanel>
			</SidebarContent>

			<SidebarFooter>
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
											{session?.user?.name?.[0] ?? "U"}
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
												{session?.user?.name?.[0] ?? "U"}
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
				{/* Nav User */}
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
