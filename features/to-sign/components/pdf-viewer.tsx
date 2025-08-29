"use client"

import NextImage from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Document, Page, pdfjs } from "react-pdf"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { processSignatureImage } from "../utils/signature-processing"

// Define proper types for react-pdf callbacks
interface PageViewport {
	width: number
	height: number
	scale: number
	rotation: number
}

interface PageRenderInfo {
	getViewport: (options: { scale: number }) => PageViewport
}

// Configure PDF.js worker to use local file
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

// Helper function to determine the correct bucket and path
function getBucketAndPath(documentPath: string) {
	// Legacy file upload: simple filename without slashes -> "documents" bucket
	// Envelope system: nested path with slashes -> "envelopes" bucket
	if (documentPath.includes("/")) {
		return { bucket: "envelopes", path: documentPath }
	} else {
		return { bucket: "documents", path: documentPath }
	}
}

interface SignaturePosition {
	x: number
	y: number
	pageNumber: number
}

interface SignatureSize {
	width: number
	height: number
}

interface SignaturePreview {
	type: "drawn" | "typed" | "uploaded" | null
	data?: string | null
	text?: string | null
}

interface PdfViewerProps {
	fileUrl?: string
	documentId?: string
	documentPath?: string
	useProxy?: boolean
	signaturePreview?: SignaturePreview
	onPositionSelect: (position: SignaturePosition) => void
	onSizeChange?: (size: SignatureSize) => void
}

