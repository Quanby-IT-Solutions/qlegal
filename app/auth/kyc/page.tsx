import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
    <div className="min-h-screen w-full bg-muted flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>KYC Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <KycVerificationCard userInfo={kycInfoResult.data} minimal redirectUrlOnSkip="/dashboard" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}