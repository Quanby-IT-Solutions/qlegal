import {
	BookOpen02Icon,
	BookOpenIcon,
	Calendar02Icon,
	ChatIcon,
	CheckmarkBadge01Icon,
	CustomerSupportIcon,
	DocumentAttachmentIcon,
	DocumentValidationIcon,
	Home01Icon,
	Notification01Icon,
	Search01Icon,
	Sent02Icon,
	Settings01Icon,
	ShieldUserIcon,
	Timer02Icon,
	UserGroupIcon,
	UserIcon,
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
				title: "Browse",
				url: "/browse",
				icon: Search01Icon,
				roles: ["PRINCIPAL"],
			},
			{
				title: "Schedule",
				url: "/schedule",
				icon: Calendar02Icon,
				roles: ["ENP"],
			},
			{
				title: "Requests",
				url: "/requests",
				icon: Timer02Icon,
				roles: ["ENP"],
			},
			{
				title: "Sessions",
				url: "/meetings",
				icon: Video01Icon,
			},
			{
				title: "Documents",
				url: "/documents",
				icon: DocumentValidationIcon,
				roles: ["PRINCIPAL"],
			},
			{
				title: "Notarial Registry",
				url: "/notarial-book-2",
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
		label: "Old",
		items: [
			{
				title: "Appointment Meeting",
				url: "/appointments",
				icon: Video01Icon,
				roles: ["ENP"],
			},
			{
				title: "Meetings & Notarization",
				url: "/meetings",
				icon: DocumentAttachmentIcon,
				roles: ["ENP", "PRINCIPAL"],
			},
			{
				title: "Documents",
				url: "/documents",
				icon: DocumentAttachmentIcon,
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
				badge: "soon",
			},
			{
				title: "Audit & Compliance",
				url: "/audit",
				icon: CheckmarkBadge01Icon,
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
				icon: UserGroupIcon,
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
				icon: UserGroupIcon,
				roles: ["ENA", "ADMIN"],
			},
		],
	}
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
