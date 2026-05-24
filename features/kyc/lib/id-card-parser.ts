/**
 * ID Card OCR Parser
 * Parses raw OCR data from HyperVerge and other providers into structured IdCardDetail format
 */

import type { IdDocumentType } from "@/services/drizzle/schema/id-card-details"

export interface ParsedIdCardData {
	documentType: IdDocumentType
	documentNumber?: string
	documentCountry: string
	firstName?: string
	middleName?: string
	lastName?: string
	fullName?: string
	dateOfBirth?: string
	gender?: string
	nationality?: string
	addressLine1?: string
	addressLine2?: string
	city?: string
	province?: string
	postalCode?: string
	country?: string
	issueDate?: string
	expiryDate?: string
	isExpired: boolean
	additionalFields?: Record<string, unknown>
	ocrConfidenceScore?: number
}

/**
 * Common field name variations for each data type
 */
const FIELD_MAPPINGS = {
	// Document identification
	documentNumber: [
		"idNumber",
		"id_number",
		"documentNumber",
		"document_number",
		"cardNumber",
		"card_number",
		"licenseNumber",
		"license_number",
		"passportNumber",
		"passport_number",
		"number",
	],

	// Personal info - First Name
	firstName: [
		"firstName",
		"first_name",
		"givenName",
		"given_name",
		"givenNames",
		"given_names",
		"name",
	],

	// Personal info - Middle Name
	middleName: ["middleName", "middle_name", "middleInitial", "middle_initial"],

	// Personal info - Last Name
	lastName: [
		"lastName",
		"last_name",
		"surname",
		"familyName",
		"family_name",
		"familyNames",
		"family_names",
	],

	// Personal info - Full Name
	fullName: ["fullName", "full_name", "name", "completeName", "complete_name"],

	// Date of Birth
	dateOfBirth: [
		"dateOfBirth",
		"date_of_birth",
		"dob",
		"birthDate",
		"birth_date",
		"birthday",
		"yearOfBirth",
		"year_of_birth",
	],

	// Gender
	gender: ["gender", "sex"],

	// Nationality
	nationality: ["nationality", "citizen", "citizenship"],

	// Address
	address: ["address", "fullAddress", "full_address", "residentialAddress", "residential_address"],
	addressLine1: ["addressLine1", "address_line1", "street", "streetAddress", "street_address"],
	addressLine2: ["addressLine2", "address_line2"],
	city: ["city", "municipality", "cityMunicipality", "city_municipality"],
	province: ["province", "state", "region"],
	postalCode: ["postalCode", "postal_code", "zipCode", "zip_code", "zip"],
	country: ["country", "countryOfResidence", "country_of_residence"],

	// Document validity
	issueDate: ["issueDate", "issue_date", "dateIssued", "date_issued", "issuedDate", "issued_date"],
	expiryDate: [
		"expiryDate",
		"expiry_date",
		"expirationDate",
		"expiration_date",
		"validUntil",
		"valid_until",
		"dateOfExpiry",
		"date_of_expiry",
	],
} as const

/**
 * Normalize field name for consistent lookup
 */
function normalizeFieldName(field: string): string {
	return field.toLowerCase().replace(/[_\s-]/g, "")
}

/**
 * Extract string value from potentially nested OCR data
 * Handles both direct strings and nested objects with {value, confidence} structure
 */
function extractValue(fieldValue: unknown): string | undefined {
	// Direct string value
	if (typeof fieldValue === "string" && fieldValue.trim()) {
		return fieldValue.trim()
	}

	// Nested object with value property (HyperVerge structure)
	if (fieldValue && typeof fieldValue === "object" && "value" in fieldValue) {
		const nestedValue = (fieldValue as { value: unknown }).value
		if (typeof nestedValue === "string" && nestedValue.trim()) {
			return nestedValue.trim()
		}
	}

	return undefined
}

/**
 * Extract value from OCR data using field name variations
 */
function extractField(
	ocrData: Record<string, unknown>,
	fieldVariations: readonly string[]
): string | undefined {
	// Try exact matches first
	for (const variation of fieldVariations) {
		if (variation in ocrData) {
			const extracted = extractValue(ocrData[variation])
			if (extracted) return extracted
		}
	}

	// Try normalized matches
	const normalizedOcrData = new Map<string, unknown>()
	for (const [key, value] of Object.entries(ocrData)) {
		normalizedOcrData.set(normalizeFieldName(key), value)
	}

	for (const variation of fieldVariations) {
		const normalized = normalizeFieldName(variation)
		if (normalizedOcrData.has(normalized)) {
			const extracted = extractValue(normalizedOcrData.get(normalized))
			if (extracted) return extracted
		}
	}

	return undefined
}

