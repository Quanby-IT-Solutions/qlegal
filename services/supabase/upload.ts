/* eslint-disable no-console */
import { useMutation } from "@tanstack/react-query"
import { z } from "zod/v4"

const uploadFileSchema = z.object({
	signedUrl: z.string().url("Must be a valid URL"),
	file: z.instanceof(File, { message: "A file is required" }),
	contentType: z.string().optional(),
})

export type UploadFileInput = z.input<typeof uploadFileSchema>

async function uploadFileToSupabase(input: UploadFileInput) {
	const { signedUrl, file, contentType } = uploadFileSchema.parse(input)

	const uploadResponse = await fetch(signedUrl, {
		method: "PUT",
		headers: { "Content-Type": contentType ?? file.type },
		body: file,
	})

	if (!uploadResponse.ok) {
		throw new Error(`Upload failed with status ${uploadResponse.status}`)
	}

	return {
		success: true,
		status: uploadResponse.status,
		statusText: uploadResponse.statusText,
	}
}

/**
 * Hook for uploading files to Supabase using presigned URLs
 *
 * @example
 * const upload = useUploadFile()
 * await upload.mutateAsync({
 *   signedUrl: presignedUrl,
 *   file: selectedFile
 * })
 */
export function useUploadFile() {
	return useMutation({
		mutationFn: uploadFileToSupabase,
		onError: error => {
			console.error("Failed to upload file to Supabase:", error)
		},
	})
}
