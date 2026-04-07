import type { Metadata } from "next"
import { redirect } from "next/navigation"

/**
 * Legacy `/onboarding` route: identity verification and post-KYC steps now live on Profile.
 * KYC Web SDK is started from Profile or restriction dialogs (`useStartKycVerification`).
 */
export const metadata: Metadata = {
	title: "Onboarding | Quanby Sign",
	description: "Account setup continues on your profile.",
}

export default function OnboardingPage() {
	redirect("/profile?focus=kyc")
}
