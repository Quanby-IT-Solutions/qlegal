import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	verifyLocationForRole,
	type LocationVerificationResult,
} from "@/features/sessions/lib/location-verification"

import { env } from "@/env"

/**
 * Response from proxycheck.io
 */
interface ProxyCheckIpData {
	status?: "ok" | "error"
	proxy?: "yes" | "no"
	type?: string
	country?: string
	asn?: string
	provider?: string
	organisation?: string
	[extra: string]: unknown
}

interface ProxyCheckResponse {
	status?: string
	message?: string
	[ip: string]: ProxyCheckIpData | string | undefined
}

interface IpApiResponse {
	status?: "success" | "fail"
	message?: string
	country?: string
	countryCode?: string
	region?: string
	city?: string
	lat?: number
	lon?: number
	timezone?: string
	proxy?: boolean
	hosting?: boolean
	isp?: string
	org?: string
	as?: string
}

type IpApiTransportMode = "secure_https" | "insecure_http"

interface IpApiCheckResult {
	checked: boolean
	isProxy: boolean
	countryCode: string | null
	isp: string | null
	org: string | null
	transportMode: IpApiTransportMode
	authoritative: boolean
	message?: string
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
	const cfConnectingIp = headers.get("cf-connecting-ip")
	if (cfConnectingIp) {
		return cfConnectingIp
	}

	const realIp = headers.get("x-real-ip")
	if (realIp) {
		return realIp
	}

	const forwardedFor = headers.get("x-forwarded-for")
	if (forwardedFor) {
		const ips = forwardedFor
			.split(",")
			.map(ip => ip.trim())
			.filter(Boolean)
		// Use the first IP in the chain (original client IP)
		// The x-forwarded-for header format is: client, proxy1, proxy2, ...
		// The first IP is the real client; the last is typically our infrastructure
		return ips[0] ?? null
	}

	return null
}

/**
 * Check if an IP is a VPN/proxy using proxycheck.io
 */
async function checkVpnStatus(
	ip: string
): Promise<{
	checked: boolean
	isVpn: boolean
	ipData: ProxyCheckIpData | null
	message?: string
}> {
	if (!env.PROXYCHECK_API_KEY) {
		// Warn in production if VPN check is disabled
		if (env.NODE_ENV === "production") {
			console.warn(
				"[VPN Check] PROXYCHECK_API_KEY is not configured. VPN detection is disabled. " +
					"Set PROXYCHECK_API_KEY in your environment variables to enable VPN blocking."
			)
		}
		return {
			checked: false,
			isVpn: false,
			ipData: null,
			message: "PROXYCHECK_API_KEY is not configured",
		}
	}

	try {
		const response = await fetch(
			`https://proxycheck.io/v2/${ip}?key=${env.PROXYCHECK_API_KEY}&vpn=1`,
			{
				headers: {
					Accept: "application/json",
				},
			}
		)

		if (!response.ok) {
			console.error(`[VPN Check] proxycheck.io returned status ${response.status}`)
			return { checked: false, isVpn: false, ipData: null, message: "VPN check request failed" }
		}

		const data = (await response.json()) as ProxyCheckResponse
		const ipPayload = data[ip]

		if (!ipPayload || typeof ipPayload === "string") {
			console.error("[VPN Check] proxycheck.io response missing IP payload")
			return { checked: false, isVpn: false, ipData: null, message: "Invalid VPN check response" }
		}

		if (ipPayload.status === "error") {
			console.error(`[VPN Check] proxycheck.io error: ${data.message ?? "Unknown error"}`)
			return {
				checked: false,
				isVpn: false,
				ipData: null,
				message: data.message ?? "VPN check provider error",
			}
		}

		const isVpn = ipPayload.proxy === "yes"

		return { checked: true, isVpn, ipData: ipPayload }
	} catch (error) {
		console.error("[VPN Check] Error checking VPN status:", error)
		return { checked: false, isVpn: false, ipData: null, message: "VPN check error" }
	}
}

