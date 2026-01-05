"use client"

import { useState } from "react"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Camera, Eye, UserCheck } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { LivenessFlow } from "@/features/liveness/components"

export default function LivenessValidationPage() {
	const [isComplete, setIsComplete] = useState(false)
	const [result, setResult] = useState<{
		imageData: string
		transactionId: string
	} | null>(null)

	const handleSuccess = (data: { imageData: string; transactionId: string }) => {
		console.log("✅ Liveness validation successful!", data)
		setResult(data)
		setIsComplete(true)
		
		// Here you would typically:
		// 1. Save to database using saveLivenessValidation()
		// 2. Update user's KYC status
		// 3. Proceed to next KYC step
	}

	const handleError = (error: string) => {
		console.error("❌ Liveness validation error:", error)
	}

	const handleCancel = () => {
		console.log("User cancelled liveness validation")
		// Redirect or handle cancellation
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
			{/* Header Bar */}
			<div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
				<div className="container max-w-6xl mx-auto px-4">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-3">
							<Link href="/">
								<Button variant="ghost" size="icon" className="rounded-full">
									<ArrowLeft className="h-5 w-5" />
								</Button>
							</Link>
							<div className="flex items-center gap-3">
								<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
									<ShieldCheck className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h1 className="text-lg font-semibold">Liveness Validation</h1>
									<p className="text-xs text-muted-foreground">Identity Verification Test</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="container max-w-2xl mx-auto px-4 py-8">
				{isComplete && result ? (
					<Card className="border-2 border-green-500 animate-in fade-in duration-500">
						<CardHeader>
							<div className="flex items-center gap-3">
								<CheckCircle2 className="h-8 w-8 text-green-600" />
								<div>
									<CardTitle>Verification Complete!</CardTitle>
									<CardDescription>
										Transaction ID: {result.transactionId}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<p className="text-sm text-muted-foreground">
								Your identity has been successfully verified. You can now proceed with your registration.
							</p>
							<Button onClick={() => {
								setIsComplete(false)
								setResult(null)
							}} variant="outline" className="w-full">
								Try Again
							</Button>
						</CardContent>
					</Card>
				) : (
					<LivenessFlow
						onSuccess={handleSuccess}
						onError={handleError}
						onCancel={handleCancel}
						showInstructions={true}
					/>
				)}
			</div>
		</div>
	)
}
