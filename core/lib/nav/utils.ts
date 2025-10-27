import { appSidebarSections } from "@/core/lib/nav/site.config"
import type { NavItem, NavSection, NotaryRole, WorkflowType } from "@/core/lib/nav/types"

// Role and workflow filtering utility
export const canAccessNavItem = (
	roles?: NotaryRole[],
	userRole?: string,
	workflows?: WorkflowType[],
	currentWorkflow?: string
): boolean => {
	// Check role access
	if (roles && roles.length > 0) {
		if (!userRole || !roles.includes(userRole as NotaryRole)) return false
	}

	// Check workflow access
	if (workflows && workflows.length > 0) {
		if (!currentWorkflow || !workflows.includes(currentWorkflow as WorkflowType)) return false
	}

	return true
}

// Filter navigation items by role and workflow
export function filterNavItemsByRoleAndWorkflow(
	navItems: NavItem[],
	userRole?: string,
	currentWorkflow?: string
): NavItem[] {
	return navItems
		.filter(item => {
			// Check if user can access this item
			// Handle union type: roles can be NotaryRole[] | UserRole[]
			return canAccessNavItem(
				item.roles as NotaryRole[] | undefined,
				userRole,
				item.workflows,
				currentWorkflow
			)
		})
		.map(item => {
			// Create new object with filtered sub-items if they exist
			if (item.items) {
				const filteredSubItems = item.items.filter(subItem =>
					canAccessNavItem(subItem.roles, userRole, subItem.workflows, currentWorkflow)
				)
				return {
					...item,
					items: filteredSubItems,
				}
			}
			return item
		})
}

// Filter navigation sections by role and workflow
export function filterNavSectionsByRoleAndWorkflow(
	navSections: NavSection[],
	userRole?: string,
	currentWorkflow?: string
): NavSection[] {
	return navSections
		.map(section => ({
			...section,
			items: filterNavItemsByRoleAndWorkflow(section.items, userRole, currentWorkflow),
		}))
		.filter(section => section.items.length > 0)
}

// Get filtered app sidebar sections
export function getAppSidebarSections(userRole?: string, currentWorkflow?: string): NavSection[] {
	return filterNavSectionsByRoleAndWorkflow(appSidebarSections, userRole, currentWorkflow)
}

// Get filtered nav sections (generic function)
export function getFilteredNavSections(
	sections: NavSection[],
	userRole?: string,
	workflow?: string
): NavSection[] {
	return filterNavSectionsByRoleAndWorkflow(sections, userRole, workflow)
}
