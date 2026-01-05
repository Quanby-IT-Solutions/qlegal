"use client"

import { AlertCircle, Camera, CheckCircle2, Eye, Shield, User } from "lucide-react"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"

interface InstructionsScreenProps {
	onContinue: () => void
	onSkip?: () => void
}

export function InstructionsScreen({ onContinue, onSkip }: InstructionsScreenProps) {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
			{/* Main Header */}
			<Card className="border-2 border-primary/20">
				<CardHeader className="text-center pb-4">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
						<Shield className="h-8 w-8 text-primary" />
					</div>
					<CardTitle className="text-2xl">Identity Verification</CardTitle>
					<CardDescription className="text-base mt-2">
						We need to verify your identity with a selfie. This helps keep your account secure and
						prevents fraud.
					</CardDescription>
				</CardHeader>
			</Card>

			{/* What to Expect */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Camera className="h-5 w-5 text-primary" />
						What to Expect
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-3">
						<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
							<span className="text-sm font-semibold text-primary">1</span>
						</div>
						<div>
							<h4 className="font-medium mb-1">Position Your Face</h4>
							<p className="text-sm text-muted-foreground">
								You'll see an oval guideline on the screen. Center your face within it.
							</p>
						</div>
					</div>

					<div className="flex gap-3">
						<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
							<span className="text-sm font-semibold text-primary">2</span>
						</div>
						<div>
							<h4 className="font-medium mb-1">Capture Your Selfie</h4>
							<p className="text-sm text-muted-foreground">
								The camera will capture a photo. Keep still and look directly at the camera.
							</p>
						</div>
					</div>

					<div className="flex gap-3">
						<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
							<span className="text-sm font-semibold text-primary">3</span>
						</div>
						<div>
							<h4 className="font-medium mb-1">Instant Verification</h4>
							<p className="text-sm text-muted-foreground">
								Our system will verify your identity in seconds. You'll get instant feedback.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Best Practices */}
			<Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg text-blue-700 dark:text-blue-400">
						<CheckCircle2 className="h-5 w-5" />
						Best Practices
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2.5 text-sm text-blue-800 dark:text-blue-300">
						<li className="flex items-start gap-2">
							<CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
							<span>Find a well-lit area with even lighting on your face</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
							<span>Remove glasses, hats, or anything covering your face</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
							<span>Keep your eyes open and look directly at the camera</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
							<span>Use a plain background without other people</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
							<span>Hold your device at eye level for the best angle</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			{/* Privacy Notice */}
			<Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
				<CardContent className="pt-4 pb-4">
					<div className="flex gap-3">
						<Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
						<div>
							<h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">
								Your Privacy Matters
							</h4>
							<p className="text-sm text-amber-700 dark:text-amber-400">
								Your selfie is encrypted and securely processed for identity verification only. We
								comply with all data protection regulations.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Important Notes */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<AlertCircle className="h-5 w-5 text-orange-500" />
						Important Notes
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-start gap-2">
							<span className="text-orange-500 mt-0.5">•</span>
							<span>You have 3 attempts to complete the verification</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-orange-500 mt-0.5">•</span>
							<span>Make sure your camera permissions are enabled</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-orange-500 mt-0.5">•</span>
							<span>The process takes less than 2 minutes</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-orange-500 mt-0.5">•</span>
							<span>Avoid shadows or bright backlighting</span>
						</li>
					</ul>
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<div className="flex gap-3 pt-4">
				<Button onClick={onContinue} size="lg" className="flex-1 h-12">
					<Camera className="mr-2 h-5 w-5" />
					Start Verification
				</Button>
				{onSkip && (
					<Button onClick={onSkip} variant="outline" size="lg" className="h-12">
						Skip Guide
					</Button>
				)}
			</div>
		</div>
	)
}
