import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	verifyLocationForRole,
	type LocationVerificationResult,
} from "@/features/meetings/lib/location-verification"

import { env } from "@/env"

/**
 * Response from ip-api.com
 */
interface IpApiResponse {
	status: "success" | "fail"
	message?: string
	country?: string
	countryCode?: string
	region?: string
	city?: string
	lat?: number
	lon?: number
	timezone?: string
	isp?: string
	org?: string
	as?: string
	proxy?: boolean
	hosting?: boolean
}

/**
 * Response from Google Maps Geocoding API
 */
interface GeocodingResponse {
	status: string
	results: Array<{
		address_components: Array<{
			long_name: string
			short_name: string
			types: string[]
		}>
		formatted_address: string
		geometry: {
			location: {
				lat: number
				lng: number
			}
		}
	}>
	error_message?: string
}

/**
 * Parsed address components
 */
export interface ParsedAddress {
	homeStreet: string | null
	barangay: string | null
	cityProvince: string | null
	fullAddress: string | null
}

/**
 * Extract client IP from headers
 * Handles various proxy headers commonly used
 */
function getClientIp(headers: Headers): string | null {
	// Check common proxy headers
	const forwardedFor = headers.get("x-forwarded-for")
	if (forwardedFor) {
		// x-forwarded-for can contain multiple IPs, take the first one
		const ips = forwardedFor.split(",").map(ip => ip.trim())
		return ips[0] ?? null
	}

	// Check other common headers
	const realIp = headers.get("x-real-ip")
	if (realIp) {
		return realIp
	}

	const cfConnectingIp = headers.get("cf-connecting-ip")
	if (cfConnectingIp) {
		return cfConnectingIp
	}

	return null
}

/**
 * Check if an IP is a VPN/proxy using ip-api.com
 */
async function checkVpnStatus(
	ip: string
): Promise<{ isVpn: boolean; ipData: IpApiResponse | null }> {
	try {
		// Use the free ip-api.com service
		// Fields: proxy (boolean), hosting (boolean for datacenter IPs)
		const response = await fetch(
			`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,org,as,proxy,hosting`,
			{
				headers: {
					Accept: "application/json",
				},
			}
		)

		if (!response.ok) {
			console.error(`[VPN Check] ip-api.com returned status ${response.status}`)
			return { isVpn: false, ipData: null }
		}

		const data = (await response.json()) as IpApiResponse

		if (data.status === "fail") {
			console.error(`[VPN Check] ip-api.com error: ${data.message}`)
			return { isVpn: false, ipData: null }
		}

		// Check if proxy or hosting (datacenter) is detected
		const isVpn = data.proxy === true || data.hosting === true

		return { isVpn, ipData: data }
	} catch (error) {
		console.error("[VPN Check] Error checking VPN status:", error)
		return { isVpn: false, ipData: null }
	}
}

/**
 * Parse address components from Google Maps Geocoding API response
 * Extracts street, barangay, city, and province
 */
function parseAddressComponents(result: GeocodingResponse["results"][0]): ParsedAddress {
	if (!result) {
		return {
			homeStreet: null,
			barangay: null,
			cityProvince: null,
			fullAddress: null,
		}
	}

	const components = result.address_components
	let streetNumber = ""
	let route = ""
	let barangay = ""
	let city = ""
	let province = ""

	// Extract relevant address components
	for (const component of components) {
		const types = component.types

		if (types.includes("street_number")) {
			streetNumber = component.long_name
		} else if (types.includes("route")) {
			route = component.long_name
		} else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
			// In Philippines, this is often the barangay
			barangay = component.long_name
		} else if (types.includes("locality") || types.includes("administrative_area_level_2")) {
			// City or Municipality
			city = component.long_name
		} else if (types.includes("administrative_area_level_1")) {
			// Province
			province = component.long_name
		} else if (types.includes("neighborhood") && !barangay) {
			// Fallback for barangay
			barangay = component.long_name
		}
	}

	// Construct street address
	const homeStreet = [streetNumber, route].filter(Boolean).join(" ").trim() || null

	// Construct city and province
	const cityProvince = [city, province].filter(Boolean).join(", ").trim() || null

	return {
		homeStreet,
		barangay: barangay || null,
		cityProvince,
		fullAddress: result.formatted_address,
	}
}

/**
 * Get country code and formatted address from coordinates using Google Maps Geocoding API
 */
