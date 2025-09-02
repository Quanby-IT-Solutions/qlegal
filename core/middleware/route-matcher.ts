import { type RoutePattern } from "@/core/middleware/config"

// ============================================================================
// ROUTE MATCHING UTILITIES (Functional)
// ============================================================================

// Cache for performance optimization
const matchCache = new Map<string, boolean>()

/**
 * Checks if a path matches a route pattern with caching for performance
 */
export function matchesRoute(path: string, pattern: RoutePattern): boolean {
	const cacheKey = `${path}:${pattern.path}:${pattern.exact ?? false}`

	if (matchCache.has(cacheKey)) {
		return matchCache.get(cacheKey)!
	}

	const result = pattern.exact ? path === pattern.path : path.startsWith(pattern.path)

	matchCache.set(cacheKey, result)
	return result
}

/**
 * Checks if path matches any pattern in an array
 */
export function matchesAnyRoute(path: string, patterns: RoutePattern[]): boolean {
	return patterns.some(pattern => matchesRoute(path, pattern))
}
