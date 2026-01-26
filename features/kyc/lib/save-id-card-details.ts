/**
 * Save ID Card Details Service
 * Handles saving parsed OCR data to the id_card_details table
 */

import { eq, desc } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import type { schema } from "@/services/drizzle/schema"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"

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
}

/**
 * Save ID card details to database
 * Creates or updates the user's ID card record
 */
export async function saveIdCardDetails(
	db: DB,
	input: SaveIdCardDetailsInput
): Promise<{ success: boolean; idCardDetailId?: string; error?: string }> {
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

		return {
			success: true,
			idCardDetailId,
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
	return await db.query.idCardDetails.findFirst({
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
	return allRecords.find((record) => record.isVerified) ?? null
}
