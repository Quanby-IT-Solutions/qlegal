"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { getFullName } from "@/core/lib/utils"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"
import {
	createOnboardLink,
	extractIdentifierFromStartKycUrl,
	getTransactionStatus,
	interpretStatus,
	type OnboardLinkConfig,
} from "@/services/hyperverge"
import { getHyperVergeAuthToken } from "@/services/hyperverge/auth-token"
import { matchFaceSelfieToId, readIdCard } from "@/services/hyperverge/kyc-direct"
import {
	fetchImageUrlAsDataUrl,
	getHyperVergeKycLogs,
	pickBestFaceImageUrlFromLogs,
	pickOcrFieldsFromLogs,
} from "@/services/hyperverge/kyc-logs"
import { checkLiveness } from "@/services/hyperverge/liveness"
import { auth } from "@/services/next-auth"

import { saveIdCardDetails } from "@/features/kyc/lib/save-id-card-details"

import { env } from "@/env"

/**
 * Generate a unique transaction ID for KYC based on user ID
 */
function generateTransactionId(userId: string): string {
	const timestamp = Date.now().toString(36)
	const random = Math.random().toString(36).substring(2, 8)
	return `kyc_${userId}_${timestamp}_${random}`.toUpperCase()
}

function hasNameValue(value: string | null | undefined) {
	return Boolean(value && value.trim() !== "")
}

function coalesceNameValue(
	currentValue: string | null | undefined,
	candidateValue: string | null | undefined
) {
	if (hasNameValue(currentValue)) return currentValue
	if (hasNameValue(candidateValue)) return candidateValue?.trim()
	return currentValue ?? null
}

function extractAdditionalFieldString(
	additionalFields: unknown,
	keys: readonly string[]
): string | undefined {
	if (
		!additionalFields ||
		typeof additionalFields !== "object" ||
		Array.isArray(additionalFields)
	) {
		return undefined
	}

	const record = additionalFields as Record<string, unknown>
	for (const key of keys) {
		const value = record[key]
		if (typeof value === "string" && value.trim() !== "") {
			return value.trim()
		}
	}

	return undefined
}

interface ParsedNameFields {
	firstName?: string
	middleName?: string
	lastName?: string
}

function normalizeNameValue(value: string | null | undefined): string | undefined {
	if (!value) return undefined
	const normalized = value.replace(/\s+/g, " ").trim()
	return normalized || undefined
}

/** Capitalize first letter of each word only (title case) for DB display. */
function toTitleCaseWords(value: string | null | undefined): string | undefined {
	const trimmed = normalizeNameValue(value)
	if (!trimmed) return undefined
	return trimmed
		.split(/\s+/)
		.map(w => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
		.join(" ")
}

function parseNameFromFullName(fullName: string): ParsedNameFields {
	const normalizedFullName = normalizeNameValue(fullName)
	if (!normalizedFullName) return {}

	// Format: "LASTNAME, FIRSTNAME ... MIDDLENAME" (middleName = last word after comma)
	if (normalizedFullName.includes(",")) {
		const [rawLastName, ...rest] = normalizedFullName.split(",")
		const lastName = normalizeNameValue(rawLastName)
		const trailing = normalizeNameValue(rest.join(" "))
		const trailingParts = trailing?.split(/\s+/).filter(Boolean) ?? []

		if (trailingParts.length === 0) return lastName ? { lastName } : {}

		const middleName = trailingParts[trailingParts.length - 1]
		const firstName = trailingParts.length > 1 ? trailingParts.slice(0, -1).join(" ") : undefined
		return {
			firstName: firstName ?? trailingParts[0],
			middleName: trailingParts.length > 1 ? middleName : undefined,
			lastName,
		}
	}

	const parts = normalizedFullName.split(" ").filter(Boolean)
	if (parts.length === 1) return { firstName: parts[0] }
	if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] }

	return {
		firstName: parts[0],
		middleName: parts.slice(1, -1).join(" "),
		lastName: parts[parts.length - 1],
	}
}

function resolveNameFieldsFromIdCardDetails(details: {
	firstName?: string | null
	middleName?: string | null
	lastName?: string | null
	fullName?: string | null
}): ParsedNameFields {
	const fromFullName = details.fullName ? parseNameFromFullName(details.fullName) : {}

	return {
		firstName: normalizeNameValue(details.firstName) ?? fromFullName.firstName,
		middleName: normalizeNameValue(details.middleName) ?? fromFullName.middleName,
		lastName: normalizeNameValue(details.lastName) ?? fromFullName.lastName,
	}
}

function joinDefined(parts: Array<string | null | undefined>, separator: string) {
	return parts
		.map(part => (typeof part === "string" ? part.trim() : ""))
		.filter(Boolean)
		.join(separator)
}

type AddressDetails = {
	addressLine1?: string | null
	addressLine2?: string | null
	city?: string | null
	province?: string | null
	postalCode?: string | null
	country?: string | null
	additionalFields?: unknown
}

function formatAddressLine(details: AddressDetails): string | null {
	const line1 = normalizeNameValue(details.addressLine1)
	const line2 = normalizeNameValue(details.addressLine2)
	const city = normalizeNameValue(details.city)
	const province = normalizeNameValue(details.province)
	const postalCode = normalizeNameValue(details.postalCode)
	const country = normalizeNameValue(details.country)

	const cityProvince = joinDefined([city, province], ", ")
	const cityProvincePostal = joinDefined([cityProvince, postalCode], " ")
	const main = joinDefined([line1, line2], ", ")

	const full = joinDefined([main, cityProvincePostal, country], ", ")
	return full ? full : null
}

function formatStreetLine(details: AddressDetails): string | null {
	const line1 = normalizeNameValue(details.addressLine1)
	const line2 = normalizeNameValue(details.addressLine2)
	const street = joinDefined([line1, line2], ", ")
	return street ? street : null
}

function extractBarangayFromAdditionalFields(additionalFields: unknown): string | null {
	if (
		!additionalFields ||
		typeof additionalFields !== "object" ||
		Array.isArray(additionalFields)
	) {
		return null
	}

	const record = additionalFields as Record<string, unknown>
	const candidates = ["barangay", "brgy", "brgyName", "brgy_name"]

	for (const key of candidates) {
		const value = record[key]
		if (typeof value === "string" && value.trim()) {
			return value.trim()
		}
	}

	return null
}

function formatCityProvince(details: AddressDetails): string | null {
	const city = normalizeNameValue(details.city)
	const province = normalizeNameValue(details.province)
	const cityProvince = joinDefined([city, province], ", ")
	return cityProvince ? cityProvince : null
}

