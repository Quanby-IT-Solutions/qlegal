import { signOut } from "next-auth/react"

/**
 * Shared logout utility that clears KYC skip session cookie and signs out the user.
 * This ensures consistent logout behavior across the application.
 * @param callbackUrl - Optional callback URL to redirect to after logout. Defaults to "/"
 */
export async function handleLogout(callbackUrl = "/"): Promise<void> {
	try {
		// Clear KYC skip session cookie before logout
		document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
		await signOut({
			redirect: true,
			callbackUrl,
		})
	} catch {
		// Fallback: Clear cookie and sign out without redirect on error
		document.cookie = "skipKycSession=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
		void signOut()
	}
}
