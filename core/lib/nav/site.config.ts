import {
	AudioWaveform,
	BadgeCheck,
	BarChartIcon,
	BellIcon,
	BookIcon,
	BookOpen,
	CalendarIcon,
	ChevronRight,
	ChevronsUpDown,
	ClipboardCheckIcon,
	Command,
	CreditCard,
	EyeIcon,
	FileText,
	FileTextIcon,
	GalleryVerticalEnd,
	Globe,
	Handshake,
	HouseIcon,
	LayersIcon,
	LifeBuoy,
	LogOut,
	MailIcon,
	MessageSquareIcon,
	Monitor,
	PenToolIcon,
	PieChart,
	Plus,
	Scan,
	Send,
	Settings2,
	SettingsIcon,
	ShieldIcon,
	Sparkles,
	UserCheckIcon,
	UserIcon,
	UsersIcon,
	type LucideIcon,
} from "lucide-react"

import type { UserRole } from "@/services/drizzle/schema/auth"

import type { NavItem, NavSection, Team, UserProfile, WorkflowConfig, WorkflowType } from "./types"

// Icon mapping for string-based icon references
export const iconMap = {
	house: HouseIcon,
	document: FileTextIcon,
	mail: MailIcon,
	message: MessageSquareIcon,
	shield: ShieldIcon,
	calendar: CalendarIcon,
	clipboard: ClipboardCheckIcon,
	bell: BellIcon,
	users: UsersIcon,
	chart: BarChartIcon,
	userCheck: UserCheckIcon,
	eye: EyeIcon,
	layers: LayersIcon,
	user: UserIcon,
	settings: SettingsIcon,
	signature: PenToolIcon,
	book: BookIcon,
	// Additional icons from app-sidebar
	pieChart: PieChart,
	fileText: FileText,
	bookOpen: BookOpen,
	badgeCheck: BadgeCheck,
	monitor: Monitor,
	settings2: Settings2,
	globe: Globe,
	handshake: Handshake,
	// Team logos
	audioWaveform: AudioWaveform,
	galleryVerticalEnd: GalleryVerticalEnd,
	command: Command,
	// User actions
	chevronRight: ChevronRight,
	chevronsUpDown: ChevronsUpDown,
	creditCard: CreditCard,
	logOut: LogOut,
	plus: Plus,
	sparkles: Sparkles,
	// Secondary navigation icons
	lifeBuoy: LifeBuoy,
	send: Send,
} as const

export type IconName = keyof typeof iconMap

// Workflow configurations
export const workflows: WorkflowConfig[] = [
	{
		id: "REN",
		label: "REN",
		description: "Remote Electronic Notarization",
		icon: Globe,
	},
	{
		id: "IEN",
		label: "IEN",
		description: "In-Person Electronic Notarization",
		icon: Handshake,
	},
]

// Teams configuration (mock data)
export const teams: Team[] = [
	{
		name: "Acme Inc",
		logo: AudioWaveform,
		plan: "Enterprise",
	},
]

// Secondary navigation items
export const navSecondary: NavItem[] = [
	{
		title: "Support",
		url: "/support",
		icon: "lifeBuoy",
	},
	{
		title: "Feedback",
		url: "/feedback",
		icon: "send",
	},
]

