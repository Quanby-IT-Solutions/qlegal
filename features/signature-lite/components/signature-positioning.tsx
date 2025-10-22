"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
	CalendarFold,
	ChevronLeft,
	ChevronRight,
	CircleUserRound,
	Mail,
	Pen,
	Radio,
	SquareCheck,
	Text,
	TextCursor,
	Trash2,
	ZoomIn,
	ZoomOut,
} from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

// Field types that can be added to documents
export const FIELD_TYPES = {
	SIGNATURE: { label: "Signature", color: "bg-blue-500", icon: Pen },
	INITIAL: { label: "Initial", color: "bg-green-500", icon: TextCursor },
	NAME: { label: "Name", color: "bg-purple-500", icon: CircleUserRound },
	DATE: { label: "Date", color: "bg-orange-500", icon: CalendarFold },
	TEXT: { label: "Text", color: "bg-gray-500", icon: Text },
	EMAIL: { label: "Email", color: "bg-pink-500", icon: Mail },
	CHECKBOX: { label: "Checkbox", color: "bg-indigo-500", icon: SquareCheck },
	RADIO: { label: "Radio", color: "bg-yellow-500", icon: Radio },
} as const

export type FieldType = keyof typeof FIELD_TYPES

interface FieldPosition {
	x: number
	y: number
	pageNumber: number
}

interface FieldSize {
	width: number
	height: number
}

interface DocumentField {
	id: string
	type: FieldType
	label: string
	position: FieldPosition
	size: FieldSize
	required: boolean
	recipientId: string
	placeholder?: string
	options?: string[] // For radio/checkbox fields
}

interface Recipient {
	id: string
	email: string
	name: string
	role: "SIGNER" | "APPROVER" | "CC"
	color: string // Assigned color for visual distinction
}

interface SignaturePositioningProps {
	documentUrl: string
	recipients: Recipient[]
	fields: DocumentField[]
	onFieldsChange: (fields: DocumentField[]) => void
	onFieldAdd: (field: Omit<DocumentField, "id">) => void
	onFieldUpdate: (fieldId: string, updates: Partial<DocumentField>) => void
	onFieldDelete: (fieldId: string) => void
	selectedFieldType?: FieldType
	selectedRecipient?: string
}

