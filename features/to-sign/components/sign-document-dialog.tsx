"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle, FileText, MapPin, PenTool, Sparkles } from "lucide-react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from "@/core/components/ui/dialog"
import { Form } from "@/core/components/ui/form"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from "@/core/components/ui/tabs"

import { trpc } from "@/services/trpc/client"

import type { signDocumentSchema } from "../api/to-sign.schemas"
import { PdfViewer } from "./pdf-viewer"
import { SignaturePad, type SignaturePadRef } from "./signature-pad"

const documentSignFormSchema = z.object({})

type DocumentSignFormSchema = z.infer<typeof documentSignFormSchema>

interface SignaturePosition {
	x: number
	y: number
	pageNumber: number
}

interface SignatureSize {
	width: number
	height: number
}

interface SignatureData {
	data: string | null
	text: string
	type: "drawn" | "typed" | "uploaded" | null
}

// Simplified Document interface for signing
interface SimpleDocument {
	id: string
	name: string
	url?: string
	envelopeId: string
}

interface SignDocumentDialogProps {
	document: SimpleDocument | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

export function SignDocumentDialog({
	document,
	open,
	onOpenChange,
	onSuccess
}: SignDocumentDialogProps) {
	const { data: session } = useSession()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [signaturePosition, setSignaturePosition] =
		useState<SignaturePosition | null>(null)
	const [signatureSize, setSignatureSize] = useState<SignatureSize | null>(null)
	const [processedSignatureImage, setProcessedSignatureImage] = useState<
		string | null
	>(null)
	const [hasSignature, setHasSignature] = useState(false)
	const [activeTab, setActiveTab] = useState("signature")

	// Store signature data separately to persist across tabs
	const [savedSignatureData, setSavedSignatureData] = useState<SignatureData>({
		data: null,
		text: "",
		type: null
	})

	const signaturePadRef = useRef<SignaturePadRef>(null)

	const [signaturePreview, setSignaturePreview] = useState<{
		data: string | null
		text: string | null
		type: "drawn" | "typed" | "uploaded" | null
	}>({
		data: null,
		text: null,
		type: null
	})

	const form = useForm<DocumentSignFormSchema>({
		resolver: zodResolver(documentSignFormSchema),
		defaultValues: {}
	})

	const utils = trpc.useUtils()
	const signDocumentMutation = trpc.toSign.signDocument.useMutation({
		onSuccess: () => {
			// Invalidate all related queries to refresh the data
			void utils.toSign.listEnvelopesToSign.invalidate()
			void utils.toSign.getEnvelopeToSign.invalidate()
			void utils.toSign.findDocumentById.invalidate()
			void utils.toSign.getPdfProxy.invalidate()
		}
	})

	// Override the default success handler
	const handleSignDocument = async (
		data: z.infer<typeof signDocumentSchema>
	) => {
		try {
			await signDocumentMutation.mutateAsync(data)
			toast.success(`Document "${document?.name}" signed successfully!`)

			// Reset submitting state first
			setIsSubmitting(false)

			// Call onSuccess to refresh the document list
			onSuccess()

			// Close dialog after a short delay to ensure toast is visible
			setTimeout(() => {
				handleClose()
			}, 100)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred"
			toast.error(`Signing failed: ${errorMessage}`)
			setIsSubmitting(false)
		}
	}

	const validateSignature = useCallback(() => {
		// Check saved signature data first
		if (
			savedSignatureData.type &&
			(savedSignatureData.data || savedSignatureData.text.trim())
		) {
			return true
		}

		// Fallback to signature pad ref
		if (!signaturePadRef.current) {
			return false
		}

		const isEmpty = signaturePadRef.current.isEmpty()
		const signatureData = signaturePadRef.current.getSignatureData()
		const signatureText = signaturePadRef.current.getSignatureText()

		// Check if we have any valid signature
		const hasValidSignature =
			!isEmpty && (!!signatureData || !!signatureText.trim())

		return hasValidSignature
	}, [savedSignatureData])

	const getSignatureForSubmission = useCallback(() => {
		// Use saved signature data if available
		if (savedSignatureData.type) {
			// For drawn and uploaded signatures, use the processed image if available
			const shouldUseProcessed =
				(savedSignatureData.type === "drawn" ||
					savedSignatureData.type === "uploaded") &&
				processedSignatureImage

			return {
				signatureData: shouldUseProcessed
					? processedSignatureImage
					: savedSignatureData.data,
				signatureText: savedSignatureData.text
			}
		}

		// Fallback to signature pad ref
		if (signaturePadRef.current) {
			return {
				signatureData: signaturePadRef.current.getSignatureData(),
				signatureText: signaturePadRef.current.getSignatureText()
			}
		}

		return {
			signatureData: null,
			signatureText: ""
		}
	}, [savedSignatureData, processedSignatureImage])

	const onSubmit = async (_values: DocumentSignFormSchema) => {
		if (!document) {
			toast.error("No document selected")
			return
		}

		// Validate signature first
		if (!validateSignature()) {
			toast.error("Please create a signature first")
			setActiveTab("signature")
			return
		}

		if (!signaturePosition) {
			toast.error(
				"Please select a position for your signature by clicking on the PDF preview"
			)
			setActiveTab("position")
			return
		}

		const { signatureData, signatureText } = getSignatureForSubmission()

		setIsSubmitting(true)

		try {
			console.log("Submitting signature with size:", {
				signaturePosition,
				signatureSize,
				signaturePreview: {
					type: savedSignatureData.type,
					hasData: !!signatureData,
					hasText: !!signatureText,
					hasProcessedImage: !!processedSignatureImage,
					usingProcessedImage:
						(savedSignatureData.type === "drawn" ||
							savedSignatureData.type === "uploaded") &&
						!!processedSignatureImage
				}
			})

			await handleSignDocument({
				documentId: document.id,
				envelopeId: document.envelopeId ?? "",
				userId: session?.user?.id ?? "",
				signatureText: signatureText || undefined,
				signatureImage: signatureData ?? undefined,
				position: signaturePosition,
				size: signatureSize ?? undefined
			})
		} catch {
			setIsSubmitting(false)
		}
	}

	const handleClose = () => {
		// Reset all state
		form.reset()
		setSignaturePosition(null)
		setSignatureSize(null)
		setProcessedSignatureImage(null)
		setHasSignature(false)
		setActiveTab("signature")
		setSavedSignatureData({ data: null, text: "", type: null })
		signaturePadRef.current?.clear()
		setSignaturePreview({
			data: null,
			text: null,
			type: null
		})
		setIsSubmitting(false)

		// Force close the dialog
		onOpenChange(false)
	}

	const canProceedToPosition = useMemo(() => {
		return hasSignature
	}, [hasSignature])

	const canSubmit = useMemo(() => {
		return canProceedToPosition && signaturePosition && validateSignature()
	}, [canProceedToPosition, signaturePosition, validateSignature])

	// Handle signature change from SignaturePad
	const handleSignatureChange = useCallback((newHasSignature: boolean) => {
		setHasSignature(newHasSignature)

		// Save signature data when it changes
		if (newHasSignature && signaturePadRef.current) {
			const data = signaturePadRef.current.getSignatureData()
			const text = signaturePadRef.current.getSignatureText()
			const type = signaturePadRef.current.getSignatureType()

			const newSignatureData = {
				data,
				text,
				type
			}

			setSavedSignatureData(newSignatureData)
		} else if (!newHasSignature) {
			setSavedSignatureData({ data: null, text: "", type: null })
		}
	}, [])

	// Update signature preview when signature changes
	useEffect(() => {
		if (hasSignature && savedSignatureData.type) {
			setSignaturePreview({
				data: savedSignatureData.data,
				text: savedSignatureData.text,
				type: savedSignatureData.type
			})
		} else {
			setSignaturePreview({
				data: null,
				text: null,
				type: null
			})
		}
	}, [hasSignature, savedSignatureData])

	// Prevent automatic tab switching when signature is cleared
	useEffect(() => {
		// If we're on position or review tab and signature gets cleared, go back to signature tab
		if (!hasSignature && (activeTab === "position" || activeTab === "review")) {
			setActiveTab("signature")
		}
	}, [hasSignature, activeTab])

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-h-[95vh] max-w-6xl border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
				<DialogHeader className="pb-6">
					<div className="mb-2 flex items-center gap-3">
						<div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-2">
							<PenTool className="h-5 w-5 text-white" />
						</div>
						<DialogTitle className="text-2xl font-bold text-slate-900">
							Sign Document
						</DialogTitle>
					</div>
					<DialogDescription className="text-base text-slate-600">
						Add your digital signature to &quot;{document?.name}&quot; securely
						and professionally
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[calc(95vh-140px)] pr-4">
					<div className="pr-2">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-8"
							>
								<Tabs
									value={activeTab}
									onValueChange={setActiveTab}
									className="w-full"
								>
									<TabsList className="mb-6 grid w-full grid-cols-3 rounded-lg bg-slate-100 p-1">
										<TabsTrigger
											value="signature"
											className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
										>
											<PenTool className="h-4 w-4" />
											Create Signature
										</TabsTrigger>
										<TabsTrigger
											value="position"
											className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
											disabled={!canProceedToPosition}
										>
											<MapPin className="h-4 w-4" />
											Position Signature
										</TabsTrigger>
										<TabsTrigger
											value="review"
											className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
											disabled={!canSubmit}
										>
											<CheckCircle className="h-4 w-4" />
											Review & Sign
										</TabsTrigger>
									</TabsList>

									<TabsContent value="signature" className="space-y-6">
										<div className="grid grid-cols-1 gap-8">
											{/* Signature Creation */}
											<div>
												<SignaturePad
													ref={signaturePadRef}
													onSignatureChange={handleSignatureChange}
												/>
											</div>
										</div>
									</TabsContent>

									<TabsContent value="position" className="space-y-6">
										<div className="grid grid-cols-1 gap-8">
											{/* Document Viewer */}
											<div>
												<Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
													<CardHeader className="pb-4">
														<CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
															<FileText className="h-5 w-5 text-blue-600" />
															Document Preview
														</CardTitle>
													</CardHeader>
													<CardContent>
														<div className="overflow-hidden rounded-lg border border-slate-200">
															<PdfViewer
																fileUrl={document?.url ?? ""}
																onPositionSelect={setSignaturePosition}
																onSizeChange={setSignatureSize}
																signaturePreview={signaturePreview}
															/>
														</div>
													</CardContent>
												</Card>
											</div>
										</div>
									</TabsContent>

									<TabsContent value="review" className="space-y-6">
										<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
											{/* Final Review */}
											<div>
												<Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
													<CardHeader className="pb-4">
														<CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
															<CheckCircle className="h-5 w-5 text-emerald-600" />
															Final Review
														</CardTitle>
													</CardHeader>
													<CardContent>
														<div className="space-y-4">
															<div className="rounded-lg bg-slate-50 p-4">
																<h4 className="mb-2 font-medium text-slate-900">
																	Document Details
																</h4>
																<div className="space-y-2 text-sm">
																	<div className="flex justify-between">
																		<span className="text-slate-600">
																			Document:
																		</span>
																		<span className="font-medium">
																			{document?.name}
																		</span>
																	</div>
																	<div className="flex justify-between">
																		<span className="text-slate-600">
																			Signature Type:
																		</span>
																		<span className="font-medium capitalize">
																			{signaturePreview.type}
																		</span>
																	</div>
																	<div className="flex justify-between">
																		<span className="text-slate-600">
																			Position:
																		</span>
																		<span className="font-medium">
																			Page {signaturePosition?.pageNumber}
																		</span>
																	</div>
																</div>
															</div>

															<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
																<div className="flex items-center gap-2 text-emerald-700">
																	<CheckCircle className="h-5 w-5" />
																	<span className="text-sm font-medium">
																		Ready to sign
																	</span>
																</div>
																<p className="mt-1 text-xs text-emerald-600">
																	Your signature will be securely applied to the
																	document
																</p>
															</div>
														</div>
													</CardContent>
												</Card>
											</div>

											{/* Signature Preview */}
											<div>
												<Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
													<CardHeader className="pb-4">
														<CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
															<PenTool className="h-5 w-5 text-blue-600" />
															Your Signature
														</CardTitle>
													</CardHeader>
													<CardContent>
														<div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
															{signaturePreview.type === "drawn" &&
																signaturePreview.data && (
																	<Image
																		src={signaturePreview.data}
																		alt="Signature preview"
																		width={300}
																		height={100}
																		className="mx-auto rounded"
																	/>
																)}
															{signaturePreview.type === "typed" &&
																signaturePreview.text && (
																	<p className="text-center font-serif text-2xl font-semibold text-slate-900">
																		{signaturePreview.text}
																	</p>
																)}
															{signaturePreview.type === "uploaded" &&
																signaturePreview.data && (
																	<Image
																		src={signaturePreview.data}
																		alt="Uploaded signature"
																		width={300}
																		height={100}
																		className="mx-auto rounded"
																	/>
																)}
														</div>
													</CardContent>
												</Card>
											</div>
										</div>
									</TabsContent>
								</Tabs>

								{/* Action Buttons */}
								<div className="flex items-center justify-between border-t border-slate-200 pt-6">
									<Button
										type="button"
										variant="outline"
										onClick={handleClose}
										className="border-slate-300 text-slate-700 hover:bg-slate-50"
									>
										Cancel
									</Button>

									<div className="flex gap-3">
										{activeTab === "signature" && (
											<Button
												type="button"
												onClick={() => setActiveTab("position")}
												disabled={!canProceedToPosition}
												className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700"
											>
												Next: Position Signature
												<MapPin className="ml-2 h-4 w-4" />
											</Button>
										)}

										{activeTab === "position" && (
											<>
												<Button
													type="button"
													variant="outline"
													onClick={() => setActiveTab("signature")}
													className="border-slate-300 text-slate-700 hover:bg-slate-50"
												>
													Back
												</Button>
												<Button
													type="button"
													onClick={() => setActiveTab("review")}
													disabled={!canSubmit}
													className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:from-blue-700 hover:to-purple-700"
												>
													Next: Review & Sign
													<CheckCircle className="ml-2 h-4 w-4" />
												</Button>
											</>
										)}

										{activeTab === "review" && (
											<>
												<Button
													type="button"
													variant="outline"
													onClick={() => setActiveTab("position")}
													className="border-slate-300 text-slate-700 hover:bg-slate-50"
												>
													Back
												</Button>
												<Button
													type="submit"
													disabled={isSubmitting || !canSubmit}
													className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg hover:from-emerald-700 hover:to-green-700"
												>
													{isSubmitting ? (
														<>
															<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
															Signing Document...
														</>
													) : (
														<>
															<PenTool className="mr-2 h-4 w-4" />
															Sign Document
														</>
													)}
												</Button>
											</>
										)}
									</div>
								</div>
							</form>
						</Form>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	)
}
