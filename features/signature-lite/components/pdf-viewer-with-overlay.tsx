"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { useIsMobile } from "@/core/hooks/use-mobile"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

interface FieldOverlay {
	id: string
	type: string
	label: string
	position: {
		x: number
		y: number
		pageNumber: number
	}
	size: {
		width: number
		height: number
	}
	signed: boolean
	signatureValue?: string
	previewValue?: string
}

interface PDFViewerWithOverlayProps {
	fileUrl: string
	fields: FieldOverlay[]
	currentFieldId?: string
	className?: string
}

export function PDFViewerWithOverlay({
	fileUrl,
	fields,
	currentFieldId,
	className
}: PDFViewerWithOverlayProps) {
	const pageRef = useRef<HTMLDivElement>(null)
	const pdfContainerRef = useRef<HTMLDivElement>(null)
	const [numPages, setNumPages] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState(1)
	const isMobile = useIsMobile()
	const [scale, setScale] = useState(1)

	// Use refs to store dimensions to avoid recreating objects
	const containerDimensionsRef = useRef({ width: 0, height: 0 })
	const pdfDimensionsRef = useRef({ width: 0, height: 0 })
	const hasAutoFittedRef = useRef(false)
	const isInitialLoadRef = useRef(true)

	// Simple state to trigger re-renders when needed
	const [, forceUpdate] = useState(0)
	const triggerUpdate = () => forceUpdate((prev) => prev + 1)

	// Calculate and apply auto-fit scale
	const applyAutoFit = useCallback(() => {
		const containerDims = containerDimensionsRef.current
		const pdfDims = pdfDimensionsRef.current

		if (containerDims.width === 0 || pdfDims.width === 0) {
			return
		}

		// Minimal padding for mobile, slightly more for desktop
		const containerPadding = isMobile ? 16 : 32
		const availableWidth = containerDims.width - containerPadding
		const availableHeight = containerDims.height - containerPadding

		const scaleX = availableWidth / pdfDims.width
		const scaleY = availableHeight / pdfDims.height

		// Use the smaller scale to ensure the PDF fits completely
		const fitScale = Math.min(scaleX, scaleY, 2.5) // Slightly increased max scale

		if (fitScale > 0.2 && fitScale < 3) {
			// Better scale range for mobile
			setScale(fitScale)
			hasAutoFittedRef.current = true
		}
	}, [isMobile])

	// Handle page changes - reset auto-fit flag
	useEffect(() => {
		hasAutoFittedRef.current = false
		isInitialLoadRef.current = false
	}, [currentPage])

	// Apply auto-fit when needed - always on initial load and page changes
	useEffect(() => {
		const timer = setTimeout(() => {
			applyAutoFit()
		}, 100)

		return () => clearTimeout(timer)
	}, [applyAutoFit])

	// Function to manually fit page
	const fitToPage = useCallback(() => {
		const containerDims = containerDimensionsRef.current
		const pdfDims = pdfDimensionsRef.current

		if (containerDims.width === 0 || pdfDims.width === 0) return

		const containerPadding = isMobile ? 16 : 32
		const availableWidth = containerDims.width - containerPadding
		const availableHeight = containerDims.height - containerPadding

		const scaleX = availableWidth / pdfDims.width
		const scaleY = availableHeight / pdfDims.height

		const fitScale = Math.min(scaleX, scaleY, 2.5)
		if (fitScale > 0.2) {
			setScale(fitScale)
		}
	}, [isMobile])

	// Manual zoom handlers that disable auto-fit
	const handleZoomIn = useCallback(() => {
		setScale((prev) => Math.min(3, prev + 0.1))
	}, [])

	const handleZoomOut = useCallback(() => {
		setScale((prev) => Math.max(0.5, prev - 0.1))
	}, [])

	// Observe container size changes
	useEffect(() => {
		if (!pdfContainerRef.current) return

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newDimensions = {
					width: entry.contentRect.width,
					height: entry.contentRect.height
				}

				const prevDimensions = containerDimensionsRef.current
				const widthChange = Math.abs(prevDimensions.width - newDimensions.width)
				const heightChange = Math.abs(
					prevDimensions.height - newDimensions.height
				)

				if (widthChange > 20 || heightChange > 20) {
					containerDimensionsRef.current = newDimensions

					// Reset auto-fit for significant size changes to retrigger fitting
					if (widthChange > 100 || heightChange > 100) {
						hasAutoFittedRef.current = false
					}

					triggerUpdate()
				}
			}
		})

		resizeObserver.observe(pdfContainerRef.current)
		return () => resizeObserver.disconnect()
	}, [])

	// React-pdf document load handlers
	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setNumPages(numPages)
	}

	const onDocumentLoadError = (err: Error) => {
		console.error("PDF load error:", err)
	}

	// Handle page load to get PDF dimensions and trigger auto-fit
	const onPageLoadSuccess = (page: { width: number; height: number }) => {
		const { width, height } = page
		const prevDimensions = pdfDimensionsRef.current

		if (prevDimensions.width !== width || prevDimensions.height !== height) {
			pdfDimensionsRef.current = { width, height }
			hasAutoFittedRef.current = false // Allow fitting when PDF dimensions change
			triggerUpdate()
		}
	}

	// Get fields for current page
	const fieldsForCurrentPage = fields.filter(
		(field) => field.position.pageNumber === currentPage
	)

	// Get field style based on type and status
	const getFieldStyle = (field: FieldOverlay) => {
		const baseStyle = {
			position: "absolute" as const,
			left: `${field.position.x * scale}px`,
			top: `${field.position.y * scale}px`,
			width: `${field.size.width * scale}px`,
			height: `${field.size.height * scale}px`,
			border: "2px solid",
			borderRadius: "6px",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: `${Math.max(10, Math.min(field.size.height * scale * 0.5, 16))}px`,
			fontWeight: "500",
			pointerEvents: "none" as const,
			zIndex: 10,
			boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
			transition: "all 0.2s ease-in-out"
		}

		if (field.id === currentFieldId) {
			// Current field being signed
			return {
				...baseStyle,
				borderColor: "#3b82f6",
				backgroundColor: "rgba(59, 130, 246, 0.15)",
				color: "#1e40af",
				animation: "pulse 2s infinite",
				boxShadow:
					"0 4px 8px rgba(59, 130, 246, 0.3), 0 0 0 2px rgba(59, 130, 246, 0.2)"
			}
		} else if (field.signed) {
			// Already signed field
			return {
				...baseStyle,
				borderColor: "#10b981",
				backgroundColor: "rgba(16, 185, 129, 0.15)",
				color: "#065f46",
				boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)"
			}
		} else {
			// Pending field
			return {
				...baseStyle,
				borderColor: "#f59e0b",
				backgroundColor: "rgba(245, 158, 11, 0.15)",
				color: "#92400e",
				boxShadow: "0 2px 4px rgba(245, 158, 11, 0.2)"
			}
		}
	}

	// Get field display content
	const getFieldContent = (field: FieldOverlay) => {
		if (field.id === currentFieldId && field.previewValue) {
			// Show preview for current field
			if (
				field.type === "SIGNATURE" &&
				field.previewValue?.startsWith("data:image")
			) {
				return (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={field.previewValue}
						alt="Signature preview"
						style={{
							maxWidth: "100%",
							maxHeight: "100%",
							objectFit: "contain"
						}}
					/>
				)
			}
			return field.previewValue
		} else if (field.signed && field.signatureValue) {
			// Show actual signature for signed fields
			if (
				field.type === "SIGNATURE" &&
				field.signatureValue.startsWith("data:image")
			) {
				return (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={field.signatureValue}
						alt="Signature"
						style={{
							maxWidth: "100%",
							maxHeight: "100%",
							objectFit: "contain"
						}}
					/>
				)
			}
			return field.signatureValue
		} else {
			// Show field label for unsigned fields
			return field.label
		}
	}

	// Get field icon
	const getFieldIcon = (type: string) => {
		switch (type) {
			case "SIGNATURE":
				return "✍️"
			case "NAME":
				return "👤"
			case "DATE":
				return "📅"
			case "EMAIL":
				return "📧"
			case "TEXT":
				return "📝"
			default:
				return "📝"
		}
	}

	return (
		<div className={`flex w-full flex-col space-y-6 ${className}`}>
			{/* PDF Container */}
			<Card className="overflow-hidden border-2 border-border shadow-lg">
				<CardContent className="p-0">
					<div
						ref={pdfContainerRef}
						className={`relative flex items-center justify-center bg-muted/10 ${
							isMobile ? "overflow-hidden" : "overflow-auto"
						}`}
						style={{
							height: "auto",
							minHeight: isMobile ? "50vh" : "60vh",
							maxHeight: isMobile ? "80vh" : "85vh"
						}}
					>
						<div className="flex w-full items-center justify-center p-2">
							<Document
								file={fileUrl}
								onLoadSuccess={onDocumentLoadSuccess}
								onLoadError={onDocumentLoadError}
								loading={
									<div className="flex h-full w-full items-center justify-center rounded-md bg-muted/20">
										<div className="space-y-4 text-center">
											<div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
											<div className="space-y-2">
												<p className="text-lg font-medium text-foreground">
													Loading PDF...
												</p>
												<p className="text-sm text-muted-foreground">
													Please wait while we prepare your document
												</p>
											</div>
										</div>
									</div>
								}
								error={
									<div className="flex h-full w-full items-center justify-center">
										<Card className="border-2 border-dashed border-destructive/50 bg-destructive/10">
											<CardContent className="p-8 text-center">
												<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
													<svg
														className="h-6 w-6 text-destructive"
														fill="none"
														viewBox="0 0 24 24"
														stroke="currentColor"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
														/>
													</svg>
												</div>
												<div className="space-y-2">
													<p className="text-lg font-semibold text-destructive">
														Error loading PDF
													</p>
													<p className="text-sm text-muted-foreground">
														Failed to load PDF document
													</p>
												</div>
												<Button
													onClick={() => window.location.reload()}
													variant="destructive"
													className="mt-4"
												>
													Try Again
												</Button>
											</CardContent>
										</Card>
									</div>
								}
								className="overflow-hidden rounded-lg bg-card shadow-2xl"
							>
								<div
									ref={pageRef}
									className="relative inline-block w-full max-w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg"
								>
									<Page
										pageNumber={currentPage}
										scale={scale}
										renderTextLayer={false}
										renderAnnotationLayer={false}
										onLoadSuccess={onPageLoadSuccess}
										className="block max-w-full"
									/>

									{/* Field Overlays */}
									<div className="pointer-events-none absolute inset-0">
										{fieldsForCurrentPage.map((field) => (
											<div
												key={field.id}
												style={getFieldStyle(field)}
												title={`${field.label} (${field.type})`}
											>
												<div className="overflow-hidden break-words px-1 text-center">
													{field.type === "SIGNATURE" &&
													(field.previewValue?.startsWith("data:image") ||
														field.signatureValue?.startsWith("data:image")) ? (
														getFieldContent(field)
													) : (
														<>
															<span className="mr-1 text-xs">
																{getFieldIcon(field.type)}
															</span>
															<span className="truncate text-xs">
																{getFieldContent(field)}
															</span>
														</>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							</Document>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Controls */}
			<Card className="w-full shadow-sm">
				<CardContent className="p-3 md:p-4">
					<div className="space-y-3 md:space-y-0">
						{/* Controls Row */}
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							{/* Page Navigation */}
							<div className="flex items-center justify-center gap-2 sm:justify-start">
								<Button
									onClick={() =>
										setCurrentPage((prev) => Math.max(1, prev - 1))
									}
									disabled={currentPage <= 1}
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
								>
									<ChevronLeft className="h-4 w-4 sm:mr-1" />
									<span className="hidden sm:inline">Prev</span>
								</Button>

								<div className="flex min-w-[60px] items-center justify-center rounded-md border border-border px-2 py-1">
									<span className="text-xs font-medium text-foreground">
										{currentPage} of {numPages}
									</span>
								</div>

								<Button
									onClick={() =>
										setCurrentPage((prev) => Math.min(numPages, prev + 1))
									}
									disabled={currentPage >= numPages}
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
								>
									<span className="hidden sm:inline">Next</span>
									<ChevronRight className="h-4 w-4 sm:ml-1" />
								</Button>
							</div>

							{/* Zoom Controls */}
							<div className="flex items-center justify-center gap-2">
								<div className="flex items-center gap-1 rounded-md border border-border p-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={handleZoomOut}
										disabled={scale <= 0.5}
										className="h-7 w-7 p-0"
									>
										<Minus className="h-4 w-4" />
									</Button>
									<div className="flex min-w-[50px] items-center justify-center border-x border-border px-2">
										<span className="text-xs font-medium text-foreground">
											{Math.round(scale * 100)}%
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleZoomIn}
										disabled={scale >= 3}
										className="h-7 w-7 p-0"
									>
										<Plus className="h-4 w-4" />
									</Button>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={fitToPage}
									className="h-7 px-3 text-xs"
								>
									Fit Page
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Field Legend */}
			<Card className="w-full shadow-sm">
				<CardContent className="p-4">
					<h4 className="mb-3 text-sm font-semibold text-foreground">
						Field Status Legend
					</h4>
					<div className="flex flex-wrap gap-4 text-sm sm:gap-6">
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded border-2 border-blue-500 bg-blue-100 shadow-sm dark:bg-blue-900"></div>
							<span className="text-foreground">Current Field</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded border-2 border-green-500 bg-green-100 shadow-sm dark:bg-green-900"></div>
							<span className="text-foreground">Completed</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="h-3 w-3 rounded border-2 border-yellow-500 bg-yellow-100 shadow-sm dark:bg-yellow-900"></div>
							<span className="text-foreground">Pending</span>
						</div>
						{fieldsForCurrentPage.length > 0 && (
							<div className="ml-auto hidden sm:block">
								<Card className="bg-muted">
									<CardContent className="px-3 py-1">
										<span className="text-xs text-muted-foreground">
											{fieldsForCurrentPage.filter((f) => f.signed).length} of{" "}
											{fieldsForCurrentPage.length} completed on this page
										</span>
									</CardContent>
								</Card>
							</div>
						)}
					</div>
					{fieldsForCurrentPage.length > 0 && (
						<div className="mt-2 block sm:hidden">
							<Card className="bg-muted">
								<CardContent className="px-3 py-1 text-center">
									<span className="text-xs text-muted-foreground">
										{fieldsForCurrentPage.filter((f) => f.signed).length} of{" "}
										{fieldsForCurrentPage.length} completed on this page
									</span>
								</CardContent>
							</Card>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Enhanced animations and styles */}
			<style jsx>{`
				@keyframes pulse {
					0%,
					100% {
						opacity: 1;
						transform: scale(1);
					}
					50% {
						opacity: 0.8;
						transform: scale(1.02);
					}
				}
			`}</style>
		</div>
	)
}
