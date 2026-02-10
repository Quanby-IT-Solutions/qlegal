import type { InferSelectModel } from "drizzle-orm"

import { notarialActs } from "@/services/drizzle/schema/notarial-book"

import { createMetadata } from "@/services/supreme-court/api/metadata"
import { getPresignedUrl, registerFileMetadata, uploadFileToS3 } from "@/services/supreme-court/api/file-upload"

type NotarialAct = InferSelectModel<typeof notarialActs>

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

/**
 * Parse address string into SC API format.
 * Expected format: "Street, Barangay, City/Province" or similar
 */
function parseAddress(addressText: string | null | undefined): {
	homeStreet: string
	barangay: string
	cityProvince: string
} {
	if (!addressText) {
		return {
			homeStreet: "",
			barangay: "",
			cityProvince: "",
		}
	}

	// Try to parse common formats
	// Format 1: "Street, Barangay, City Province"
	// Format 2: "Street Barangay City Province"
	const parts = addressText.split(",").map(p => p.trim())

	if (parts.length >= 3) {
		return {
			homeStreet: parts[0] || "",
			barangay: parts[1] || "",
			cityProvince: parts.slice(2).join(", ") || "",
		}
	}

	if (parts.length === 2) {
		return {
			homeStreet: parts[0] || "",
			barangay: "",
			cityProvince: parts[1] || "",
		}
	}

	// Fallback: put everything in homeStreet
	return {
		homeStreet: addressText,
		barangay: "",
		cityProvince: "",
	}
}

/**
 * Map our actType to SC API format.
 */
function mapActType(actType: string): "Acknowledgment" | "Affirmation" | "Jurat" | "Signature Witnessing" {
	const upper = actType.toUpperCase()
	if (upper === "ACKNOWLEDGMENT") return "Acknowledgment"
	if (upper === "AFFIRMATION") return "Affirmation"
	if (upper === "JURAT") return "Jurat"
	if (upper === "SIGNATURE_WITNESSING") return "Signature Witnessing"
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
 * 2. Creates metadata with principals and witnesses (consolidated endpoint)
 * 3. Optionally uploads document file if provided
 * 4. Returns NRID and NRN for storage
 */
export async function syncNotarialActToSupremeCourt(
	options: SyncNotarialActOptions
): Promise<SyncResult> {
	const { act, notaryFacilityNumber, notaryPublicNumber, rollNumber, documentFile, documentFileName } =
		options

	// Map principal address
	const principalAddress = parseAddress(act.principalAddress)

	// Build principals list
	const principals = [
		{
			principalName: act.principalName,
			principalAddress,
		},
	]

	// Build witnesses list (if witness exists)
	const witnesses: Array<{ witnessName: string; witnessAddress: { homeStreet: string; barangay: string; cityProvince: string } }> =
		[]
	if (act.witnessName) {
		const witnessAddress = parseAddress(act.principalAddress) // Use principal address as fallback if no separate witness address
		witnesses.push({
			witnessName: act.witnessName,
			witnessAddress,
		})
	}

	// Map workflow to modeOfNotarization
	const modeOfNotarization: "In-person" | "Remote" =
		act.workflow === "IEN" ? "Remote" : "In-person"

	// Create metadata request
	const metadataRequest = {
		notaryFacilityNumber,
		notaryPublicNumber,
		rollNumber,
		metaData: {
			dateNotarized: formatDate(act.executedAt),
			notarialActType: mapActType(act.actType),
			notarialPageNumber: 1, // TODO: Calculate actual page number from notarial book
			notarialBookNumber: 1, // TODO: Get actual book number
			description: act.documentDescription || act.documentName || "Notarial Act",
			modeOfNotarization,
			remarks: act.locationStatement || undefined,
			dateUpdated: formatDate(act.updatedAt),
		},
		listOfPrincipals: principals,
		listOfWitness: witnesses.length > 0 ? witnesses : undefined,
	}

	// Step 1: Create metadata (consolidated endpoint)
	console.log("🔵 Creating metadata in Supreme Court...")
	const metadataResult = await createMetadata(metadataRequest)
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