export function SignaturePositioning({
	documentUrl,
	recipients,
	fields,
	// onFieldsChange,
	onFieldAdd,
	onFieldUpdate,
	onFieldDelete,
	selectedFieldType = "SIGNATURE",
	selectedRecipient,
}: SignaturePositioningProps) {
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(0)
	const [scale, setScale] = useState(1.2)
	const [, setIsLoading] = useState(true)
	const [selectedField, setSelectedField] = useState<string | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

	// Refs for PDF and overlay
	const pdfContainerRef = useRef<HTMLDivElement>(null)
	const overlayRef = useRef<HTMLDivElement>(null)

	// Handle PDF document load
	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setTotalPages(numPages)
		setIsLoading(false)
	}

	const onDocumentLoadError = (error: Error) => {
		console.error("PDF load error:", error)
		toast.error("Failed to load PDF document")
		setIsLoading(false)
	}

	// Handle overlay click to add fields
	const handleOverlayClick = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!overlayRef.current || !selectedRecipient || isDragging) return

			const rect = overlayRef.current.getBoundingClientRect()
			const x = (event.clientX - rect.left) / rect.width
			const y = (event.clientY - rect.top) / rect.height

			// Create new field
			const newField: Omit<DocumentField, "id"> = {
				type: selectedFieldType,
				label: FIELD_TYPES[selectedFieldType].label,
				position: { x, y, pageNumber: currentPage },
				size: getDefaultFieldSize(selectedFieldType),
				required: true,
				recipientId: selectedRecipient,
				...(selectedFieldType === "TEXT" && { placeholder: "Enter text here" }),
				...(selectedFieldType === "RADIO" && {
					options: ["Option 1", "Option 2"],
				}),
			}

			onFieldAdd(newField)
		},
		[selectedFieldType, selectedRecipient, currentPage, onFieldAdd, isDragging]
	)

	// Get default size for different field types
	const getDefaultFieldSize = (type: FieldType): FieldSize => {
		const defaultSizes: Record<FieldType, FieldSize> = {
			SIGNATURE: { width: 200, height: 60 },
			INITIAL: { width: 60, height: 60 },
			NAME: { width: 150, height: 30 },
			DATE: { width: 120, height: 30 },
			TEXT: { width: 150, height: 30 },
			EMAIL: { width: 150, height: 30 },
			CHECKBOX: { width: 20, height: 20 },
			RADIO: { width: 20, height: 20 },
		}
		return defaultSizes[type]
	}

	// Handle field drag start
	const handleFieldMouseDown = useCallback(
		(event: React.MouseEvent, fieldId: string) => {
			event.stopPropagation()
			setSelectedField(fieldId)
			setIsDragging(true)

			const field = fields.find(f => f.id === fieldId)
			if (!field || !overlayRef.current) return

			const rect = overlayRef.current.getBoundingClientRect()
			const fieldX = field.position.x * rect.width
			const fieldY = field.position.y * rect.height

			setDragOffset({
				x: event.clientX - rect.left - fieldX,
				y: event.clientY - rect.top - fieldY,
			})
		},
		[fields]
	)

	// Handle field drag
	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isDragging || !selectedField || !overlayRef.current) return

			const rect = overlayRef.current.getBoundingClientRect()
			const x = Math.max(0, Math.min(1, (event.clientX - rect.left - dragOffset.x) / rect.width))
			const y = Math.max(0, Math.min(1, (event.clientY - rect.top - dragOffset.y) / rect.height))

			onFieldUpdate(selectedField, {
				position: { x, y, pageNumber: currentPage },
			})
		},
		[isDragging, selectedField, dragOffset, currentPage, onFieldUpdate]
	)

	// Handle drag end
	const handleMouseUp = useCallback(() => {
		setIsDragging(false)
		setDragOffset({ x: 0, y: 0 })
	}, [])

	// Add mouse event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove)
			document.addEventListener("mouseup", handleMouseUp)
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}
	}, [isDragging, handleMouseMove, handleMouseUp])

	// Navigation functions
	const goToPreviousPage = () => {
		setCurrentPage(prev => Math.max(1, prev - 1))
	}

	const goToNextPage = () => {
		setCurrentPage(prev => Math.min(totalPages, prev + 1))
	}

	const handleZoomIn = () => {
		setScale(prev => Math.min(3, prev + 0.1))
	}

	const handleZoomOut = () => {
		setScale(prev => Math.max(0.5, prev - 0.1))
	}

	const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const page = parseInt(e.target.value)
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page)
		}
	}

	// Filter fields for current page
	const currentPageFields = fields.filter(field => field.position.pageNumber === currentPage)

	// Get recipient info for a field
	const getRecipientInfo = (recipientId: string) => {
		return recipients.find(r => r.id === recipientId)
	}

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
			{/* PDF Viewer */}
			<div className="lg:col-span-3">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								Document Preview
								{selectedRecipient && (
									<Badge variant="outline" className="text-xs">
										Adding {FIELD_TYPES[selectedFieldType].label} fields
									</Badge>
								)}
							</CardTitle>
							<div className="flex items-center gap-2">
								{/* Zoom Controls */}
								<Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5}>
									<ZoomOut className="h-4 w-4" />
								</Button>
								<span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
								<Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3}>
									<ZoomIn className="h-4 w-4" />
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{/* Navigation */}
						<div className="mb-4 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={goToPreviousPage}
									disabled={currentPage <= 1}
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<div className="flex items-center gap-2">
									<Input
										type="number"
										value={currentPage}
										onChange={handlePageInput}
										className="w-16 text-center"
										min={1}
										max={totalPages}
									/>
									<span className="text-sm text-gray-500">/ {totalPages}</span>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={goToNextPage}
									disabled={currentPage >= totalPages}
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>

							<div className="text-sm text-gray-500">
								{currentPageFields.length} field
								{currentPageFields.length !== 1 ? "s" : ""} on this page
							</div>
						</div>

						{/* PDF Container */}
						<div
							ref={pdfContainerRef}
							className="relative overflow-auto rounded-lg border border-gray-200 bg-gray-50"
							style={{ height: "600px" }}
						>
							<Document
								file={documentUrl}
								onLoadSuccess={onDocumentLoadSuccess}
								onLoadError={onDocumentLoadError}
								loading={
									<div className="flex h-full items-center justify-center">
										<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
									</div>
								}
							>
								<div className="relative">
									<Page
										pageNumber={currentPage}
										scale={scale}
										renderTextLayer={false}
										renderAnnotationLayer={false}
									/>

									{/* Field Overlay */}
									<div
										ref={overlayRef}
										className="absolute inset-0 cursor-crosshair"
										onClick={handleOverlayClick}
									>
										{currentPageFields.map(field => {
											const recipient = getRecipientInfo(field.recipientId)
											const fieldStyle = FIELD_TYPES[field.type]

											return (
												<div
													key={field.id}
													className={`absolute cursor-move border-2 border-dashed transition-all duration-200 ${
														selectedField === field.id
															? "border-blue-500 bg-blue-100/20"
															: "border-gray-400 bg-white/10 hover:border-blue-400"
													}`}
													style={{
														left: `${field.position.x * 100}%`,
														top: `${field.position.y * 100}%`,
														width: `${(field.size.width / (overlayRef.current?.clientWidth ?? 1)) * 100}%`,
														height: `${(field.size.height / (overlayRef.current?.clientHeight ?? 1)) * 100}%`,
														borderColor: recipient?.color ?? "#6b7280",
													}}
													onMouseDown={e => handleFieldMouseDown(e, field.id)}
													onClick={e => {
														e.stopPropagation()
														setSelectedField(field.id)
													}}
												>
													{/* Field Content */}
													<div className="flex h-full items-center justify-center text-xs font-medium text-gray-700">
														<fieldStyle.icon className="mr-1 h-3 w-3" />
														{field.type === "SIGNATURE" && "Sign Here"}
														{field.type === "INITIAL" && "Initial"}
														{field.type === "NAME" && "Full Name"}
														{field.type === "DATE" && "Date"}
														{field.type === "TEXT" && (field.placeholder ?? "Text")}
														{field.type === "EMAIL" && "Email"}
														{field.type === "CHECKBOX" && "☐"}
														{field.type === "RADIO" && "○"}
													</div>

													{/* Field Controls */}
													{selectedField === field.id && (
														<div className="absolute -top-8 left-0 flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 shadow-sm">
															<span className="text-xs font-medium text-gray-600">
																{field.label}
															</span>
															<Button
																variant="ghost"
																size="sm"
																className="h-6 w-6 p-0 hover:bg-red-50"
																onClick={e => {
																	e.stopPropagation()
																	onFieldDelete(field.id)
																	setSelectedField(null)
																}}
															>
																<Trash2 className="h-3 w-3 text-red-500" />
															</Button>
														</div>
													)}

													{/* Recipient indicator */}
													<div
														className="absolute -bottom-6 left-0 rounded px-2 py-1 text-xs font-medium"
														style={{
															backgroundColor: recipient?.color ?? "#6b7280",
															color: "white",
														}}
													>
														{recipient?.name ?? "Unknown"}
													</div>
												</div>
											)
										})}
									</div>
								</div>
							</Document>
						</div>

						{/* Instructions */}
						{selectedRecipient ? (
							<div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
								<p className="text-sm text-blue-800">
									<strong>Instructions:</strong> Click anywhere on the document to add a{" "}
									<span className="font-medium">{FIELD_TYPES[selectedFieldType].label}</span> field
									for{" "}
									<span className="font-medium">
										{recipients.find(r => r.id === selectedRecipient)?.name}
									</span>
									. Drag existing fields to reposition them.
								</p>
							</div>
						) : (
							<div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
								<p className="text-sm text-gray-600">
									Select a recipient and field type from the panel to start adding fields to the
									document.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Field Controls Panel */}
			<div className="space-y-6">
				{/* Field Type Selection */}
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Field Type</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid grid-cols-2 gap-2">
							{Object.entries(FIELD_TYPES).map(([type, config]) => (
								<Button
									key={type}
									variant={selectedFieldType === type ? "default" : "outline"}
									size="sm"
									className="justify-start text-xs"
									onClick={() => onFieldUpdate("fieldType", { type: type as FieldType })}
								>
									<config.icon className="mr-1 h-3 w-3" />
									{config.label}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Recipients */}
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Assign To</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{recipients.map(recipient => (
								<div
									key={recipient.id}
									className={`flex cursor-pointer items-center gap-2 rounded border p-2 transition-all ${
										selectedRecipient === recipient.id
											? "border-blue-500 bg-blue-50"
											: "border-gray-200 hover:border-gray-300"
									}`}
									onClick={() => onFieldUpdate("recipient", { recipientId: recipient.id })}
								>
									<div
										className="h-3 w-3 rounded-full"
										style={{ backgroundColor: recipient.color }}
									/>
									<div className="min-w-0 flex-1">
										<div className="truncate text-sm font-medium text-gray-900">
											{recipient.name}
										</div>
										<div className="truncate text-xs text-gray-500">{recipient.email}</div>
									</div>
									<Badge variant="outline" className="text-xs">
										{recipient.role}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Field List */}
				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Fields ({fields.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="max-h-60 space-y-2 overflow-y-auto">
							{fields.length === 0 ? (
								<p className="py-4 text-center text-sm text-gray-500">No fields added yet</p>
							) : (
								fields.map(field => {
									const recipient = getRecipientInfo(field.recipientId)
									const fieldStyle = FIELD_TYPES[field.type]

									return (
										<div
											key={field.id}
											className={`flex cursor-pointer items-center gap-2 rounded border p-2 transition-all ${
												selectedField === field.id
													? "border-blue-500 bg-blue-50"
													: "border-gray-200 hover:border-gray-300"
											}`}
											onClick={() => {
												setSelectedField(field.id)
												setCurrentPage(field.position.pageNumber)
											}}
										>
											<fieldStyle.icon className="h-3 w-3" />
											<div className="min-w-0 flex-1">
												<div className="truncate text-sm font-medium text-gray-900">
													{field.label}
												</div>
												<div className="text-xs text-gray-500">
													Page {field.position.pageNumber} • {recipient?.name}
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 w-6 p-0 hover:bg-red-50"
												onClick={e => {
													e.stopPropagation()
													onFieldDelete(field.id)
													if (selectedField === field.id) {
														setSelectedField(null)
													}
												}}
											>
												<Trash2 className="h-3 w-3 text-red-500" />
											</Button>
										</div>
									)
								})
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