interface ParsedNameParts {
	firstName?: string
	middleName?: string
	lastName?: string
}

function parseNamePartsFromFullName(value: string): ParsedNameParts {
	const fullName = value.replace(/\s+/g, " ").trim()
	if (!fullName) return {}

	// Format: "LASTNAME, FIRSTNAME ... MIDDLENAME" (middleName = last word after comma)
	if (fullName.includes(",")) {
		const [rawLastName, ...rest] = fullName.split(",")
		const lastName = rawLastName?.trim() || undefined
		const trailing = rest.join(" ").trim()
		const trailingParts = trailing.split(/\s+/).filter(Boolean)

		if (trailingParts.length === 0) {
			return lastName ? { lastName } : {}
		}

		const middleName = trailingParts[trailingParts.length - 1]
		const firstName =
			trailingParts.length > 1 ? trailingParts.slice(0, -1).join(" ") : trailingParts[0]
		return {
			firstName,
			middleName: trailingParts.length > 1 ? middleName : undefined,
			lastName,
		}
	}

	// Fallback for non-comma format: FIRST [MIDDLE ...] LAST
	const parts = fullName.split(/\s+/).filter(Boolean)
	if (parts.length === 1) {
		return { firstName: parts[0] }
	}
	if (parts.length === 2) {
		return { firstName: parts[0], lastName: parts[1] }
	}

	return {
		firstName: parts[0],
		middleName: parts.slice(1, -1).join(" "),
		lastName: parts[parts.length - 1],
	}
}

/**
 * Detect document type from OCR data
 */
function detectDocumentType(
	ocrData: Record<string, unknown>,
	countryId?: string,
	documentId?: string
): IdDocumentType {
	const dataStr = JSON.stringify(ocrData).toLowerCase()

	// Check documentId parameter first (from direct API)
	if (documentId) {
		const docIdLower = documentId.toLowerCase()
		if (docIdLower.includes("national") || docIdLower.includes("umid")) return "NATIONAL_ID"
		if (docIdLower.includes("driver") || docIdLower.includes("dl")) return "DRIVERS_LICENSE"
		if (docIdLower.includes("passport")) return "PASSPORT"
		if (docIdLower.includes("voter")) return "VOTERS_ID"
		if (docIdLower.includes("sss")) return "SSS_ID"
		if (docIdLower.includes("philhealth")) return "PHILHEALTH_ID"
		if (docIdLower.includes("tin")) return "TIN_ID"
		if (docIdLower.includes("postal")) return "POSTAL_ID"
		if (docIdLower.includes("prc")) return "PRC_ID"
	}

	// Check OCR data content
	if (dataStr.includes("national") || dataStr.includes("philsys") || dataStr.includes("umid"))
		return "NATIONAL_ID"
	if (
		dataStr.includes("driver") ||
		dataStr.includes("license") ||
		dataStr.includes("restriction") ||
		dataStr.includes("class")
	)
		return "DRIVERS_LICENSE"
	if (dataStr.includes("passport")) return "PASSPORT"
	if (dataStr.includes("voter") || dataStr.includes("comelec")) return "VOTERS_ID"
	if (dataStr.includes("sss") || dataStr.includes("social security")) return "SSS_ID"
	if (dataStr.includes("philhealth")) return "PHILHEALTH_ID"
	if (dataStr.includes("tin") || dataStr.includes("bir")) return "TIN_ID"
	if (dataStr.includes("postal")) return "POSTAL_ID"
	if (dataStr.includes("prc") || dataStr.includes("professional regulation")) return "PRC_ID"

	return "OTHER"
}

/**
 * Check if document is expired
 */
function checkIfExpired(expiryDateStr?: string): boolean {
	if (!expiryDateStr) return false

	try {
		// Try to parse various date formats
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		// Common formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY
		let expiryDate: Date | null = null

		// Try ISO format first
		if (/^\d{4}-\d{2}-\d{2}/.test(expiryDateStr)) {
			expiryDate = new Date(expiryDateStr)
		}
		// Try MM/DD/YYYY (or DD/MM/YYYY - ambiguous, we assume MM/DD/YYYY)
		else if (/^\d{2}\/\d{2}\/\d{4}/.test(expiryDateStr)) {
			const [month, day, year] = expiryDateStr.split("/")
			expiryDate = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!))
		}

		if (expiryDate && !isNaN(expiryDate.getTime())) {
			return expiryDate < today
		}
	} catch (error) {
		console.warn("Could not parse expiry date:", expiryDateStr, error)
	}

	return false
}

/**
 * Calculate average OCR confidence score
 */
