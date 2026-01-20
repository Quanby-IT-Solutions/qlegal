import type { NavItem } from "./types"

// Auth page navigation links
const authLinks: NavItem[] = [
	{
		title: "Back to Home",
		url: "/",
		icon: "house",
	},
	{
		title: "Sign In",
		url: "/auth/login",
		icon: "user",
	},
	{
		title: "Sign Up",
		url: "/auth/register",
		icon: "user",
	},
	{
		title: "Forgot Password",
		url: "/auth/forgot-password",
		icon: "mail",
	},
	{
		title: "Reset Password",
		url: "/auth/reset-password",
		icon: "mail",
	},
	{
		title: "Verify Email",
		url: "/auth/verify-email",
		icon: "mail",
	},
]

// Common auth page footer links
const authFooterLinks: NavItem[] = [
	{
		title: "Privacy Policy",
		url: "/privacy-policy",
	},
	{
		title: "Terms of Service",
		url: "/terms-of-service",
	},
	{
		title: "Help Center",
		url: "#help-center",
	},
]

// Exported Functions
export function getAuthLinks(): NavItem[] {
	return authLinks
}

export function getAuthFooterLinks(): NavItem[] {
	return authFooterLinks
}

// Helper function to get specific auth links
export function getAuthLinkByTitle(title: string): NavItem | undefined {
	return authLinks.find(link => link.title === title)
}

// Helper function to get links for specific auth pages
export function getLoginPageLinks(): NavItem[] {
	return authLinks.filter(link =>
		["Back to Home", "Sign Up", "Forgot Password"].includes(link.title)
	)
}

export function getRegisterPageLinks(): NavItem[] {
	return authLinks.filter(link => ["Back to Home", "Sign In"].includes(link.title))
}

export function getForgotPasswordPageLinks(): NavItem[] {
	return authLinks.filter(link => ["Back to Home", "Sign In"].includes(link.title))
}
