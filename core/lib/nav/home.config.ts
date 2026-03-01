import { BookOpenIcon, Home01Icon, Sent02Icon, UserGroupIcon } from "@hugeicons/core-free-icons"

import type { NavGroups, NavItem } from "@/core/lib/nav/types"

import type { UserRole } from "@/services/drizzle/schema/auth"

// Landing Page Navigation
const homeConfig: NavItem[] = [
	{
		icon: Home01Icon,
		title: "Features",
		url: "#features",
	},
	{
		icon: BookOpenIcon,
		title: "Pricing",
		url: "#pricing",
	},
	{
		icon: Sent02Icon,
		title: "Contact Us",
		url: "#contact-us",
	},
	{
		icon: UserGroupIcon,
		title: "About Us",
		url: "#about-us",
	},
]

const footerConfig: NavGroups = {
	product: {
		label: "Product",
		items: [
			{
				title: "Envelopes",
				url: "/envelopes",
			},
		],
	},
	company: {
		label: "Company",
		items: [
			{
				title: "About Us",
				url: "https://quanbyit.com/about-us/",
			},
			{
				title: "Blog",
				url: "https://quanbyit.com/quill-news/",
			},
			{
				title: "Careers",
				url: "https://quanbyit.com/careers/",
			},
		],
	},
	support: {
		label: "Support",
		items: [
			{
				title: "Data Privacy",
				url: "/auth/privacy-policy",
			},
			{
				title: "Terms of Service",
				url: "/auth/terms-of-service",
			},
			{
				title: "Mission & Vision",
				url: "https://quanbyit.com/mission-vision/",
			},
			{
				title: "Contact Us",
				url: "https://quanbyit.com/contact-quanby/",
			},
		],
	},
}

const navbarConfig: NavItem[] = [
	{
		title: "Features",
		url: "#features",
	},
	{
		title: "Pricing",
		url: "#pricing",
	},
	{
		title: "Contact Us",
		url: "#contact-us",
	},
]

// Navigation Filtering Functions
function isValidUserRole(role: string | null | undefined): role is UserRole {
	if (!role) {
		return false
	}
	return ["ENP", "Principal", "ENA", "ADMIN"].includes(role)
}

function filterNavItemsByRole(navItems: NavItem[], userRole?: string | null): NavItem[] {
	return navItems.filter(item => {
		const roles = item.roles
		if (!roles || roles.length === 0) return true
		if (!userRole || !isValidUserRole(userRole)) return false
		// Handle union type: roles can be NotaryRole[] | UserRole[]
		return (roles as readonly string[]).includes(userRole)
	})
}

// Exported Functions
export function getHomeConfig(): NavItem[] {
	return homeConfig
}

export function getFooterGroups(): NavGroups {
	return footerConfig
}

export function getNavbarItems(userRole?: UserRole | null): NavItem[] {
	return filterNavItemsByRole(navbarConfig, userRole)
}
