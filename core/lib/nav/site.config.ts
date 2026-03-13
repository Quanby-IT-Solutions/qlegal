import {
	Appointment02Icon,
	BookOpen02Icon,
	Building01Icon,
	ChatIcon,
	CustomerSupportIcon,
	DocumentValidationIcon,
	Home01Icon,
	Notification01Icon,
	Sent02Icon,
	Settings01Icon,
	ShieldIcon,
	ShieldUserIcon,
	UserGroupIcon,
	UserIcon,
	UserMultipleIcon,
	Video01Icon,
} from "@hugeicons/core-free-icons"

import type { UserRole } from "@/services/drizzle/schema/auth"

import type { NavItem, NavSection } from "./types"

export const navSecondary: NavItem[] = [
	{
		title: "Support",
		url: "/support",
		icon: CustomerSupportIcon,
		badge: "soon",
	},
	{
		title: "Feedback",
		url: "/feedback",
		icon: Sent02Icon,
		badge: "soon",
	},
]

export const appSidebarSections: NavSection[] = [
	{
		label: "Platform",
		items: [
			{
				title: "Dashboard",
				url: "/dashboard",
				icon: Home01Icon,
			},
			{
				title: "Appointments",
				url: "/requests",
				icon: Appointment02Icon,
				roles: ["ENP"],
			},
			{
				title: "Sessions",
				url: "/sessions",
				icon: Video01Icon,
				roles: ["ENP", "PRINCIPAL"],
			},
			{
				title: "Notarial Registry",
				url: "/notarial-registry",
				icon: BookOpen02Icon,
				roles: ["ENP"],
			},
			{
				title: "Messages",
				url: "/messages",
				icon: ChatIcon,
			},
		],
	},
	{
		label: "Browse & Documents",
		items: [
			{
				title: "Browse",
				url: "/browse",
				icon: UserMultipleIcon,
				roles: ["PRINCIPAL", "ENP"],
			},
			{
				title: "Documents",
				url: "/documents",
				icon: DocumentValidationIcon,
				roles: ["PRINCIPAL", "ENP"],
			},
		],
	},
	{
		label: "Management",
		items: [
			{
				title: "User Management",
				url: "/management/users",
				icon: UserGroupIcon,
				roles: ["ENA", "ADMIN"],
			},
			{
				title: "ENP Management",
				url: "/management/enp-management",
				icon: ShieldIcon,
				roles: ["ADMIN"],
			},
			{
				title: "Sub-Orgs",
				url: "/management/sub-orgs",
				icon: Building01Icon,
				roles: ["ENA", "ADMIN"],
			},
		],
	},
]

const siteUserConfig: NavItem[] = [
	{
		title: "Profile",
		url: "/profile",
		icon: UserIcon,
	},
	{
		title: "Notifications",
		url: "/notifications",
		icon: Notification01Icon,
	},
	{
		title: "KYC Verification",
		url: "/kyc",
		icon: ShieldUserIcon,
	},
	{
		title: "Settings",
		url: "/settings",
		icon: Settings01Icon,
	},
]

function isValidUserRole(role: string | null | undefined): role is UserRole {
	if (!role) return false
	return ["ENP", "PRINCIPAL", "ENA", "ADMIN"].includes(role)
}

export function getSiteUserItems(userRole?: UserRole | null): NavItem[] {
	return siteUserConfig.filter(item => {
		const roles = item.roles as readonly UserRole[] | undefined
		if (!roles || roles.length === 0) return true
		if (!userRole || !isValidUserRole(userRole)) return false
		return roles.includes(userRole)
	})
}

export function getNavSecondary(): NavItem[] {
	return navSecondary
}
