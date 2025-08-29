"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import {
	ArrowLeft,
	CheckCircle,
	FileText,
	Lock,
	PenTool,
	Shield
} from "lucide-react"
import { toast } from "sonner"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import { Progress } from "@/core/components/ui/progress"

import { trpc } from "@/services/trpc/client"

import { PDFViewerWithOverlay } from "@/features/signature-lite/components/pdf-viewer-with-overlay"
import { UnifiedSignatureDialog } from "@/features/signature-lite/components/unified-signature-dialog"

export default function DocumentSignPage() {
	const params = useParams()
	const router = useRouter()
	const [isAgreed, setIsAgreed] = useState(false)
	const [isSigning, setIsSigning] = useState(false)
	const [signatureDialogOpen, setSignatureDialogOpen] = useState(false)
	const [currentFieldToSign, setCurrentFieldToSign] = useState<{
		id: string
		type: string
		label: string
		required: boolean
		position: { x: number; y: number; pageNumber: number }
		size: { width: number; height: number }
		signed: boolean
		signatureValue?: string
	} | null>(null)

	const envelopeId = params.envelopeId as string
	const documentId = params.documentId as string

	// Debug: Log parameters
	console.log("🔍 Sign page - envelopeId:", envelopeId)
	console.log("🔍 Sign page - documentId:", documentId)
	console.log("🔍 Sign page - params:", params)

	// Fetch document data for signing
	const {
		data: document,
		isLoading,
		refetch
	} = trpc.signatureLite.getDocumentForSigning.useQuery(
		{ envelopeId, documentId },
		{ enabled: !!envelopeId && !!documentId }
	)

	// Fetch real-time document field progress
	const { data: fieldProgress, refetch: refetchProgress } =
		trpc.signatureLite.getDocumentFieldProgress.useQuery(
			{ envelopeId, documentId },
			{ enabled: !!envelopeId && !!documentId }
		)

	// Complete signature mutation
	const completeSignatureMutation =
		trpc.signatureLite.completeDocumentSignature.useMutation({
			onSuccess: (data) => {
				if (data.allDocumentsSigned) {
					toast.success("Document completed! All recipients have signed.")
				} else {
					toast.success("Your signature has been recorded successfully.")
				}
				router.push("/my-signed")
			},
			onError: (error) => {
				toast.error(error.message)
			}
		})

	// Handle field signing
	const handleFieldSign = (field: {
		id: string
		type: string
		label: string
		required: boolean
		position: { x: number; y: number; pageNumber: number }
		size: { width: number; height: number }
		signed: boolean
		signatureValue?: string
	}) => {
		setCurrentFieldToSign(field)
		setSignatureDialogOpen(true)
	}

	// Handle field signed callback
	const handleFieldSigned = async (
		_fieldId: string,
		_signatureData: unknown
	) => {
		// Refresh both the document data and progress to show updated fields
		await Promise.all([refetch(), refetchProgress()])
	}

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
					<p className="text-muted-foreground">Loading document...</p>
				</div>
			</div>
		)
	}

	if (!document) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Card className="w-96">
					<CardContent className="py-12 text-center">
						<h3 className="mb-2 text-lg font-medium">Document Not Found</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							The document you&apos;re looking for doesn&apos;t exist or you
							don&apos;t have access to it.
						</p>
						<Button onClick={() => router.push("/")} variant="outline">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Go to Dashboard
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Get user's fields and debug info
	const userFields = document.fields
	const isOwner = document.isOwner
	const currentUserRecipient = document.currentUserRecipient
	const requiredFields = userFields.filter((field) => field.required)
	const signedRequiredFields = requiredFields.filter((field) => field.signed)
	// Calculate if all required fields are signed
	const allRequiredFieldsSigned = (() => {
		// Always calculate manually for now to debug the issue
		if (requiredFields.length === 0) {
			return true // No required fields means all are "signed"
		}

		const manualCalculation =
			signedRequiredFields.length === requiredFields.length
		console.log("Manual calculation:", {
			signedRequiredFieldsLength: signedRequiredFields.length,
			requiredFieldsLength: requiredFields.length,
			result: manualCalculation
		})

		return manualCalculation
	})()

	// Debug logging
	console.log("Debug info:", {
		userFields: userFields.map((f) => ({
			id: f.id,
			label: f.label,
			required: f.required,
			signed: f.signed
		})),
		isOwner,
		currentUserRecipient,
		recipients: document.recipients,
		fieldsCount: userFields.length,
		requiredFields: requiredFields.map((f) => ({
			id: f.id,
			label: f.label,
			signed: f.signed
		})),
		signedRequiredFields: signedRequiredFields.map((f) => ({
			id: f.id,
			label: f.label
		})),
		allRequiredFieldsSigned,
		fieldProgress,
		requiredFieldsCount: requiredFields.length,
		signedRequiredFieldsCount: signedRequiredFields.length,
		// Add detailed field analysis
		fieldAnalysis: userFields.map((f) => ({
			id: f.id,
			label: f.label,
			required: f.required,
			signed: f.signed,
			hasSignatureValue: !!f.signatureValue,
			signatureValueLength: f.signatureValue?.length ?? 0
		}))
	})

	const handleSign = async () => {
		if (!isAgreed) {
			toast.error("Please agree to the terms and conditions before signing.")
			return
		}

		if (!allRequiredFieldsSigned) {
			toast.error(
				"Please complete all required signature fields before proceeding."
			)
			return
		}

		setIsSigning(true)
		try {
			await completeSignatureMutation.mutateAsync({
				envelopeId,
				documentId,
				agreed: true
			})
		} finally {
			setIsSigning(false)
		}
	}

	return (
		<>
			{/* Site Navigation */}
			<SiteNavbar
				items={[
					{ label: "Envelopes", url: "/envelopes" },
					{ label: "Document View", url: `/envelope/${envelopeId}` },
					{ label: "Sign Document" }
				]}
			/>

			<div className="min-h-screen bg-muted dark:bg-background">
				{/* Header */}
				<div className="border-b bg-background backdrop-blur dark:bg-muted/60">
					<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
						<div>
							<h1 className="text-2xl font-medium text-foreground">
								{document.envelope?.title}
							</h1>
							<p className="mt-1 text-sm text-muted-foreground">
								Document: {document.name} • {userFields.length} fields assigned
								to you
							</p>
						</div>
					</div>
				</div>

				{/* Security Notice */}
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
						<CardContent className="pt-6">
							<div className="flex items-start space-x-4">
								<Shield className="mt-1 h-6 w-6 text-blue-600 dark:text-blue-400" />
								<div>
									<h3 className="font-medium text-blue-800 dark:text-blue-100">
										Secure Signing Session
									</h3>
									<p className="text-sm text-blue-700 dark:text-blue-200">
										This is a secure signing session. Your signature will be
										legally binding and recorded in the audit trail.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Main Content */}
				<div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
						{/* Document with PDF Viewer and Overlay */}
						<Card className="lg:col-span-3">
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<FileText className="h-5 w-5" />
									<span>Document to Sign</span>
								</CardTitle>
								<CardDescription>
									Click &quot;Sign&quot; buttons to fill in your signature
									fields
								</CardDescription>
							</CardHeader>
							<CardContent>
								<PDFViewerWithOverlay
									fileUrl={document.url}
									fields={userFields.map((field) => ({
										id: field.id,
										type: field.type,
										label: field.label,
										position: field.position,
										size: field.size,
										signed: field.signed,
										signatureValue: field.signatureValue,
										previewValue:
											currentFieldToSign?.id === field.id
												? field.signatureValue
												: undefined
									}))}
									currentFieldId={currentFieldToSign?.id}
									className="w-full"
								/>
							</CardContent>
						</Card>

						{/* Signature Control Panel */}
						<Card>
							<CardHeader>
								<CardTitle>Signature Fields</CardTitle>
								<CardDescription>
									Complete all required fields to sign
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Field Status */}
								<div className="space-y-3">
									{userFields.length === 0 ? (
										<div className="space-y-2 py-4 text-center text-muted-foreground">
											<p>No signature fields assigned to you</p>
											{isOwner && (
												<p className="text-sm">
													You are the document owner. Recipients will sign the
													fields you&apos;ve assigned to them.
												</p>
											)}
											{!isOwner && !currentUserRecipient && (
												<p className="text-sm">
													You are not a recipient of this document or there may
													be an access issue.
												</p>
											)}
											{currentUserRecipient && (
												<p className="text-sm">
													You are a recipient but no fields have been assigned
													to you yet.
												</p>
											)}
										</div>
									) : (
										userFields.map((field) => (
											<div
												key={field.id}
												className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
											>
												<div className="flex-1">
													<p className="text-sm font-medium">{field.label}</p>
													<p className="text-xs text-muted-foreground">
														Page {field.position.pageNumber} •{" "}
														{field.required ? "Required" : "Optional"}
													</p>
													{field.signed && field.signatureValue && (
														<p className="mt-1 text-xs text-green-600 dark:text-green-400">
															Signed:{" "}
															{field.signatureValue.length > 20
																? `${field.signatureValue.substring(0, 20)}...`
																: field.signatureValue}
														</p>
													)}
												</div>
												<div className="flex items-center gap-2">
													{field.signed ? (
														<CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
													) : (
														<>
															<Button
																size="sm"
																onClick={() => handleFieldSign(field)}
																className="text-xs"
															>
																<PenTool className="mr-1 h-3 w-3" />
																Sign
															</Button>
															<div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
														</>
													)}
												</div>
											</div>
										))
									)}
								</div>

								{/* Progress */}
								{fieldProgress && fieldProgress.totalFields > 0 && (
									<div className="border-t pt-4">
										<div className="mb-2 flex items-center justify-between text-sm">
											<span>Progress</span>
											<span>
												{fieldProgress.signedFields}/{fieldProgress.totalFields}
											</span>
										</div>
										<Progress value={fieldProgress.progress} className="h-2" />
									</div>
								)}

								{/* Agreement */}
								<div className="space-y-4 pt-4">
									<div className="flex items-start space-x-2">
										<Checkbox
											id="terms"
											checked={isAgreed}
											onCheckedChange={(checked) => setIsAgreed(!!checked)}
										/>
										<div className="grid gap-1.5 leading-none">
											<label
												htmlFor="terms"
												className="cursor-pointer text-sm font-medium leading-none"
											>
												I agree to the terms and conditions
											</label>
											<p className="text-xs text-muted-foreground">
												By checking this box, I acknowledge that I have read and
												agree to the terms of this document and consent to use
												electronic signatures.
											</p>
										</div>
									</div>

									{/* Sign Button */}
									<Button
										onClick={handleSign}
										className="w-full"
										disabled={
											!isAgreed || !allRequiredFieldsSigned || isSigning
										}
									>
										<Lock className="mr-2 h-4 w-4" />
										{isSigning ? "Signing..." : "Complete Signature"}
									</Button>

									{!allRequiredFieldsSigned && (
										<p className="text-center text-xs text-orange-600 dark:text-orange-400">
											Complete all required fields to enable signing
										</p>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Unified Signature Dialog */}
					<UnifiedSignatureDialog
						document={
							document
								? {
										id: document.id,
										name: document.name,
										url: document.url,
										envelope: {
											id: document.envelope?.id ?? envelopeId,
											title: document.envelope?.title ?? "Document",
											status: document.envelope?.status ?? "PUBLISHED"
										},
										fields: userFields.map((field) => ({
											id: field.id,
											type: field.type,
											label: field.label,
											required: field.required,
											position: field.position,
											size: field.size,
											signed: field.signed,
											signatureValue: field.signatureValue,
											placeholder: `Enter your ${field.label.toLowerCase()}`
										}))
									}
								: null
						}
						currentField={currentFieldToSign}
						open={signatureDialogOpen}
						onOpenChange={setSignatureDialogOpen}
						onFieldSigned={handleFieldSigned}
					/>
				</div>
			</div>
		</>
	)
}
