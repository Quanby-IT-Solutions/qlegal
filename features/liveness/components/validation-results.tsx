"use client"

import { AlertCircle, CheckCircle2, Eye, EyeOff, User, Users, XCircle } from "lucide-react"
import { Badge } from "@/core/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import type { LivenessValidationRequest } from "../types"

interface ValidationResultsProps {
	validationData: LivenessValidationRequest
	capturedImage: string
}

export function ValidationResults({ validationData, capturedImage }: ValidationResultsProps) {
	const apiResponse = validationData.apiResponse

	if (!apiResponse) {
		return null
	}

	const isSuccess = apiResponse.result.summary.action === "pass"
	const details = apiResponse.result.details[0]

	if (!details) {
		return null
	}

	// Quality checks data
	const qualityChecks = [
		{
			label: "Eyes Open",
			value: details.qualityChecks.eyesClosed.value === "no",
			confidence: details.qualityChecks.eyesClosed.confidence,
			icon: details.qualityChecks.eyesClosed.value === "no" ? Eye : EyeOff,
		},
		{
			label: "No Occlusion",
			value: details.qualityChecks.occlusion.value === "no",
			confidence: details.qualityChecks.occlusion.confidence,
			icon: details.qualityChecks.occlusion.value === "no" ? CheckCircle2 : XCircle,
		},
		{
			label: "Single Face",
			value: details.qualityChecks.multipleFaces.value === "no",
			confidence: details.qualityChecks.multipleFaces.confidence,
			icon: details.qualityChecks.multipleFaces.value === "no" ? User : Users,
		},
	]

	const passedChecks = qualityChecks.filter(check => check.value).length
	const totalChecks = qualityChecks.length
	const progressPercentage = (passedChecks / totalChecks) * 100

	return (
		<div className="space-y-6">
			{/* Overall Status */}
			<Card className={isSuccess ? "border-green-500" : "border-red-500"}>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								{isSuccess ? (
									<CheckCircle2 className="h-6 w-6 text-green-600" />
								) : (
									<XCircle className="h-6 w-6 text-red-600" />
								)}
								{isSuccess ? "Liveness Check Passed" : "Liveness Check Failed"}
							</CardTitle>
							<CardDescription className="mt-2">
								{isSuccess
									? "Your selfie has been successfully validated."
									: "Please retake your selfie following the guidelines."}
							</CardDescription>
						</div>
						<Badge variant={isSuccess ? "default" : "destructive"} className="text-xs">
							{isSuccess ? "VERIFIED" : "FAILED"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Progress */}
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Quality Score</span>
							<span className="font-medium">
								{passedChecks}/{totalChecks} checks passed
							</span>
						</div>
						<Progress value={progressPercentage} className="h-2" />
					</div>

					{/* Live Face Status */}
					<div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
						{details.liveFace.value === "yes" ? (
							<CheckCircle2 className="h-5 w-5 text-green-600" />
						) : (
							<XCircle className="h-5 w-5 text-red-600" />
						)}
						<div>
							<p className="text-sm font-medium">Live Face Detection</p>
							<p className="text-xs text-muted-foreground">
								{details.liveFace.value === "yes"
									? "A live person was detected in the image"
									: "No live face detected - please try again"}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Captured Image */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Captured Selfie</CardTitle>
					<CardDescription>The image used for liveness validation</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
						<img
							src={capturedImage}
							alt="Validation selfie"
							className="h-full w-full object-cover"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Quality Checks Details */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Quality Checks</CardTitle>
					<CardDescription>Detailed validation results</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{qualityChecks.map((check, index) => {
							const Icon = check.icon
							return (
								<div
									key={index}
									className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
								>
									<div className="flex items-center gap-3">
										<Icon
											className={`h-5 w-5 ${
												check.value ? "text-green-600" : "text-red-600"
											}`}
										/>
										<div>
											<p className="text-sm font-medium">{check.label}</p>
											<p className="text-xs text-muted-foreground">
												Confidence: {check.confidence}
											</p>
										</div>
									</div>
									<Badge variant={check.value ? "default" : "destructive"}>
										{check.value ? "PASS" : "FAIL"}
									</Badge>
								</div>
							)
						})}
					</div>
				</CardContent>
			</Card>

			{/* API Metadata */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Validation Details</CardTitle>
					<CardDescription>Technical information about this validation</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Request ID:</span>
							<span className="font-mono text-xs">
								{apiResponse.metadata.requestId}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Transaction ID:</span>
							<span className="font-mono text-xs">
								{apiResponse.metadata.transactionId}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Status Code:</span>
							<span className="font-medium">{apiResponse.statusCode}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-muted-foreground">Attempts:</span>
							<span className="font-medium">{validationData.attempts}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Failure Guidance */}
			{!isSuccess && (
				<Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
							<AlertCircle className="h-5 w-5" />
							Tips for Success
						</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
							<li className="flex items-start gap-2">
								<span className="mt-1">•</span>
								<span>Ensure your face is clearly visible and well-lit</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1">•</span>
								<span>Remove any obstructions like masks, sunglasses, or hats</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1">•</span>
								<span>Keep your eyes open and look directly at the camera</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1">•</span>
								<span>Ensure only one person appears in the frame</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="mt-1">•</span>
								<span>Use a neutral background without other faces or reflections</span>
							</li>
						</ul>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
