import { redirect } from "next/navigation"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { getUserKycInfo } from "@/features/kyc/api/kyc.actions"
import { KycVerificationCard } from "@/features/kyc/components/kyc-verification-card"

import { auth } from "@/services/next-auth"

export default async function KycRegisterPage() {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/auth/login")
	}

	// If already verified, go to dashboard
	// @ts-expect-error augmented session field
	if (session.user.kycStatus === "VERIFIED") {
		redirect("/dashboard")
	}

	const kycInfoResult = await getUserKycInfo()
	if (!kycInfoResult.success || !kycInfoResult.data) {
		redirect("/dashboard")
	}

	return (
		<Card className="w-full max-w-xl">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Verify Your Identity</CardTitle>
				<CardDescription>
					Complete your KYC verification to access all features securely
				</CardDescription>
			</CardHeader>
			<CardContent>
				<KycVerificationCard
					userInfo={kycInfoResult.data}
					minimal
					redirectUrlOnSkip="/dashboard"
				/>
			</CardContent>
		</Card>
	)
}