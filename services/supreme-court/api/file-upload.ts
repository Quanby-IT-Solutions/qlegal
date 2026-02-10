import { post } from "@/services/supreme-court/lib/http-client"

interface PresignedUrlRequest {
	/** Notarial Registry Number from metadata creation (required for file association) */
	notarialRegistryNumber: string
	/** NOTE: fileName must match the name of the file being uploaded to S3 */
	uploadedFiles: Array<{ fileName: string; mimetype: string }>
}

interface PresignedUrlEntry {
	url: string
	fileName: string
}

interface PresignedUrlResponse {
	preSignedUrls: PresignedUrlEntry[]
}

interface FileMetadataRequest {
	notarialRegistryID?: string
	notarialRegistryNumber?: string
	notarialDocumentType?: string
	files: string[] // Array of fileNames from presigned URL response (use response fileName values)
}

interface FileMetadataResponse {
	message: string
}

/**
 * Generate a pre-signed URL for file upload.
 * Endpoint: POST /public-use/presigned-url
 *
 * Must be called AFTER metadata creation (need NRN).
 * NOTE: The "fileName" field must match the name of the file being uploaded.
 *
 * @param notarialRegistryNumber - NRN from metadata creation
 * @param fileName - Must match the name of the file being uploaded
 * @returns Array of { url, fileName } - use response fileName in registerFileMetadata
 */
export async function getPresignedUrl(
	notarialRegistryNumber: string,
	fileName: string
): Promise<PresignedUrlEntry> {
	const body: PresignedUrlRequest = {
		notarialRegistryNumber,
		uploadedFiles: [{ fileName, mimetype: "application/pdf" }],
	}
	const response = await post("/public-use/presigned-url", body)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Supreme Court presigned URL failed: ${response.status} - ${errorText}`
		)
	}

	const data = (await response.json()) as PresignedUrlResponse
	const entry = data.preSignedUrls?.[0]
	if (!entry?.url || !entry?.fileName) {
		throw new Error("Supreme Court presigned URL response missing url or fileName")
	}
	return entry
}

/**
 * Upload file to S3 using pre-signed URL.
 * Endpoint: PUT <pre-signed-url>
 *
 * - Send payload in binary format with Content-Type: application/pdf
 * - Use the "url" from the Pre-Signed URL response directly as the upload destination
 * - No Authorization header needed (pre-signed URL contains credentials)
 *
 * @param presignedUrl - URL from getPresignedUrl response (use directly as upload destination)
 * @param fileBuffer - File content as Buffer (binary)
 * @param contentType - MIME type (application/pdf)
 */
export async function uploadFileToS3(
	presignedUrl: string,
	fileBuffer: Buffer,
	contentType = "application/pdf"
): Promise<void> {
	const response = await fetch(presignedUrl, {
		method: "PUT",
		headers: {
			"Content-Type": contentType,
		},
		body: new Uint8Array(fileBuffer),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`S3 upload failed: ${response.status} - ${errorText}`)
	}
}

/**
 * Store file metadata in Supreme Court database.
 * Endpoint: POST /public-use/file
 *
 * NOTE: Assign the "fileName" from the Pre-Signed URL response as the values within the "files" array.
 * The response fileName includes the NRN prefix (e.g. "NRN-xxx-2025-file1.pdf").
 *
 * @param notarialRegistryNumber - NRN from metadata creation (API may accept NRID or NRN)
 * @param fileNames - Array of fileName values from presigned URL response
 */
export async function registerFileMetadata(
	notarialRegistryNumber: string,
	fileNames: string[]
): Promise<FileMetadataResponse> {
	const body: FileMetadataRequest = {
		notarialRegistryNumber,
		notarialDocumentType: "Notarial Document",
		files: fileNames,
	}
	const response = await post("/public-use/file", body)

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(
			`Supreme Court file metadata registration failed: ${response.status} - ${errorText}`
		)
	}

	const data = (await response.json()) as FileMetadataResponse
	return data
}
