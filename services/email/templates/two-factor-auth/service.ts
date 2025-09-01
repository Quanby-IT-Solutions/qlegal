import { render } from "@react-email/render"

import { TwoFactorEmail } from "@/services/email/templates/two-factor-auth/components/two-factor-email"

export interface TwoFactorEmailParams {
	user: { name?: string | null; email: string }
	code: string
	type: "login" | "enable" | "disable" | "reset"
}

/**
 * Generate email subject based on verification type
 */
export function generateSubject(type: string): string {
	switch (type) {
		case "login":
			return "Quanby Sign - Login Verification Code"
		case "enable":
			return "Quanby Sign - Two-Factor Authentication Setup"
		case "disable":
			return "Quanby Sign - Two-Factor Authentication Disabled"
		case "reset":
			return "Quanby Sign - Password Reset Code"
		default:
			return "Quanby Sign - Verification Code"
	}
}

/**
 * Generate plain text email content
 */
export function generateTextContent({ user, code, type }: TwoFactorEmailParams): string {
	const actionText =
		type === "login"
			? "complete your login"
			: type === "enable"
				? "enable two-factor authentication"
				: type === "disable"
					? "disable two-factor authentication"
					: "reset your password"

	return `
Hello ${user.name ?? user.email},

We received a request to ${actionText} for your Quanby Sign account.

Your verification code is: ${code}

This code will expire in 10 minutes and can only be used once.

For your security:
- Never share your verification codes with anyone
- Quanby Sign will never ask for your verification code via phone or email
- Always verify you're on the official Quanby Sign website
- If you didn't request this code, secure your account immediately

If you need help or have questions about your account security, please contact our support team.

This is an automated security message from Quanby Sign. Please do not reply to this email.
	`.trim()
}

/**
 * Render HTML email content using React Email template
 */
export async function renderHtmlContent(params: TwoFactorEmailParams): Promise<string> {
	return render(TwoFactorEmail(params))
}

/**
 * Prepare complete email data for two-factor authentication
 */
export async function prepareTwoFactorEmail(params: TwoFactorEmailParams) {
	const subject = generateSubject(params.type)
	const html = await renderHtmlContent(params)
	const text = generateTextContent(params)

	return {
		to: params.user.email,
		subject,
		html,
		text,
	}
}
