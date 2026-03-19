import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod/v4"

import { getPublicClient } from "./index"

const signedUrlSchema = z.object({
	bucket: z.string().min(1, "Bucket name is required"),
	path: z.string().min(1, "File path is required"),
	expiresIn: z.number().optional(), // seconds, default: 3600 (1 hour)
})

export type SignedUrlInput = z.input<typeof signedUrlSchema>

async function generateSignedUrl(input: SignedUrlInput) {
	const { bucket, path, expiresIn = 3600 } = signedUrlSchema.parse(input)

	const supabase = getPublicClient()
	const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

	if (error) {
		throw new Error(`Failed to create signed download URL: ${error.message}`)
	}

	return {
		signedUrl: data.signedUrl,
		path,
	}
}

export function useSignedUrl() {
	return useMutation({
		mutationFn: generateSignedUrl,
		onError: error => toast.error(error.message),
	})
}

// New helper for public URLs (no expiration, for PDFs that should be publicly accessible)
export async function getPublicUrl(bucket: string, path: string): Promise<string> {
	const supabase = getPublicClient()

	const { data } = supabase.storage.from(bucket).getPublicUrl(path)

	if (!data.publicUrl) {
		throw new Error(`Could not generate public URL for bucket: ${bucket}, path: ${path}`)
	}

	return data.publicUrl
}

// Helper function to determine the correct bucket based on path format
function getBucketName(path: string): string {
	// If the path contains slashes, it's likely from the envelope system (e.g., "envelopeId/unsigned/filename.pdf")
	// If it's just a filename without slashes, it's from the legacy system
	return path.includes("/") ? "envelopes" : "documents"
}

// Helper specifically for document paths - auto-detects correct bucket
export async function getDocumentPublicUrl(documentPath: string): Promise<string> {
	console.log("Getting document public URL for path:", documentPath)

	// For documents that only have a filename, we need to try different approaches
	if (!documentPath.includes("/")) {
		// Try multiple possible locations for the file
		const possiblePaths = [
			// Try documents bucket with original filename
			{ bucket: "documents", path: documentPath },
			// Try envelopes bucket with original filename (in case it was uploaded there)
			{ bucket: "envelopes", path: documentPath },
			// Try with a common folder structure
			{ bucket: "documents", path: `uploads/${documentPath}` },
			{ bucket: "envelopes", path: `uploads/${documentPath}` },
		]

		for (const { bucket, path } of possiblePaths) {
			try {
				console.log(`Trying ${bucket}/${path}`)
				const url = await getPublicUrl(bucket, path)
				console.log(`Success! Found file at ${bucket}/${path}`)
				return url
			} catch (error) {
				console.log(`File not found at ${bucket}/${path}:`, error)
				continue
			}
		}

		// If none of the paths work, throw a descriptive error
		throw new Error(
			`Document file not found. Tried multiple locations for path: ${documentPath}. ` +
				`Please ensure the file was properly uploaded to Supabase storage.`
		)
	}

	// For paths with slashes, use the normal logic
	const bucketName = getBucketName(documentPath)
	console.log(`Using ${bucketName} bucket for path: ${documentPath}`)
	return getPublicUrl(bucketName, documentPath)
}
