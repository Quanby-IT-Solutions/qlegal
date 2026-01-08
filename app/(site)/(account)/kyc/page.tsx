import { type Route } from "next"
import { redirect } from "next/navigation"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { auth } from "@/services/next-auth"

import { getUserKycInfo } from "@/features/kyc/api/kyc.actions"
import { KycVerificationCard } from "@/features/kyc/components/kyc-verification-card"

export default async function KycPage() {
	const session = await auth()

	if (!session?.user) {
		redirect("/auth/login")
	}

	const kycInfoResult = await getUserKycInfo()

	if (!kycInfoResult.success || !kycInfoResult.data) {
		redirect("/profile")
	}

	return (
		<>
			<SiteNavbar items={[{ label: "KYC Verification", url: "/kyc" as Route }]} />

			<div className="min-h-screen bg-muted/30">
				<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
					<div className="mb-8 space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">KYC Verification</h1>
						<p className="text-muted-foreground text-sm">
							Complete your identity verification to access all platform features
						</p>
					</div>

					<KycVerificationCard userInfo={kycInfoResult.data} />

					<Card className="mt-6">
						<CardHeader>
							<CardTitle className="text-sm">About KYC Verification</CardTitle>
						</CardHeader>
						<CardContent className="text-muted-foreground text-xs space-y-2">
							<p>
								KYC (Know Your Customer) verification is required to ensure the security and
								legitimacy of all transactions on the platform.
							</p>
							<p>The verification process includes:</p>
							<ul className="list-inside list-disc space-y-1 ml-2">
								<li>Identity document verification</li>
								<li>Facial recognition and liveness check</li>
								<li>Address verification (if required)</li>
							</ul>
							<p className="pt-2">
								This process is powered by HyperVerge, a trusted identity verification provider.
							</p>
						</CardContent>
					</Card>
				</main>
			</div>
		</>
	)
}
