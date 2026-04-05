/**
 * Save ID Card Details Service
 * Handles saving parsed OCR data to the id_card_details table and the saved_ids table
 */

import { desc, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import type { schema } from "@/services/drizzle/schema"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { savedIds } from "@/services/drizzle/schema/saved-ids"

import { parseIdCardOcrData } from "./id-card-parser"

type DB = PostgresJsDatabase<typeof schema>

export interface SaveIdCardDetailsInput {
	userId: string
	rawOcrData: Record<string, unknown>
	ocrTransactionId?: string
	ocrProvider?: string
	frontImageUrl?: string
	backImageUrl?: string
	faceImageUrl?: string
	isVerified?: boolean
	verifiedAt?: Date
	verificationMethod?: string
	countryId?: string
	documentId?: string
	kycSessionId?: string
}

/**
 * Compute a normalized expiresAt timestamp from OCR expiry or fallback to verifiedAt + 1 month.
 */
function computeExpiresAt(ocrExpiryDate: string | null | undefined, verifiedAt: Date): Date {
	if (ocrExpiryDate) {
		const parsed = new Date(ocrExpiryDate)
		if (!isNaN(parsed.getTime())) {
			return parsed
		}
	}
	// Fallback: verifiedAt + 1 month
	const fallback = new Date(verifiedAt)
	fallback.setMonth(fallback.getMonth() + 1)
	return fallback
}

/**
 * Create a new saved ID record from OCR data (append-only, never overwrites).
 * This is the primary function for the multi-ID model.
 */
export async function createSavedIdFromOcr(
	db: DB,
	input: SaveIdCardDetailsInput
): Promise<{ success: boolean; savedIdId?: string; error?: string }> {
	try {
		const parsedData = parseIdCardOcrData(input.rawOcrData, {
			countryId: input.countryId,
			documentId: input.documentId,
		})

		const verifiedAt = input.verifiedAt ?? (input.isVerified ? new Date() : new Date())
		const expiresAt = computeExpiresAt(parsedData.expiryDate ?? null, verifiedAt)

		const [created] = await db
			.insert(savedIds)
			.values({
				userId: input.userId,
				kycSessionId: input.kycSessionId,
				documentType: parsedData.documentType,
				documentNumber: parsedData.documentNumber,
				documentCountry: parsedData.documentCountry,
				firstName: parsedData.firstName,
				middleName: parsedData.middleName,
				lastName: parsedData.lastName,
				fullName: parsedData.fullName,
				dateOfBirth: parsedData.dateOfBirth,
				gender: parsedData.gender,
				addressLine1: parsedData.addressLine1,
				city: parsedData.city,
				province: parsedData.province,
				country: parsedData.country,
				issueDate: parsedData.issueDate,
				expiryDate: parsedData.expiryDate,
				expiresAt,
				isExpired: expiresAt < new Date(),
				frontImageUrl: input.frontImageUrl,
				backImageUrl: input.backImageUrl,
				faceImageUrl: input.faceImageUrl,
				ocrConfidenceScore: parsedData.ocrConfidenceScore,
				ocrTransactionId: input.ocrTransactionId,
				rawOcrData: input.rawOcrData,
				isVerified: input.isVerified ?? false,
				verifiedAt: input.isVerified ? verifiedAt : undefined,
				verificationMethod: input.verificationMethod,
			})
			.returning({ id: savedIds.id })

		console.log("✅ Created new saved ID:", created!.id)

		return {
			success: true,
			savedIdId: created!.id,
		}
	} catch (error) {
		console.error("❌ Failed to create saved ID:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to create saved ID",
		}
	}
}

/**
 * Save ID card details to database (legacy compatibility wrapper).
 * Creates or updates the user's ID card record AND creates a saved_ids row.
 */
export async function saveIdCardDetails(
	db: DB,
	input: SaveIdCardDetailsInput
): Promise<{ success: boolean; idCardDetailId?: string; savedIdId?: string; error?: string }> {
	try {
		// Parse the OCR data
		const parsedData = parseIdCardOcrData(input.rawOcrData, {
			countryId: input.countryId,
			documentId: input.documentId,
		})

		// Check if user already has an ID card record
		const existingRecord = await db.query.idCardDetails.findFirst({
			where: eq(idCardDetails.userId, input.userId),
			orderBy: [desc(idCardDetails.createdAt)],
		})

		const idCardData = {
			userId: input.userId,
			documentType: parsedData.documentType,
			documentNumber: parsedData.documentNumber,
			documentCountry: parsedData.documentCountry,
			firstName: parsedData.firstName,
			middleName: parsedData.middleName,
			lastName: parsedData.lastName,
			fullName: parsedData.fullName,
			dateOfBirth: parsedData.dateOfBirth,
			gender: parsedData.gender,
			nationality: parsedData.nationality,
			addressLine1: parsedData.addressLine1,
			addressLine2: parsedData.addressLine2,
			city: parsedData.city,
			province: parsedData.province,
			postalCode: parsedData.postalCode,
			country: parsedData.country,
			issueDate: parsedData.issueDate,
			expiryDate: parsedData.expiryDate,
			isExpired: parsedData.isExpired,
			additionalFields: parsedData.additionalFields,
			ocrConfidenceScore: parsedData.ocrConfidenceScore,
			ocrProvider: input.ocrProvider ?? "hyperverge",
			ocrTransactionId: input.ocrTransactionId,
			rawOcrData: input.rawOcrData,
			frontImageUrl: input.frontImageUrl,
			backImageUrl: input.backImageUrl,
			faceImageUrl: input.faceImageUrl,
			isVerified: input.isVerified ?? false,
			verifiedAt: input.verifiedAt ?? (input.isVerified ? new Date() : undefined),
			verificationMethod: input.verificationMethod,
		}

		let idCardDetailId: string

		if (existingRecord) {
			// Update existing record
			const [updated] = await db
				.update(idCardDetails)
				.set({
					...idCardData,
					updatedAt: new Date(),
				})
				.where(eq(idCardDetails.id, existingRecord.id))
				.returning({ id: idCardDetails.id })

			idCardDetailId = updated?.id ?? existingRecord.id
			console.log("✅ Updated existing ID card details:", idCardDetailId)
		} else {
			// Create new record
			const [created] = await db
				.insert(idCardDetails)
				.values(idCardData)
				.returning({ id: idCardDetails.id })

			idCardDetailId = created!.id
			console.log("✅ Created new ID card details:", idCardDetailId)
		}

		// Also create a saved_ids row (multi-ID model)
		const savedIdResult = await createSavedIdFromOcr(db, input)

		return {
			success: true,
			idCardDetailId,
			savedIdId: savedIdResult.savedIdId,
		}
	} catch (error) {
		console.error("❌ Failed to save ID card details:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to save ID card details",
		}
	}
}

/**
 * Get ID card details for a user
 */
export async function getUserIdCardDetails(db: DB, userId: string) {
	return db.query.idCardDetails.findFirst({
		where: eq(idCardDetails.userId, userId),
		orderBy: [desc(idCardDetails.createdAt)],
	})
}

/**
 * Get verified ID card details for a user (for notarial book)
 */
export async function getUserVerifiedIdCardDetails(db: DB, userId: string) {
	const allRecords = await db.query.idCardDetails.findMany({
		where: eq(idCardDetails.userId, userId),
		orderBy: [desc(idCardDetails.verifiedAt)],
	})

	// Return the most recent verified record
	return allRecords.find(record => record.isVerified) ?? null
}
