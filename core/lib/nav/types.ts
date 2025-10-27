import type { LucideIcon } from "lucide-react"

import type { UserRole } from "@/services/drizzle/schema/auth"

// Core role and workflow types
export type NotaryRole = "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"
export type WorkflowType = "REN" | "IEN"

// Navigation item types
export interface NavSubItem {
	title: string
	url: string
	roles?: NotaryRole[]
	workflows?: WorkflowType[]
}

export interface NavItem {
	title: string
	url: string
	icon?: LucideIcon | string
	isActive?: boolean
	roles?: NotaryRole[] | UserRole[]
	workflows?: WorkflowType[]
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

// Workflow configuration
export interface WorkflowConfig {
	id: WorkflowType
	label: string
	description: string
	icon: LucideIcon
}

// Team configuration
export interface Team {
	name: string
	logo: LucideIcon
	plan: string
}

// User profile configuration
export interface UserProfile {
	name: string
	email: string
	avatar: string
}