async function syncUserKycStatusFromLatestSession(userId: string): Promise<{
	kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" | null
	kycVerifiedAt: Date | null
	kycLastExpiredAt: Date | null
	latestSession: typeof kycSessions.$inferSelect | null
}> {
	const latestSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, userId),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})
	const latestVerifiedSession = await db.query.kycSessions.findFirst({
		where: and(eq(kycSessions.userId, userId), eq(kycSessions.status, "VERIFIED")),
		orderBy: (table, { desc }) => [
			desc(table.verifiedAt),
			desc(table.updatedAt),
			desc(table.createdAt),
		],
	})

	const dbUser = await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: {
			kycStatus: true,
			kycVerifiedAt: true,
			kycLastExpiredAt: true,
		},
	})

	if (!dbUser) {
		return {
			kycStatus: null,
			kycVerifiedAt: null,
			kycLastExpiredAt: null,
			latestSession: latestSession ?? null,
		}
	}

	const latestVerifiedAt =
		latestVerifiedSession?.verifiedAt ??
		latestVerifiedSession?.updatedAt ??
		latestVerifiedSession?.createdAt ??
		null
	const validityMs = env.KYC_VERIFICATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000
	const hasValidVerifiedSession =
		latestVerifiedSession && latestVerifiedAt
			? Date.now() - latestVerifiedAt.getTime() < validityMs
			: false

	const sourceSession = hasValidVerifiedSession ? latestVerifiedSession : latestSession

	if (!sourceSession || sourceSession.status === "NOT_STARTED") {
		return {
			kycStatus: "NOT_STARTED",
			kycVerifiedAt: dbUser.kycVerifiedAt,
			kycLastExpiredAt: dbUser.kycLastExpiredAt,
			latestSession: sourceSession ?? null,
		}
	}

	const nextStatus = sourceSession.status
	const nextVerifiedAt =
		nextStatus === "VERIFIED"
			? (sourceSession.verifiedAt ?? sourceSession.updatedAt ?? sourceSession.createdAt)
			: null

	const nextLastExpiredAt = nextStatus === "VERIFIED" ? null : dbUser.kycLastExpiredAt

	const needsUpdate =
		dbUser.kycStatus !== nextStatus ||
		(dbUser.kycVerifiedAt?.getTime() ?? null) !== (nextVerifiedAt?.getTime() ?? null) ||
		(nextStatus === "VERIFIED" && dbUser.kycLastExpiredAt !== null)

	if (needsUpdate) {
		await db
			.update(users)
			.set({
				kycStatus: nextStatus,
				kycVerifiedAt: nextVerifiedAt,
				kycLastExpiredAt: nextStatus === "VERIFIED" ? null : dbUser.kycLastExpiredAt,
			})
			.where(eq(users.id, userId))
	}

	return {
		kycStatus: nextStatus,
		kycVerifiedAt: nextVerifiedAt,
		kycLastExpiredAt: nextLastExpiredAt,
		latestSession: sourceSession,
	}
}

/**
 * Create a new KYC onboard link for the authenticated user
 * Prevents creating multiple pending transactions by checking for existing valid (non-expired) pending transactions
 */
export async function createUserKycLink() {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const sessionBackedStatus = await syncUserKycStatusFromLatestSession(session.user.id)

	// Check for existing pending KYC session
	const existingSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})

	// If there's a pending session, check if it's expired (24 hours)
	// Only when the KYC session source of truth is still PENDING.
	if (
		sessionBackedStatus.kycStatus === "PENDING" &&
		existingSession?.status === "PENDING" &&
		existingSession.hostedLink
	) {
		const linkAge = Date.now() - new Date(existingSession.hostedLinkCreatedAt!).getTime()
		const expirationTime = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
		const isExpired = linkAge > expirationTime

		if (!isExpired) {
			// Link is still valid, prevent creating a new one
			return {
				success: false,
				error:
					"You already have a pending KYC verification. Please resume your existing verification or wait for it to complete.",
				isExpired: false,
			}
		}

		// Link is expired, allow creating a new one
		console.log("⚠️ Existing KYC link has expired, creating new link")
	}

	const transactionId = generateTransactionId(session.user.id)

	// Build redirect URL - use callback page that closes the window
	const baseUrl = env.AUTH_URL ?? "http://localhost:3000"
	const redirectUrl = `${baseUrl}/onboarding/callback`

	console.log("🔗 Creating KYC link with redirect:", redirectUrl)

	const config: OnboardLinkConfig = {
		transactionId,
		redirectUrl,
		inputs: {
			email: session.user.email,
			name: session.user.name || "",
			userId: session.user.id,
			createdAt: new Date().toISOString(),
			source: "qsign-kyc-verification",
		},
	}

	try {
		const result = await createOnboardLink(config)

		// Use the transaction ID returned by HyperVerge if available, otherwise use ours
		const actualTransactionId = result.result.transactionId ?? transactionId

		console.log("📝 Transaction IDs:", {
			generated: transactionId,
			returned: result.result.transactionId,
			using: actualTransactionId,
		})

		const now = new Date()
		const wasExpired =
			existingSession?.status === "PENDING" && existingSession.hostedLinkCreatedAt
				? Date.now() - new Date(existingSession.hostedLinkCreatedAt).getTime() > 24 * 60 * 60 * 1000
				: false

		// Create a new KYC session record
		await db.insert(kycSessions).values({
			userId: session.user.id,
			transactionId: actualTransactionId,
			sessionType: "hosted",
			hostedLink: result.result.startKycUrl,
			hostedLinkCreatedAt: now,
			hostedLinkExpiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
			status: "PENDING",
		})

		// Update user KYC status
		await db
			.update(users)
			.set({
				kycStatus: "PENDING",
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/onboarding")

		return {
			success: true,
			data: {
				transactionId: actualTransactionId,
				url: result.result.startKycUrl,
				isExpiredLink: wasExpired, // Indicate if this was created for an expired link
			},
		}
	} catch (error) {
		console.error("Failed to create KYC link:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to create KYC link",
		}
	}
}

/**
 * Create or reuse a KYC session for the HyperVerge Web SDK.
 * Returns authToken and transactionId so the client can launch HyperKYCModule.launch().
 */
export async function getKycWebSdkSession() {
	const session = await auth()

	if (!session?.user?.id) {
		return { success: false as const, error: "User not authenticated" }
	}

	const sessionBackedStatus = await syncUserKycStatusFromLatestSession(session.user.id)

	const existingSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})

	let transactionId: string

	// Reuse a pending Web SDK transaction only while the KYC session source of truth is PENDING.
	if (
		sessionBackedStatus.kycStatus === "PENDING" &&
		existingSession?.status === "PENDING" &&
		existingSession.sessionType === "web_sdk"
	) {
		transactionId = existingSession.transactionId
	} else {
		transactionId = generateTransactionId(session.user.id)
		await db.insert(kycSessions).values({
			userId: session.user.id,
			transactionId,
			sessionType: "web_sdk",
			status: "PENDING",
		})
		await db.update(users).set({ kycStatus: "PENDING" }).where(eq(users.id, session.user.id))
	}

	try {
		const authToken = await getHyperVergeAuthToken({ transactionId })
		revalidatePath("/onboarding")
		return {
			success: true as const,
			data: { authToken, transactionId },
		}
	} catch (error) {
		console.error("Failed to get KYC Web SDK session:", error)
		return {
			success: false as const,
			error: error instanceof Error ? error.message : "Failed to get verification session",
		}
	}
}

/**
 * Direct API KYC (no workflow / no QR).
 *
 * Runs:
 * 1) ID Card Validation API (readId) -> summary.action
 * 2) Selfie Validation API (checkLiveness) -> decision + summary.action
 * 3) Face Match API (matchFace) selfie vs id -> match.value + summary.action
 *
 * Updates users.kycStatus based on the combined outcome.
 *
 * Note: This is server-to-server to avoid exposing appKey in the browser.
 */
