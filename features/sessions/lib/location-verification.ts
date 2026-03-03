import { PHILIPPINE_EMBASSIES, type EmbassyLocation } from "./philippine-embassies"

/**
 * Philippine geographical boundaries (approximate bounding box)
 * These coordinates encompass the entire Philippine archipelago
 */
export const PHILIPPINES_BOUNDS = {
	north: 21.5, // Batanes
	south: 4.5, // Tawi-Tawi
	east: 127.0, // Eastern Samar
	west: 116.0, // Palawan
}

/**
 * Default radius for embassy proximity check (in kilometers)
 */
export const DEFAULT_EMBASSY_RADIUS_KM = 1

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180)
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 6371 // Earth's radius in kilometers

	const dLat = toRadians(lat2 - lat1)
	const dLng = toRadians(lng2 - lng1)

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

	return R * c
}

/**
 * Check if coordinates are within the Philippine geographical boundaries
 * This is a rough bounding box check, not a precise border check
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns True if within Philippines bounds
 */
export function isWithinPhilippinesBounds(lat: number, lng: number): boolean {
	return (
		lat >= PHILIPPINES_BOUNDS.south &&
		lat <= PHILIPPINES_BOUNDS.north &&
		lng >= PHILIPPINES_BOUNDS.west &&
		lng <= PHILIPPINES_BOUNDS.east
	)
}

/**
 * Find the nearest Philippine embassy/consulate to the given coordinates
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns The nearest embassy location and its distance in km
 */
export function findNearestEmbassy(
	lat: number,
	lng: number
): { embassy: EmbassyLocation; distanceKm: number } | null {
	if (PHILIPPINE_EMBASSIES.length === 0) {
		return null
	}

	let nearest: EmbassyLocation | null = null
	let minDistance = Infinity

	for (const embassy of PHILIPPINE_EMBASSIES) {
		const distance = calculateDistanceKm(lat, lng, embassy.coordinates.lat, embassy.coordinates.lng)

		if (distance < minDistance) {
			minDistance = distance
			nearest = embassy
		}
	}

	if (!nearest) {
		return null
	}

	return {
		embassy: nearest,
		distanceKm: minDistance,
	}
}

/**
 * Find all embassies within a specified radius
 * @param lat - Latitude
 * @param lng - Longitude
 * @param radiusKm - Search radius in kilometers (default: 1km)
 * @returns Array of embassy locations within radius, sorted by distance
 */
export function findEmbassiesWithinRadius(
	lat: number,
	lng: number,
	radiusKm: number = DEFAULT_EMBASSY_RADIUS_KM
): Array<{ embassy: EmbassyLocation; distanceKm: number }> {
	const results: Array<{ embassy: EmbassyLocation; distanceKm: number }> = []

	for (const embassy of PHILIPPINE_EMBASSIES) {
		const distance = calculateDistanceKm(lat, lng, embassy.coordinates.lat, embassy.coordinates.lng)

		if (distance <= radiusKm) {
			results.push({
				embassy,
				distanceKm: distance,
			})
		}
	}

	// Sort by distance (nearest first)
	return results.sort((a, b) => a.distanceKm - b.distanceKm)
}

/**
 * Check if the user is near a Philippine embassy/consulate
 * @param lat - Latitude
 * @param lng - Longitude
 * @param radiusKm - Maximum distance in kilometers (default: 1km)
 * @returns True if within radius of any embassy
 */
export function isNearPhilippineEmbassy(
	lat: number,
	lng: number,
	radiusKm: number = DEFAULT_EMBASSY_RADIUS_KM
): boolean {
	return findEmbassiesWithinRadius(lat, lng, radiusKm).length > 0
}

/**
 * Location verification result
 */
