"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Loader2, Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"

import { trpc } from "@/services/trpc/client"

import {
	DocumentPrePositioning,
	type DocumentField,
	type Recipient
} from "@/features/signature-lite/components/document-prepositioning"

export default function DocumentPositioningPage() {
	const params = useParams()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(true)

	// Ref to track current fields state from the component
	const currentFieldsRef = useRef<DocumentField[]>([])

	const envelopeId = params.envelopeId as string
	const documentId = params.documentId as string

	// Fetch document data with fields and envelope data
	const {
		data: document,
		isLoading: documentLoading,
		error: documentError
	} = trpc.signatureLite.prepositioning.getDocumentWithFields.useQuery(
		{ documentId },
		{
			enabled: !!documentId,
			retry: 1
		}
	)

	const {
		data: envelope,
		isLoading: envelopeLoading,
		error: envelopeError
	} = trpc.signatureLite.prepositioning.getEnvelopeWithRecipients.useQuery(
		{ envelopeId, documentId },
		{
			enabled: !!envelopeId && !!documentId,
			retry: 1
		}
	)

	// Mutation for sending envelope
	const sendEnvelopeMutation = trpc.signatureLite.sendEnvelope.useMutation()

	// Also add save mutation for field positioning
	const saveFieldsMutation =
		trpc.signatureLite.prepositioning.saveDocumentFields.useMutation()

	const handleSaveFields = async (fields: DocumentField[]) => {
		try {
			const fieldsToSave = fields.map((field) => ({
				...field,
				options: field.options ?? []
			}))

			await saveFieldsMutation.mutateAsync({
				documentId,
				fields: fieldsToSave
			})
		} catch (error) {
			console.error("Auto-save fields error:", error)
			throw error
		}
	}

	const handleFieldsChange = (fields: DocumentField[]) => {
		currentFieldsRef.current = fields
	}

	useEffect(() => {
		if (!documentLoading && !envelopeLoading) {
			setIsLoading(false)
		}
	}, [documentLoading, envelopeLoading])

	useEffect(() => {
		if (documentError) {
			toast.error("Failed to load document")
			console.error("Document error:", documentError)
		}
		if (envelopeError) {
			toast.error("Failed to load envelope")
			console.error("Envelope error:", envelopeError)
		}
	}, [documentError, envelopeError])

	const handleSendEnvelope = async () => {
		if (!envelope) return

		try {
			// First save the current fields if any exist
			if (currentFieldsRef.current.length > 0) {
				await handleSaveFields(currentFieldsRef.current)
			}

			// Then send the envelope
			await sendEnvelopeMutation.mutateAsync({ envelopeId })
			toast.success("Envelope sent successfully!")
			router.push(`/envelope/${envelopeId}`)
		} catch (error) {
			console.error("Send envelope error:", error)
			toast.error("Failed to send envelope")
		}
	}

	const handleBack = () => {
		router.back()
	}

	// Transform envelope recipients to match component interface
	const recipients: Recipient[] =
		envelope?.recipient?.map((recipient, index) => ({
			id: recipient.id,
			email:
				recipient.user?.email ??
				recipient.email ??
				`recipient-${index + 1}@example.com`,
			name: recipient.user?.name ?? recipient.name ?? `Recipient ${index + 1}`,
			role: recipient.role as "SIGNER" | "APPROVER" | "CC",
			color: `hsl(${(index * 137.5) % 360}, 70%, 50%)` // Generate colors
		})) ?? []

	// Extract existing fields from document if available
	const existingFields: DocumentField[] = useMemo(
		() =>
			document?.documentFields?.map((field) => ({
				id: field.id,
				type: field.type as DocumentField["type"],
				label: field.label,
				placeholder: field.placeholder ?? undefined,
				required: field.required,
				options: field.options ?? [],
				position: {
					x: field.x,
					y: field.y,
					pageNumber: field.pageNumber
				},
				size: {
					width: field.width,
					height: field.height
				},
				recipientId: field.recipientId
			})) ?? [],
		[document?.documentFields]
	)

	// Initialize the ref with existing fields
	useEffect(() => {
		if (existingFields.length > 0) {
			currentFieldsRef.current = existingFields
		}
	}, [existingFields])

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<Card className="w-96">
					<CardContent className="flex items-center justify-center py-12">
						<div className="text-center">
							<Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
							<h3 className="text-lg font-medium">Loading Document</h3>
							<p className="text-sm text-gray-600">
								Please wait while we prepare your document for positioning...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!document || !envelope) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<Card className="w-96">
					<CardContent className="py-12 text-center">
						<h3 className="mb-2 text-lg font-medium">Document Not Found</h3>
						<p className="mb-4 text-sm text-gray-600">
							The document or envelope you&apos;re looking for doesn&apos;t
							exist or you don&apos;t have permission to access it.
						</p>
						<Button onClick={handleBack} variant="outline">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Go Back
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (recipients.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<Card className="w-96">
					<CardContent className="py-12 text-center">
						<h3 className="mb-2 text-lg font-medium">No Recipients</h3>
						<p className="mb-4 text-sm text-gray-600">
							Please add recipients to this envelope before positioning fields.
						</p>
						<Button
							onClick={() => router.push(`/envelope/${envelopeId}/recipients`)}
						>
							Add Recipients
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="border-b bg-white shadow-sm">
				<div className="mx-auto max-w-7xl px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button variant="ghost" onClick={handleBack}>
								<ArrowLeft className="h-4 w-4" />
							</Button>
							<div>
								<h1 className="text-xl font-semibold">
									Position Document Fields
								</h1>
								<p className="text-sm text-gray-600">
									{document.name} • {envelope.title}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onClick={handleSendEnvelope}
								disabled={sendEnvelopeMutation.isPending}
							>
								{sendEnvelopeMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								Send for Signature
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Document Positioning Interface */}
			<DocumentPrePositioning
				documentUrl={document.url}
				documentId={documentId}
				recipients={recipients}
				existingFields={existingFields}
				onSave={handleSaveFields}
				onFieldsChange={handleFieldsChange}
				showFieldEditor={true}
			/>
		</div>
	)
}