async function checkIpApi(ip: string): Promise<IpApiCheckResult> {
	const baseUrl = "http://ip-api.com/json"
	const transportMode: IpApiTransportMode = "insecure_http"
	const authoritative = false

	if (!authoritative) {
		console.warn(
			"[IP-API Check] Using insecure HTTP transport. ip-api proxy detections are advisory only and will not hard-block without proxycheck confirmation."
		)
	}

	try {
		const response = await fetch(
			`${baseUrl}/${ip}?fields=status,message,country,countryCode,region,city,lat,lon,timezone,isp,org,as,proxy,hosting`
		)

		if (!response.ok) {
			console.error(`[IP-API Check] ip-api.com returned status ${response.status}`)
			return {
				checked: false,
				isProxy: false,
				countryCode: null,
				isp: null,
				org: null,
				transportMode,
				authoritative,
				message: "ip-api request failed",
			}
		}

		const data = (await response.json()) as IpApiResponse
		if (data.status !== "success") {
			return {
				checked: false,
				isProxy: false,
				countryCode: null,
				isp: null,
				org: null,
				transportMode,
				authoritative,
				message: data.message ?? "ip-api returned non-success status",
			}
		}

		const isProxy = data.proxy === true || data.hosting === true

		return {
			checked: true,
			isProxy,
			countryCode: data.countryCode ?? null,
			isp: data.isp ?? null,
			org: data.org ?? null,
			transportMode,
			authoritative,
		}
	} catch (error) {
		console.error("[IP-API Check] Error checking IP reputation:", error)
		return {
			checked: false,
			isProxy: false,
			countryCode: null,
			isp: null,
			org: null,
			transportMode,
			authoritative,
			message: "ip-api check error",
		}
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
	 * 2a. Checks IP via ip-api.com (free, no key required) — blocks immediately if proxy/hosting detected
	 * 2b. If ip-api.com passes, checks via proxycheck.io (pro layer, requires PROXYCHECK_API_KEY)
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
					vpnDetails?: ProxyCheckIpData | null
					ipApiDetails?: {
						checked: boolean
						isProxy: boolean
						countryCode: string | null
						isp: string | null
						org: string | null
						transportMode?: IpApiTransportMode
						authoritative?: boolean
						message?: string
					} | null
					parsedAddress?: ParsedAddress | null
					clientIp?: string
				}
			> => {
				const { latitude, longitude } = input
				const userRole = ctx.session.user.role
				let ipData: ProxyCheckIpData | null = null
				let ipApiData: IpApiCheckResult | null = null

				// Step 1: Get client IP
				const clientIp = getClientIp(ctx.headers)

				if (!clientIp) {
					console.warn("[Location Verification] Could not determine client IP")
					// Continue without VPN check if IP cannot be determined
				}

				// Step 2: Check for VPN/proxy usage
				if (clientIp) {
					const ipApiCheckResult = await checkIpApi(clientIp)
					ipApiData = ipApiCheckResult

					if (ipApiCheckResult.isProxy) {
						if (ipApiCheckResult.authoritative) {
							console.log(
								`[Location Verification] Proxy/hosting detected by ip-api (secure transport) for IP: ${clientIp}`
							)
							return {
								allowed: false,
								reason: "vpn_detected",
								ipApiDetails: ipApiCheckResult,
								clientIp: clientIp ?? undefined,
							}
						}

						console.warn(
							`[Location Verification] ip-api reported proxy/hosting over ${ipApiCheckResult.transportMode}; treating as advisory until proxycheck confirms`
						)
					}

					const vpnCheckResult = await checkVpnStatus(clientIp)
					ipData = vpnCheckResult.ipData

					if (vpnCheckResult.isVpn) {
						console.log(`[Location Verification] VPN detected for IP: ${clientIp}`)
						return {
							allowed: false,
							reason: "vpn_detected",
							vpnDetails: ipData,
							ipApiDetails: ipApiData,
							clientIp: clientIp ?? undefined,
						}
					}

					if (!ipApiCheckResult.checked && !vpnCheckResult.checked) {
						console.warn(
							"[Location Verification] VPN checks unavailable (ip-api + proxycheck), proceeding with location-only verification"
						)
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
						clientIp: clientIp ?? undefined,
					}
				}

				const ipCountryCode = (
					ipData?.country ??
					(ipApiData?.authoritative ? ipApiData.countryCode : null) ??
					null
				)?.toUpperCase() ?? null

				if (ipCountryCode && countryCode && ipCountryCode !== countryCode.toUpperCase()) {
					return {
						allowed: false,
						reason: "vpn_detected",
						vpnDetails: ipData,
						ipApiDetails: ipApiData,
						clientIp: clientIp ?? undefined,
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
					ipApiDetails: ipApiData,
					parsedAddress,
					clientIp: clientIp ?? undefined,
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

		const ipApiCheckResult = await checkIpApi(clientIp)

		if (ipApiCheckResult.isProxy && ipApiCheckResult.authoritative) {
			return {
				checked: true,
				isVpn: true,
				ipInfo: {
					isp: ipApiCheckResult.isp ?? undefined,
					org: ipApiCheckResult.org ?? undefined,
					country: ipApiCheckResult.countryCode ?? undefined,
				},
			}
		}

		if (ipApiCheckResult.isProxy && !ipApiCheckResult.authoritative) {
			console.warn(
				`[Quick VPN Check] ip-api proxy signal is advisory only (${ipApiCheckResult.transportMode}); waiting for proxycheck confirmation`
			)
		}

		const vpnCheckResult = await checkVpnStatus(clientIp)

		if (!vpnCheckResult.checked && !ipApiCheckResult.checked) {
			return {
				checked: false,
				isVpn: false,
				message: vpnCheckResult.message ?? "VPN checks unavailable",
			}
		}

		if (!vpnCheckResult.checked && ipApiCheckResult.isProxy && !ipApiCheckResult.authoritative) {
			return {
				checked: false,
				isVpn: false,
				message:
					"ip-api returned advisory proxy signal over insecure transport; proxycheck confirmation unavailable",
			}
		}

		const isVpn = vpnCheckResult.isVpn || (ipApiCheckResult.isProxy && ipApiCheckResult.authoritative)

		return {
			checked: true,
			isVpn,
			ipInfo: isVpn
				? {
						isp: vpnCheckResult.ipData?.provider ?? ipApiCheckResult.isp ?? undefined,
						org: vpnCheckResult.ipData?.organisation ?? ipApiCheckResult.org ?? undefined,
						country: vpnCheckResult.ipData?.country ?? ipApiCheckResult.countryCode ?? undefined,
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
