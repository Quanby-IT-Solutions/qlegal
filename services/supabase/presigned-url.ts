import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod/v4"

import { getSupabaseClient } from "./index"

const presignedUrlSchema = z.object({
	file: z.instanceof(File, { message: "A file is required" }),
	bucket: z.string().min(1, "Bucket name is required"),
	folderPath: z.string().default(""),
	upsert: z.boolean().default(false),
})

export type PresignedUrlInput = z.input<typeof presignedUrlSchema>

async function generatePresignedUploadUrl(input: PresignedUrlInput) {
	const { file, bucket, folderPath, upsert } = presignedUrlSchema.parse(input)

	const fullPath = folderPath ? `${folderPath.replace(/^\/+|\/+$/g, "")}/${file.name}` : file.name

	const supabase = getSupabaseClient()
	const { data, error } = await supabase.storage
		.from(bucket)
		.createSignedUploadUrl(fullPath, { upsert })

	if (error) {
		throw new Error(`Failed to create signed upload URL: ${error.message}`)
	}

	return {
		signedUrl: data.signedUrl,
		path: data.path,
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
