import type { Metadata } from "next"

import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard"

export const metadata: Metadata = {
	title: "Onboarding | Quanby Sign",
	description: "Complete your account setup to get started with Quanby Sign.",
}

export default function OnboardingPage() {
	return (
		<div className="bg-muted/40 flex min-h-screen items-center justify-center p-4">
			<OnboardingWizard />
		</div>
	)
}
