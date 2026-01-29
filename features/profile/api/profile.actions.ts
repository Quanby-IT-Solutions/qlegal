"use server"

import { getServiceRoleClient } from "@/services/supabase"

export async function createAvatarUploadUrl(fileName: string) {
	const supabase = getServiceRoleClient()

	const { data, error } = await supabase.storage
		.from("avatar")
		.createSignedUploadUrl(fileName, { upsert: true })

	if (error) {
		throw new Error(error.message)
	}

	return data // { signedUrl, path }
}

/**
 * Delete an avatar file from the avatar bucket.
 * Returns true if removal succeeded or false if file was not found.
 * Throws on unexpected Supabase errors.
 */
export async function deleteAvatar(path: string) {
	if (!path) {
		return false
	}

	const supabase = getServiceRoleClient()

	const { error } = await supabase.storage.from("avatar").remove([path])

	if (error) {
		throw new Error(error.message)
	}

	return true
}

