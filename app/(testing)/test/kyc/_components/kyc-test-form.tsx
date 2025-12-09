"use client"

import { useState, useTransition } from "react"
import { Copy, ExternalLink, Loader2, Send } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { createKycLink, checkKycStatus } from "../_api/actions"

interface KycLinkResult {
	transactionId: string
	url: string
}

interface KycStatusResult {
	transactionId: string
	status: string
	isComplete: boolean
	isApproved: boolean
	needsReview: boolean
	message: string
	details?: Record<string, unknown>
}

export function KycTestForm() {
	const [isPending, startTransition] = useTransition()
	const [linkResult, setLinkResult] = useState<KycLinkResult | null>(null)
	const [statusResult, setStatusResult] = useState<KycStatusResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [copied, setCopied] = useState(false)

	const handleCreateLink = (formData: FormData) => {
		setError(null)
		setLinkResult(null)
		setStatusResult(null)

		startTransition(async () => {
			const result = await createKycLink(formData)
			if (result.success && result.data) {
				setLinkResult(result.data)
			} else {
				setError(result.error || "Failed to create KYC link")
			}
		})
	}

	const handleCheckStatus = () => {
		if (!linkResult?.transactionId) return

		setError(null)
		setStatusResult(null)

		startTransition(async () => {
			const result = await checkKycStatus(linkResult.transactionId)
			if (result.success && result.data) {
				setStatusResult(result.data)
			} else {
				setError(result.error || "Failed to check KYC status")
			}
		})
	}

	const handleCopyLink = async () => {
		if (!linkResult?.url) return
		await navigator.clipboard.writeText(linkResult.url)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "auto_approved":
				return "text-green-600 bg-green-50 border-green-200"
			case "auto_declined":
				return "text-red-600 bg-red-50 border-red-200"
			case "needs_review":
				return "text-yellow-600 bg-yellow-50 border-yellow-200"
			case "user_cancelled":
				return "text-gray-600 bg-gray-50 border-gray-200"
			case "error":
				return "text-red-600 bg-red-50 border-red-200"
			default:
				return "text-blue-600 bg-blue-50 border-blue-200"
		}
	}

	return (
		<div className="space-y-6">
			{/* Create KYC Link Form */}
			<Card>
				<CardHeader>
					<CardTitle>Create KYC Onboard Link</CardTitle>
					<CardDescription>
						Generate a HyperVerge KYC verification link that can be sent to users
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={handleCreateLink} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email Address *</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="user@example.com"
								required
								disabled={isPending}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="name">Full Name (Optional)</Label>
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="John Doe"
								disabled={isPending}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
							<Input
								id="redirectUrl"
								name="redirectUrl"
								type="url"
								placeholder="https://yourapp.com/kyc-complete"
								disabled={isPending}
							/>
							<p className="text-muted-foreground text-xs">
								URL where users will be redirected after completing KYC
							</p>
						</div>

						<Button type="submit" disabled={isPending} className="w-full">
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating Link...
								</>
							) : (
								<>
									<Send className="mr-2 h-4 w-4" />
									Create KYC Link
								</>
							)}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Error Display */}
			{error && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<p className="text-red-600">{error}</p>
					</CardContent>
				</Card>
			)}

			{/* Link Result */}
			{linkResult && (
				<Card className="border-green-200 bg-green-50">
					<CardHeader>
						<CardTitle className="text-green-700">KYC Link Created!</CardTitle>
						<CardDescription className="text-green-600">
							Transaction ID: {linkResult.transactionId}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>Onboard Link</Label>
							<div className="flex gap-2">
								<Input
									value={linkResult.url}
									readOnly
									className="bg-white"
								/>
								<Button
									variant="outline"
									size="icon"
									onClick={handleCopyLink}
									title="Copy link"
								>
									<Copy className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									asChild
									title="Open link"
								>
									<a href={linkResult.url} target="_blank" rel="noopener noreferrer">
										<ExternalLink className="h-4 w-4" />
									</a>
								</Button>
							</div>
							{copied && (
								<p className="text-sm text-green-600">Link copied to clipboard!</p>
							)}
						</div>

						<Button
							variant="secondary"
							onClick={handleCheckStatus}
							disabled={isPending}
							className="w-full"
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Checking Status...
								</>
							) : (
								"Check KYC Status"
							)}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Status Result */}
			{statusResult && (
				<Card className={`border ${getStatusColor(statusResult.status)}`}>
					<CardHeader>
						<CardTitle>KYC Status</CardTitle>
						<CardDescription>
							Transaction: {statusResult.transactionId}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className={`rounded-lg border p-4 ${getStatusColor(statusResult.status)}`}>
							<p className="font-semibold capitalize">
								Status: {statusResult.status.replace(/_/g, " ")}
							</p>
							<p className="mt-1 text-sm">{statusResult.message}</p>
						</div>

						<div className="grid grid-cols-3 gap-4 text-sm">
							<div className="text-center">
								<p className="font-medium">Complete</p>
								<p className={statusResult.isComplete ? "text-green-600" : "text-gray-400"}>
									{statusResult.isComplete ? "Yes" : "No"}
								</p>
							</div>
							<div className="text-center">
								<p className="font-medium">Approved</p>
								<p className={statusResult.isApproved ? "text-green-600" : "text-gray-400"}>
									{statusResult.isApproved ? "Yes" : "No"}
								</p>
							</div>
							<div className="text-center">
								<p className="font-medium">Needs Review</p>
								<p className={statusResult.needsReview ? "text-yellow-600" : "text-gray-400"}>
									{statusResult.needsReview ? "Yes" : "No"}
								</p>
							</div>
						</div>

						{statusResult.details && Object.keys(statusResult.details).length > 0 && (
							<div className="space-y-2">
								<Label>Additional Details</Label>
								<pre className="bg-muted overflow-auto rounded-lg p-4 text-xs">
									{JSON.stringify(statusResult.details, null, 2)}
								</pre>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
