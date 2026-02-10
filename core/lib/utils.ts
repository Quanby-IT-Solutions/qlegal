import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { env } from "@/env"

/**
 * Merge class names
 * @param inputs - Class values
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Get initials from a name string
 * @param name - Full name string
 * @returns Initials (max 2 characters)
 */
export function getInitials(name?: string | null): string {
	if (!name?.trim()) {
		return ""
	}

	const parts = name.trim().split(/\s+/)

	// Single word name
	if (parts.length === 1) {
		const word = parts[0] ?? ""
		return word.length <= 1 ? word : word.slice(0, 2).toUpperCase()
	}

	// Multiple word name - take first letter of first two words
	return parts
		.slice(0, 2)
		.map(word => word.charAt(0))
		.join("")
		.toUpperCase()
}

/**
 * Map a user role code to its human-readable label.
 * @param role - The role code (e.g., 'ENP', 'PRINCIPAL', 'ENA', 'ADMIN')
 * @returns The mapped label or an empty string if role is invalid.
 */
export function mapRoleToLabel(role?: string | null): string {
	if (!role) return ""
	switch (role) {
		case "ENP":
			return "Electronic Notary Public"
		case "PRINCIPAL":
			return "Principal"
		case "ENA":
			return "Electronic Notary Admin"
		case "ADMIN":
			return "Administrator"
		default:
			// fallback: try to convert any ALL_CAPS_WORD to Title Case with spaces (e.g., "LEGAL_OFFICER" -> "Legal Officer")
			return role
				.replace(/_/g, " ")
				.toLowerCase()
				.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1))
				.trim()
	}
}

/**
 * Get the full URL for an avatar image from Supabase Storage
 * @param avatar - Avatar path or URL (e.g. "userId/1770757323301-woman.jpg")
 * @returns Full URL for the avatar or null if not provided
 */
export function getAvatarUrl(avatar?: string | null): string | null {
	const trimmed = typeof avatar === "string" ? avatar.trim() : ""
	if (!trimmed) return null

	// If already a full URL (starts with http:// or https://), return as-is
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed
	}

	// Same format as supabase.storage.from("avatar").getPublicUrl(path).data.publicUrl
	const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
	if (!supabaseUrl) return null

	const base = supabaseUrl.replace(/\/+$/, "")
	const path = trimmed.replace(/^\/+/, "")
	return `${base}/storage/v1/object/public/avatar/${path}`
}
