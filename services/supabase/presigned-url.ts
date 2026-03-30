import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod/v4"

import { getPublicClient } from "./index"

const presignedUrlSchema = z.object({
	file: z.instanceof(File, { message: "A file is required" }),
	bucket: z.string().min(1, "Bucket name is required"),
	folderPath: z.string().default(""),
	upsert: z.boolean().default(false),
})

export type PresignedUrlInput = z.input<typeof presignedUrlSchema>

async function generatePresignedUploadUrl(input: PresignedUrlInput) {
	const { file, bucket, folderPath, upsert } = presignedUrlSchema.parse(input)

	// Use a server route that generates the signed URL using the Supabase service role.
	// This avoids RLS blocking `createSignedUploadUrl` for the client.
	const res = await fetch("/api/supabase/presigned-upload-url", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			fileName: file.name,
			bucket,
			folderPath,
			upsert,
		}),
	})

	if (!res.ok) {
		const json = (await res.json().catch(() => null)) as { error?: string } | null
		throw new Error(json?.error ?? `Failed to create signed upload URL (${res.status})`)
	}

	const json = (await res.json()) as { signedUrl: string; path: string }

	return {
		signedUrl: json.signedUrl,
		path: json.path,
		fileName: file.name,
	}
}

/**
 * Hook for generating presigned upload URLs for Supabase storage
 *
 * @example
 * const presignedUrl = usePresignedUrl()
 * const result = await presignedUrl.mutateAsync({
 *   file: selectedFile,
 *   bucket: "documents",
 *   folderPath: "contracts/legal"
 * })
 */
export function usePresignedUrl() {
	return useMutation({
		mutationFn: generatePresignedUploadUrl,
		onError: error => toast.error(error.message),
	})
}

// Convert Supabase storage path to public URL for avatar bucket
export async function getAvatarPublicUrl(path: string | null): Promise<string | null> {
	if (!path) return null

	// If it's already a full URL, return it
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path
	}

	try {
		const supabase = getPublicClient()
		const { data } = supabase.storage.from("avatar").getPublicUrl(path)
		return data.publicUrl
	} catch (error) {
		console.error("Failed to get avatar public URL:", error)
		return null
	}
}
