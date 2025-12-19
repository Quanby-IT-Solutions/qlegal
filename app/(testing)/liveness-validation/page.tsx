"use client"

import { useState } from "react"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck, Camera, Eye, UserCheck } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { CameraCapture } from "@/features/liveness/components/camera-capture"
import { ValidationResults } from "@/features/liveness/components/validation-results"
import { validateSelfie } from "@/features/liveness/api/liveness.actions"
import type { LivenessValidationRequest } from "@/features/liveness/types"

type ValidationStep = "instructions" | "capture" | "processing" | "results"

export default function LivenessValidationPage() {
	const [currentStep, setCurrentStep] = useState<ValidationStep>("instructions")
	const [capturedImage, setCapturedImage] = useState<string | null>(null)
	const [validationData, setValidationData] = useState<LivenessValidationRequest | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isProcessing, setIsProcessing] = useState(false)

	// Handle image capture
	const handleCapture = async (imageData: string) => {
		setCapturedImage(imageData)
		setCurrentStep("processing")
		setIsProcessing(true)
		setError(null)

		try {
			const result = await validateSelfie(imageData)

			if (result.success && result.data) {
				setValidationData(result.data)
				setCurrentStep("results")
			} else {
				setError(result.error || "Validation failed. Please try again.")
				setCurrentStep("capture")
			}
		} catch (err) {
			console.error("Validation error:", err)
			setError("An unexpected error occurred. Please try again.")
			setCurrentStep("capture")
		} finally {
			setIsProcessing(false)
		}
	}

	// Handle camera error
	const handleCameraError = (errorMessage: string) => {
		setError(errorMessage)
	}

	// Reset to capture step
	const handleRetry = () => {
		setCapturedImage(null)
		setValidationData(null)
		setError(null)
		setCurrentStep("capture")
	}

	// Start validation process
	const handleStartValidation = () => {
		setCurrentStep("capture")
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
									<p className="text-xs text-muted-foreground">Identity Verification</p>
								</div>
							</div>
						</div>
						
						{/* Progress Steps */}
						<div className="hidden md:flex items-center gap-2">
							<StepIndicator 
								icon={Eye} 
								label="Instructions" 
								active={currentStep === "instructions"} 
								completed={["capture", "processing", "results"].includes(currentStep)}
							/>
							<div className="w-8 h-0.5 bg-border" />
							<StepIndicator 
								icon={Camera} 
								label="Capture" 
								active={currentStep === "capture"} 
								completed={["processing", "results"].includes(currentStep)}
							/>
							<div className="w-8 h-0.5 bg-border" />
							<StepIndicator 
								icon={Loader2} 
								label="Processing" 
								active={currentStep === "processing"} 
								completed={currentStep === "results"}
							/>
							<div className="w-8 h-0.5 bg-border" />
							<StepIndicator 
								icon={UserCheck} 
								label="Results" 
								active={currentStep === "results"} 
								completed={false}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="container max-w-4xl mx-auto px-4 py-8">
				{/* Error Alert */}
				{error && (
					<Alert variant="destructive" className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* Instructions Step */}
				{currentStep === "instructions" && (
					<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						{/* Hero Section */}
						<Card className="border-2">
							<CardContent className="pt-6">
								<div className="text-center space-y-4">
									<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
										<ShieldCheck className="h-8 w-8 text-primary" />
									</div>
									<div>
										<h2 className="text-2xl font-bold mb-2">Identity Verification</h2>
										<p className="text-muted-foreground">
											Complete liveness validation to verify your identity securely
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Instructions Grid */}
						<div className="grid gap-4 md:grid-cols-2">
							<InstructionCard
								number="1"
								title="Prepare Environment"
								description="Find a well-lit area with plain background. Avoid backlighting or harsh shadows."
							/>
							<InstructionCard
								number="2"
								title="Remove Obstructions"
								description="Take off glasses, sunglasses, hats, masks, or any face coverings."
							/>
							<InstructionCard
								number="3"
								title="Position Yourself"
								description="Face camera directly with your entire face visible within the guideline."
							/>
							<InstructionCard
								number="4"
								title="Capture Selfie"
								description="Look directly at camera with eyes open. Stay still and capture when ready."
							/>
						</div>

						{/* Privacy Notice */}
						<Alert className="border-primary/20 bg-primary/5">
							<AlertCircle className="h-4 w-4 text-primary" />
							<AlertDescription className="text-sm">
								<strong className="text-primary">Privacy Notice:</strong> Your selfie is used only for identity
								verification. Images are processed securely and not stored permanently unless required by law.
							</AlertDescription>
						</Alert>

						{/* Action Button */}
						<Button onClick={handleStartValidation} className="w-full h-12 text-base" size="lg">
							<CheckCircle2 className="mr-2 h-5 w-5" />
							Start Verification
						</Button>
					</div>
				)}

				{/* Capture Step */}
				{currentStep === "capture" && (
					<CameraCapture
						onCapture={handleCapture}
						onError={handleCameraError}
						disabled={isProcessing}
					/>
				)}

				{/* Processing Step */}
				{currentStep === "processing" && (
					<Card className="border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<CardContent className="flex flex-col items-center justify-center py-16">
							<div className="relative mb-6">
								<div className="absolute inset-0 animate-ping">
									<div className="h-20 w-20 rounded-full bg-primary/20" />
								</div>
								<Loader2 className="h-20 w-20 animate-spin text-primary relative" />
							</div>
							<h3 className="text-2xl font-semibold mb-3">Validating Your Identity</h3>
							<p className="text-muted-foreground text-center max-w-md mb-6">
								Analyzing facial features and performing liveness checks. This will only take a moment...
							</p>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
								<span>Processing biometric data</span>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Results Step */}
				{currentStep === "results" && validationData && capturedImage && (
					<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<ValidationResults
							validationData={validationData}
							capturedImage={capturedImage}
						/>

						{/* Action Buttons */}
						<Card>
							<CardContent className="pt-6">
								<div className="flex flex-col sm:flex-row gap-3">
									<Button 
										onClick={handleRetry} 
										variant="outline" 
										className="flex-1 h-11"
										size="lg"
									>
										<ArrowLeft className="mr-2 h-4 w-4" />
										Try Again
									</Button>
									{validationData.apiResponse?.result.summary.action === "pass" && (
										<Link href="/" className="flex-1">
											<Button className="w-full h-11" size="lg">
												<CheckCircle2 className="mr-2 h-4 w-4" />
												Continue
											</Button>
										</Link>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	)
}

// Step Indicator Component
function StepIndicator({ 
	icon: Icon, 
	label, 
	active, 
	completed 
}: { 
	icon: React.ElementType
	label: string
	active: boolean
	completed: boolean
}) {
	return (
		<div className="flex items-center gap-2">
			<div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
				active ? "bg-primary text-primary-foreground" :
				completed ? "bg-primary/20 text-primary" :
				"bg-muted text-muted-foreground"
			}`}>
				<Icon className="h-4 w-4" />
			</div>
			<span className={`text-xs font-medium hidden lg:block ${
				active ? "text-foreground" : "text-muted-foreground"
			}`}>
				{label}
			</span>
		</div>
	)
}

// Instruction Card Component
function InstructionCard({ 
	number, 
	title, 
	description 
}: { 
	number: string
	title: string
	description: string
}) {
	return (
		<Card className="border-2 hover:border-primary/50 transition-colors">
			<CardContent className="pt-6">
				<div className="flex items-start gap-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
						{number}
					</div>
					<div className="space-y-1">
						<h4 className="font-semibold">{title}</h4>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{description}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