async function getCountryFromCoordinates(
	lat: number,
	lng: number
): Promise<{
	countryCode: string | null
	countryName: string | null
	formattedAddress: string | null
	parsedAddress: ParsedAddress | null
}> {
	try {
		// Don't filter by result_type to get full address data
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${env.GOOGLE_MAPS_API_KEY}`
		)

		if (!response.ok) {
			console.error(`[Geocoding] Google Maps API returned status ${response.status}`)
			return { countryCode: null, countryName: null, formattedAddress: null, parsedAddress: null }
		}

		const data = (await response.json()) as GeocodingResponse

		if (data.status !== "OK" || !data.results || data.results.length === 0) {
			console.error(`[Geocoding] Google Maps API error: ${data.status} - ${data.error_message}`)
			return { countryCode: null, countryName: null, formattedAddress: null, parsedAddress: null }
		}

		// Get the first result for the most detailed address
		const result = data.results[0]
		if (!result) {
			return { countryCode: null, countryName: null, formattedAddress: null, parsedAddress: null }
		}

		// Extract formatted address
		const formattedAddress = result.formatted_address ?? null

		// Parse address into components
		const parsedAddress = parseAddressComponents(result)

		// Find the country component from any result
		let countryComponent = result.address_components.find(component =>
			component.types.includes("country")
		)

		// If not found in first result, search in other results
		if (!countryComponent) {
			for (const res of data.results) {
				countryComponent = res.address_components.find(component =>
					component.types.includes("country")
				)
				if (countryComponent) break
			}
		}

		return {
			countryCode: countryComponent?.short_name ?? null,
			countryName: countryComponent?.long_name ?? null,
			formattedAddress,
			parsedAddress,
		}
	} catch (error) {
		console.error("[Geocoding] Error getting country from coordinates:", error)
		return { countryCode: null, countryName: null, formattedAddress: null, parsedAddress: null }
	}
}

export const locationVerificationRouter = createTRPCRouter({
	/**
	 * Verify user's location and check for VPN usage
	 *
	 * This procedure:
	 * 1. Gets the user's IP address from request headers
	 * 2. Checks if the IP is using a VPN/proxy via ip-api.com
	 * 3. Uses Google Maps Geocoding to determine the country from coordinates
	 * 4. Verifies location based on user role (ENP must be in PH, PRINCIPAL can be at embassy)
	 */
	verifyLocation: protectedProcedure
		.input(
			z.object({
				latitude: z.number().min(-90).max(90),
				longitude: z.number().min(-180).max(180),
				meetingId: z.string().min(1),
			})
		)
		.mutation(
			async ({
				input,
				ctx,
			}): Promise<
				LocationVerificationResult & {
					vpnDetails?: IpApiResponse | null
					parsedAddress?: ParsedAddress | null
				}
			> => {
				const { latitude, longitude } = input
				const userRole = ctx.session.user.role

				// Step 1: Get client IP
				const clientIp = getClientIp(ctx.headers)

				if (!clientIp) {
					console.warn("[Location Verification] Could not determine client IP")
					// Continue without VPN check if IP cannot be determined
				}

				// Step 2: Check for VPN/proxy usage
				if (clientIp) {
					const { isVpn, ipData } = await checkVpnStatus(clientIp)

					if (isVpn) {
						console.log(`[Location Verification] VPN detected for IP: ${clientIp}`)
						return {
							allowed: false,
							reason: "vpn_detected",
							vpnDetails: ipData,
						}
					}
				}

				// Step 3: Get country and address from coordinates using Google Maps Geocoding
				const { countryCode, formattedAddress, parsedAddress } = await getCountryFromCoordinates(
					latitude,
					longitude
				)

				if (!countryCode) {
					console.warn("[Location Verification] Could not determine country from coordinates")
					return {
						allowed: false,
						reason: "location_unknown",
						details: {
							isInPhilippines: false,
							formattedAddress: formattedAddress ?? undefined,
						},
					}
				}

				// Check if user is in Philippines
				const isInPhilippines = countryCode === "PH"

				// Step 4: Verify location based on user role
				const verificationResult = verifyLocationForRole(
					userRole,
					latitude,
					longitude,
					isInPhilippines
				)

				// Add country code and formatted address to details
				if (verificationResult.details) {
					verificationResult.details.countryCode = countryCode
					verificationResult.details.formattedAddress = formattedAddress ?? undefined
				} else {
					verificationResult.details = {
						countryCode,
						formattedAddress: formattedAddress ?? undefined,
					}
				}

				return {
					...verificationResult,
					parsedAddress,
				}
			}
		),

	/**
	 * Quick VPN check without full location verification
	 * Useful for initial check before requesting geolocation
	 */
	checkVpn: protectedProcedure.query(async ({ ctx }) => {
		const clientIp = getClientIp(ctx.headers)

		if (!clientIp) {
			return {
				checked: false,
				isVpn: false,
				message: "Could not determine client IP",
			}
		}

		const { isVpn, ipData } = await checkVpnStatus(clientIp)

		return {
			checked: true,
			isVpn,
			ipInfo: isVpn
				? {
						isp: ipData?.isp,
						org: ipData?.org,
						country: ipData?.country,
					}
				: null,
		}
	}),

	/**
	 * Save user's location to their profile
	 * Updates the separated address fields in the user table
	 */
	saveUserLocation: protectedProcedure
		.input(
			z.object({
				homeStreet: z.string().nullable(),
				barangay: z.string().nullable(),
				cityProvince: z.string().nullable(),
				fullAddress: z.string().nullable(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id

			// Update user's address fields
			await db
				.update(users)
				.set({
					homeStreet: input.homeStreet,
					barangay: input.barangay,
					cityProvince: input.cityProvince,
					// Also update the legacy address field with full address for backward compatibility
					address: input.fullAddress,
				})
				.where(eq(users.id, userId))

			return {
				success: true,
				message: "Location saved successfully",
			}
		}),
})
