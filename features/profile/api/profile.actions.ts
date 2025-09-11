"use server"

import { getServiceRoleClient } from "@/services/supabase"

export async function createAvatarUploadUrl(fileName: string) {
	const supabase = getServiceRoleClient()

	const { data, error } = await supabase.storage
		.from("avatars")
		.createSignedUploadUrl(fileName, { upsert: true })

	if (error) {
		throw new Error(error.message)
	}

	return data // { signedUrl, path }
}

export async function createAvatarDownloadUrl(path: string) {
	const supabase = getServiceRoleClient()

	const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 5) // valid for 5m

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

/**
 * Delete an avatar file from the avatars bucket.
 * Returns true if removal succeeded or false if file was not found.
 * Throws on unexpected Supabase errors.
 */
export async function deleteAvatar(path: string) {
	if (!path) {
		return false
	}

	const supabase = getServiceRoleClient()

	const { error } = await supabase.storage.from("avatars").remove([path])

	if (error) {
		// Supabase returns 404-like behavior as an error too; surface useful message
		// Let callers decide whether to treat this as fatal.
		throw new Error(error.message)
	}

	return true
}
