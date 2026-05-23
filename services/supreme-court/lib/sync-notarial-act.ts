import { getCommissionStatus } from "@/services/supreme-court/api/commission-status"
import {
	getPresignedUrl,
	registerFileMetadata,
	uploadFileToS3,
} from "@/services/supreme-court/api/file-upload"
import { createMetadataConsolidated } from "@/services/supreme-court/api/metadata"

import { env } from "@/env"

type NotarialAct =
	// Minimal shape we need from the `notarialActs` row for SC sync.
	{
		actType: string
		workflow: string | null
		principalName: string | null
		principalAddress: string | null
		witnessName: string | null
		documentName: string | null
		documentDescription: string | null
		locationStatement: string | null
		executedAt: Date
		updatedAt: Date
	}

interface SyncNotarialActOptions {
	/** Notarial act to sync */
	act: NotarialAct
	/** ENP's Notary Facility Number (NFN) */
	notaryFacilityNumber: string
	/** ENP's Notary Public Number (NPN) */
	notaryPublicNumber: string
	/** ENP's Roll Number (RN) */
	rollNumber: string
	/** Optional: Document file buffer if file needs to be uploaded */
	documentFile?: Buffer
	/** Optional: Document file name if file needs to be uploaded */
	documentFileName?: string
}

interface SyncResult {
	notarialRegistryID: string // NRID
	notarialRegistryNumber: string // NRN
}

/** SC API requires non-empty principalAddress fields; use this when value is missing */
const ADDRESS_NOT_SPECIFIED = "Not specified"

/**
 * Normalize Supreme Court identifiers to expected format.
 * Per SC API v1.4: System auto-prepends NPN-/NFN-/RN- if not included, but some
 * implementations expect the prefix. Ensure consistent format.
 */
function normalizeIdentifier(value: string, prefix: "NPN" | "NFN" | "RN"): string {
	const trimmed = value?.trim() ?? ""
	if (!trimmed) return trimmed
	const upperPrefix = `${prefix}-`
	if (trimmed.toUpperCase().startsWith(upperPrefix)) return trimmed
	// If value is just digits (e.g. "12341"), prepend prefix
	if (/^\d+$/.test(trimmed)) return `${upperPrefix}${trimmed}`
	return trimmed
}

/**
 * Parse address string into SC API format.
 * Expected format: "Street, Barangay, City/Province" or similar.
 * Returns non-empty strings for all fields (SC API requires homeStreet, barangay, cityProvince).
 */
function parseAddress(addressText: string | null | undefined): {
	homeStreet: string
	barangay: string
	cityProvince: string
} {
	const empty = {
		homeStreet: ADDRESS_NOT_SPECIFIED,
		barangay: ADDRESS_NOT_SPECIFIED,
		cityProvince: ADDRESS_NOT_SPECIFIED,
	}

	if (!addressText?.trim()) {
		return empty
	}

	// Try to parse common formats
	// Format 1: "Street, Barangay, City Province"
	// Format 2: "Street Barangay City Province"
	const parts = addressText
		.split(",")
		.map(p => p.trim())
		.filter(Boolean)

	if (parts.length >= 3) {
		const cityProvince = parts.slice(2).join(", ").trim()
		return {
			homeStreet: parts[0] ?? ADDRESS_NOT_SPECIFIED,
			barangay: parts[1] ?? ADDRESS_NOT_SPECIFIED,
			cityProvince: cityProvince || ADDRESS_NOT_SPECIFIED,
		}
	}

	if (parts.length === 2) {
		return {
			homeStreet: parts[0] ?? ADDRESS_NOT_SPECIFIED,
			barangay: ADDRESS_NOT_SPECIFIED,
			cityProvince: parts[1] ?? ADDRESS_NOT_SPECIFIED,
		}
	}

	// Single part: use as homeStreet, fill the rest so SC API accepts
	return {
		homeStreet: addressText.trim(),
		barangay: ADDRESS_NOT_SPECIFIED,
		cityProvince: ADDRESS_NOT_SPECIFIED,
	}
}

/**
 * Map our actType to SC API format.
 * Per SC API v1.4: "Acknowledgment" | "Affirmation" | "Jurat" | "Signature Witnessing" | "Copy Certification"
 */
function mapActType(
	actType: string
): "Acknowledgment" | "Affirmation" | "Jurat" | "Signature Witnessing" | "Copy Certification" {
	const upper = actType.toUpperCase()
	if (upper === "ACKNOWLEDGMENT") return "Acknowledgment"
	if (upper === "AFFIRMATION") return "Affirmation"
	if (upper === "JURAT") return "Jurat"
	if (upper === "SIGNATURE_WITNESSING") return "Signature Witnessing"
	if (upper === "COPY_CERTIFICATION") return "Copy Certification"
	// Default fallback
	return "Acknowledgment"
}

/**
 * Format date to YYYY-MM-DD format.
 */
function formatDate(date: Date | null | undefined): string {
	if (!date) {
		return new Date().toISOString().split("T")[0]!
	}
	return date.toISOString().split("T")[0]!
}

/**
 * Sync a notarial act to Supreme Court eNotarization API.
 *
 * This function:
 * 1. Maps our notarialActs schema to SC API format
 * 2. Creates metadata, principals, and witnesses via POST /public-use/consolidated (one call)
 * 3. Optionally uploads document file if provided
 * 4. Returns NRID and NRN for storage
 */
