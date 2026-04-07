import { appSidebarSections } from "@/core/lib/nav/site.config"
import type { NavItem, NavSection, NotaryRole } from "@/core/lib/nav/types"

const ENP_SECTION_ITEM_TITLES = new Set(["Appointments", "Notarial Registry"])
const BROWSE_AND_DOCUMENTS_LABEL = "Browse & Documents"
const ENP_APPOINTMENTS_LABEL = "Appointments & Notarial Registry"

// Active route checking utility
export const isRouteActive = (itemUrl: string, currentPath: string): boolean => {
	// Remove trailing slashes for comparison
	const normalizedItemUrl = itemUrl.replace(/\/$/, "")
	const normalizedCurrentPath = currentPath.replace(/\/$/, "")

	// Exact match
	if (normalizedItemUrl === normalizedCurrentPath) {
		return true
	}

	// Prefix match (e.g., /messages matches /messages/123)
	if (normalizedCurrentPath.startsWith(`${normalizedItemUrl}/`)) {
		return true
	}

	return false
}

// Role filtering utility
export const canAccessNavItem = (roles?: NotaryRole[], userRole?: string): boolean => {
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
export function filterNavSectionsByRole(
	navSections: NavSection[],
	userRole?: string
): NavSection[] {
	return navSections
		.map(section => ({
			...section,
			items: filterNavItemsByRole(section.items, userRole),
		}))
		.filter(section => section.items.length > 0)
}

// Get filtered app sidebar sections.
// ENP: move Browse/Documents into Platform and show Appointments/Notarial Registry as their own section.
// Principal (and others): combine Browse/Documents into Platform.
export function getAppSidebarSections(userRole?: string): NavSection[] {
	const filtered = filterNavSectionsByRole(appSidebarSections, userRole)
	const platform = filtered.find(s => s.label === "Platform")
	const browseAndDocs = filtered.find(s => s.label === BROWSE_AND_DOCUMENTS_LABEL)
	const rest = filtered.filter(s => s.label !== "Platform" && s.label !== BROWSE_AND_DOCUMENTS_LABEL)

	if (!platform) return filtered

	if (userRole === "ENP") {
		const appointmentsSectionItems = platform.items.filter(item =>
			ENP_SECTION_ITEM_TITLES.has(item.title)
		)
		const browseAndDocsItems = browseAndDocs?.items ?? []
		let browseAndDocsIndex = 0

		const enpPlatformItems = platform.items.flatMap(item => {
			if (!ENP_SECTION_ITEM_TITLES.has(item.title)) return [item]

			const replacementItem = browseAndDocsItems[browseAndDocsIndex]

			if (!replacementItem) return []

			browseAndDocsIndex += 1
			return [replacementItem]
		})

		const enpSections: NavSection[] = [
			{
				label: "Platform",
				items: [...enpPlatformItems, ...browseAndDocsItems.slice(browseAndDocsIndex)],
			},
		]

		if (appointmentsSectionItems.length > 0) {
			enpSections.push({
				label: ENP_APPOINTMENTS_LABEL,
				items: appointmentsSectionItems,
			})
		}

		return [...enpSections, ...rest]
	}

	const mergedPlatform: NavSection = {
		label: "Platform",
		items: browseAndDocs ? [...platform.items, ...browseAndDocs.items] : platform.items,
	}
	return [mergedPlatform, ...rest]
}

// Get filtered nav sections (generic function)
export function getFilteredNavSections(sections: NavSection[], userRole?: string): NavSection[] {
	return filterNavSectionsByRole(sections, userRole)
}
