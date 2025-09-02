import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