export async function runDirectKycVerification(input: {
	countryId: string
	documentId: string
	idImageBase64: string
	selfieImageBase64: string
}) {
	const session = await auth()

	if (!session?.user?.id || !session?.user?.email) {
		return { success: false, error: "User not authenticated" }
	}

	// Basic payload validation
	if (!input.countryId || !input.documentId) {
		return { success: false, error: "countryId and documentId are required" }
	}
	if (!input.idImageBase64 || input.idImageBase64.length < 100) {
		return { success: false, error: "Invalid ID image" }
	}
	if (!input.selfieImageBase64 || input.selfieImageBase64.length < 100) {
		return { success: false, error: "Invalid selfie image" }
	}

	const existingUser = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			commissionStatus: true,
			role: true,
			firstName: true,
			middleName: true,
			lastName: true,
			prefix: true,
			suffix: true,
			address: true,
			homeStreet: true,
			barangay: true,
			cityProvince: true,
		},
	})

	if (!existingUser) {
		return { success: false, error: "User not found" }
	}

	const transactionId = generateTransactionId(session.user.id)

	// Create a KYC session record immediately (so we can track transactionId even if a later step fails)
	await db.insert(kycSessions).values({
		userId: session.user.id,
		transactionId,
		sessionType: "direct",
		status: "PENDING",
	})

	// Mark user as pending
	await db
		.update(users)
		.set({
			kycStatus: "PENDING",
		})
		.where(eq(users.id, session.user.id))

	try {
		const isRecord = (v: unknown): v is Record<string, unknown> =>
			typeof v === "object" && v !== null && !Array.isArray(v)

		const pickOcrFieldsFromReadId = (raw: unknown): Record<string, unknown> | null => {
			const maxDepth = 8
			const maxNodes = 1500
			let visited = 0

			const walk = (node: unknown, depth: number): Record<string, unknown> | null => {
				if (visited++ > maxNodes) return null
				if (depth > maxDepth) return null

				if (isRecord(node)) {
					for (const [k, v] of Object.entries(node)) {
						const key = k.toLowerCase()
						if (
							key === "fieldsextracted" ||
							key === "fields_extracted" ||
							key === "extractedfields" ||
							key === "ocrfields" ||
							key === "extracted"
						) {
							if (isRecord(v)) return v
						}
						const found = walk(v, depth + 1)
						if (found) return found
					}
				} else if (Array.isArray(node)) {
					for (const item of node) {
						const found = walk(item, depth + 1)
						if (found) return found
					}
				}

				return null
			}

			return walk(raw, 0)
		}

		// 1) ID OCR/validation
		const idResult = await readIdCard({
			transactionId,
			imageBase64: input.idImageBase64,
			countryId: input.countryId,
			documentId: input.documentId,
			expectedDocumentSide: "front",
		})

		// 2) Liveness
		const livenessResult = await checkLiveness({
			image: input.selfieImageBase64,
			transactionId,
			// Enable common quality checks (optional)
			showCaptureInstructions: false,
		})

		// 3) Face match (selfie vs full ID image)
		const faceMatchResult = await matchFaceSelfieToId({
			transactionId,
			selfieBase64: input.selfieImageBase64,
			idBase64: input.idImageBase64,
			returnScore: true,
		})

		const idPass = idResult.summaryAction === "pass"
		const livenessPass = livenessResult.decision?.isApproved === true
		const faceMatchPass =
			faceMatchResult.matchValue === "yes" && faceMatchResult.summaryAction === "pass"

		// Conservative decisioning:
		// - manualReview from readId/faceMatch -> treat as pending (needs review)
		// - all pass -> verified
		// - any hard fail -> rejected
		let kycStatus: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING"
		let message = "KYC verification submitted."

		const hasManualReview =
			idResult.summaryAction === "manualReview" || faceMatchResult.summaryAction === "manualReview"

		if (idPass && livenessPass && faceMatchPass) {
			kycStatus = "VERIFIED"
			message = "KYC verified successfully."
		} else if (hasManualReview) {
			kycStatus = "PENDING"
			message = "KYC requires manual review."
		} else {
			kycStatus = "REJECTED"
			message = "KYC verification failed."
		}

		// Persist OCR fields from Direct API readId (direct equivalent of Logs API module output).
		// Keep it lightweight by storing only the extracted fields object when we can locate it.
		const ocrFields = pickOcrFieldsFromReadId(idResult.raw)
		const shouldStoreOcr = kycStatus !== "REJECTED" && !!ocrFields

		// Save to id_card_details table for structured access
		let idCardDetailId: string | undefined
		if (shouldStoreOcr && ocrFields) {
			const idCardDetail = await saveIdCardDetails(db, {
				userId: session.user.id,
				rawOcrData: ocrFields,
				ocrTransactionId: transactionId,
				ocrProvider: "hyperverge",
				frontImageUrl: kycStatus === "VERIFIED" ? input.idImageBase64 : undefined,
				faceImageUrl: kycStatus === "VERIFIED" ? input.selfieImageBase64 : undefined,
				isVerified: kycStatus === "VERIFIED",
				verifiedAt: kycStatus === "VERIFIED" ? new Date() : undefined,
				verificationMethod: "kyc_desktop_camera",
				countryId: input.countryId,
				documentId: input.documentId,
			})
			idCardDetailId = idCardDetail.idCardDetailId
		}

		// Update KYC session with result
		await db
			.update(kycSessions)
			.set({
				status: kycStatus,
				idCardDetailId: idCardDetailId ?? null,
				verifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
				updatedAt: new Date(),
			})
			.where(eq(kycSessions.transactionId, transactionId))

		const latestIdCardDetails =
			kycStatus === "VERIFIED"
				? await db.query.idCardDetails.findFirst({
						where: (data, { eq }) => eq(data.userId, session.user.id),
						orderBy: (table, { desc }) => [desc(table.updatedAt)],
						columns: {
							firstName: true,
							middleName: true,
							lastName: true,
							fullName: true,
							addressLine1: true,
							addressLine2: true,
							city: true,
							province: true,
							postalCode: true,
							country: true,
							additionalFields: true,
						},
					})
				: null

		const latestPrefix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
			"prefix",
			"namePrefix",
			"name_prefix",
		])
		const latestSuffix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
			"suffix",
			"nameSuffix",
			"name_suffix",
		])
		const resolvedNameFields = resolveNameFieldsFromIdCardDetails({
			firstName: latestIdCardDetails?.firstName,
			middleName: latestIdCardDetails?.middleName,
			lastName: latestIdCardDetails?.lastName,
			fullName: latestIdCardDetails?.fullName,
		})
		const resolvedAddress = latestIdCardDetails
			? {
					address: formatAddressLine({
						addressLine1: latestIdCardDetails.addressLine1,
						addressLine2: latestIdCardDetails.addressLine2,
						city: latestIdCardDetails.city,
						province: latestIdCardDetails.province,
						postalCode: latestIdCardDetails.postalCode,
						country: latestIdCardDetails.country,
						additionalFields: latestIdCardDetails.additionalFields,
					}),
					homeStreet: formatStreetLine({
						addressLine1: latestIdCardDetails.addressLine1,
						addressLine2: latestIdCardDetails.addressLine2,
						city: null,
						province: null,
						postalCode: null,
						country: null,
						additionalFields: latestIdCardDetails.additionalFields,
					}),
					barangay: extractBarangayFromAdditionalFields(latestIdCardDetails.additionalFields),
					cityProvince: formatCityProvince({
						addressLine1: null,
						addressLine2: null,
						city: latestIdCardDetails.city,
						province: latestIdCardDetails.province,
						postalCode: null,
						country: null,
						additionalFields: latestIdCardDetails.additionalFields,
					}),
				}
			: null

		// Update user status and hydrate missing names from verified ID details (title-cased).
		await db
			.update(users)
			.set({
				kycStatus,
				kycVerifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
				...(kycStatus === "VERIFIED" ? { kycLastExpiredAt: null } : {}),
				firstName:
					kycStatus === "VERIFIED"
						? coalesceNameValue(
								existingUser.firstName,
								toTitleCaseWords(resolvedNameFields.firstName)
							)
						: existingUser.firstName,
				middleName:
					kycStatus === "VERIFIED"
						? coalesceNameValue(
								existingUser.middleName,
								toTitleCaseWords(resolvedNameFields.middleName)
							)
						: existingUser.middleName,
				lastName:
					kycStatus === "VERIFIED"
						? coalesceNameValue(
								existingUser.lastName,
								toTitleCaseWords(resolvedNameFields.lastName)
							)
						: existingUser.lastName,
				prefix:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.prefix, latestPrefix)
						: existingUser.prefix,
				suffix:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.suffix, latestSuffix)
						: existingUser.suffix,
				address:
					kycStatus === "VERIFIED" && resolvedAddress
						? coalesceNameValue(existingUser.address, resolvedAddress.address)
						: existingUser.address,
				homeStreet:
					kycStatus === "VERIFIED" && resolvedAddress
						? coalesceNameValue(existingUser.homeStreet, resolvedAddress.homeStreet)
						: existingUser.homeStreet,
				barangay:
					kycStatus === "VERIFIED" && resolvedAddress
						? coalesceNameValue(existingUser.barangay, resolvedAddress.barangay ?? null)
						: existingUser.barangay,
				cityProvince:
					kycStatus === "VERIFIED" && resolvedAddress
						? coalesceNameValue(existingUser.cityProvince, resolvedAddress.cityProvince)
						: existingUser.cityProvince,
				// Auto-activate account when direct KYC is verified for non-ENP users.
				// Never override SUSPENDED here.
				// For ENP users, keep status as PENDING even after KYC verification.
				commissionStatus:
					kycStatus === "VERIFIED" &&
					existingUser.commissionStatus === "PENDING" &&
					existingUser.role !== "ENP"
						? "ACTIVE"
						: existingUser.commissionStatus,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/onboarding")

		return {
			success: true,
			data: {
				transactionId,
				kycStatus,
				message,
				steps: {
					readId: { action: idResult.summaryAction },
					liveness: {
						isApproved: livenessResult.decision?.isApproved ?? false,
						liveFaceValue: livenessResult.decision?.liveFaceValue ?? "unknown",
						summaryAction: livenessResult.decision?.summaryAction ?? "unknown",
					},
					faceMatch: {
						match: faceMatchResult.matchValue,
						action: faceMatchResult.summaryAction,
					},
				},
			},
		}
	} catch (error) {
		console.error("Direct KYC failed:", error)

		// Update session status
		await db
			.update(kycSessions)
			.set({
				status: "REJECTED",
				updatedAt: new Date(),
			})
			.where(eq(kycSessions.transactionId, transactionId))

		// Update user status
		await db
			.update(users)
			.set({
				kycStatus: "REJECTED",
				kycVerifiedAt: null,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/onboarding")

		return {
			success: false,
			error: error instanceof Error ? error.message : "Direct KYC failed",
			transactionId,
		}
	}
}

/**
 * Check the KYC status of the authenticated user
 */
export async function checkUserKycStatus() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const sessionBackedStatus = await syncUserKycStatusFromLatestSession(session.user.id)

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			kycVerifiedAt: true,
			kycLastExpiredAt: true,
			commissionStatus: true,
			role: true,
			firstName: true,
			middleName: true,
			lastName: true,
			prefix: true,
			suffix: true,
			address: true,
			homeStreet: true,
			barangay: true,
			cityProvince: true,
		},
	})

	if (!user) {
		return {
			success: false,
			error: "User not found",
		}
	}

	const kycSession = sessionBackedStatus.latestSession
		? await db.query.kycSessions.findFirst({
				where: eq(kycSessions.id, sessionBackedStatus.latestSession.id),
				with: {
					idCardDetail: true,
				},
			})
		: null

	if (!kycSession) {
		return {
			success: true,
			data: {
				transactionId: null,
				status: "not_started",
				kycStatus: "NOT_STARTED" as const,
				isComplete: false,
				isApproved: false,
				needsReview: false,
				message: "Please start identity verification.",
				details: {},
			},
		}
	}

	// IMPORTANT:
	// - Hosted link/workflow KYC can be polled via HyperVerge transaction status.
	// - Direct API KYC (readId/checkLiveness/matchFace) does NOT go through the workflow engine,
	//   so HyperVerge "applicationStatus" may remain "started" even when checks have passed.
	//   In that case, our DB is the source of truth and we must NOT overwrite VERIFIED -> PENDING.

	const needsHostedArtifacts = kycSession.sessionType === "hosted" && !kycSession.idCardDetailId

	// If our DB already has a final state:
	// - normally we avoid remote calls
	// - but for Hosted KYC, we want consistency: backfill ID card details exactly once if missing
	if (kycSession.status === "VERIFIED") {
		if (needsHostedArtifacts) {
			try {
				console.log("🧾 Fetching HyperVerge Logs API (backfill hosted KYC artifacts)...", {
					transactionId: kycSession.transactionId,
				})

				const logs = await getHyperVergeKycLogs({ transactionId: kycSession.transactionId })
				const imageUrl = pickBestFaceImageUrlFromLogs(logs)
				const ocr = pickOcrFieldsFromLogs(logs)

				if (ocr) {
					let faceImageUrl: string | undefined
					if (imageUrl) {
						const dataUrl = await fetchImageUrlAsDataUrl(imageUrl)
						if (dataUrl) {
							faceImageUrl = dataUrl
						}
					}

					// Save to id_card_details table
					const idCardDetail = await saveIdCardDetails(db, {
						userId: session.user.id,
						rawOcrData: ocr,
						ocrTransactionId: kycSession.transactionId,
						ocrProvider: "hyperverge",
						faceImageUrl,
						isVerified: true,
						verifiedAt: new Date(),
						verificationMethod: "kyc_mobile_link",
					})

					// Link session to id card detail
					await db
						.update(kycSessions)
						.set({ idCardDetailId: idCardDetail.idCardDetailId })
						.where(eq(kycSessions.id, kycSession.id))
				}
			} catch {
				// Non-fatal: status is already VERIFIED.
			}
		}

		const shouldHydrateMissingNames =
			!hasNameValue(user?.firstName) ||
			!hasNameValue(user?.lastName) ||
			!hasNameValue(user?.middleName)

		if (shouldHydrateMissingNames) {
			const latestIdCardDetails = await db.query.idCardDetails.findFirst({
				where: (data, { eq }) => eq(data.userId, session.user.id),
				orderBy: (table, { desc }) => [desc(table.updatedAt)],
				columns: {
					firstName: true,
					middleName: true,
					lastName: true,
					fullName: true,
					addressLine1: true,
					addressLine2: true,
					city: true,
					province: true,
					postalCode: true,
					country: true,
					additionalFields: true,
				},
			})

			const latestPrefix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
				"prefix",
				"namePrefix",
				"name_prefix",
			])
			const latestSuffix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
				"suffix",
				"nameSuffix",
				"name_suffix",
			])
			const resolvedNameFields = resolveNameFieldsFromIdCardDetails({
				firstName: latestIdCardDetails?.firstName,
				middleName: latestIdCardDetails?.middleName,
				lastName: latestIdCardDetails?.lastName,
				fullName: latestIdCardDetails?.fullName,
			})
			const resolvedAddress = latestIdCardDetails
				? {
						address: formatAddressLine({
							addressLine1: latestIdCardDetails.addressLine1,
							addressLine2: latestIdCardDetails.addressLine2,
							city: latestIdCardDetails.city,
							province: latestIdCardDetails.province,
							postalCode: latestIdCardDetails.postalCode,
							country: latestIdCardDetails.country,
							additionalFields: latestIdCardDetails.additionalFields,
						}),
						homeStreet: formatStreetLine({
							addressLine1: latestIdCardDetails.addressLine1,
							addressLine2: latestIdCardDetails.addressLine2,
							city: null,
							province: null,
							postalCode: null,
							country: null,
							additionalFields: latestIdCardDetails.additionalFields,
						}),
						barangay: extractBarangayFromAdditionalFields(latestIdCardDetails.additionalFields),
						cityProvince: formatCityProvince({
							addressLine1: null,
							addressLine2: null,
							city: latestIdCardDetails.city,
							province: latestIdCardDetails.province,
							postalCode: null,
							country: null,
							additionalFields: latestIdCardDetails.additionalFields,
						}),
					}
				: null

			await db
				.update(users)
				.set({
					firstName: coalesceNameValue(
						user?.firstName,
						toTitleCaseWords(resolvedNameFields.firstName)
					),
					middleName: coalesceNameValue(
						user?.middleName,
						toTitleCaseWords(resolvedNameFields.middleName)
					),
					lastName: coalesceNameValue(
						user?.lastName,
						toTitleCaseWords(resolvedNameFields.lastName)
					),
					prefix: coalesceNameValue(user?.prefix, latestPrefix),
					suffix: coalesceNameValue(user?.suffix, latestSuffix),
					address: resolvedAddress
						? coalesceNameValue(user?.address, resolvedAddress.address)
						: (user?.address ?? null),
					homeStreet: resolvedAddress
						? coalesceNameValue(user?.homeStreet, resolvedAddress.homeStreet)
						: (user?.homeStreet ?? null),
					barangay: resolvedAddress
						? coalesceNameValue(user?.barangay, resolvedAddress.barangay ?? null)
						: (user?.barangay ?? null),
					cityProvince: resolvedAddress
						? coalesceNameValue(user?.cityProvince, resolvedAddress.cityProvince)
						: (user?.cityProvince ?? null),
				})
				.where(eq(users.id, session.user.id))
		}

		return {
			success: true,
			data: {
				transactionId: kycSession.transactionId,
				status: "auto_approved",
				kycStatus: "VERIFIED" as const,
				isComplete: true,
				isApproved: true,
				needsReview: false,
				message: "KYC already verified.",
				details: {},
			},
		}
	}

	// Terminal rejection: do not call HyperVerge /v1/output. After a decline, the transaction is
	// often no longer returned (400 TransactionId not found), which spams logs and was mis-parsed
	// as "pending" inside getTransactionStatus. Our DB row is authoritative for REJECTED.
	if (kycSession.status === "REJECTED") {
		const interpretation = interpretStatus("auto_declined")
		return {
			success: true,
			data: {
				transactionId: kycSession.transactionId,
				status: "auto_declined",
				kycStatus: "REJECTED" as const,
				...interpretation,
				details: {},
			},
		}
	}

	// If it's PENDING but there is no hosted KYC link, assume this is the direct API flow.
	// Do not poll HyperVerge workflow status because it may remain "started" indefinitely.
	if (kycSession.status === "PENDING" && kycSession.sessionType === "direct") {
		return {
			success: true,
			data: {
				transactionId: kycSession.transactionId,
				status: "needs_review",
				kycStatus: "PENDING" as const,
				isComplete: false,
				isApproved: false,
				needsReview: true,
				message: "KYC is pending review.",
				details: {},
			},
		}
	}

	try {
		const hypervergeIdentifier = kycSession.hostedLink
			? extractIdentifierFromStartKycUrl(kycSession.hostedLink)
			: undefined
		const result = await getTransactionStatus(kycSession.transactionId, {
			hypervergeIdentifier: hypervergeIdentifier ?? undefined,
		})
		const applicationStatus = result.result.applicationStatus
		const interpretation = interpretStatus(applicationStatus)

		console.log("🔍 KYC Status Check:", {
			transactionId: kycSession.transactionId,
			applicationStatus,
			interpretation,
		})

		// Update the KYC status in the database based on the result
		let newStatus: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING"
		const workflowDetails = result.result.workflowDetails ?? {}

		if (interpretation.isApproved) {
			newStatus = "VERIFIED"
			console.log("✅ KYC Approved - Updating to VERIFIED")

			// Fetch and save ID card details if not already done
			if (!kycSession.idCardDetailId) {
				try {
					console.log("🧾 Fetching HyperVerge Logs API (hosted KYC artifacts)...", {
						transactionId: kycSession.transactionId,
					})

					const logs = await getHyperVergeKycLogs({ transactionId: kycSession.transactionId })
					const imageUrl = pickBestFaceImageUrlFromLogs(logs)
					const ocr = pickOcrFieldsFromLogs(logs)

					if (ocr) {
						let faceImageUrl: string | undefined
						if (imageUrl) {
							const dataUrl = await fetchImageUrlAsDataUrl(imageUrl)
							if (dataUrl) {
								faceImageUrl = dataUrl
							}
						}

						// Save to id_card_details table
						const idCardDetail = await saveIdCardDetails(db, {
							userId: session.user.id,
							rawOcrData: ocr,
							ocrTransactionId: kycSession.transactionId,
							ocrProvider: "hyperverge",
							faceImageUrl,
							isVerified: true,
							verifiedAt: new Date(),
							verificationMethod: "kyc_mobile_link",
						})

						// Update session with ID card detail reference
						await db
							.update(kycSessions)
							.set({
								status: newStatus,
								idCardDetailId: idCardDetail.idCardDetailId,
								verifiedAt: new Date(),
								updatedAt: new Date(),
							})
							.where(eq(kycSessions.id, kycSession.id))
					}
				} catch (e) {
					console.warn("⚠️ Hosted KYC Logs API fetch failed:", e)
				}
			} else {
				// Just update session status
				await db
					.update(kycSessions)
					.set({
						status: newStatus,
						verifiedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(kycSessions.id, kycSession.id))
			}

			// If approval succeeded but we could not persist OCR (no logs / empty OCR), the session row
			// may still be PENDING. Finalize it so checkUserKycStatus and the DB stay consistent.
			const sessionRow = await db.query.kycSessions.findFirst({
				where: eq(kycSessions.id, kycSession.id),
				columns: { status: true },
			})
			if (sessionRow?.status === "PENDING" && newStatus === "VERIFIED") {
				await db
					.update(kycSessions)
					.set({
						status: "VERIFIED",
						verifiedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(kycSessions.id, kycSession.id))
			}

			const latestIdCardDetails = await db.query.idCardDetails.findFirst({
				where: (data, { eq }) => eq(data.userId, session.user.id),
				orderBy: (table, { desc }) => [desc(table.updatedAt)],
				columns: {
					firstName: true,
					middleName: true,
					lastName: true,
					fullName: true,
					addressLine1: true,
					addressLine2: true,
					city: true,
					province: true,
					postalCode: true,
					country: true,
					additionalFields: true,
				},
			})

			const latestPrefix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
				"prefix",
				"namePrefix",
				"name_prefix",
			])
			const latestSuffix = extractAdditionalFieldString(latestIdCardDetails?.additionalFields, [
				"suffix",
				"nameSuffix",
				"name_suffix",
			])
			const resolvedNameFields = resolveNameFieldsFromIdCardDetails({
				firstName: latestIdCardDetails?.firstName,
				middleName: latestIdCardDetails?.middleName,
				lastName: latestIdCardDetails?.lastName,
				fullName: latestIdCardDetails?.fullName,
			})
			const resolvedAddress = latestIdCardDetails
				? {
						address: formatAddressLine({
							addressLine1: latestIdCardDetails.addressLine1,
							addressLine2: latestIdCardDetails.addressLine2,
							city: latestIdCardDetails.city,
							province: latestIdCardDetails.province,
							postalCode: latestIdCardDetails.postalCode,
							country: latestIdCardDetails.country,
							additionalFields: latestIdCardDetails.additionalFields,
						}),
						homeStreet: formatStreetLine({
							addressLine1: latestIdCardDetails.addressLine1,
							addressLine2: latestIdCardDetails.addressLine2,
							city: null,
							province: null,
							postalCode: null,
							country: null,
							additionalFields: latestIdCardDetails.additionalFields,
						}),
						barangay: extractBarangayFromAdditionalFields(latestIdCardDetails.additionalFields),
						cityProvince: formatCityProvince({
							addressLine1: null,
							addressLine2: null,
							city: latestIdCardDetails.city,
							province: latestIdCardDetails.province,
							postalCode: null,
							country: null,
							additionalFields: latestIdCardDetails.additionalFields,
						}),
					}
				: null

			// Update user status and hydrate missing names from verified ID details (title-cased).
			await db
				.update(users)
				.set({
					kycStatus: newStatus,
					kycVerifiedAt: new Date(),
					kycLastExpiredAt: null,
					firstName: coalesceNameValue(
						user?.firstName,
						toTitleCaseWords(resolvedNameFields.firstName)
					),
					middleName: coalesceNameValue(
						user?.middleName,
						toTitleCaseWords(resolvedNameFields.middleName)
					),
					lastName: coalesceNameValue(
						user?.lastName,
						toTitleCaseWords(resolvedNameFields.lastName)
					),
					prefix: coalesceNameValue(user?.prefix, latestPrefix),
					suffix: coalesceNameValue(user?.suffix, latestSuffix),
					address: resolvedAddress
						? coalesceNameValue(user?.address, resolvedAddress.address)
						: (user?.address ?? null),
					homeStreet: resolvedAddress
						? coalesceNameValue(user?.homeStreet, resolvedAddress.homeStreet)
						: (user?.homeStreet ?? null),
					barangay: resolvedAddress
						? coalesceNameValue(user?.barangay, resolvedAddress.barangay ?? null)
						: (user?.barangay ?? null),
					cityProvince: resolvedAddress
						? coalesceNameValue(user?.cityProvince, resolvedAddress.cityProvince)
						: (user?.cityProvince ?? null),
					// If account was pending, auto-activate on successful KYC for non-ENP users.
					// Never override SUSPENDED here.
					// For ENP users, keep status as PENDING even after KYC verification.
					commissionStatus:
						user?.commissionStatus === "PENDING" && user?.role !== "ENP"
							? "ACTIVE"
							: user?.commissionStatus,
				})
				.where(eq(users.id, session.user.id))
		} else if (applicationStatus === "auto_declined" || applicationStatus === "manual_declined") {
			newStatus = "REJECTED"
			console.log("❌ KYC Rejected")

			// Update session status
			await db
				.update(kycSessions)
				.set({
					status: newStatus,
					updatedAt: new Date(),
				})
				.where(eq(kycSessions.id, kycSession.id))

			// Update user status
			await db
				.update(users)
				.set({
					kycStatus: newStatus,
				})
				.where(eq(users.id, session.user.id))
		} else if (interpretation.needsReview) {
			newStatus = "PENDING"
			console.log("🕵️ KYC Needs Review")

			// Update session
			await db
				.update(kycSessions)
				.set({
					status: newStatus,
					updatedAt: new Date(),
				})
				.where(eq(kycSessions.id, kycSession.id))
		} else {
			console.log("⏳ KYC Still Pending")
		}

		revalidatePath("/onboarding")

		return {
			success: true,
			data: {
				transactionId: result.result.transactionId,
				status: applicationStatus,
				kycStatus: newStatus,
				...interpretation,
				details: workflowDetails,
			},
		}
	} catch (error) {
		console.error("Failed to check KYC status:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to check KYC status",
		}
	}
}

