import type { Metadata } from "next"

import { Spotlight } from "@/core/components/ui/spotlight-new"
import { getSafeOnboardingReturnPath } from "@/core/lib/onboarding-return-path"

import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard"

export const metadata: Metadata = {
	title: "Onboarding | Quanby Sign",
	description: "Complete your account setup to get started with Quanby Sign.",
}

export default async function OnboardingPage({
	searchParams,
}: {
	searchParams: Promise<{ focus?: string; returnTo?: string }>
}) {
	const params = await searchParams
	const skipWelcomeForKyc = params.focus === "kyc"
	const kycReturnTo = getSafeOnboardingReturnPath(params.returnTo)

	return (
		<div className="relative min-h-screen w-full overflow-hidden">
			<div className="via-background absolute inset-0 bg-linear-to-br from-[rgb(91,26,128)]/5 to-[rgb(233,30,140)]/5" />

			<Spotlight
				gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(278, 100%, 65%, .08) 0, hsla(278, 100%, 60%, .02) 50%, hsla(278, 100%, 55%, 0) 80%)"
				gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(327, 100%, 65%, .05) 0, hsla(327, 100%, 60%, .015) 80%, transparent 100%)"
				gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(278, 100%, 65%, .04) 0, hsla(278, 100%, 55%, .01) 80%, transparent 100%)"
			/>

			<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]" />

			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

			<div className="pointer-events-none absolute bottom-[-20%] left-[-10%] size-80 rounded-full bg-linear-to-r from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 blur-3xl" />

			<div className="pointer-events-none absolute -right-25 bottom-[20%] size-80 rounded-full bg-linear-to-r from-[rgb(233,30,140)]/15 to-[rgb(91,26,128)]/15 blur-3xl" />

			<div className="pointer-events-none absolute top-[-10%] left-[25%] size-80 rounded-full bg-linear-to-r from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 blur-3xl" />

			<div className="relative z-10 flex min-h-screen items-center justify-center p-4">
				<OnboardingWizard skipWelcomeForKyc={skipWelcomeForKyc} kycReturnTo={kycReturnTo} />
			</div>
		</div>
	)
}
