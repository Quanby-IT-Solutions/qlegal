"use client"

import { useRef, useState } from "react"
import {
	Calendar,
	CheckSquare,
	Circle,
	Hand,
	Loader2,
	Mail,
	Save,
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

interface UpdatePositioningPageProps {
	documentUrl: string
	documentId: string
	recipients: Recipient[]
	existingFields: DocumentField[]
	onUpdate: (fields: DocumentField[]) => Promise<void>
	onCancel?: () => void
}

const FIELD_TYPE_INFO = {
	SIGNATURE: { label: "Signature", icon: Hand, color: "#3B82F6" },
	INITIAL: { label: "Initial", icon: Hand, color: "#10B981" },
	NAME: { label: "Name", icon: Type, color: "#F59E0B" },
	DATE: { label: "Date", icon: Calendar, color: "#8B5CF6" },
	TEXT: { label: "Text", icon: Type, color: "#EF4444" },
	EMAIL: { label: "Email", icon: Mail, color: "#06B6D4" },
	CHECKBOX: { label: "Checkbox", icon: CheckSquare, color: "#84CC16" },
	RADIO: { label: "Radio", icon: Circle, color: "#EC4899" }
} as const

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

export default function UpdatePositioningPage({
	documentUrl,
	documentId: _documentId,
	recipients,
	existingFields,
	onUpdate,
	onCancel
}: UpdatePositioningPageProps) {
	const [numPages, setNumPages] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageScale, setPageScale] = useState<number>(1.2)
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [showSidebar, setShowSidebar] = useState(false)

	// Field management
	const [fields, setFields] = useState<DocumentField[]>(existingFields)
	const [draggedField, setDraggedField] = useState<DocumentField | null>(null)
	const [resizeStartPos, setResizeStartPos] = useState<{
		x: number
		y: number
	} | null>(null)

	// Refs
	const pdfContainerRef = useRef<HTMLDivElement>(null)
	const pageRef = useRef<HTMLDivElement>(null)

	// Assign colors to recipients
	const recipientsWithColors = recipients.map((recipient, index) => ({
		...recipient,
		color: RECIPIENT_COLORS[index % RECIPIENT_COLORS.length]
	}))

	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setNumPages(numPages)
		setIsLoading(false)
	}

	const onDocumentLoadError = (error: Error) => {
		console.error("PDF load error:", error)
		toast.error("Failed to load document")
		setIsLoading(false)
	}

	const handleFieldDragStart = (
		field: DocumentField,
		event: React.DragEvent
	) => {
		setDraggedField(field)
		event.dataTransfer.effectAllowed = "move"
	}

	const handleFieldDrop = (event: React.DragEvent) => {
		event.preventDefault()
		if (!draggedField || !pageRef.current) return

		const rect = pageRef.current.getBoundingClientRect()
		const dropX = (event.clientX - rect.left) / pageScale
		const dropY = (event.clientY - rect.top) / pageScale

		// Get page dimensions for boundary checking
		const pageWidth = rect.width / pageScale
		const pageHeight = rect.height / pageScale

		// Ensure field fits within page boundaries
		const maxX = Math.max(0, pageWidth - draggedField.size.width)
		const maxY = Math.max(0, pageHeight - draggedField.size.height)

		const x = Math.max(0, Math.min(dropX, maxX))
		const y = Math.max(0, Math.min(dropY, maxY))

		setFields((prev) =>
			prev.map((field) =>
				field.id === draggedField.id
					? {
							...field,
							position: { ...field.position, x, y, pageNumber: currentPage }
						}
					: field
			)
		)

		setDraggedField(null)
		toast.success("Field position updated")
	}

	const handleFieldDelete = (fieldId: string) => {
		setFields((prev) => prev.filter((field) => field.id !== fieldId))
		toast.success("Field deleted")
	}

	const handleResizeStart = (field: DocumentField, event: React.MouseEvent) => {
		event.preventDefault()
		event.stopPropagation()
		setResizeStartPos({ x: event.clientX, y: event.clientY })

		const handleMouseMove = (e: MouseEvent) => {
			if (!resizeStartPos || !pageRef.current) return

			const rect = pageRef.current.getBoundingClientRect()
			const deltaX = (e.clientX - resizeStartPos.x) / pageScale
			const deltaY = (e.clientY - resizeStartPos.y) / pageScale

			// Get page dimensions for boundary checking
			const pageWidth = rect.width / pageScale
			const pageHeight = rect.height / pageScale

			// Calculate new size with minimum constraints
			const newWidth = Math.max(20, field.size.width + deltaX)
			const newHeight = Math.max(20, field.size.height + deltaY)

			// Ensure field doesn't exceed page boundaries
			const maxWidth = pageWidth - field.position.x
			const maxHeight = pageHeight - field.position.y

			const finalWidth = Math.min(newWidth, maxWidth)
			const finalHeight = Math.min(newHeight, maxHeight)

			setFields((prev) =>
				prev.map((f) =>
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
			)
		}

		const handleMouseUp = () => {
			setResizeStartPos(null)
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
			toast.success("Field resized")
		}

		document.addEventListener("mousemove", handleMouseMove)
		document.addEventListener("mouseup", handleMouseUp)
	}

	const handleUpdate = async () => {
		setIsSaving(true)
		try {
			await onUpdate(fields)
			toast.success("Field positions updated successfully")
		} catch (error) {
			console.error("Update error:", error)
			toast.error("Failed to update field positions")
		} finally {
			setIsSaving(false)
		}
	}

	const currentPageFields = fields.filter(
		(field) => field.position.pageNumber === currentPage
	)

	return (
		<div className="min-h-screen bg-gray-50 p-2 md:p-4">
			<div className="mx-auto max-w-7xl">
				{/* Header */}
				<div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-xl font-bold text-gray-900 md:text-2xl">
							Update Field Positions
						</h1>
						<p className="text-sm text-gray-600">
							Drag and resize existing signature fields to update their
							positions
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{onCancel && (
							<Button
								variant="outline"
								onClick={onCancel}
								size="sm"
								className="md:size-default"
							>
								Cancel
							</Button>
						)}
						<Button
							onClick={handleUpdate}
							disabled={isSaving}
							size="sm"
							className="md:size-default"
						>
							{isSaving ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-2 h-4 w-4" />
							)}
							<span className="hidden sm:inline">Update Positions</span>
							<span className="sm:hidden">Update</span>
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-4">
					{/* Field Information Sidebar */}
					<div className="space-y-4 md:space-y-6 xl:order-1">
						{/* Mobile Toggle for Sidebar */}
						<div className="xl:hidden">
							<Button
								variant="outline"
								onClick={() => setShowSidebar(!showSidebar)}
								className="w-full"
							>
								{showSidebar ? "Hide Field Info" : "Show Field Info"}
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
									{recipientsWithColors.map((recipient, index) => (
										<div
											key={`${recipient.id}-${recipient.email}-${index}`}
											className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2"
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
										</div>
									))}
								</CardContent>
							</Card>

							{/* Field Summary */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm">Field Summary</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									<div className="text-sm text-gray-600">
										<p>
											Total Fields:{" "}
											<span className="font-medium">{fields.length}</span>
										</p>
										<p>
											Current Page:{" "}
											<span className="font-medium">
												{currentPage} of {numPages}
											</span>
										</p>
										<p>
											Page Fields:{" "}
											<span className="font-medium">
												{currentPageFields.length}
											</span>
										</p>
									</div>
								</CardContent>
							</Card>

							{/* Current Page Fields */}
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
												const fieldInfo = FIELD_TYPE_INFO[field.type]
												return (
													<div
														key={field.id}
														className="flex items-center gap-2 rounded-lg border p-2 hover:bg-gray-50"
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
																{fieldInfo.label} - {recipient?.name}
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

							{/* Instructions */}
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-sm">Instructions</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2 text-xs text-gray-600">
										<p>
											• <strong>Drag</strong> fields to move them
										</p>
										<p>
											• <strong>Resize</strong> using the handle in bottom-right
											corner
										</p>
										<p>
											• <strong>Delete</strong> fields with the × button
										</p>
										<p>• Fields are constrained to page boundaries</p>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					{/* Document Viewer */}
					<div className="xl:order-2 xl:col-span-3">
						<Card className="overflow-hidden border-2 border-gray-200 shadow-lg">
							<CardContent className="p-0">
								{isLoading && (
									<div className="flex h-96 items-center justify-center bg-gray-50">
										<div className="text-center">
											<Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
											<span className="text-sm text-gray-600">
												Loading document...
											</span>
										</div>
									</div>
								)}

								<div
									ref={pdfContainerRef}
									className="relative overflow-auto bg-gray-100"
									style={{ maxHeight: "80vh", minHeight: "400px" }}
								>
									<div className="flex min-h-full items-start justify-center p-4 md:p-6">
										<Document
											file={documentUrl}
											onLoadSuccess={onDocumentLoadSuccess}
											onLoadError={onDocumentLoadError}
											loading={null}
											className="overflow-hidden rounded-lg bg-white shadow-2xl"
										>
											<div
												ref={pageRef}
												className="relative inline-block overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-xl"
												onDrop={handleFieldDrop}
												onDragOver={(e) => e.preventDefault()}
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
															className="group absolute"
															style={{
																left: field.position.x * pageScale,
																top: field.position.y * pageScale,
																width: field.size.width * pageScale,
																height: field.size.height * pageScale
															}}
														>
															{/* Main field area */}
															<div
																className="relative flex h-full w-full cursor-move items-center justify-center border-2 border-dashed bg-opacity-20 text-xs font-medium transition-all hover:border-solid hover:bg-opacity-30"
																style={{
																	borderColor: recipient?.color,
																	backgroundColor: recipient?.color + "20",
																	color: recipient?.color
																}}
																draggable
																onDragStart={(e) =>
																	handleFieldDragStart(field, e)
																}
																title={`${field.label} for ${recipient?.name} - Drag to move`}
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
																	className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-full border-2 bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
																	style={{ borderColor: recipient?.color }}
																	onMouseDown={(e) =>
																		handleResizeStart(field, e)
																	}
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

								{/* Enhanced Controls */}
								<div className="border-t bg-white p-3 md:p-4">
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
													onClick={() => setPageScale(1.2)}
													className="ml-2"
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
											<span className="font-medium text-blue-600">
												🎯 Drag fields to reposition, resize using corner
												handles
											</span>
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
