"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, CheckIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"

import { trpc } from "@/services/trpc/client"

import {
	DocumentPrePositioning,
	type DocumentField,
	type Recipient
} from "@/features/signature-lite/components/document-prepositioning"

interface UpdatePrepositioningClientProps {
	envelopeId: string
	documentId: string
	onUpdate?: (fields: DocumentField[]) => Promise<void>
}

export const UpdatePrepositioningClient = ({
	envelopeId,
	documentId,
	onUpdate
}: UpdatePrepositioningClientProps) => {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [isPendingAutoSave, setIsPendingAutoSave] = useState(false) // Track pending auto-save from child
	const utils = trpc.useUtils()

	// Ref to track current fields state from the component
	const currentFieldsRef = useRef<DocumentField[]>([])
	// Add state management similar to original update-positioning-page.tsx
	const [fields, setFields] = useState<DocumentField[]>([])

	// Ref to track if component is mounted
	const isMountedRef = useRef(true)

	// Immediate cache invalidation on mount to ensure fresh data
	useEffect(() => {
		// Only invalidate once on mount, not continuously
		void utils.signatureLite.prepositioning.invalidate()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Intentionally empty - only run once on mount

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			isMountedRef.current = false
			// Invalidate cache when component unmounts to ensure fresh data on next visit
			void utils.signatureLite.prepositioning.invalidate()
		}
	}, [utils])

	// Fetch document data with fields and envelope data
	const documentQuery =
		trpc.signatureLite.prepositioning.getDocumentWithFields.useQuery(
			{ documentId },
			{
				enabled: !!documentId,
				retry: 1,
				refetchOnWindowFocus: false, // Reduce unnecessary refetches
				staleTime: 10000, // Increased to 10 seconds to reduce conflicts during editing
				gcTime: 15000 // Keep cache longer to prevent unnecessary refetches
			}
		)

	const {
		data: documentData,
		isLoading: documentLoading,
		error: documentError
	} = documentQuery

	const envelopeQuery =
		trpc.signatureLite.prepositioning.getEnvelopeWithRecipients.useQuery(
			{ envelopeId, documentId },
			{
				enabled: !!envelopeId && !!documentId,
				retry: 1,
				refetchOnWindowFocus: false, // Reduce unnecessary refetches
				staleTime: 10000, // Increased to 10 seconds to reduce conflicts during editing
				gcTime: 15000 // Keep cache longer to prevent unnecessary refetches
			}
		)

	const {
		data: envelope,
		isLoading: envelopeLoading,
		error: envelopeError
	} = envelopeQuery

	// Mutation for saving fields only
	const saveFieldsMutation =
		trpc.signatureLite.prepositioning.saveDocumentFields.useMutation({
			onSuccess: () => {
				// Don't invalidate cache immediately to prevent reverting field positions
				// The cache will naturally refresh when staleTime expires
				setFieldsSaved(true)
			},
			onError: (_error) => {
				toast.error("Failed to save fields")
			}
		})

	useEffect(() => {
		if (!documentLoading && !envelopeLoading) {
			setIsLoading(false)
		}
	}, [documentLoading, envelopeLoading])

	useEffect(() => {
		if (documentError) {
			toast.error("Failed to load document")
		}
		if (envelopeError) {
			toast.error("Failed to load envelope")
		}
	}, [documentError, envelopeError])

	const handleSaveFields = async (fields?: DocumentField[]): Promise<void> => {
		// Use provided fields or current fields from ref
		const fieldsToSave = fields ?? currentFieldsRef.current

		if (fieldsToSave.length === 0) {
			return // Don't throw error for empty fields, just return
		}

		try {
			const formattedFields = fieldsToSave.map((field) => {
				// Validate each field before formatting
				if (!field.id || !field.type || !field.label) {
					throw new Error(
						`Field missing required properties: ${JSON.stringify(field)}`
					)
				}

				if (!field.recipientId) {
					throw new Error(`Field missing recipientId: ${field.label}`)
				}

				return {
					...field,
					options: field.options ?? []
				}
			})

			await saveFieldsMutation.mutateAsync({
				documentId,
				fields: formattedFields
			})

			// Mutation's onSuccess will handle state updates
		} catch (error) {
			// Log the specific error information
			if (error && typeof error === "object") {
				console.error("Error details:", JSON.stringify(error, null, 2))
			}
			throw new Error(
				`Failed to save document fields: ${error instanceof Error ? error.message : "Unknown error"}`
			)
		}
	}

	const handleFieldsChange = (fields: DocumentField[]) => {
		currentFieldsRef.current = fields
		setFields(fields) // Also update state for better tracking
	}

	// Handle pending save state changes from the child component
	const handlePendingSaveChange = (isPending: boolean) => {
		setIsPendingAutoSave(isPending)
	}

	// Force refresh function to get latest data
	const refreshData = async () => {
		try {
			await Promise.all([documentQuery.refetch(), envelopeQuery.refetch()])
		} catch {
			toast.error("Failed to refresh data")
		}
	}

	const handleBack = () => {
		router.back()
	}

	// State for placeholder recipients
	const [fieldsSaved, setFieldsSaved] = useState(false)

	// Transform envelope recipients to match component interface
	const recipients: Recipient[] = useMemo(() => {
		if (!envelope?.recipient) return []

		// Only show APPROVED real recipients (not pending requests)
		const realRecipients = envelope.recipient
			.filter((r) => r.userId !== null && r.status === "APPROVED") // Only approved real recipients
			.map((recipient, index) => ({
				id: recipient.id,
				email:
					recipient.user?.email ??
					recipient.email ??
					`recipient-${index + 1}@example.com`,
				name:
					recipient.user?.name ?? recipient.name ?? `Recipient ${index + 1}`,
				role: recipient.role as "SIGNER" | "APPROVER" | "CC",
				color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
			}))

		// Get placeholder recipients (these are placeholders waiting for real users)
		const placeholderRecipientsFromDB = envelope.recipient
			.filter((r) => r.userId === null && r.status === "PENDING")
			.map((recipient, index) => ({
				id: recipient.id,
				email: recipient.email ?? `recipient-${index + 1}@placeholder.com`,
				name: recipient.name ?? `Recipient ${index + 1}`,
				role: recipient.role as "SIGNER" | "APPROVER" | "CC",
				color: `hsl(${((realRecipients.length + index) * 137.5) % 360}, 70%, 50%)`
			}))

		return [...realRecipients, ...placeholderRecipientsFromDB]
	}, [envelope])

	// Mutation for creating placeholder recipients
	const createPlaceholderRecipient =
		trpc.envelopeLite.createPlaceholderRecipient.useMutation({
			onSuccess: () => {
				toast.success("Placeholder recipient added")
				// Refetch envelope data to update the UI
				void envelopeQuery.refetch()
			},
			onError: (_error) => {
				toast.error("Failed to add recipient")
			}
		})

	// Mutation for deleting placeholder recipients
	const deletePlaceholderRecipientMutation =
		trpc.envelopeLite.deletePlaceholderRecipient.useMutation({
			onSuccess: () => {
				toast.success("Recipient deleted")
				// Refetch envelope data to update the UI
				void envelopeQuery.refetch()
			},
			onError: (_error) => {
				toast.error("Failed to delete recipient")
			}
		})

	// Function to add placeholder recipient
	const addPlaceholderRecipient = () => {
		// Count existing placeholder recipients from the database, not from the UI state
		const existingPlaceholders =
			envelope?.recipient?.filter(
				(r) => r.userId === null && r.status === "PENDING"
			).length ?? 0

		const newIndex = existingPlaceholders + 1
		createPlaceholderRecipient.mutate({
			envelopeId,
			documentId,
			name: `Recipient${newIndex}`,
			email: `recipient${newIndex}@placeholder.com`
		})
	}

	// Handle update function - simplified and cleaned up
	const handleUpdate = async () => {
		if (!isMountedRef.current || !documentData) {
			return
		}

		// Don't proceed if there's a pending auto-save
		if (isPendingAutoSave) {
			toast.info("Please wait for auto-save to complete...")
			return
		}

		setIsSaving(true)

		try {
			// Get current fields - use state first, then ref as fallback
			const currentFields =
				fields.length > 0 ? fields : currentFieldsRef.current

			// Only save if we have fields to save
			if (currentFields.length > 0) {
				// Validate recipients exist for all fields
				const invalidFields = currentFields.filter(
					(field) => !recipients.find((r) => r.id === field.recipientId)
				)

				if (invalidFields.length > 0) {
					toast.error("Some fields have invalid recipient assignments")
					return
				}

				// Save the fields (but don't trigger auto-save since we're doing manual save)
				await handleSaveFields(currentFields)
			}

			// Call onUpdate callback if provided
			if (onUpdate && currentFields.length > 0) {
				await onUpdate(currentFields)
			}

			// Success feedback and navigation
			toast.success("Field positions updated successfully")
			router.push(`/envelope/${envelopeId}`)
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred"
			toast.error(`Failed to update field positions: ${errorMessage}`)
		} finally {
			if (isMountedRef.current) {
				setIsSaving(false)
			}
		}
	}

	// Function to delete placeholder recipient
	const deletePlaceholderRecipient = (recipientId: string) => {
		deletePlaceholderRecipientMutation.mutate({ recipientId })
	}

	// Extract existing fields from document if available
	const existingFields: DocumentField[] = useMemo(
		() =>
			documentData?.documentFields?.map((field) => ({
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
		[documentData?.documentFields]
	)

	// Initialize the ref and state with existing fields
	useEffect(() => {
		// Always update to match existingFields, even if empty
		currentFieldsRef.current = existingFields
		setFields(existingFields)
	}, [existingFields])

	// Force refresh data when component mounts or document ID changes
	useEffect(() => {
		if (documentId) {
			// Only invalidate cache once when document ID changes, not continuously
			void utils.signatureLite.prepositioning.getDocumentWithFields.invalidate({
				documentId
			})
			void utils.signatureLite.prepositioning.getEnvelopeWithRecipients.invalidate(
				{ envelopeId, documentId }
			)
		}
	}, [
		documentId,
		envelopeId,
		utils.signatureLite.prepositioning.getDocumentWithFields,
		utils.signatureLite.prepositioning.getEnvelopeWithRecipients
	]) // Only depend on IDs, not query functions to prevent loops

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="w-96">
					<CardContent className="flex items-center justify-center py-12">
						<div className="text-center">
							<Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
							<h3 className="text-lg font-medium text-foreground">
								Loading Document
							</h3>
							<p className="text-sm text-muted-foreground">
								Please wait while we prepare your document for updating...
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!documentData) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<Card className="w-96">
					<CardContent className="py-12 text-center">
						<h3 className="mb-2 text-lg font-medium text-foreground">
							Document Not Found
						</h3>
						<p className="mb-4 text-sm text-muted-foreground">
							The document you&apos;re looking for doesn&apos;t exist or you
							don&apos;t have permission to access it.
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

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="border-b bg-muted/60 shadow-sm">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-xl font-semibold">Update Positioning</h1>
							<p className="text-sm text-gray-600">
								Position signature fields on {documentData?.name}
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<Button
								onClick={handleUpdate}
								disabled={isSaving || isPendingAutoSave}
								size="sm"
								className="md:size-default mb-2"
							>
								{isSaving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : isPendingAutoSave ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<CheckIcon className="mr-2 h-4 w-4" />
								)}
								<span className="hidden sm:inline">
									{isPendingAutoSave ? "Saving..." : "Done"}
								</span>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Document Positioning Component */}
			<DocumentPrePositioning
				documentUrl={documentData.url}
				documentId={documentId}
				recipients={recipients}
				existingFields={fields.length > 0 ? fields : existingFields}
				onSave={handleSaveFields}
				onFieldsChange={handleFieldsChange}
				hideSaveButton={true}
				showFieldEditor={true}
				fieldsSaved={fieldsSaved}
				onAddRecipient={addPlaceholderRecipient}
				isAddingRecipient={createPlaceholderRecipient.isPending}
				onDeleteRecipient={deletePlaceholderRecipient}
				onRefresh={refreshData}
				onPendingSaveChange={handlePendingSaveChange}
			/>
		</div>
	)
}