/**
 * Sync KYC status from the HyperVerge redirect callback (e.g. ?transactionId=...&status=auto_approved).
 * Call this when the user lands on /onboarding/callback so the DB is updated even when the Output API
 * is unavailable (e.g. fallback region).
 */
export async function syncKycStatusFromCallback(
	transactionId: string,
	status: string,
	options: { alternateTransactionIds?: string[]; backfillIdCardDetails?: boolean } = {}
) {
	const logPrefix = "[KYC syncKycStatusFromCallback]"

	const session = await auth()
	if (!session?.user?.id) {
		console.warn(`${logPrefix} Aborted: not authenticated`)
		return { success: false, error: "Not authenticated" }
	}
	if (!transactionId?.trim() || !status?.trim()) {
		console.warn(`${logPrefix} Aborted: missing transactionId or status`, {
			hasTransactionId: Boolean(transactionId?.trim()),
			hasStatus: Boolean(status?.trim()),
		})
		return { success: false, error: "Missing transactionId or status" }
	}

	const normalized = status.trim().toLowerCase().replace(/\s+/g, "_")
	let newStatus: "PENDING" | "VERIFIED" | "REJECTED" = "PENDING"
	if (
		[
			"auto_approved",
			"approved",
			"success",
			"succeeded",
			"verified",
			"completed",
			"manual_approved",
			"manually_approved",
			"manual_approve",
			"approved_manual",
			"operator_approved",
			"reviewer_approved",
			"review_passed",
			"review_approved",
		].includes(normalized)
	) {
		newStatus = "VERIFIED"
	} else if (
		[
			"auto_declined",
			"manual_declined",
			"manually_declined",
			"declined_manual",
			"rejected",
			"declined",
			"failed",
			"error",
		].includes(normalized)
	) {
		newStatus = "REJECTED"
	}
	// user_cancelled, needs_review, or unknown -> leave as PENDING

	console.log(`${logPrefix} Started`, {
		userId: session.user.id,
		transactionId: transactionId.trim(),
		rawStatus: status.trim(),
		normalizedStatus: normalized,
		resolvedKycStatus: newStatus,
	})

	const transactionIds = Array.from(
		new Set(
			[transactionId, ...(options.alternateTransactionIds ?? [])]
				.map(id => id.trim())
				.filter(Boolean)
		)
	)

	const kycSessionColumns = {
		id: true,
		status: true,
		idCardDetailId: true,
		sessionType: true,
		transactionId: true,
	} as const

	let kycSession:
		| {
				id: string
				status: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED"
				idCardDetailId: string | null
				sessionType: string
				transactionId: string
		  }
		| undefined

	for (const candidateTransactionId of transactionIds) {
		const candidate = await db.query.kycSessions.findFirst({
			where: and(
				eq(kycSessions.userId, session.user.id),
				eq(kycSessions.transactionId, candidateTransactionId)
			),
			columns: kycSessionColumns,
		})

		if (candidate) {
			kycSession = candidate
			break
		}
	}

	const resolvedKycSession =
		kycSession ??
		(await db.query.kycSessions.findFirst({
			where: and(eq(kycSessions.userId, session.user.id), eq(kycSessions.status, "PENDING")),
			orderBy: (table, { desc }) => [desc(table.createdAt)],
			columns: {
				id: true,
				status: true,
				idCardDetailId: true,
				sessionType: true,
				transactionId: true,
			},
		}))

	if (!resolvedKycSession) {
		console.error(`${logPrefix} Failed: KYC session not found`, {
			userId: session.user.id,
			transactionId: transactionId.trim(),
		})
		return { success: false, error: "KYC session not found" }
	}

	console.log(`${logPrefix} Session loaded`, {
		kycSessionId: resolvedKycSession.id,
		previousSessionStatus: resolvedKycSession.status,
		sessionType: resolvedKycSession.sessionType,
		hasIdCardDetailId: Boolean(resolvedKycSession.idCardDetailId),
		matchedRequestedTransactionId: Boolean(kycSession),
	})

	if (newStatus === "PENDING") {
		console.log(`${logPrefix} No DB update (non-final provider status)`, {
			normalizedStatus: normalized,
			sessionStatus: resolvedKycSession.status,
		})
		return { success: true } // no DB update for pending/cancelled
	}

	if (resolvedKycSession.status === "VERIFIED" || resolvedKycSession.status === "REJECTED") {
		console.log(`${logPrefix} Session already final — skipping update`, {
			sessionStatus: resolvedKycSession.status,
			incomingResolvedStatus: newStatus,
		})
		return { success: true } // already final
	}

	const previousSessionStatus = resolvedKycSession.status
	const now = new Date()

	await db
		.update(kycSessions)
		.set({
			status: newStatus,
			verifiedAt: newStatus === "VERIFIED" ? now : null,
			updatedAt: now,
		})
		.where(eq(kycSessions.id, resolvedKycSession.id))

	const userKycUpdate =
		newStatus === "VERIFIED"
			? {
					kycStatus: newStatus,
					kycVerifiedAt: now,
					kycLastExpiredAt: null,
				}
			: newStatus === "REJECTED"
				? { kycStatus: newStatus, kycVerifiedAt: null }
				: { kycStatus: newStatus }

	await db.update(users).set(userKycUpdate).where(eq(users.id, session.user.id))

	console.log(`${logPrefix} Updated kyc_session and users`, {
		userId: session.user.id,
		transactionId: resolvedKycSession.transactionId,
		previousSessionStatus,
		newSessionStatus: newStatus,
		newUserKycStatus: newStatus,
	})

	let idCardBackfill: "skipped" | "saved" | "no_ocr" | "failed" = "skipped"

	if (!options.backfillIdCardDetails) {
		revalidatePath("/onboarding")
		revalidatePath("/profile")

		console.log(
			`${logPrefix} KYC callback processed without blocking on id_card_details backfill`,
			{
				userId: session.user.id,
				transactionId: resolvedKycSession.transactionId,
				finalStatus: newStatus,
				idCardBackfill,
			}
		)

		return { success: true }
	}

	// Backfill id_card_details from HyperVerge Logs when VERIFIED and not yet linked (e.g. Web SDK flow)
	if (
		newStatus === "VERIFIED" &&
		!resolvedKycSession.idCardDetailId &&
		resolvedKycSession.transactionId
	) {
		idCardBackfill = "no_ocr"
		try {
			console.log(`${logPrefix} Fetching HyperVerge Logs API for id_card_details backfill`, {
				transactionId: resolvedKycSession.transactionId,
				sessionType: resolvedKycSession.sessionType,
			})
			const logs = await getHyperVergeKycLogs({ transactionId: resolvedKycSession.transactionId })
			const imageUrl = pickBestFaceImageUrlFromLogs(logs)
			const ocr = pickOcrFieldsFromLogs(logs)

			if (ocr) {
				let faceImageUrl: string | undefined
				if (imageUrl) {
					const dataUrl = await fetchImageUrlAsDataUrl(imageUrl)
					if (dataUrl) faceImageUrl = dataUrl
				}
				const verificationMethod =
					resolvedKycSession.sessionType === "web_sdk" ? "kyc_web_sdk" : "kyc_mobile_link"
				const idCardDetail = await saveIdCardDetails(db, {
					userId: session.user.id,
					rawOcrData: ocr,
					ocrTransactionId: resolvedKycSession.transactionId,
					ocrProvider: "hyperverge",
					faceImageUrl,
					isVerified: true,
					verifiedAt: new Date(),
					verificationMethod,
				})

				if (idCardDetail.idCardDetailId) {
					idCardBackfill = "saved"
					await db
						.update(kycSessions)
						.set({
							idCardDetailId: idCardDetail.idCardDetailId,
							verifiedAt: new Date(),
							updatedAt: new Date(),
						})
						.where(eq(kycSessions.id, resolvedKycSession.id))

					console.log(`${logPrefix} id_card_details saved and linked to session`, {
						idCardDetailId: idCardDetail.idCardDetailId,
						hasFaceImage: Boolean(faceImageUrl),
						verificationMethod,
					})

					// Hydrate user profile from id card when name/address are empty
					const user = await db.query.users.findFirst({
						where: eq(users.id, session.user.id),
						columns: { firstName: true, middleName: true, lastName: true, address: true },
					})
					const latestIdCardDetails = await db.query.idCardDetails.findFirst({
						where: eq(idCardDetails.userId, session.user.id),
						orderBy: (table, { desc }) => [desc(table.updatedAt)],
						columns: {
							firstName: true,
							middleName: true,
							lastName: true,
							fullName: true,
							addressLine1: true,
							addressLine2: true,
							city: true,
							province: true,
							postalCode: true,
							country: true,
							additionalFields: true,
						},
					})
					const shouldHydrate =
						user &&
						latestIdCardDetails &&
						(!hasNameValue(user.firstName) ||
							!hasNameValue(user.lastName) ||
							!hasNameValue(user.address))
					if (shouldHydrate && latestIdCardDetails) {
						const resolvedNameFields = resolveNameFieldsFromIdCardDetails({
							firstName: latestIdCardDetails.firstName,
							middleName: latestIdCardDetails.middleName,
							lastName: latestIdCardDetails.lastName,
							fullName: latestIdCardDetails.fullName,
						})
						const resolvedAddress = formatAddressLine({
							addressLine1: latestIdCardDetails.addressLine1,
							addressLine2: latestIdCardDetails.addressLine2,
							city: latestIdCardDetails.city,
							province: latestIdCardDetails.province,
							postalCode: latestIdCardDetails.postalCode,
							country: latestIdCardDetails.country,
							additionalFields: latestIdCardDetails.additionalFields,
						})
						await db
							.update(users)
							.set({
								firstName: coalesceNameValue(
									user?.firstName,
									toTitleCaseWords(resolvedNameFields.firstName)
								),
								middleName: coalesceNameValue(
									user?.middleName,
									toTitleCaseWords(resolvedNameFields.middleName)
								),
								lastName: coalesceNameValue(
									user?.lastName,
									toTitleCaseWords(resolvedNameFields.lastName)
								),
								address: coalesceNameValue(user?.address, resolvedAddress),
							})
							.where(eq(users.id, session.user.id))
						console.log(`${logPrefix} Hydrated user profile from id_card_details`)
					} else {
						console.log(`${logPrefix} Skipped profile hydration (names/address already set)`)
					}
				} else {
					console.warn(`${logPrefix} saveIdCardDetails returned no idCardDetailId`)
				}
			} else {
				console.warn(`${logPrefix} Logs API returned no OCR fields`, {
					transactionId: resolvedKycSession.transactionId,
					hasFaceImageUrl: Boolean(imageUrl),
				})
			}
		} catch (err) {
			idCardBackfill = "failed"
			console.warn(`${logPrefix} id_card_details backfill failed (non-fatal):`, err)
		}
	} else if (newStatus === "VERIFIED" && resolvedKycSession.idCardDetailId) {
		console.log(`${logPrefix} id_card_details backfill skipped (already linked)`, {
			idCardDetailId: resolvedKycSession.idCardDetailId,
		})
	}

	revalidatePath("/onboarding")
	revalidatePath("/profile")

	const completed =
		newStatus === "VERIFIED"
			? "KYC verification completed — user and session marked VERIFIED"
			: newStatus === "REJECTED"
				? "KYC verification completed — user and session marked REJECTED"
				: "KYC callback processed"

	console.log(`${logPrefix} ${completed}`, {
		userId: session.user.id,
		transactionId: resolvedKycSession.transactionId,
		finalStatus: newStatus,
		idCardBackfill,
	})

	return { success: true }
}

