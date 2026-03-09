"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"

import { getFullName } from "@/core/lib/utils"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { kycSessions } from "@/services/drizzle/schema/kyc-sessions"
import {
	createOnboardLink,
	getTransactionStatus,
	interpretStatus,
	type OnboardLinkConfig,
} from "@/services/hyperverge"
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

	// Check for existing pending KYC session
	const existingSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})

	// If there's a pending session, check if it's expired (24 hours)
	if (existingSession?.status === "PENDING" && existingSession.hostedLink) {
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

		// Update user status and hydrate missing names from verified ID details.
		await db
			.update(users)
			.set({
				kycStatus,
				kycVerifiedAt: kycStatus === "VERIFIED" ? new Date() : null,
				firstName:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.firstName, latestIdCardDetails?.firstName)
						: existingUser.firstName,
				middleName:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.middleName, latestIdCardDetails?.middleName)
						: existingUser.middleName,
				lastName:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.lastName, latestIdCardDetails?.lastName)
						: existingUser.lastName,
				prefix:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.prefix, latestPrefix)
						: existingUser.prefix,
				suffix:
					kycStatus === "VERIFIED"
						? coalesceNameValue(existingUser.suffix, latestSuffix)
						: existingUser.suffix,
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

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			kycStatus: true,
			commissionStatus: true,
			role: true,
			firstName: true,
			middleName: true,
			lastName: true,
			prefix: true,
			suffix: true,
		},
	})

	// Get the latest KYC session
	const kycSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
		with: {
			idCardDetail: true,
		},
	})

	if (!kycSession) {
		return {
			success: false,
			error: "No KYC verification found. Please start the verification process.",
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

	if (kycSession.status === "REJECTED") {
		return {
			success: true,
			data: {
				transactionId: kycSession.transactionId,
				status: "auto_declined",
				kycStatus: "REJECTED" as const,
				isComplete: true,
				isApproved: false,
				needsReview: false,
				message: "KYC was rejected.",
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
		const result = await getTransactionStatus(kycSession.transactionId)
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

			const latestIdCardDetails = await db.query.idCardDetails.findFirst({
				where: (data, { eq }) => eq(data.userId, session.user.id),
				orderBy: (table, { desc }) => [desc(table.updatedAt)],
				columns: {
					firstName: true,
					middleName: true,
					lastName: true,
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

			// Update user status and hydrate missing names from verified ID details.
			await db
				.update(users)
				.set({
					kycStatus: newStatus,
					kycVerifiedAt: new Date(),
					firstName: coalesceNameValue(user?.firstName, latestIdCardDetails?.firstName),
					middleName: coalesceNameValue(user?.middleName, latestIdCardDetails?.middleName),
					lastName: coalesceNameValue(user?.lastName, latestIdCardDetails?.lastName),
					prefix: coalesceNameValue(user?.prefix, latestPrefix),
					suffix: coalesceNameValue(user?.suffix, latestSuffix),
					// If account was pending, auto-activate on successful KYC for non-ENP users.
					// Never override SUSPENDED here.
					// For ENP users, keep status as PENDING even after KYC verification.
					commissionStatus:
						user?.commissionStatus === "PENDING" && user?.role !== "ENP"
							? "ACTIVE"
							: user?.commissionStatus,
				})
				.where(eq(users.id, session.user.id))
		} else if (applicationStatus === "auto_declined") {
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

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: {
			firstName: true,
			middleName: true,
			lastName: true,
			email: true,
			kycStatus: true,
		},
	})

	if (!user) {
		return {
			success: false,
			error: "User not found",
		}
	}

	const kycSession = await db.query.kycSessions.findFirst({
		where: eq(kycSessions.userId, session.user.id),
		orderBy: (table, { desc }) => [desc(table.createdAt)],
	})

	return {
		success: true,
		data: {
			name: getFullName(user),
			email: user.email,
			transactionId: kycSession?.transactionId ?? null,
			kycStatus: user.kycStatus,
			kycLinkCreatedAt: kycSession?.hostedLinkCreatedAt ?? null,
			hasHostedLink: !!kycSession?.hostedLink,
			sessionType: kycSession?.sessionType ?? null,
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
