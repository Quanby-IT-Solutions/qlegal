import type { LucideIcon } from "lucide-react"

import type { UserRole } from "@/services/drizzle/schema/auth"

// Core role types
export type NotaryRole = "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"

// Navigation item types
export interface NavSubItem {
	title: string
	url: string
	roles?: NotaryRole[]
}

export interface NavItem {
	title: string
	url: string
	icon?: LucideIcon | string
	isActive?: boolean
	roles?: NotaryRole[] | UserRole[]
	items?: NavSubItem[]
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