// App sidebar sections configuration
export const appSidebarSections: NavSection[] = [
	{
		label: "Platform",
		items: [
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: PieChart,
			},
			{
				title: "Find a Lawyer",
				url: "/find-a-lawyer",
				icon: UsersIcon,
			},
			{
				title: "Scan Documents",
				url: "/scan",
				icon: Scan,
				workflows: ["IEN"],
			},
			{
				title: "My Documents",
				url: "/documents",
				icon: FileText,
				roles: ["ENP", "PRINCIPAL"],
				items: [
					{
						title: "Create New Envelope",
						url: "/documents/create",
						roles: ["ENP"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Request Notarization",
						url: "/documents/request",
						roles: ["PRINCIPAL"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Pending Signatures",
						url: "/documents/pending",
						roles: ["ENP"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Completed",
						url: "/documents/completed",
						roles: ["ENP", "PRINCIPAL"],
						workflows: ["REN", "IEN"],
					},
				],
			},
			{
				title: "Electronic Notarial Book",
				url: "/notarial-book",
				icon: BookOpen,
				roles: ["ENP"],
				workflows: ["REN", "IEN"],
			},
			{
				title: "Audit & Compliance",
				url: "/audit",
				icon: BadgeCheck,
				roles: ["ENA"],
				workflows: ["REN", "IEN"],
				items: [
					{
						title: "Notarial Records",
						url: "/audit/records",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Reports",
						url: "/audit/reports",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
				],
			},
			{
				title: "Identity Verification",
				url: "/verification/identity",
				icon: UserIcon,
				roles: ["ENP"],
				workflows: ["IEN"],
			},
			{
				title: "Witness Management",
				url: "/verification/witness",
				icon: UsersIcon,
				roles: ["ENP"],
				workflows: ["IEN"],
			},
		],
	},
	{
		label: "Management",
		items: [
			{
				title: "ENP Management",
				url: "/management/enp",
				icon: UsersIcon,
				roles: ["ENA"],
				workflows: ["REN", "IEN"],
				items: [
					{
						title: "Active Commissions",
						url: "/management/enp/commissions",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Applications",
						url: "/management/enp/applications",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Revocations",
						url: "/management/enp/revocations",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
				],
			},
			{
				title: "Facility Providers",
				url: "/management/providers",
				icon: Monitor,
				roles: ["ENA"],
				workflows: ["REN"],
				items: [
					{
						title: "Accreditation",
						url: "/management/providers/accreditation",
						roles: ["ENA"],
						workflows: ["REN"],
					},
					{
						title: "Monitoring",
						url: "/management/providers/monitoring",
						roles: ["ENA"],
						workflows: ["REN"],
					},
				],
			},
		],
	},
	{
		label: "Settings",
		items: [
			{
				title: "Account Settings",
				url: "/settings",
				icon: Settings2,
				roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
				workflows: ["REN", "IEN"],
				items: [
					{
						title: "Profile",
						url: "/settings/profile",
						roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "Security",
						url: "/settings/security",
						roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
						workflows: ["REN", "IEN"],
					},
					{
						title: "System Settings",
						url: "/settings/system",
						roles: ["ENA"],
						workflows: ["REN", "IEN"],
					},
				],
			},
		],
	},
]

// Helper functions for workflows
export function getWorkflowConfig(workflowId: WorkflowType): WorkflowConfig | undefined {
	return workflows.find(workflow => workflow.id === workflowId)
}

export function getWorkflowLabel(workflowId: WorkflowType): string {
	const config = getWorkflowConfig(workflowId)
	return config?.label ?? workflowId
}

export function getWorkflowDescription(workflowId: WorkflowType): string {
	const config = getWorkflowConfig(workflowId)
	return config?.description ?? workflowId
}

export function getWorkflowIcon(workflowId: WorkflowType): LucideIcon | undefined {
	const config = getWorkflowConfig(workflowId)
	return config?.icon
}

// Site user configuration (for authenticated user dropdown)
const siteUserConfig: NavItem[] = [
	{
		title: "Profile",
		url: "/profile",
		icon: "user",
	},
	{
		title: "Notifications",
		url: "/notifications",
		icon: "bell",
	},
	{
		title: "Settings",
		url: "/settings",
		icon: "settings",
	},
]

// Navigation Filtering Functions for site user
function isValidUserRole(role: string | null | undefined): role is UserRole {
	if (!role) {
		return false
	}
	return ["ENP", "Principal", "ENA"].includes(role)
}

function filterNavItemsByRole(navItems: NavItem[], userRole?: string | null): NavItem[] {
	return navItems.filter(item => {
		const roles = item.roles
		if (!roles || roles.length === 0) return true
		if (!userRole || !isValidUserRole(userRole)) return false
		// Handle union type: roles can be NotaryRole[] | UserRole[]
		// Check if any role in the array matches the user's role
		return (roles as readonly string[]).includes(userRole)
	})
}

// Getter functions for easy access
export function getAppSidebarSections(): NavSection[] {
	return appSidebarSections
}

export function getWorkflows(): WorkflowConfig[] {
	return workflows
}

export function getTeams(): Team[] {
	return teams
}

export function getSiteUserItems(userRole?: UserRole | null): NavItem[] {
	return filterNavItemsByRole(siteUserConfig, userRole)
}

export function getNavSecondary(): NavItem[] {
	return navSecondary
}
