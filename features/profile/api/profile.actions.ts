"use server"

import { getSupabaseAdminClient } from "@/services/supabase"

export async function createAvatarUploadUrl(fileName: string) {
	const supabase = getSupabaseAdminClient()

	const { data, error } = await supabase.storage
		.from("avatar")
		.createSignedUploadUrl(fileName, { upsert: true })

	if (error) {
		throw new Error(error.message)
	}

	return data // { signedUrl, path }
}

export async function createAvatarDownloadUrl(path: string) {
	const supabase = getSupabaseAdminClient()

	const { data, error } = await supabase.storage.from("avatar").createSignedUrl(path, 60 * 60) // valid for 1h

	if (error) {
		throw new Error(`Failed to create download URL: ${error.message}`)
	}

	return data.signedUrl
}

export async function getAvatarUrl(imagePath: string | null): Promise<string | null> {
	if (!imagePath) {
		return null
	}

	try {
		return await createAvatarDownloadUrl(imagePath)
	} catch {
		return null
	}
}
