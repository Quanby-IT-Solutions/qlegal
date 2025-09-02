"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
	Calendar,
	CheckSquare,
	Circle,
	LetterTextIcon,
	Loader2,
	Mail,
	Pen,
	Plus,
	Trash2,
	Type
} from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { useIsMobile } from "@/core/hooks/use-mobile"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

export interface DocumentField {
	id: string
	type:
		| "SIGNATURE"
		| "INITIAL"
		| "NAME"
		| "DATE"
		| "TEXT"
		| "EMAIL"
		| "CHECKBOX"
		| "RADIO"
	label: string
	placeholder?: string
	required: boolean
	options?: string[]
	position: {
		x: number
		y: number
		pageNumber: number
	}
	size: {
		width: number
		height: number
	}
	recipientId: string
}

export interface Recipient {
	id: string
	email: string
	name: string
	role: "SIGNER" | "APPROVER" | "CC"
	color: string
}

interface PrePositioningPageProps {
	documentUrl: string
	_documentId: string
	recipients: Recipient[]
	existingFields?: DocumentField[]
	_onSave: (fields: DocumentField[]) => Promise<void>
	onFieldsChange?: (fields: DocumentField[]) => void
	_hideSaveButton?: boolean
	_onPreview?: () => void
	fieldsSaved?: boolean
	onAddRecipient?: () => void
	isAddingRecipient?: boolean
	onDeleteRecipient?: (recipientId: string) => void
	_onRefresh?: () => Promise<void>
	onPendingSaveChange?: (isPending: boolean) => void // Add callback for pending save state
}

const FIELD_TYPES = [
	{
		value: "SIGNATURE",
		label: "Signature",
		icon: Pen,
		defaultSize: { width: 200, height: 60 }
	},
	{
		value: "INITIAL",
		label: "Initial",
		icon: LetterTextIcon,
		defaultSize: { width: 60, height: 60 }
	},
	{
		value: "NAME",
		label: "Name",
		icon: Type,
		defaultSize: { width: 200, height: 40 }
	},
	{
		value: "DATE",
		label: "Date",
		icon: Calendar,
		defaultSize: { width: 150, height: 40 }
	},
	{
		value: "TEXT",
		label: "Text",
		icon: Type,
		defaultSize: { width: 200, height: 40 }
	},
	{
		value: "EMAIL",
		label: "Email",
		icon: Mail,
		defaultSize: { width: 200, height: 40 }
	},
	{
		value: "CHECKBOX",
		label: "Checkbox",
		icon: CheckSquare,
		defaultSize: { width: 20, height: 20 }
	},
	{
		value: "RADIO",
		label: "Radio",
		icon: Circle,
		defaultSize: { width: 20, height: 20 }
	}
] as const

const RECIPIENT_COLORS = [
	"#3B82F6", // Blue
	"#EF4444", // Red
	"#10B981", // Green
	"#F59E0B", // Orange
	"#8B5CF6", // Purple
	"#EC4899", // Pink
	"#06B6D4", // Cyan
	"#84CC16" // Lime
]

