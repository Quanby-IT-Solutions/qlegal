"use client"

import { useState } from "react"
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

interface PDFViewerEnhancedProps {
	documentUrl: string
	className?: string
	showControls?: boolean
	initialScale?: number
	maxHeight?: string
	onPageChange?: (page: number) => void
	children?: React.ReactNode // For overlays like signature fields
}

export default function PDFViewerEnhanced({
	documentUrl,
	className = "",
	showControls = true,
	initialScale = 1.2,
	maxHeight = "80vh",
	onPageChange,
	children
}: PDFViewerEnhancedProps) {
	const [numPages, setNumPages] = useState<number>(0)
	const [currentPage, setCurrentPage] = useState<number>(1)
	const [pageScale, setPageScale] = useState<number>(initialScale)
	const [isLoading, setIsLoading] = useState(true)

	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setNumPages(numPages)
		setIsLoading(false)
	}

	const onDocumentLoadError = (error: Error) => {
		console.error("PDF load error:", error)
		toast.error("Failed to load document")
		setIsLoading(false)
	}

	const handlePageChange = (newPage: number) => {
		setCurrentPage(newPage)
		onPageChange?.(newPage)
	}

	const handleZoomIn = () => {
		setPageScale(Math.min(3, pageScale + 0.1))
	}

	const handleZoomOut = () => {
		setPageScale(Math.max(0.5, pageScale - 0.1))
	}

	const handleResetZoom = () => {
		setPageScale(initialScale)
	}

	return (
		<Card
			className={`overflow-hidden border-2 border-gray-200 shadow-lg ${className}`}
		>
			<CardContent className="p-0">
				{isLoading && (
					<div className="flex h-96 items-center justify-center bg-gray-50">
						<div className="text-center">
							<Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
							<span className="text-sm text-gray-600">Loading document...</span>
						</div>
					</div>
				)}

				<div
					className="relative overflow-auto bg-gray-100"
					style={{ maxHeight, minHeight: "400px" }}
				>
					<div className="flex min-h-full items-start justify-center p-4 md:p-6">
						<Document
							file={documentUrl}
							onLoadSuccess={onDocumentLoadSuccess}
							onLoadError={onDocumentLoadError}
							loading={null}
							className="overflow-hidden rounded-lg bg-white shadow-2xl"
						>
							<div className="relative inline-block overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-xl">
								<Page
									pageNumber={currentPage}
									scale={pageScale}
									renderTextLayer={false}
									renderAnnotationLayer={false}
									className="block"
								/>
								{children}
							</div>
						</Document>
					</div>
				</div>

				{showControls && (
					<div className="border-t bg-white p-3 md:p-4">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							{/* Combined Controls */}
							<div className="flex items-center justify-center gap-3 md:justify-start">
								{/* Zoom Controls */}
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={handleZoomOut}
										disabled={pageScale <= 0.5}
										title="Zoom out"
									>
										<ZoomOut className="h-4 w-4" />
									</Button>
									<span className="min-w-[60px] text-center text-sm font-medium">
										{Math.round(pageScale * 100)}%
									</span>
									<Button
										variant="outline"
										size="sm"
										onClick={handleZoomIn}
										disabled={pageScale >= 3}
										title="Zoom in"
									>
										<ZoomIn className="h-4 w-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={handleResetZoom}
										className="ml-2"
										title="Reset zoom"
									>
										<RotateCcw className="h-4 w-4" />
									</Button>
								</div>

								{/* Page Navigation */}
								{numPages > 1 && (
									<div className="ml-4 flex items-center gap-2 border-l border-gray-300 pl-4">
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												handlePageChange(Math.max(1, currentPage - 1))
											}
											disabled={currentPage <= 1}
										>
											Previous
										</Button>
										<span className="min-w-[80px] text-center text-sm font-medium">
											{currentPage} of {numPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											onClick={() =>
												handlePageChange(Math.min(numPages, currentPage + 1))
											}
											disabled={currentPage >= numPages}
										>
											Next
										</Button>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
