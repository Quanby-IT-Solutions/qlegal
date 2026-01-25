import type { UserRole } from "@/services/drizzle/schema/auth"

export type IconSvgObject = readonly (readonly [string, Record<string, string | number>])[]

// Core role types
export type NotaryRole = "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"

// Icon component type (compatible with Lucide, HugeIcons, etc.)
export type IconComponentType = React.ComponentType<React.SVGProps<SVGSVGElement>>

// Badge types for navigation items
export type NavBadgeType = "new" | "soon" | "beta" | "updated" | "popular"

// Navigation item types
export interface NavSubItem {
	title: string
	url: string
	roles?: NotaryRole[]
}

export interface NavItem {
	title: string
	url: string
	icon?: IconComponentType | IconSvgObject
	isActive?: boolean
	roles?: NotaryRole[] | UserRole[]
	items?: NavSubItem[]
	badge?: NavBadgeType
}

export interface NavSection {
	label: string
	items: NavItem[]
}

export interface NavItemGroup {
	label?: string
	items?: NavItem[]
	roles?: UserRole[]
}

export type NavGroups = Record<string, NavItemGroup>

// User profile configuration
export interface UserProfile {
	name: string
	email: string
	avatar: string
}