/**
 * Retrieve existing KYC link for the authenticated user
 */
export async function getExistingKycLink() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const kycSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})

	if (!kycSession) {
		return {
			success: false,
			error: "No KYC verification link found. Please start the verification process.",
		}
	}

	if (!kycSession.hostedLink) {
		const isDirectSession = kycSession.sessionType === "direct"

		return {
			success: false,
			error: isDirectSession
				? "This verification was completed in-browser and does not have a link to resume. Please wait for review or start a new verification."
				: "No KYC verification link found. Please start the verification process.",
		}
	}

	if (kycSession.status !== "PENDING") {
		return {
			success: false,
			error: "KYC verification is not in pending state",
		}
	}

	// Check if link is expired (24 hours)
	if (kycSession.hostedLinkCreatedAt) {
		const linkAge = Date.now() - new Date(kycSession.hostedLinkCreatedAt).getTime()
		const expirationTime = 24 * 60 * 60 * 1000 // 24 hours
		if (linkAge > expirationTime) {
			return {
				success: false,
				error: "Your verification link has expired. Please create a new link.",
			}
		}
	}

	console.log("🔗 Retrieved existing KYC link for transaction:", kycSession.transactionId)

	return {
		success: true,
		data: {
			transactionId: kycSession.transactionId,
			url: kycSession.hostedLink,
		},
	}
}