export async function syncNotarialActToSupremeCourt(
	options: SyncNotarialActOptions
): Promise<SyncResult> {
	const { act, documentFile, documentFileName } = options

	// Normalize identifiers to SC API format (NPN-, NFN-, RN- prefixes)
	const nfn = normalizeIdentifier(options.notaryFacilityNumber, "NFN")
	const npn = normalizeIdentifier(options.notaryPublicNumber, "NPN")
	const rn = normalizeIdentifier(options.rollNumber, "RN")

	// Validate commission status before syncing
	// Per SC API v1.4: "The system rejects any request to create Notarial Metadata
	// wherein either the Commission Status or Accreditation Status is classified as Inactive."
	try {
		const commissionStatus = await getCommissionStatus(npn, rn)
		if (commissionStatus.commissionStatus !== "Active") {
			throw new Error(
				`Cannot sync to Supreme Court: Commission status is "${commissionStatus.commissionStatus}". Only "Active" commissions can create notarial metadata.`
			)
		}
		console.log(`✅ Commission status verified: ${commissionStatus.commissionStatus}`)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		const status =
			error instanceof Error ? (error as Error & { status?: number }).status : undefined
		// Validation error (status is inactive) - throw it
		if (error instanceof Error && message.includes("Cannot sync")) {
			throw error
		}
		// Input validation from SC (invalid NPN/RN) is a hard failure; don't continue to consolidated.
		// Otherwise user sees a confusing "Rejected" later.
		if (status === 400 || message.toLowerCase().includes("invalid notary public number")) {
			throw new Error(
				`Cannot sync to Supreme Court: your ENP profile identifiers (NPN/RN) are invalid or not recognized by the Supreme Court API.\n\n` +
					`Provided identifiers:\n` +
					`- NFN: ${nfn}\n` +
					`- NPN: ${npn}\n` +
					`- RN: ${rn}\n\n` +
					`Fix: update the ENP profile to the official Supreme Court-issued numbers (or correct test credentials for the SC sandbox), then retry.`
			)
		}
		// Cognito auth failure: do not continue (would trigger a second auth attempt and lock the account faster)
		const isAuthError =
			message.includes("Cognito") ||
			message.includes("credentials") ||
			message.includes("NotAuthorizedException") ||
			message.includes("Password attempts") ||
			message.includes("Incorrect username")
		if (isAuthError) {
			throw error
		}
		// Other API errors (network, timeout): log and continue; SC API will reject if status is inactive
		console.warn(
			"⚠️ Could not verify commission status before sync (will proceed - SC API will reject if inactive):",
			message
		)
	}

	// Validate principal (SC API rejects empty principal)
	const principalName = (act.principalName ?? "").trim()
	if (!principalName) {
		throw new Error(
			"Cannot sync to Supreme Court: principalName is required. Please ensure the notarial act has principal information."
		)
	}

	// Map principal address
	const principalAddress = parseAddress(act.principalAddress)

	// Build principals list
	const principals = [
		{
			principalName,
			principalAddress,
		},
	]

	// Build witnesses list (if witness exists)
	const witnesses: Array<{
		witnessName: string
		witnessAddress: { homeStreet: string; barangay: string; cityProvince: string }
	}> = []
	if (act.witnessName) {
		const witnessAddress = parseAddress(act.principalAddress) // Use principal address as fallback if no separate witness address
		witnesses.push({
			witnessName: act.witnessName,
			witnessAddress,
		})
	}

	// Map workflow to modeOfNotarization: REN = Remote (video), IEN = In-person
	const modeOfNotarization: "In-person" | "Remote" = act.workflow === "REN" ? "Remote" : "In-person"

	// Create consolidated request (POST /public-use/consolidated - metadata + principals + witnesses in one call)
	const consolidatedRequest = {
		notaryFacilityNumber: nfn,
		notaryPublicNumber: npn,
		rollNumber: rn,
		metaData: {
			dateNotarized: formatDate(act.executedAt),
			notarialActType: mapActType(act.actType),
			notarialPageNumber: 1, // TODO: Calculate actual page number from notarial book
			notarialBookNumber: 1, // TODO: Get actual book number
			description: (act.documentDescription ?? act.documentName ?? "Notarial Act").trim(),
			modeOfNotarization,
			remarks: act.locationStatement?.trim() ?? undefined,
			dateUpdated: formatDate(act.updatedAt),
		},
		listOfPrincipals: principals,
		// SC API expects an array; sending undefined causes server to crash (reading 'map' of undefined)
		listOfWitness: witnesses,
	}

	// Step 1: Create metadata, principals, and witnesses in one call (per PDF Section 6)
	console.log("🔵 Creating metadata (consolidated) in Supreme Court...")
	if (env.NODE_ENV === "development") {
		console.log("📋 [SC Sync] Payload:", JSON.stringify(consolidatedRequest, null, 2))
	}
	const metadataResult = await createMetadataConsolidated(consolidatedRequest)
	const { notarialRegistryID, notarialRegistryNumber } = metadataResult

	console.log(`✅ Metadata created: NRID=${notarialRegistryID}, NRN=${notarialRegistryNumber}`)

	// Step 2: Upload file if provided
	if (documentFile && documentFileName) {
		console.log(`🔵 Uploading document file: ${documentFileName}...`)

		// Step 2a: Get presigned URL (requires NRN from metadata)
		const presignedUrlResult = await getPresignedUrl(notarialRegistryNumber, documentFileName)
		console.log(`   - Got presigned URL for: ${presignedUrlResult.fileName}`)

		// Step 2b: Upload to S3
		await uploadFileToS3(presignedUrlResult.url, documentFile, "application/pdf")
		console.log(`   - File uploaded to S3`)

		// Step 2c: Register file metadata (use fileName from response - includes NRN prefix)
		await registerFileMetadata(notarialRegistryNumber, [presignedUrlResult.fileName])
		console.log(`   - File metadata registered`)
	}

	return {
		notarialRegistryID,
		notarialRegistryNumber,
	}
}
