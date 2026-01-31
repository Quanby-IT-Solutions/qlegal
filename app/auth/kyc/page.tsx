import { redirect } from "next/navigation"
import { LogOut } from "lucide-react"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { auth } from "@/services/next-auth"

import { LogoutButton } from "@/features/auth/components/logout-button"
import { getUserKycInfo } from "@/features/kyc/api/kyc.actions"
import { KycVerificationCard } from "@/features/kyc/components/kyc-verification-card"

export default async function KycRegisterPage() {
	const session = await auth()

	if (session!.user.kycStatus === "VERIFIED") redirect("/dashboard")

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
				<KycVerificationCard userInfo={kycInfoResult.data} minimal redirectUrlOnSkip="/dashboard" />
			</CardContent>

			<CardFooter>
				<LogoutButton callbackUrl="/auth/login" variant="link" className="w-full">
					<LogOut className="mr-2 h-4 w-4" />
					Log Out
				</LogoutButton>
			</CardFooter>
		</Card>
	)
}