/** Clears the post-expiry notice flag after the user acknowledges the re-verification dialog. */
export async function dismissKycExpiryNotice() {
	const session = await auth()
	if (!session?.user?.id) {
		return { success: false as const, error: "User not authenticated" }
	}
	try {
		await db.update(users).set({ kycLastExpiredAt: null }).where(eq(users.id, session.user.id))
		revalidatePath("/profile")
		return { success: true as const }
	} catch (error) {
		console.error("dismissKycExpiryNotice failed:", error)
		return {
			success: false as const,
			error: error instanceof Error ? error.message : "Failed to update",
		}
	}
}

/**
 * Get the current user's KYC information
 */
export async function getUserKycInfo() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	const sessionBackedStatus = await syncUserKycStatusFromLatestSession(session.user.id)

	const dbUser = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			firstName: true,
			middleName: true,
			lastName: true,
			address: true,
			email: true,
			kycLastExpiredAt: true,
		},
	})

	if (!dbUser) {
		return {
			success: false,
			error: "User not found",
		}
	}

	const kycLastExpiredAtIso =
		sessionBackedStatus.kycLastExpiredAt instanceof Date
			? sessionBackedStatus.kycLastExpiredAt.toISOString()
			: null

	const kycSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})

	const latestIdCard = await db.query.idCardDetails.findFirst({
		where: eq(idCardDetails.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.updatedAt)],
		columns: {
			firstName: true,
			middleName: true,
			lastName: true,
			fullName: true,
			addressLine1: true,
			addressLine2: true,
			city: true,
			province: true,
			postalCode: true,
			country: true,
			additionalFields: true,
			documentType: true,
			documentCountry: true,
			ocrTransactionId: true,
			isVerified: true,
		},
	})

	const resolvedIdName = latestIdCard
		? resolveNameFieldsFromIdCardDetails({
				firstName: latestIdCard.firstName,
				middleName: latestIdCard.middleName,
				lastName: latestIdCard.lastName,
				fullName: latestIdCard.fullName,
			})
		: null

	const previewAddress = latestIdCard
		? formatAddressLine({
				addressLine1: latestIdCard.addressLine1,
				addressLine2: latestIdCard.addressLine2,
				city: latestIdCard.city,
				province: latestIdCard.province,
				postalCode: latestIdCard.postalCode,
				country: latestIdCard.country,
				additionalFields: latestIdCard.additionalFields,
			})
		: null
	const previewHomeStreet = latestIdCard
		? formatStreetLine({
				addressLine1: latestIdCard.addressLine1,
				addressLine2: latestIdCard.addressLine2,
				city: null,
				province: null,
				postalCode: null,
				country: null,
				additionalFields: latestIdCard.additionalFields,
			})
		: null
	const previewBarangay = latestIdCard
		? extractBarangayFromAdditionalFields(latestIdCard.additionalFields)
		: null
	const previewCityProvince = latestIdCard
		? formatCityProvince({
				addressLine1: null,
				addressLine2: null,
				city: latestIdCard.city,
				province: latestIdCard.province,
				postalCode: null,
				country: null,
				additionalFields: latestIdCard.additionalFields,
			})
		: null

	return {
		success: true,
		data: {
			name: getFullName(dbUser),
			email: dbUser.email,
			profileFirstName: dbUser.firstName,
			profileMiddleName: dbUser.middleName,
			profileLastName: dbUser.lastName,
			transactionId: kycSession?.transactionId ?? null,
			kycStatus: sessionBackedStatus.kycStatus ?? "NOT_STARTED",
			kycLastExpiredAt: kycLastExpiredAtIso,
			kycVerificationValidityDays: env.KYC_VERIFICATION_VALIDITY_DAYS,
			kycLinkCreatedAt: kycSession?.hostedLinkCreatedAt ?? null,
			hasHostedLink: !!kycSession?.hostedLink,
			sessionType: kycSession?.sessionType ?? null,
			kycPreview:
				latestIdCard && (latestIdCard.isVerified || sessionBackedStatus.kycStatus === "VERIFIED")
					? {
							// Prefer saved DB values when verified (auto-saved after KYC)
							firstName:
								sessionBackedStatus.kycStatus === "VERIFIED"
									? (dbUser.firstName ?? resolvedIdName?.firstName ?? null)
									: (resolvedIdName?.firstName ?? null),
							middleName:
								sessionBackedStatus.kycStatus === "VERIFIED"
									? (dbUser.middleName ?? resolvedIdName?.middleName ?? null)
									: (resolvedIdName?.middleName ?? null),
							lastName:
								sessionBackedStatus.kycStatus === "VERIFIED"
									? (dbUser.lastName ?? resolvedIdName?.lastName ?? null)
									: (resolvedIdName?.lastName ?? null),
							address:
								sessionBackedStatus.kycStatus === "VERIFIED"
									? (dbUser.address ?? previewAddress)
									: previewAddress,
							homeStreet: previewHomeStreet,
							barangay: previewBarangay,
							cityProvince: previewCityProvince,
							documentType: latestIdCard.documentType ?? null,
							documentCountry: latestIdCard.documentCountry ?? null,
							ocrTransactionId: latestIdCard.ocrTransactionId ?? null,
						}
					: null,
		},
	}
}

