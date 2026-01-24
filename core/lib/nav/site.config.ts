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
	PieChartIcon,
	Plus,
	Send,
	Settings2,
	SettingsIcon,
	ShieldCheck,
	ShieldIcon,
	Sparkles,
	UserCheckIcon,
	UserIcon,
	UsersIcon,
	Video,
} from "lucide-react"

import type { UserRole } from "@/services/drizzle/schema/auth"

import type { NavItem, NavSection } from "./types"

// Icon mapping for string-based icon references
export const iconMap = {
	"house": HouseIcon,
	"document": FileTextIcon,
	"mail": MailIcon,
	"message": MessageSquareIcon,
	"shield": ShieldIcon,
	"shield-check": ShieldCheck,
	"calendar": CalendarIcon,
	"clipboard": ClipboardCheckIcon,
	"bell": BellIcon,
	"users": UsersIcon,
	"chart": BarChartIcon,
	"userCheck": UserCheckIcon,
	"eye": EyeIcon,
	"layers": LayersIcon,
	"user": UserIcon,
	"settings": SettingsIcon,
	"signature": PenToolIcon,
	"book": BookIcon,
	// Additional icons from app-sidebar
	"pieChart": PieChart,
	"fileText": FileText,
	"bookOpen": BookOpen,
	"badgeCheck": BadgeCheck,
	"monitor": Monitor,
	"settings2": Settings2,
	"globe": Globe,
	"handshake": Handshake,
	// Team logos
	"audioWaveform": AudioWaveform,
	"galleryVerticalEnd": GalleryVerticalEnd,
	"command": Command,
	// User actions
	"chevronRight": ChevronRight,
	"chevronsUpDown": ChevronsUpDown,
	"creditCard": CreditCard,
	"logOut": LogOut,
	"plus": Plus,
	"sparkles": Sparkles,
	// Secondary navigation icons
	"lifeBuoy": LifeBuoy,
	"send": Send,
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
				icon: PieChartIcon,
			},
			{
				title: "Find & Book",
				url: "/browse",
				icon: Sparkles,
				roles: ["PRINCIPAL"],
			},
			{
				title: "My Calendar",
				url: "/appointments",
				icon: CalendarIcon,
				roles: ["ENP"],
			},
			{
				title: "Appointment Meeting",
				url: "/appointments",
				icon: Video,
				roles: ["ENP"],
			},
			{
				title: "Meetings & Notarization",
				url: "/meetings",
				icon: Monitor,
				roles: ["ENP", "PRINCIPAL"],
			},
			{
				title: "Documents",
				url: "/documents",
				icon: FileText,
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
				icon: BookOpen,
				roles: ["ENP"],
			},
			{
				title: "Audit & Compliance",
				url: "/audit",
				icon: BadgeCheck,
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
				icon: Settings2,
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