export function PdfViewer({
	fileUrl,
	documentId,
	documentPath,
	useProxy = false,
	signaturePreview,
	onPositionSelect,
	onSizeChange
}: PdfViewerProps) {
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(0)
	const [scale, setScale] = useState(1.5)
	const [pdfWidth, setPdfWidth] = useState(0)
	const [pdfHeight, setPdfHeight] = useState(0)

	// Add state for DOM-based signature preview
	const [clickPosition, setClickPosition] = useState<{
		x: number
		y: number
	} | null>(null)
	const [signatureSize, setSignatureSize] = useState({ width: 0, height: 0 })

	// Refs for PDF
	const pdfContainerRef = useRef<HTMLDivElement>(null)
	const overlayRef = useRef<HTMLDivElement>(null)

	// Construct the PDF URL: prefer fileUrl, fallback to constructing from documentPath
	const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null)
	const [isLoadingUrl, setIsLoadingUrl] = useState(true)
	const [urlError, setUrlError] = useState<string | null>(null)

	useEffect(() => {
		const resolveUrl = async () => {
			try {
				setIsLoadingUrl(true)
				setUrlError(null)

				if (fileUrl) {
					// Use provided fileUrl directly
					console.log("Using provided fileUrl:", fileUrl)
					setResolvedPdfUrl(fileUrl)
				} else if (documentPath) {
					// Construct URL from document path
					const { bucket, path } = getBucketAndPath(documentPath)

					console.log("Constructing direct Supabase URL:", {
						originalPath: documentPath,
						bucket,
						path,
						note: path.includes("/")
							? "Envelope system (nested path)"
							: "Legacy system (simple filename)"
					})

					const { getSupabaseClient } = await import("@/services/supabase")
					const supabase = getSupabaseClient()
					const {
						data: { publicUrl }
					} = supabase.storage.from(bucket).getPublicUrl(path)
					console.log("Generated public URL:", publicUrl)
					setResolvedPdfUrl(publicUrl)
				} else {
					setResolvedPdfUrl(null)
				}
			} catch (error) {
				console.error("Error resolving PDF URL:", error)
				setUrlError(
					error instanceof Error ? error.message : "Failed to resolve PDF URL"
				)
				setResolvedPdfUrl(null)
			} finally {
				setIsLoadingUrl(false)
			}
		}
		void resolveUrl()
	}, [fileUrl, documentPath])

	// Use the resolved URL as the actual file URL
	const actualFileUrl = resolvedPdfUrl

	// Process signature image
	const { data: processedSignature } = useQuery({
		queryKey: [
			"processSignature",
			signaturePreview?.data,
			signaturePreview?.type
		],
		queryFn: async () => {
			if (!signaturePreview?.data || signaturePreview.type === "typed") {
				return null
			}
			return await processSignatureImage(signaturePreview.data)
		},
		enabled: Boolean(
			signaturePreview?.data && signaturePreview.type !== "typed"
		)
	})

	// Handle overlay click (matching working pdf-fabric-viewer approach)
	const handleOverlayClick = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			if (!overlayRef.current) return

			const overlayRect = overlayRef.current.getBoundingClientRect()

			// Get click position relative to the overlay (matching working implementation)
			const clickX = event.clientX - overlayRect.left
			const clickY = event.clientY - overlayRect.top

			console.log("=== DEBUG CLICK POSITIONING ===")
			console.log("Mouse event:", {
				clientX: event.clientX,
				clientY: event.clientY
			})
			console.log("Overlay rect:", overlayRect)
			console.log("Calculated click position:", { x: clickX, y: clickY })
			console.log("Overlay ref element:", overlayRef.current)

			// Store click position for preview rendering (keep original coordinates like working implementation)
			setClickPosition({ x: clickX, y: clickY })

			// Convert pixel coordinates to ratios for backend (matching working implementation)
			const xRatio = clickX / overlayRect.width
			const yRatio = clickY / overlayRect.height

			console.log("Position conversion for backend:", {
				clickPixels: { x: clickX, y: clickY },
				overlayDimensions: {
					width: overlayRect.width,
					height: overlayRect.height
				},
				ratios: { xRatio, yRatio }
			})

			// Send position ratios to backend (matching working implementation)
			onPositionSelect({
				x: xRatio,
				y: yRatio,
				pageNumber: currentPage
			})
		},
		[currentPage, onPositionSelect]
	)

	// Calculate signature size when position is set (matching working implementation)
	useEffect(() => {
		if (overlayRef.current && clickPosition) {
			const overlayRect = overlayRef.current.getBoundingClientRect()

			// Calculate target size based on overlay dimensions (matching working implementation)
			const overlayWidth = overlayRect.width
			const targetWidthPercentage = 0.15 // 15% of overlay width
			const initialWidth = Math.max(overlayWidth * targetWidthPercentage, 80)

			let initialHeight: number
			if (signaturePreview?.type === "typed") {
				// For typed signatures, use a fixed aspect ratio
				initialHeight = initialWidth * 0.3 // Height is 30% of width for text
			} else {
				// For images, try to get the actual image aspect ratio
				if (processedSignature || signaturePreview?.data) {
					// Create a temporary image to get natural dimensions
					const tempImg = new Image()
					tempImg.onload = () => {
						const imageAspectRatio = tempImg.width / tempImg.height
						const correctedHeight = initialWidth / imageAspectRatio

						const correctedSize = {
							width: initialWidth,
							height: correctedHeight
						}
						setSignatureSize(correctedSize)

						// Convert to PDF points for backend using actual aspect ratio
						if (onSizeChange) {
							const pdfWidthRatio = initialWidth / overlayWidth
							const pdfHeightRatio = correctedHeight / overlayRect.height

							// Use actual PDF dimensions for conversion
							const pdfWidthPoints = pdfWidthRatio * (pdfWidth ?? 595)
							const pdfHeightPoints = pdfHeightRatio * (pdfHeight ?? 842)

							onSizeChange({ width: pdfWidthPoints, height: pdfHeightPoints })
						}
					}
					// Prioritize processed signature over raw data (matching working implementation)
					tempImg.src = processedSignature ?? signaturePreview?.data ?? ""
					return // Don't set size immediately, wait for image load
				}

				// Fallback for no image data
				initialHeight = initialWidth * 0.5
			}

			const newSize = { width: initialWidth, height: initialHeight }
			setSignatureSize(newSize)

			// Send size to backend (matching working implementation)
			if (onSizeChange) {
				const pdfWidthRatio = initialWidth / overlayWidth
				const pdfHeightRatio = initialHeight / overlayRect.height

				// Use actual PDF dimensions for conversion
				const pdfWidthPoints = pdfWidthRatio * (pdfWidth ?? 595)
				const pdfHeightPoints = pdfHeightRatio * (pdfHeight ?? 842)

				onSizeChange({ width: pdfWidthPoints, height: pdfHeightPoints })
			}
		}
	}, [
		clickPosition,
		signaturePreview?.type,
		signaturePreview?.data,
		processedSignature,
		onSizeChange,
		pdfWidth,
		pdfHeight
	])

	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setTotalPages(numPages)
	}

	const onPageRenderSuccess = (page: PageRenderInfo) => {
		// Get page dimensions for coordinate conversion
		try {
			const viewport = page.getViewport({ scale: 1 })
			const width = viewport?.width
			const height = viewport?.height
			setPdfWidth(width ?? 595)
			setPdfHeight(height ?? 842)
		} catch (error) {
			console.warn("Failed to get page dimensions:", error)
			setPdfWidth(595)
			setPdfHeight(842)
		}
	}

	const goToPreviousPage = () => {
		setCurrentPage((prev) => Math.max(1, prev - 1))
		setClickPosition(null) // Clear position when changing pages
	}

	const goToNextPage = () => {
		setCurrentPage((prev) => Math.min(totalPages, prev + 1))
		setClickPosition(null) // Clear position when changing pages
	}

	const handleZoomIn = () => {
		setScale((prev) => Math.min(3, prev + 0.25))
		setClickPosition(null) // Clear position when zooming
	}

	const handleZoomOut = () => {
		setScale((prev) => Math.max(0.5, prev - 0.25))
		setClickPosition(null) // Clear position when zooming
	}

	const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const page = parseInt(e.target.value)
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page)
			setClickPosition(null) // Clear position when changing pages
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Document Preview</span>
					<div className="flex items-center gap-2">
						<Badge variant="outline">
							Page {currentPage} of {totalPages}
						</Badge>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{/* Controls */}
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={goToPreviousPage}
								disabled={currentPage <= 1}
							>
								Previous
							</Button>
							<div className="flex items-center gap-2">
								<Label htmlFor="pageInput" className="text-sm">
									Page:
								</Label>
								<Input
									id="pageInput"
									type="number"
									min={1}
									max={totalPages}
									value={currentPage}
									onChange={handlePageInput}
									className="w-16"
								/>
								<span className="text-sm text-muted-foreground">
									of {totalPages}
								</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={goToNextPage}
								disabled={currentPage >= totalPages}
							>
								Next
							</Button>
						</div>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={handleZoomOut}>
								Zoom Out
							</Button>
							<Badge variant="outline">{Math.round(scale * 100)}%</Badge>
							<Button variant="outline" size="sm" onClick={handleZoomIn}>
								Zoom In
							</Button>
						</div>
					</div>

					{/* PDF Viewer */}
					<div className="relative">
						<div
							ref={pdfContainerRef}
							className="flex justify-center overflow-auto rounded-lg border bg-gray-50"
						>
							{!actualFileUrl ? (
								<div className="flex h-96 items-center justify-center">
									<div className="text-center">
										<p>No PDF to display</p>
										<p className="mt-2 text-sm text-gray-500">
											fileUrl: {fileUrl ?? "not provided"}
											<br />
											documentId: {documentId ?? "not provided"}
											<br />
											documentPath: {documentPath ?? "not provided"}
											<br />
											useProxy: {useProxy ? "true" : "false"}
											<br />
											actualFileUrl: {actualFileUrl ?? "not available"}
											{urlError && (
												<>
													<br />
													urlError: {urlError}
												</>
											)}
										</p>
									</div>
								</div>
							) : isLoadingUrl ? (
								<div className="flex h-96 items-center justify-center">
									<p>Loading PDF...</p>
								</div>
							) : urlError ? (
								<div className="flex h-96 items-center justify-center text-red-600">
									<div className="text-center">
										<p>Failed to load PDF</p>
										<p className="mt-2 text-sm">Error: {urlError}</p>
										<p className="mt-2 text-xs text-gray-500">
											actualFileUrl: {actualFileUrl}
										</p>
									</div>
								</div>
							) : (
								<div className="relative">
									<Document
										file={actualFileUrl}
										onLoadSuccess={onDocumentLoadSuccess}
										loading={
											<div className="flex h-96 items-center justify-center">
												<p>Loading PDF...</p>
											</div>
										}
										error={
											<div className="flex h-96 items-center justify-center text-red-600">
												<div className="text-center">
													<p>Failed to load PDF</p>
													<p className="mt-2 text-sm">
														This might be due to CORS restrictions. Try using
														the proxy option.
													</p>
													<p className="mt-2 text-xs text-gray-500">
														URL: {actualFileUrl}
													</p>
												</div>
											</div>
										}
									>
										<Page
											pageNumber={currentPage}
											scale={scale}
											onRenderSuccess={onPageRenderSuccess}
											loading={
												<div className="flex h-96 items-center justify-center">
													<p>Loading page...</p>
												</div>
											}
										/>
									</Document>

									{/* Click overlay positioned exactly over the PDF */}
									<div
										ref={overlayRef}
										className="absolute inset-0 cursor-crosshair bg-transparent"
										onClick={handleOverlayClick}
										title="Click to position signature"
										style={{
											pointerEvents: "auto",
											zIndex: 10
										}}
									/>

									{/* Signature preview */}
									{clickPosition &&
										signaturePreview?.type &&
										(() => {
											console.log("=== DEBUG SIGNATURE PREVIEW ===")
											console.log("Click position for preview:", clickPosition)
											console.log("Signature size:", signatureSize)

											return (
												<div
													className="absolute z-20"
													style={{
														left: `${clickPosition.x}px`,
														top: `${clickPosition.y}px`,
														transform: "translate(-50%, -50%)",
														cursor: "grab"
													}}
												>
													<div
														className="group relative border-2 border-dashed border-blue-400 bg-transparent transition-colors hover:border-blue-600"
														style={{
															backgroundColor: "rgba(240, 249, 255, 0.05)",
															borderRadius: "4px",
															width: `${signatureSize.width}px`,
															height: `${signatureSize.height}px`,
															minWidth: "30px",
															minHeight: "30px",
															boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.1)",
															pointerEvents: "auto"
														}}
													>
														{/* Position indicator center dot */}
														<div
															className="absolute z-30 h-2 w-2 rounded-full bg-blue-600 shadow-lg"
															style={{
																left: "50%",
																top: "50%",
																transform: "translate(-50%, -50%)"
															}}
														/>

														{/* Signature content */}
														<div
															className="flex h-full w-full items-center justify-center"
															style={{ backgroundColor: "transparent" }}
														>
															{signaturePreview.type === "typed" &&
																signaturePreview.text && (
																	<div
																		className="font-cursive flex h-full items-center justify-center text-sm text-blue-600"
																		style={{
																			fontSize: `${Math.min(signatureSize.height * 0.6, 16)}px`
																		}}
																	>
																		{signaturePreview.text}
																	</div>
																)}{" "}
															{(signaturePreview.type === "drawn" ||
																signaturePreview.type === "uploaded") &&
																(processedSignature ??
																	signaturePreview.data) && (
																	<NextImage
																		src={
																			processedSignature ??
																			signaturePreview.data ??
																			""
																		}
																		alt="Signature preview"
																		width={signatureSize.width}
																		height={signatureSize.height}
																		className="h-full w-full object-contain"
																		style={{ backgroundColor: "transparent" }}
																	/>
																)}
														</div>
													</div>
												</div>
											)
										})()}
								</div>
							)}
						</div>
					</div>

					{/* Instructions */}
					<div className="rounded-lg bg-blue-50 p-4">
						<p className="text-sm text-blue-800">
							<strong>Click anywhere on the document</strong> to position your
							signature. The signature will be centered at the click point.
						</p>
						{clickPosition && (
							<p className="mt-2 text-xs text-blue-600">
								✓ Signature positioned at ({Math.round(clickPosition.x)},{" "}
								{Math.round(clickPosition.y)})
							</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
