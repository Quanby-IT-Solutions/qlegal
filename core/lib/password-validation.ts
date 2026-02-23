export const PASSWORD_REQUIREMENTS = [
	{
		key: "minLength",
		label: "At least 12 characters",
		test: (pw: string) => pw.length >= 12,
	},
	{
		key: "uppercase",
		label: "One uppercase letter",
		test: (pw: string) => /[A-Z]/.test(pw),
	},
	{
		key: "lowercase",
		label: "One lowercase letter",
		test: (pw: string) => /[a-z]/.test(pw),
	},
	{
		key: "digit",
		label: "One number",
		test: (pw: string) => /\d/.test(pw),
	},
	{
		key: "special",
		label: "One special character",
		test: (pw: string) => /[!@#$%^&*()_+\-=[\]{}|;:'",.<>?/\\`~]/.test(pw),
	},
] as const

export function validatePassword(password: string): Record<string, boolean> {
	const results: Record<string, boolean> = {}
	for (const req of PASSWORD_REQUIREMENTS) {
		results[req.key] = req.test(password)
	}
	return results
}
