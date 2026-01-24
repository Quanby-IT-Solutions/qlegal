import { appSidebarSections } from "@/core/lib/nav/site.config"
import type { NavItem, NavSection, NotaryRole } from "@/core/lib/nav/types"

// Role filtering utility
export const canAccessNavItem = (
	roles?: NotaryRole[],
	userRole?: string
): boolean => {
	// Check role access
	if (roles && roles.length > 0) {
		if (!userRole || !roles.includes(userRole as NotaryRole)) return false
	}

	return true
}

// Filter navigation items by role
export function filterNavItemsByRole(navItems: NavItem[], userRole?: string): NavItem[] {
	return navItems
		.filter(item => {
			// Check if user can access this item
			// Handle union type: roles can be NotaryRole[] | UserRole[]
			return canAccessNavItem(item.roles as NotaryRole[] | undefined, userRole)
		})
		.map(item => {
			// Create new object with filtered sub-items if they exist
			if (item.items) {
				const filteredSubItems = item.items.filter(subItem =>
					canAccessNavItem(subItem.roles, userRole)
				)
				return {
					...item,
					items: filteredSubItems,
				}
			}
			return item
		})
}

// Filter navigation sections by role
export function filterNavSectionsByRole(navSections: NavSection[], userRole?: string): NavSection[] {
	return navSections
		.map(section => ({
			...section,
			items: filterNavItemsByRole(section.items, userRole),
		}))
		.filter(section => section.items.length > 0)
}

// Get filtered app sidebar sections
export function getAppSidebarSections(userRole?: string): NavSection[] {
	return filterNavSectionsByRole(appSidebarSections, userRole)
}

// Get filtered nav sections (generic function)
export function getFilteredNavSections(sections: NavSection[], userRole?: string): NavSection[] {
	return filterNavSectionsByRole(sections, userRole)
}