export default function PrePositioningPage({
	documentUrl,
	_documentId,
	recipients,
	existingFields = [],
	_onSave,
	onFieldsChange,
	_hideSaveButton = false,
	_onPreview,
	fieldsSaved = false,
	onAddRecipient,
	isAddingRecipient = false,
	onDeleteRecipient,
	_onRefresh,
	onPendingSaveChange
}: PrePositioningPageProps) {
	const [numPages, setNumPages] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageScale, setPageScale] = useState<number>(1.2)
	const [isLoading, setIsLoading] = useState(true)
	const [showSidebar, setShowSidebar] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [isPendingAutoSave, setIsPendingAutoSave] = useState(false) // Track pending auto-save
	const isMobile = useIsMobile()

	// Field management
	const [fields, setFields] = useState<DocumentField[]>(existingFields)
	const fieldsRef = useRef<DocumentField[]>(existingFields) // Track latest fields state
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null) // For debouncing saves
	const [selectedFieldType, setSelectedFieldType] =
		useState<string>("SIGNATURE")
	const [selectedRecipient, setSelectedRecipient] = useState<string>(
		recipients[0]?.id ?? ""
	)
	const [draggedField, setDraggedField] = useState<DocumentField | null>(null)
	const [isPlacingField, setIsPlacingField] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const [isResizing, setIsResizing] = useState(false)

	// Sync fields with existingFields when they change (e.g., after cache invalidation)
	// But only if we're not currently dragging/editing to avoid reverting user changes
	useEffect(() => {
		if (!isDragging && !isResizing && !isPlacingField) {
			setFields(existingFields)
			fieldsRef.current = existingFields
		}
	}, [existingFields, isDragging, isResizing, isPlacingField])

	// Update fieldsRef whenever fields change
	useEffect(() => {
		fieldsRef.current = fields
	}, [fields])

	// Notify parent about pending save state changes
	useEffect(() => {
		onPendingSaveChange?.(isPendingAutoSave)
	}, [isPendingAutoSave, onPendingSaveChange])

	// Update scale based on mobile state
	useEffect(() => {
		setPageScale(isMobile ? 0.8 : 1.2)
	}, [isMobile])

	// Auto-fit PDF to container width when document loads
	useEffect(() => {
		if (!pdfContainerRef.current || numPages === 0) return

		const containerWidth = pdfContainerRef.current.clientWidth - 32 // Account for padding
		const pageWidth = 595 // Standard PDF page width in points
		const fitScale = containerWidth / pageWidth

		// On mobile, use fit-to-width by default, on desktop use responsive scale
		if (isMobile && fitScale < 1.2) {
			setPageScale(Math.max(0.5, fitScale))
		}
	}, [numPages, isMobile])

	// Refs
	const pdfContainerRef = useRef<HTMLDivElement>(null)
	const pageRef = useRef<HTMLDivElement>(null)

	// Assign colors to recipients
	const recipientsWithColors = recipients.map((recipient, index) => ({
		...recipient,
		color: RECIPIENT_COLORS[index % RECIPIENT_COLORS.length]
	}))

	// Clear selectedRecipient if it no longer exists in recipients list
	useEffect(() => {
		const recipientExists = recipientsWithColors.some(
			(r) => r.id === selectedRecipient
		)
		if (selectedRecipient && !recipientExists) {
			setSelectedRecipient("")
			setIsPlacingField(false)
		}
	}, [recipientsWithColors, selectedRecipient])

	// Auto-save function with better field handling
	const autoSave = useCallback(
		async (fieldsToSave: DocumentField[]) => {
			if (!_onSave || fieldsToSave.length === 0) return

			setIsSaving(true)
			try {
				await _onSave(fieldsToSave)
				// Only call refresh if explicitly provided
				if (_onRefresh) {
					await _onRefresh()
				}
			} catch {
				toast.error("Failed to save changes")
			} finally {
				setIsSaving(false)
			}
		},
		[_onSave, _onRefresh]
	)

	// Debounced auto-save to prevent excessive saves during drag operations
	const debouncedAutoSave = useCallback(
		(fieldsToSave: DocumentField[]) => {
			// Clear any existing timeout
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current)
			}

			// Set pending state
			setIsPendingAutoSave(true)

			// Set a new timeout to save after 1 second of inactivity
			saveTimeoutRef.current = setTimeout(() => {
				void (async () => {
					await autoSave(fieldsToSave)
					setIsPendingAutoSave(false)
				})()
			}, 1000)
		},
		[autoSave]
	)

	// Function to cancel any pending auto-save
	const cancelPendingAutoSave = useCallback(() => {
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current)
			saveTimeoutRef.current = null
			setIsPendingAutoSave(false)
		}
	}, [])

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			cancelPendingAutoSave()
		}
	}, [cancelPendingAutoSave])

	// Update fields without auto-save (for real-time updates during drag/resize)
	const updateFieldsImmediate = (newFields: DocumentField[]) => {
		setFields(newFields)
		fieldsRef.current = newFields
		onFieldsChange?.(newFields)

		// Also use debounced save for continuous updates to handle rapid changes
		debouncedAutoSave(newFields)
	}

	// Update fields and notify parent with auto-save (for discrete actions)
	const updateFields = async (newFields: DocumentField[]) => {
		// Cancel any pending auto-save before doing manual save
		cancelPendingAutoSave()

		setFields(newFields)
		fieldsRef.current = newFields
		onFieldsChange?.(newFields)

		// Auto-save when fields change (discrete actions only)
		await autoSave(newFields)
	}

	// Function to copy invite link for a recipient
	// const copyInviteLink = (recipientName: string) => {
	// 	const origin = typeof window !== "undefined" ? window.location.origin : ""
	// 	// Extract envelope ID from the current URL path
	// 	const pathParts = window.location.pathname.split("/")
	// 	const envelopeIdIndex =
	// 		pathParts.findIndex((part) => part === "envelope") + 1
	// 	const envelopeId = pathParts[envelopeIdIndex]

	// 	if (!envelopeId) {
	// 		toast.error("Could not generate invite link")
	// 		return
	// 	}

	// 	// We need to get the envelope's token, not use the ID as token
	// 	// For now, let's use the envelope ID as the token since that's what the backend expects
	// 	// The real fix would be to fetch the envelope's token from the backend
	// 	const link = `${origin}/envelope/invite?token=${encodeURIComponent(envelopeId)}&placeholder=${encodeURIComponent(recipientName)}`
	// 	void navigator.clipboard.writeText(link)
	// 	toast.success(`Invite link for ${recipientName} copied to clipboard`)
	// }

	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setNumPages(numPages)
		setIsLoading(false)
	}

	const onDocumentLoadError = (_error: Error) => {
		toast.error("Failed to load document")
		setIsLoading(false)
	}

	// Validate recipient selection before allowing field placement
	const handleFieldTypeSelect = (fieldTypeValue: string) => {
		// Check if selectedRecipient exists in the current recipients list
		const recipientExists = recipientsWithColors.some(
			(r) => r.id === selectedRecipient
		)

		if (!selectedRecipient || !recipientExists) {
			toast.error("Please select a recipient first before adding fields")
			return
		}

		setSelectedFieldType(fieldTypeValue)
		setIsPlacingField(true)
		const fieldType = FIELD_TYPES.find((ft) => ft.value === fieldTypeValue)
		toast.info(
			`Click on the document to place a ${fieldType?.label.toLowerCase()} field`
		)
	}

	const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
		// Check if selectedRecipient exists in the current recipients list
		const recipientExists = recipientsWithColors.some(
			(r) => r.id === selectedRecipient
		)

		if (
			!isPlacingField ||
			!pageRef.current ||
			!selectedRecipient ||
			!recipientExists
		) {
			if (!selectedRecipient || !recipientExists) {
				toast.error("Please select a recipient first")
			}
			return
		}

		const rect = pageRef.current.getBoundingClientRect()
		const clickX = (event.clientX - rect.left) / pageScale
		const clickY = (event.clientY - rect.top) / pageScale

		const fieldType = FIELD_TYPES.find((ft) => ft.value === selectedFieldType)
		if (!fieldType) return

		// Get page dimensions for boundary checking
		const pageWidth = rect.width / pageScale
		const pageHeight = rect.height / pageScale

		// Ensure field fits within page boundaries
		const maxX = Math.max(0, pageWidth - fieldType.defaultSize.width)
		const maxY = Math.max(0, pageHeight - fieldType.defaultSize.height)

		const x = Math.max(0, Math.min(clickX, maxX))
		const y = Math.max(0, Math.min(clickY, maxY))

		const newField: DocumentField = {
			id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			type: selectedFieldType as DocumentField["type"],
			label: `${fieldType.label} ${fields.length + 1}`,
			placeholder: `Enter ${fieldType.label.toLowerCase()}`,
			required:
				selectedFieldType === "SIGNATURE" || selectedFieldType === "INITIAL",
			position: {
				x,
				y,
				pageNumber: currentPage
			},
			size: fieldType.defaultSize,
			recipientId: selectedRecipient
		}

		void updateFields([...fields, newField])
		setIsPlacingField(false)
	}

	const handleFieldDragStart = (
		field: DocumentField,
		event: React.MouseEvent
	) => {
		event.preventDefault()
		event.stopPropagation()
		if (!pageRef.current) return

		setIsDragging(true)
		setDraggedField(field)

		const rect = pageRef.current.getBoundingClientRect()
		const startX = (event.clientX - rect.left) / pageScale
		const startY = (event.clientY - rect.top) / pageScale

		// Calculate offset from field's top-left corner
		const offsetX = startX - field.position.x
		const offsetY = startY - field.position.y

		// Store the current offset for this drag session
		const currentDragOffset = { x: offsetX, y: offsetY }

		const handleMouseMove = (e: MouseEvent) => {
			if (!pageRef.current) return

			const rect = pageRef.current.getBoundingClientRect()
			const mouseX = (e.clientX - rect.left) / pageScale
			const mouseY = (e.clientY - rect.top) / pageScale

			// Calculate new position accounting for drag offset
			const newX = mouseX - currentDragOffset.x
			const newY = mouseY - currentDragOffset.y

			// Get page dimensions for boundary checking
			const pageWidth = rect.width / pageScale
			const pageHeight = rect.height / pageScale

			// Ensure field fits within page boundaries
			const maxX = Math.max(0, pageWidth - field.size.width)
			const maxY = Math.max(0, pageHeight - field.size.height)

			const x = Math.max(0, Math.min(newX, maxX))
			const y = Math.max(0, Math.min(newY, maxY))

			// Update field position immediately for smooth dragging (no auto-save)
			const updatedFields = fields.map((f) =>
				f.id === field.id
					? {
							...f,
							position: { ...f.position, x, y, pageNumber: currentPage }
						}
					: f
			)
			updateFieldsImmediate(updatedFields)
		}

		const handleMouseUp = () => {
			setIsDragging(false)
			setDraggedField(null)
			// Use debounced auto-save after drag ends to prevent excessive saves
			debouncedAutoSave(fieldsRef.current)
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}

		document.addEventListener("mousemove", handleMouseMove)
		document.addEventListener("mouseup", handleMouseUp)
	}

	const handleFieldDelete = (fieldId: string) => {
		void updateFields(fields.filter((field) => field.id !== fieldId))
	}

	const handleResizeStart = (field: DocumentField, event: React.MouseEvent) => {
		event.preventDefault()
		event.stopPropagation()
		setIsResizing(true)
		setDraggedField(field) // Set the field being resized for visual feedback

		const startMouseX = event.clientX
		const startMouseY = event.clientY
		const startWidth = field.size.width
		const startHeight = field.size.height

		const handleMouseMove = (e: MouseEvent) => {
			if (!pageRef.current) return

			const deltaX = (e.clientX - startMouseX) / pageScale
			const deltaY = (e.clientY - startMouseY) / pageScale

			// Get page dimensions for boundary checking
			const rect = pageRef.current.getBoundingClientRect()
			const pageWidth = rect.width / pageScale
			const pageHeight = rect.height / pageScale

			// Calculate new size with minimum constraints
			const newWidth = Math.max(20, startWidth + deltaX)
			const newHeight = Math.max(20, startHeight + deltaY)

			// Ensure field doesn't exceed page boundaries
			const maxWidth = pageWidth - field.position.x
			const maxHeight = pageHeight - field.position.y

			const finalWidth = Math.min(newWidth, maxWidth)
			const finalHeight = Math.min(newHeight, maxHeight)

			// Update field size immediately for smooth resizing (no auto-save)
			const updatedFields = fields.map((f) =>
				f.id === field.id
					? {
							...f,
							size: {
								width: finalWidth,
								height: finalHeight
							}
						}
					: f
			)
			updateFieldsImmediate(updatedFields)
		}

		const handleMouseUp = () => {
			setIsResizing(false)
			setDraggedField(null)
			// Use debounced auto-save after resize ends to prevent excessive saves
			debouncedAutoSave(fieldsRef.current)
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}

		document.addEventListener("mousemove", handleMouseMove)
		document.addEventListener("mouseup", handleMouseUp)
	}

	const currentPageFields = fields.filter(
		(field) => field.position.pageNumber === currentPage
	)

	return (
		<div className="min-h-screen bg-background p-2 md:p-4">
			<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-4">
					{/* Field Tools Sidebar */}
					<div className="space-y-4 md:space-y-6 xl:order-1">
						{/* Mobile Toggle for Sidebar */}
						<div className="xl:hidden">
							<Button
								variant="outline"
								onClick={() => setShowSidebar(!showSidebar)}
								className="w-full"
							>
								{showSidebar ? "Hide Tools" : "Show Tools"}
							</Button>
						</div>

						<div
							className={`space-y-4 md:space-y-6 ${showSidebar ? "block" : "hidden xl:block"}`}
						>
							{/* Recipients */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm">Recipients</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{recipientsWithColors.length === 0 ? (
										<div className="py-4 text-center">
											<p className="mb-3 text-sm text-gray-500">
												No recipients yet. Add recipients first to start
												positioning fields.
											</p>
											{onAddRecipient && (
												<Button
													onClick={onAddRecipient}
													variant="default"
													className="w-full"
													size="sm"
													disabled={isAddingRecipient}
												>
													{isAddingRecipient ? (
														<Loader2 className="mr-2 h-3 w-3 animate-spin xl:h-4 xl:w-4" />
													) : (
														<Plus className="mr-2 h-3 w-3 xl:h-4 xl:w-4" />
													)}
													Add First Recipient
												</Button>
											)}
										</div>
									) : (
										<>
											{recipientsWithColors.map((recipient, index) => (
												<div
													key={`${recipient.id}-${recipient.email}-${index}`}
													className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors ${
														selectedRecipient === recipient.id
															? selectedFieldType
																? "border-primary bg-primary/10"
																: "border-blue-500 bg-background"
															: "border bg-muted hover:bg-popover"
													}`}
													onClick={() => {
														setSelectedRecipient(recipient.id)
														// Auto-select SIGNATURE field type for first recipient (placeholder)
														// if (
														// 	recipient.email.includes("placeholder.com") &&
														// 	index === 0
														// ) {
														// 	setSelectedFieldType("SIGNATURE")
														// }
													}}
												>
													<div
														className="h-3 w-3 flex-shrink-0 rounded-full"
														style={{ backgroundColor: recipient.color }}
													/>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium">
															{recipient.name}
														</p>
														<p className="truncate text-xs text-gray-500">
															{recipient.email}
														</p>
													</div>
													<div className="flex items-center gap-1">
														{/* Show copy invite link button only for placeholder recipients after fields are saved */}
														{fieldsSaved &&
															recipient.email.includes("placeholder.com") && (
																<Button
																	size="sm"
																	variant="outline"
																	className="h-6 px-2 text-xs"
																	onClick={(e) => {
																		e.stopPropagation()
																		// copyInviteLink(recipient.name)
																	}}
																>
																	Copy Link
																</Button>
															)}
														{/* Delete recipient button */}
														{onDeleteRecipient &&
															recipient.email.includes("placeholder.com") && (
																<Button
																	size="sm"
																	variant="ghost"
																	className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
																	onClick={(e) => {
																		e.stopPropagation()
																		onDeleteRecipient(recipient.id)
																	}}
																	title="Delete recipient"
																>
																	<Trash2 className="h-3 w-3" />
																</Button>
															)}
													</div>
												</div>
											))}

											{/* Add Recipient Button */}
											{onAddRecipient && (
												<Button
													onClick={onAddRecipient}
													className="w-full justify-start text-xs xl:text-sm"
													size="sm"
													disabled={isAddingRecipient}
												>
													{isAddingRecipient ? (
														<Loader2 className="h-3 w-3 animate-spin xl:h-4 xl:w-4" />
													) : (
														<Plus className="h-3 w-3 xl:h-4 xl:w-4" />
													)}
													<span className="hidden sm:inline xl:inline">
														Add Recipient
													</span>
												</Button>
											)}
										</>
									)}
								</CardContent>
							</Card>

							{/* Field Types */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm">Field Types</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{!selectedRecipient && (
										<p className="mb-2 text-xs text-amber-600">
											⚠️ Select a recipient first to add fields
										</p>
									)}
									<div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
										{FIELD_TYPES.map((fieldType) => {
											const Icon = fieldType.icon
											const isDisabled = !selectedRecipient
											return (
												<Button
													key={fieldType.value}
													variant={
														selectedFieldType === fieldType.value
															? "default"
															: "outline"
													}
													className={`w-full justify-start text-xs xl:text-sm ${
														isDisabled ? "cursor-not-allowed opacity-50" : ""
													}`}
													size="sm"
													disabled={isDisabled}
													onClick={() => handleFieldTypeSelect(fieldType.value)}
												>
													<Icon className="mr-2 h-3 w-3 xl:h-4 xl:w-4" />
													<span className="hidden sm:inline xl:inline">
														{fieldType.label}
													</span>
													<span className="sm:hidden xl:hidden">
														{fieldType.label.slice(0, 3)}
													</span>
												</Button>
											)
										})}
									</div>
								</CardContent>
							</Card>

							{/* Field List */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm">
										Fields on Page {currentPage}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{currentPageFields.length === 0 ? (
										<p className="text-sm text-gray-500">
											No fields on this page
										</p>
									) : (
										<div className="max-h-48 space-y-2 overflow-y-auto">
											{currentPageFields.map((field) => {
												const recipient = recipientsWithColors.find(
													(r) => r.id === field.recipientId
												)
												return (
													<div
														key={field.id}
														className="flex items-center gap-2 rounded-lg border p-2"
													>
														<div
															className="h-2 w-2 flex-shrink-0 rounded-full"
															style={{ backgroundColor: recipient?.color }}
														/>
														<div className="min-w-0 flex-1">
															<p className="truncate text-sm font-medium">
																{field.label}
															</p>
															<p className="text-xs text-gray-500">
																{field.type}
															</p>
														</div>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleFieldDelete(field.id)}
															className="h-6 w-6 flex-shrink-0 p-0 text-red-500 hover:text-red-700"
														>
															×
														</Button>
													</div>
												)
											})}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Document Viewer */}
					<div className="xl:order-2 xl:col-span-3">
						<Card className="overflow-hidden border shadow-lg">
							<CardContent className="p-0">
								{isLoading && (
									<div className="flex h-96 items-center justify-center bg-muted">
										<div className="text-center">
											<Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
											<span className="text-sm text-muted-foreground">
												Loading document...
											</span>
										</div>
									</div>
								)}

								<div
									ref={pdfContainerRef}
									className="relative overflow-auto bg-muted/10"
									style={{
										maxHeight: isMobile
											? "calc(100vh - 250px)"
											: "calc(100vh - 200px)",
										minHeight: isMobile ? "250px" : "300px"
									}}
								>
									<div className="flex min-h-full items-start justify-center p-4 md:p-6">
										<Document
											file={documentUrl}
											onLoadSuccess={onDocumentLoadSuccess}
											onLoadError={onDocumentLoadError}
											loading={null}
											className="overflow-hidden rounded-lg bg-background shadow-2xl"
										>
											<div
												ref={pageRef}
												className="relative inline-block overflow-hidden rounded-lg border bg-card shadow-xl"
												onClick={handleCanvasClick}
												style={{
													cursor: isPlacingField ? "crosshair" : "default"
												}}
											>
												<Page
													pageNumber={currentPage}
													scale={pageScale}
													renderTextLayer={false}
													renderAnnotationLayer={false}
													className="block"
												/>

												{/* Render positioned fields */}
												{currentPageFields.map((field) => {
													const recipient = recipientsWithColors.find(
														(r) => r.id === field.recipientId
													)
													return (
														<div
															key={field.id}
															className={`group absolute transition-all duration-100 ${
																isDragging && draggedField?.id === field.id
																	? "z-50 shadow-lg"
																	: ""
															} ${
																isResizing && draggedField?.id === field.id
																	? "z-50"
																	: ""
															}`}
															style={{
																left: field.position.x * pageScale,
																top: field.position.y * pageScale,
																width: field.size.width * pageScale,
																height: field.size.height * pageScale
															}}
														>
															{/* Main field area */}
															<div
																className={`relative flex h-full w-full items-center justify-center border-2 border-dashed bg-opacity-20 text-xs font-medium transition-all hover:border-solid hover:bg-opacity-30 ${
																	isDragging && draggedField?.id === field.id
																		? "cursor-grabbing border-solid bg-opacity-40 shadow-lg"
																		: "cursor-grab hover:cursor-grab"
																} ${
																	isResizing && draggedField?.id === field.id
																		? "border-solid bg-opacity-40"
																		: ""
																}`}
																style={{
																	borderColor: recipient?.color,
																	backgroundColor: recipient?.color + "20",
																	color: recipient?.color
																}}
																onMouseDown={(e) => {
																	// Prevent dragging when clicking on delete button or resize handle
																	const target = e.target as HTMLElement
																	if (
																		target.closest("button") ||
																		target.classList.contains(
																			"cursor-se-resize"
																		) ||
																		target.closest(".cursor-se-resize")
																	) {
																		return
																	}
																	handleFieldDragStart(field, e)
																}}
																title={`${field.label} for ${recipient?.name}`}
															>
																<span className="pointer-events-none select-none px-1 text-center">
																	{field.type}
																</span>

																{/* Delete button */}
																<button
																	className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-xs text-white opacity-0 shadow-lg transition-opacity hover:bg-red-600 group-hover:opacity-100"
																	onClick={(e) => {
																		e.stopPropagation()
																		handleFieldDelete(field.id)
																	}}
																	title="Delete field"
																>
																	×
																</button>

																{/* Resize handle */}
																<div
																	className={`absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize rounded-full border-2 bg-white shadow-md transition-all duration-150 ${
																		isResizing && draggedField?.id === field.id
																			? "scale-125 border-4 opacity-100"
																			: "opacity-0 hover:scale-110 group-hover:opacity-100"
																	}`}
																	style={{ borderColor: recipient?.color }}
																	onMouseDown={(e) => {
																		e.stopPropagation()
																		handleResizeStart(field, e)
																	}}
																	title="Resize field"
																/>
															</div>
														</div>
													)
												})}
											</div>
										</Document>
									</div>
								</div>

								{/* Enhanced Zoom Controls */}
								<div className="border-t bg-card p-3 md:p-4">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="flex items-center justify-center gap-3 md:justify-start">
											{/* Zoom Controls */}
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setPageScale(Math.max(0.5, pageScale - 0.1))
													}
													disabled={pageScale <= 0.5}
												>
													-
												</Button>
												<span className="min-w-[60px] text-center text-sm font-medium">
													{Math.round(pageScale * 100)}%
												</span>
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setPageScale(Math.min(3, pageScale + 0.1))
													}
												>
													+
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setPageScale(isMobile ? 0.8 : 1.2)}
													className="h-7 px-3 text-xs"
												>
													Reset
												</Button>
											</div>

											{/* Page Navigation */}
											{numPages > 1 && (
												<div className="ml-4 flex items-center gap-2 border-l border-gray-300 pl-4">
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															setCurrentPage(Math.max(1, currentPage - 1))
														}
														disabled={currentPage <= 1}
													>
														Prev
													</Button>
													<span className="min-w-[60px] text-center text-sm font-medium">
														{currentPage} of {numPages}
													</span>
													<Button
														variant="outline"
														size="sm"
														onClick={() =>
															setCurrentPage(
																Math.min(numPages, currentPage + 1)
															)
														}
														disabled={currentPage >= numPages}
													>
														Next
													</Button>
												</div>
											)}
										</div>

										<div className="text-center text-sm text-gray-600 md:text-right">
											{!isSaving && recipientsWithColors.length === 0 && (
												<span className="font-medium text-amber-600">
													⚠️ Add recipients first to start positioning fields
												</span>
											)}
											{!isSaving &&
												recipientsWithColors.length > 0 &&
												!selectedRecipient && (
													<span className="font-medium text-amber-600">
														⚠️ Select a recipient first
													</span>
												)}
											{!isSaving && selectedRecipient && isPlacingField && (
												<span className="font-medium text-blue-600">
													📍 Click on the document to place a{" "}
													{selectedFieldType.toLowerCase()} field
												</span>
											)}
											{!isSaving && selectedRecipient && !isPlacingField && (
												<span className="text-gray-500">
													Select a field type and click to place it on the
													document
												</span>
											)}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
