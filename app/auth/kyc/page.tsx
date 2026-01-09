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

	// If already verified, redirect to dashboard
	
	if (session.user.kycStatus === "VERIFIED") {
		redirect("/dashboard")
	}

	const kycInfoResult = await getUserKycInfo()
	if (!kycInfoResult.success || !kycInfoResult.data) {
		// If can't get KYC info, something is wrong, redirect to login
		redirect("/auth/login")
	}

	return (
		<Card className="w-full max-w-xl">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">🔒 Identity Verification Required</CardTitle>
				<CardDescription>
					To ensure security and regulatory compliance, all users must complete identity verification before accessing the platform.
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