function calculateConfidenceScore(ocrData: Record<string, unknown>): number | undefined {
	const confidenceMap: Record<string, number> = {
		high: 0.9,
		medium: 0.7,
		low: 0.5,
	}

	let totalScore = 0
	let count = 0

	for (const value of Object.values(ocrData)) {
		if (value && typeof value === "object" && "confidence" in value) {
			const conf = (value as { confidence: unknown }).confidence
			if (typeof conf === "string") {
				const score = confidenceMap[conf.toLowerCase()]
				if (score !== undefined) {
					totalScore += score
					count++
				}
			} else if (typeof conf === "number") {
				totalScore += conf
				count++
			}
		}
	}

	return count > 0 ? totalScore / count : undefined
}

/**
 * Parse raw OCR data into structured format
 */
export function parseIdCardOcrData(
	rawOcrData: Record<string, unknown>,
	options?: {
		countryId?: string
		documentId?: string
	}
): ParsedIdCardData {
	// Extract all fields
	const documentNumber = extractField(rawOcrData, FIELD_MAPPINGS.documentNumber)
	let firstName = extractField(rawOcrData, FIELD_MAPPINGS.firstName)
	let middleName = extractField(rawOcrData, FIELD_MAPPINGS.middleName)
	let lastName = extractField(rawOcrData, FIELD_MAPPINGS.lastName)
	const fullName = extractField(rawOcrData, FIELD_MAPPINGS.fullName)
	const dateOfBirth = extractField(rawOcrData, FIELD_MAPPINGS.dateOfBirth)
	const gender = extractField(rawOcrData, FIELD_MAPPINGS.gender)
	const nationality = extractField(rawOcrData, FIELD_MAPPINGS.nationality)

	// Backfill missing segmented name fields from common full-name formats.
	if ((!firstName || !lastName) && fullName) {
		const parsed = parseNamePartsFromFullName(fullName)
		firstName = firstName ?? parsed.firstName
		middleName = middleName ?? parsed.middleName
		lastName = lastName ?? parsed.lastName
	}

	// Address fields
	const address = extractField(rawOcrData, FIELD_MAPPINGS.address)
	const addressLine1 = extractField(rawOcrData, FIELD_MAPPINGS.addressLine1) ?? address
	const addressLine2 = extractField(rawOcrData, FIELD_MAPPINGS.addressLine2)
	const city = extractField(rawOcrData, FIELD_MAPPINGS.city)
	const province = extractField(rawOcrData, FIELD_MAPPINGS.province)
	const postalCode = extractField(rawOcrData, FIELD_MAPPINGS.postalCode)
	const country = extractField(rawOcrData, FIELD_MAPPINGS.country)

	// Document dates
	const issueDate = extractField(rawOcrData, FIELD_MAPPINGS.issueDate)
	const expiryDate = extractField(rawOcrData, FIELD_MAPPINGS.expiryDate)

	// Detect document type
	const documentType = detectDocumentType(rawOcrData, options?.countryId, options?.documentId)

	// Extract additional fields (anything not already mapped)
	const mappedFieldsSet = new Set<string>()
	for (const variations of Object.values(FIELD_MAPPINGS)) {
		for (const v of variations) {
			mappedFieldsSet.add(normalizeFieldName(v))
		}
	}

	const additionalFields: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(rawOcrData)) {
		const normalized = normalizeFieldName(key)
		if (!mappedFieldsSet.has(normalized) && value !== null && value !== undefined) {
			additionalFields[key] = value
		}
	}

	// Calculate OCR confidence score
	const ocrConfidenceScore = calculateConfidenceScore(rawOcrData)

	return {
		documentType,
		documentNumber,
		documentCountry: options?.countryId?.toUpperCase() ?? "PHL",
		firstName,
		middleName,
		lastName,
		fullName: fullName ?? [firstName, middleName, lastName].filter(Boolean).join(" "),
		dateOfBirth,
		gender,
		nationality,
		addressLine1,
		addressLine2,
		city,
		province,
		postalCode,
		country,
		issueDate,
		expiryDate,
		isExpired: checkIfExpired(expiryDate),
		additionalFields: Object.keys(additionalFields).length > 0 ? additionalFields : undefined,
		ocrConfidenceScore,
	}
}

/**
 * Parse OCR data from JSON string (for existing kycOcrExtractedFieldsJson)
 */
export function parseIdCardOcrFromJson(
	jsonString: string,
	options?: {
		countryId?: string
		documentId?: string
	}
): ParsedIdCardData | null {
	try {
		const rawData: unknown = JSON.parse(jsonString)
		if (typeof rawData !== "object" || rawData === null) {
			return null
		}
		return parseIdCardOcrData(rawData as Record<string, unknown>, options)
	} catch (error) {
		console.error("Failed to parse OCR JSON:", error)
		return null
	}
}