/**
 * Reset KYC status for the authenticated user (for testing/retry)
 */
export async function resetUserKycStatus() {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	try {
		// Delete all KYC sessions for this user
		await db.delete(kycSessions).where(eq(kycSessions.userId, session.user.id))

		// Reset user KYC status
		await db
			.update(users)
			.set({
				kycStatus: "NOT_STARTED",
				kycVerifiedAt: null,
				kycLastExpiredAt: null,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/onboarding")

		return {
			success: true,
			message: "KYC status reset successfully",
		}
	} catch (error) {
		console.error("Failed to reset KYC status:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to reset KYC status",
		}
	}
}

/**
 * Soft-reset KYC status for the authenticated user (preserves history).
 *
 * - Keeps existing `kycSessions` rows for audit/history.
 * - Marks any active PENDING session(s) as REJECTED with metadata reason "user_restarted"
 *   so the UI no longer treats the user as pending.
 */
export type SoftResetUserKycStatusResult =
	| { success: true; message: string }
	| { success: false; error: string }

export async function softResetUserKycStatus(): Promise<SoftResetUserKycStatusResult> {
	const session = await auth()

	if (!session?.user?.id) {
		return {
			success: false,
			error: "User not authenticated",
		}
	}

	try {
		const pendingSessions = await db.query.kycSessions.findMany({
			where: (table, { and, eq }) =>
				and(eq(table.userId, session.user.id), eq(table.status, "PENDING")),
			orderBy: (table, { desc }) => [desc(table.createdAt)],
			columns: {
				id: true,
				workflowMetadata: true,
			},
		})

		const restartMetadataBase = {
			reason: "user_restarted",
			at: new Date().toISOString(),
			previousStatus: "PENDING",
		} as const

		for (const s of pendingSessions) {
			const existing =
				s.workflowMetadata &&
				typeof s.workflowMetadata === "object" &&
				!Array.isArray(s.workflowMetadata)
					? (s.workflowMetadata as Record<string, unknown>)
					: undefined

			await db
				.update(kycSessions)
				.set({
					status: "REJECTED",
					verifiedAt: null,
					workflowMetadata: {
						...existing,
						...restartMetadataBase,
					},
					updatedAt: new Date(),
				})
				.where(eq(kycSessions.id, s.id))
		}

		// Reset user KYC status
		await db
			.update(users)
			.set({
				kycStatus: "NOT_STARTED",
				kycVerifiedAt: null,
				kycLastExpiredAt: null,
			})
			.where(eq(users.id, session.user.id))

		revalidatePath("/onboarding")

		return {
			success: true,
			message: "KYC status reset successfully",
		}
	} catch (error) {
		console.error("Failed to soft reset KYC status:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to soft reset KYC status",
		}
	}
}