export interface LocationVerificationResult {
	allowed: boolean
	reason:
		| "in_philippines"
		| "near_embassy"
		| "outside_philippines"
		| "enp_at_embassy_abroad"
		| "location_unknown"
		| "vpn_detected"
		| "vpn_check_unavailable"
		| "geolocation_error"
		| "permission_denied"
		| "unavailable"
		| "timeout"
		| "gps_accuracy_low"
		| "google_maps_api_error"
		| "server_error"
	details?: {
		isInPhilippines?: boolean
		nearbyEmbassy?: EmbassyLocation
		distanceToEmbassyKm?: number
		countryCode?: string
		formattedAddress?: string
	}
	debugInfo?: {
		errorCode?: string
		errorMessage?: string
		userMessage?: string
		suggestedAction?: string
		timestamp?: string
		accuracyMeters?: number
		apiStatusCode?: string
		requestId?: string
	}
}

/**
 * Verify location for a specific user role
 *
 * Rules:
 * - ENP (Notary): Must be physically in the Philippines (NOT at embassy abroad)
 * - PRINCIPAL (Client): Can be in Philippines OR within 1km of a Philippine embassy/consulate
 *
 * @param role - User role ("ENP" or "PRINCIPAL")
 * @param lat - Latitude
 * @param lng - Longitude
 * @param isInPhilippines - Whether geocoding confirms user is in PH (from Google Maps API)
 * @returns Verification result
 */
export function verifyLocationForRole(
	role: "ENP" | "PRINCIPAL" | "ENA" | "ADMIN",
	lat: number,
	lng: number,
	isInPhilippines: boolean
): LocationVerificationResult {
	// Check if near an embassy first
	const nearbyEmbassies = findEmbassiesWithinRadius(lat, lng, DEFAULT_EMBASSY_RADIUS_KM)
	const nearestEmbassy = nearbyEmbassies[0] ?? null

	// ENP must be in Philippines and NOT at an embassy abroad
	if (role === "ENP") {
		if (isInPhilippines) {
			return {
				allowed: true,
				reason: "in_philippines",
				details: {
					isInPhilippines: true,
				},
			}
		}

		// ENP is outside Philippines - check if at embassy (which is NOT allowed for ENP)
		if (nearestEmbassy) {
			return {
				allowed: false,
				reason: "enp_at_embassy_abroad",
				details: {
					isInPhilippines: false,
					nearbyEmbassy: nearestEmbassy.embassy,
					distanceToEmbassyKm: nearestEmbassy.distanceKm,
				},
			}
		}

		return {
			allowed: false,
			reason: "outside_philippines",
			details: {
				isInPhilippines: false,
			},
		}
	}

	// PRINCIPAL can be in Philippines OR at an embassy
	if (role === "PRINCIPAL" || role === "ENA" || role === "ADMIN") {
		if (isInPhilippines) {
			return {
				allowed: true,
				reason: "in_philippines",
				details: {
					isInPhilippines: true,
				},
			}
		}

		// Not in Philippines - check if near an embassy
		if (nearestEmbassy) {
			return {
				allowed: true,
				reason: "near_embassy",
				details: {
					isInPhilippines: false,
					nearbyEmbassy: nearestEmbassy.embassy,
					distanceToEmbassyKm: nearestEmbassy.distanceKm,
				},
			}
		}

		return {
			allowed: false,
			reason: "outside_philippines",
			details: {
				isInPhilippines: false,
			},
		}
	}

	// Default: not allowed
	return {
		allowed: false,
		reason: "location_unknown",
	}
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "500 m" or "1.5 km")
 */
export function formatDistance(distanceKm: number): string {
	if (distanceKm < 1) {
		return `${Math.round(distanceKm * 1000)} m`
	}
	return `${distanceKm.toFixed(1)} km`
}

/**
 * Get a human-readable location requirement message based on role
 * @param role - User role
 * @returns Description of location requirements
 */
export function getLocationRequirementMessage(role: "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"): string {
	if (role === "ENP") {
		return "As a notary (ENP), you must be physically located within the Philippines to conduct notarization sessions."
	}
	return "You must be located within the Philippines or at a Philippine embassy, consulate, or honorary consul office to join this meeting."
}
