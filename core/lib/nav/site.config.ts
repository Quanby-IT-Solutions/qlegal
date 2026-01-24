import {
	AddIcon,
	BarChartIcon,
	BadgeCheckIcon,
	Bell01Icon,
	BookIcon,
	BookOpenIcon,
	Calendar01Icon,
	ChevronRight,
	ChevronsUpDown,
	ClipboardIcon,
	Command,
	CreditCard,
	EyeIcon,
	DocumentIcon,
	FileIcon,
	FilesIcon,
	GlobeIcon,
	Handshake,
	HomeIcon,
	LayersIcon,
	LifebuoyIcon,
	LogoutIcon,
	MailIcon,
	MessageSquareIcon,
	MonitorIcon,
	SignatureIcon,
	PieChartIcon,
	PresentationChartIcon,
	SendIcon,
	SettingsIcon,
	ShieldIcon,
	ShieldCheckIcon,
	SparklesIcon,
	UserCheckIcon,
	UserIcon,
	Users01Icon,
	Video01Icon,
	AudioWaveIcon,
} from "@hugeicons/core-free-icons"

import type { UserRole } from "@/services/drizzle/schema/auth"

import type { NavItem, NavSection } from "./types"

// Icon mapping for string-based icon references
export const iconMap = {
	"house": HomeIcon,
	"document": DocumentIcon,
	"mail": MailIcon,
	"message": MessageSquareIcon,
	"shield": ShieldIcon,
	"shield-check": ShieldCheckIcon,
	"calendar": Calendar01Icon,
	"clipboard": ClipboardIcon,
	"bell": Bell01Icon,
	"users": Users01Icon,
	"chart": BarChartIcon,
	"userCheck": UserCheckIcon,
	"eye": EyeIcon,
	"layers": LayersIcon,
	"user": UserIcon,
	"settings": SettingsIcon,
	"signature": SignatureIcon,
	"book": BookIcon,
	// Additional icons from app-sidebar
	"pieChart": PieChartIcon,
	"fileText": FileIcon,
	"bookOpen": BookOpenIcon,
	"badgeCheck": BadgeCheckIcon,
	"monitor": MonitorIcon,
	"settings2": SettingsIcon,
	"globe": GlobeIcon,
	"handshake": Handshake,
	// Team logos
	"audioWaveform": AudioWaveIcon,
	"galleryVerticalEnd": FilesIcon,
	"command": Command,
	// User actions
	"chevronRight": ChevronRight,
	"chevronsUpDown": ChevronsUpDown,
	"creditCard": CreditCard,
	"logOut": LogOutIcon,
	"plus": AddIcon,
	"sparkles": SparklesIcon,
	// Secondary navigation icons
	"lifeBuoy": LifebuoyIcon,
	"send": SendIcon,
} as const

export type IconName = keyof typeof iconMap

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

export const appSidebarSections: NavSection[] = [
	{
		label: "Platform",
		items: [
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: PresentationChartIcon,
			},
			{
				title: "Find & Book",
				url: "/browse",
				icon: SparklesIcon,
				roles: ["PRINCIPAL"],
			},
			{
				title: "My Calendar",
				url: "/appointments",
				icon: Calendar01Icon,
				roles: ["ENP"],
			},
			{
				title: "Appointment Meeting",
				url: "/appointments",
				icon: Video01Icon,
				roles: ["ENP"],
			},
			{
				title: "Meetings & Notarization",
				url: "/meetings",
				icon: MonitorIcon,
				roles: ["ENP", "PRINCIPAL"],
			},
			{
				title: "Documents",
				url: "/documents",
				icon: DocumentIcon,
				roles: ["ENP", "PRINCIPAL"],
				items: [
					{
						title: "Create Envelope",
						url: "/documents/create",
						roles: ["ENP"],
					},
					{
						title: "Pending Signatures",
						url: "/documents/pending",
						roles: ["ENP", "PRINCIPAL"],
					},
					{
						title: "Completed Documents",
						url: "/documents/completed",
						roles: ["ENP", "PRINCIPAL"],
					},
					{
						title: "Templates",
						url: "/documents/templates",
						roles: ["ENP"],
					},
				],
			},
			{
				title: "Notarial Book",
				url: "/notarial-book",
				icon: BookOpenIcon,
				roles: ["ENP"],
			},
			{
				title: "Audit & Compliance",
				url: "/audit",
				icon: BadgeCheckIcon,
				roles: ["ENA", "ADMIN"],
				items: [
					{
						title: "Notarial Records",
						url: "/audit/records",
						roles: ["ENA", "ADMIN"],
					},
					{
						title: "Compliance Reports",
						url: "/audit/reports",
						roles: ["ENA", "ADMIN"],
					},
					{
						title: "Violations",
						url: "/audit/violations",
						roles: ["ENA", "ADMIN"],
					},
				],
			},
			{
				title: "Identity Verification",
				url: "/verification/identity",
				icon: UserIcon,
				roles: ["ENP"],
			},
			{
				title: "Witness Management",
				url: "/verification/witness",
				icon: UsersIcon,
				roles: ["ENP"],
			},
		],
	},
	{
		label: "Management",
		items: [
			{
				title: "User Management",
				url: "/management/users",
				icon: UsersIcon,
				roles: ["ENA", "ADMIN"],
			},
		],
	},
	{
		label: "Settings",
		items: [
			{
				title: "Account Settings",
				url: "/settings",
				icon: SettingsIcon,
				roles: ["ENP", "PRINCIPAL", "ENA", "ADMIN"],
			},
		],
	},
]

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
		title: "KYC Verification",
		url: "/kyc",
		icon: "shield-check",
	},
	{
		title: "Settings",
		url: "/settings",
		icon: "settings",
	},
]

function isValidUserRole(role: string | null | undefined): role is UserRole {
	if (!role) {
		return false
	}
	return ["ENP", "PRINCIPAL", "ENA", "ADMIN"].includes(role)
}

function filterNavItemsByRole(navItems: NavItem[], userRole?: string | null): NavItem[] {
	return navItems.filter(item => {
		const roles = item.roles
		if (!roles || roles.length === 0) return true
		if (!userRole || !isValidUserRole(userRole)) return false
		return (roles as readonly string[]).includes(userRole)
	})
}

export function getAppSidebarSections(): NavSection[] {
	return appSidebarSections
}

export function getSiteUserItems(userRole?: UserRole | null): NavItem[] {
	return filterNavItemsByRole(siteUserConfig, userRole)
}

export function getNavSecondary(): NavItem[] {
	return navSecondary
}
