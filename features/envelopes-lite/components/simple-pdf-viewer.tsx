"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from "lucide-react"
import { Document, Page } from "react-pdf"

import { Button } from "@/core/components/ui/button"

interface SimplePdfViewerProps {
	fileUrl: string
	documentName: string
	viewerMode?: "single-page" | "continuous-scroll"
}

interface PdfViewerState {
	numPages: number
	currentPage: number
	scale: number
	rotation: number
	error: string | null
	isLoaded: boolean
	isUrlValid: boolean | null // null = checking, true = valid, false = invalid
}

type PageWrapperElement = HTMLDivElement | null

const SCALE_LIMITS = {
	min: 0.5,
	max: 3.0,
	step: 0.25,
} as const

const DEFAULT_PAGE_NUMBER = 1

function clampPage(pageNumber: number, numPages: number): number {
	return Math.min(
		Math.max(DEFAULT_PAGE_NUMBER, pageNumber),
		Math.max(DEFAULT_PAGE_NUMBER, numPages)
	)
}

// Check if URL is external (not from same origin)
function isExternalUrl(url: string): boolean {
	if (typeof window === "undefined") {
		return false
	}

	if (!url || url.startsWith("#") || url.startsWith("/")) {
		return false
	}
	try {
		const urlObj = new URL(url, window.location.origin)
		return urlObj.origin !== window.location.origin
	} catch {
		return false
	}
}

export function SimplePdfViewer({
	fileUrl,
	documentName: _documentName,
	viewerMode = "single-page",
}: SimplePdfViewerProps) {
	const [state, setState] = useState<PdfViewerState>({
		numPages: 0,
		currentPage: DEFAULT_PAGE_NUMBER,
		scale: 1.0,
		rotation: 0,
		error: null,
		isLoaded: false,
		isUrlValid: null,
	})
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const currentPageRef = useRef(DEFAULT_PAGE_NUMBER)
	const pageRefs = useRef(new Map<number, PageWrapperElement>())
	const pageNumbers = useMemo(
		() => Array.from({ length: state.numPages }, (_, index) => index + 1),
		[state.numPages]
	)

	// Check if we should use iframe for external URLs
	const useIframe = isExternalUrl(fileUrl)

	const setPageRef = useCallback((pageNumber: number, node: PageWrapperElement) => {
		if (node) {
			pageRefs.current.set(pageNumber, node)
			return
		}

		pageRefs.current.delete(pageNumber)
	}, [])

	useEffect(() => {
		currentPageRef.current = state.currentPage
	}, [state.currentPage])

	const syncCurrentPageFromScroll = useCallback(() => {
		if (viewerMode !== "continuous-scroll") {
			return
		}

		const scrollContainer = scrollContainerRef.current
		if (!scrollContainer || pageRefs.current.size === 0) {
			return
		}

		const containerRect = scrollContainer.getBoundingClientRect()
		let bestPage = currentPageRef.current
		let bestVisibilityRatio = 0
		let bestDistanceFromTop = Number.POSITIVE_INFINITY

		for (const [pageNumber, pageElement] of pageRefs.current.entries()) {
			if (!pageElement) {
				continue
			}

			const pageRect = pageElement.getBoundingClientRect()
			const visibleWidth =
				Math.min(pageRect.right, containerRect.right) - Math.max(pageRect.left, containerRect.left)
			const visibleHeight =
				Math.min(pageRect.bottom, containerRect.bottom) - Math.max(pageRect.top, containerRect.top)

			if (visibleWidth <= 0 || visibleHeight <= 0) {
				continue
			}

			const visibleArea = visibleWidth * visibleHeight
			const totalArea = Math.max(pageRect.width * pageRect.height, 1)
			const visibilityRatio = visibleArea / totalArea
			const distanceFromTop = Math.abs(pageRect.top - containerRect.top)

			if (
				visibilityRatio > bestVisibilityRatio ||
				(Math.abs(visibilityRatio - bestVisibilityRatio) < 0.0001 &&
					distanceFromTop < bestDistanceFromTop)
			) {
				bestVisibilityRatio = visibilityRatio
				bestDistanceFromTop = distanceFromTop
				bestPage = pageNumber
			}
		}

		if (bestPage === currentPageRef.current) {
			return
		}

		startTransition(() => {
			setState(prev =>
				prev.currentPage === bestPage
					? prev
					: {
							...prev,
							currentPage: bestPage,
						}
			)
		})
	}, [viewerMode])

	const scrollToPage = useCallback(
		(pageNumber: number, behavior: ScrollBehavior = "smooth") => {
			const nextPage = clampPage(pageNumber, state.numPages)

			if (viewerMode !== "continuous-scroll") {
				setState(prev =>
					prev.currentPage === nextPage
						? prev
						: {
								...prev,
								currentPage: nextPage,
							}
				)
				return
			}

			const scrollContainer = scrollContainerRef.current
			const pageElement = pageRefs.current.get(nextPage)

			if (
				!(scrollContainer instanceof HTMLDivElement) ||
				!(pageElement instanceof HTMLDivElement)
			) {
				return
			}

			const containerRect = scrollContainer.getBoundingClientRect()
			const pageRect = pageElement.getBoundingClientRect()
			const nextScrollTop = scrollContainer.scrollTop + (pageRect.top - containerRect.top) - 16

			scrollContainer.scrollTo({
				top: nextScrollTop,
				behavior,
			})
		},
		[state.numPages, viewerMode]
	)

	// Pre-validate the URL before passing to react-pdf to avoid parsing errors
	useEffect(() => {
		if (!fileUrl || useIframe) {
			// Skip validation for external URLs (they'll be handled by iframe)
			pageRefs.current.clear()
			setState(prev => ({
				...prev,
				numPages: 0,
				currentPage: DEFAULT_PAGE_NUMBER,
				error: null,
				isUrlValid: true,
			}))
			return
		}

		// For our own authenticated streaming endpoints (notarized PDFs), skip the Range probe.
		// The probe can cause a full PDF download when the server doesn't support Range caching,
		// which makes the UI feel extremely slow (double-download before rendering).
		if (
			fileUrl.startsWith("/api/doconchain/projects/") ||
			fileUrl.startsWith("/api/notarial-book-2/documents/") ||
			fileUrl.startsWith("/api/notarial-book/documents/")
		) {
			pageRefs.current.clear()
			setState(prev => ({
				...prev,
				numPages: 0,
				currentPage: DEFAULT_PAGE_NUMBER,
				isUrlValid: true,
				error: null,
			}))
			return
		}

		// Reset validation state when URL changes
		pageRefs.current.clear()
		setState(prev => ({
			...prev,
			numPages: 0,
			currentPage: DEFAULT_PAGE_NUMBER,
			isUrlValid: null,
			error: null,
		}))

		// Check if the URL is valid and returns a PDF
		// Use Range request to get only first 1024 bytes to check if it's a PDF
		const controller = new AbortController()

		fetch(fileUrl, {
			method: "GET",
			headers: {
				Range: "bytes=0-1023", // Request only first 1024 bytes to check if it's a PDF
			},
			signal: controller.signal,
			credentials: "include", // Include cookies for authenticated requests
		})
			.then(response => {
				// Handle HTTP errors
				if (!response.ok && response.status !== 206) {
					// 206 is Partial Content (expected for Range requests)
					// Any other non-OK status means error
					let errorMessage = "Failed to load PDF document"

					if (response.status === 404) {
						errorMessage =
							"Document not found. The document may not have been fully signed or may not exist."
					} else if (response.status === 403) {
						errorMessage = "Access denied. You don't have permission to view this document."
					} else if (response.status === 401) {
						errorMessage = "Unauthorized. Please log in to view this document."
					} else if (response.status === 503) {
						errorMessage = "DocoChain API is temporarily unavailable. Please try again later."
					} else if (response.status === 500) {
						errorMessage = "Server error. Please try again later."
					} else if (response.status === 400) {
						errorMessage =
							"The document server returned an error. The document may not be available or may be corrupted."
					} else {
						errorMessage = `Failed to load document (HTTP ${response.status}). The document may not be available.`
					}

					setState(prev => ({
						...prev,
						isUrlValid: false,
						error: errorMessage,
					}))
					return
				}

				// Check if the response is a PDF by looking at the first bytes
				// Accept both 200 (full content) and 206 (partial content)
				return response.arrayBuffer().then(buffer => {
					if (buffer.byteLength === 0) {
						setState(prev => ({
							...prev,
							isUrlValid: false,
							error: "The server returned an empty response.",
						}))
						return
					}

					const bytes = new Uint8Array(buffer)
					const firstBytes = bytes.slice(0, Math.min(4, bytes.length))
					const pdfHeader = String.fromCharCode(...firstBytes)
					const isPdf = pdfHeader === "%PDF"

					if (!isPdf && buffer.byteLength < 1000) {
						// Small response that's not a PDF - likely an error message
						const text = new TextDecoder().decode(buffer)
						const trimmedText = text.trim()

						// If it looks like an error message (not HTML, starts with text, short)
						if (
							trimmedText.length > 0 &&
							trimmedText.length < 500 &&
							!trimmedText.startsWith("<!") &&
							!trimmedText.startsWith("<html")
						) {
							setState(prev => ({
								...prev,
								isUrlValid: false,
								error: trimmedText || "The server returned an error response instead of a PDF.",
							}))
						} else {
							// Might be HTML error page or other format - let react-pdf try
							setState(prev => ({ ...prev, isUrlValid: true }))
						}
					} else if (isPdf) {
						// Valid PDF - confirmed by header
						setState(prev => ({ ...prev, isUrlValid: true }))
					} else {
						// Response is large or doesn't start with %PDF but might still be a PDF
						// Let react-pdf handle it (it will parse and validate)
						setState(prev => ({ ...prev, isUrlValid: true }))
					}
				})
			})
			.catch(error => {
				if (error instanceof Error && error.name === "AbortError") {
					// Request was aborted (component unmounted or URL changed)
					return
				}

				console.error("Error validating PDF URL:", error)
				// On fetch error, still try to load - might be a CORS issue or network error
				// Let react-pdf handle it
				setState(prev => ({
					...prev,
					isUrlValid: true, // Allow react-pdf to try, it will handle the error
				}))
			})

		return () => {
			controller.abort()
		}
	}, [fileUrl, useIframe])

	// Load PDF.js on client side
	useEffect(() => {
		if (typeof window !== "undefined") {
			void import("react-pdf")
				.then(({ pdfjs }) => {
					// Use the version that react-pdf actually uses (from pdfjs.version)
					// This ensures the worker version matches the API version
					// PDF.js 5.x requires the .mjs extension for the worker
					const version = typeof pdfjs.version === "string" ? pdfjs.version : "5.4.296"
					pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
					setState(prev => ({ ...prev, isLoaded: true }))
				})
				.catch(error => {
					console.error("Failed to load react-pdf:", error)
					setState(prev => ({ ...prev, error: "Failed to initialize PDF viewer", isLoaded: true }))
				})
		}
	}, [])

	const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
		pageRefs.current.clear()
		setState(prev => ({
			...prev,
			numPages,
			currentPage: DEFAULT_PAGE_NUMBER,
			error: null,
		}))
	}, [])

	const onPageLoadSuccess = useCallback(() => {
		// Page loaded successfully - no action needed
	}, [])

	const onDocumentLoadError = useCallback(
		(error: Error) => {
			console.error("PDF document load error:", error)
			// Check if it's an HTTP error (400, 404, 500, etc.)
			const errorMessage = error.message ?? String(error)
			let userFriendlyMessage = state.error ?? "Failed to load PDF document"

			if (errorMessage.includes("503")) {
				userFriendlyMessage = "DocoChain API is temporarily unavailable. Please try again later."
			} else if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
				userFriendlyMessage =
					"The document server returned an error. The document may not be available or may be corrupted."
			} else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
				userFriendlyMessage =
					"Document not found. The document may not have been fully signed or may not exist."
			} else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
				userFriendlyMessage = "Access denied. You don't have permission to view this document."
			} else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
				userFriendlyMessage = "Unauthorized. Please log in to view this document."
			} else if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
				userFriendlyMessage = "Server error. Please try again later."
			} else if (errorMessage.includes("Unexpected server response")) {
				userFriendlyMessage =
					state.error ??
					"The server returned an unexpected response. The document may not be available or may be in an unsupported format."
			}

			setState(prev => ({ ...prev, error: userFriendlyMessage, isUrlValid: false }))
		},
		[state.error]
	)

	const changePage = useCallback(
		(offset: number) => {
			const nextPage = clampPage(state.currentPage + offset, state.numPages)
			scrollToPage(nextPage)
		},
		[scrollToPage, state.currentPage, state.numPages]
	)

	const changeScale = useCallback((newScale: number) => {
		setState(prev => ({
			...prev,
			scale: Math.max(SCALE_LIMITS.min, Math.min(SCALE_LIMITS.max, newScale)),
		}))
	}, [])

	const rotate = useCallback(() => {
		setState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))
	}, [])

	useEffect(() => {
		if (viewerMode !== "continuous-scroll" || state.numPages === 0) {
			return
		}

		const scrollContainer = scrollContainerRef.current
		if (!scrollContainer) {
			return
		}

		let frameId = 0

		const scheduleSync = () => {
			if (frameId) {
				return
			}

			frameId = window.requestAnimationFrame(() => {
				frameId = 0
				syncCurrentPageFromScroll()
			})
		}

		scheduleSync()
		scrollContainer.addEventListener("scroll", scheduleSync, { passive: true })
		window.addEventListener("resize", scheduleSync)

		return () => {
			scrollContainer.removeEventListener("scroll", scheduleSync)
			window.removeEventListener("resize", scheduleSync)
			if (frameId) {
				window.cancelAnimationFrame(frameId)
			}
		}
	}, [state.numPages, state.rotation, state.scale, syncCurrentPageFromScroll, viewerMode])

	useEffect(() => {
		if (viewerMode !== "continuous-scroll" || state.numPages === 0) {
			return
		}

		const frameId = window.requestAnimationFrame(() => {
			scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" })
		})

		return () => {
			window.cancelAnimationFrame(frameId)
		}
	}, [fileUrl, state.numPages, viewerMode])

	// Don't render on server side
	if (typeof window === "undefined") {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground text-sm">Loading PDF viewer...</p>
				</div>
			</div>
		)
	}

	// If PDF library not loaded yet, show loading state
	if (!state.isLoaded) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground text-sm">Loading PDF viewer...</p>
				</div>
			</div>
		)
	}

	// If no file URL, show empty state
	if (!fileUrl && !state.error) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground text-sm">No document to display</p>
				</div>
			</div>
		)
	}

	// Show loading state while validating URL
	if (state.isUrlValid === null && !useIframe) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground text-sm">Validating document...</p>
				</div>
			</div>
		)
	}

	// Show error if URL validation failed
	if (state.isUrlValid === false) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-center">
					<p className="text-destructive mb-4 text-sm font-medium">Failed to load PDF document</p>
					<p className="text-muted-foreground mb-4 text-xs">{state.error ?? "Unknown error"}</p>
					<div className="space-y-2">
						<Button variant="outline" size="sm" onClick={() => window.open(fileUrl, "_blank")}>
							Open in New Tab
						</Button>
					</div>
				</div>
			</div>
		)
	}

	// Use iframe for external URLs (like DocoChain) to avoid CORS issues
	if (useIframe) {
		return (
			<div className="flex h-full w-full flex-col overflow-hidden">
				{/* Simple toolbar for iframe */}
				<div className="flex shrink-0 items-center justify-end border-b px-4 py-2">
					<Button variant="outline" size="sm" onClick={() => window.open(fileUrl, "_blank")}>
						Open in New Tab
					</Button>
				</div>

				{/* PDF Content in iframe - Full size */}
				<div className="flex-1 overflow-hidden bg-gray-100">
					<iframe
						src={fileUrl}
						className="h-full w-full border-0"
						title="PDF Document"
						style={{
							minHeight: "100%",
							width: "100%",
							height: "100%",
						}}
					/>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			{/* Toolbar */}
			<div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => changePage(-1)}
						disabled={state.currentPage <= 1}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-sm">
						Page {state.currentPage} of {state.numPages > 0 ? state.numPages : 1}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => changePage(1)}
						disabled={state.currentPage >= state.numPages}
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => changeScale(state.scale - SCALE_LIMITS.step)}
						disabled={state.scale <= SCALE_LIMITS.min}
					>
						<ZoomOut className="size-4" />
					</Button>
					<span className="min-w-15 text-center text-sm">{Math.round(state.scale * 100)}%</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => changeScale(state.scale + SCALE_LIMITS.step)}
						disabled={state.scale >= SCALE_LIMITS.max}
					>
						<ZoomIn className="size-4" />
					</Button>
					<Button variant="outline" size="sm" onClick={rotate}>
						<RotateCw className="size-4" />
					</Button>
				</div>
			</div>

			{/* PDF Content */}
			<div ref={scrollContainerRef} className="bg-muted/20 flex-1 overflow-auto p-4">
				<div
					className={
						viewerMode === "continuous-scroll"
							? "mx-auto w-full max-w-screen-2xl min-w-0"
							: "mx-auto h-fit max-w-4xl"
					}
				>
					<div
						className={
							viewerMode === "continuous-scroll"
								? "w-full min-w-0"
								: "flex w-full items-center justify-center"
						}
					>
						<Document
							file={fileUrl}
							onLoadSuccess={onDocumentLoadSuccess}
							onLoadError={onDocumentLoadError}
							loading={null}
							error={
								<div className="flex h-96 items-center justify-center">
									<div className="text-center">
										<p className="text-destructive mb-4 text-sm">Failed to load PDF document</p>
										<p className="text-muted-foreground mb-4 text-xs">
											{state.error ?? "Unknown error"}
										</p>
										<div className="space-y-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => window.open(fileUrl, "_blank")}
											>
												Open in New Tab
											</Button>
										</div>
									</div>
								</div>
							}
							className={
								viewerMode === "continuous-scroll"
									? "w-full min-w-0"
									: "bg-background overflow-hidden rounded-lg shadow-lg"
							}
						>
							{viewerMode === "continuous-scroll" ? (
								<div className="flex w-full min-w-0 flex-col gap-4">
									{pageNumbers.map(pageNumber => (
										<div key={pageNumber} className="flex w-full min-w-max justify-center">
											<div
												ref={node => {
													setPageRef(pageNumber, node)
												}}
												data-page-number={pageNumber}
												className="bg-background relative inline-block overflow-hidden rounded-lg border shadow-sm"
											>
												<Page
													pageNumber={pageNumber}
													scale={state.scale}
													rotate={state.rotation}
													renderTextLayer={false}
													renderAnnotationLayer={false}
													onLoadSuccess={onPageLoadSuccess}
													className="block"
													loading={null}
												/>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="bg-background relative inline-block w-full max-w-full overflow-hidden rounded-lg border shadow-sm">
									<Page
										pageNumber={state.currentPage}
										scale={state.scale}
										rotate={state.rotation}
										renderTextLayer={false}
										renderAnnotationLayer={false}
										onLoadSuccess={onPageLoadSuccess}
										className="block max-w-full"
										loading={null}
									/>
								</div>
							)}
						</Document>
					</div>
				</div>
			</div>
		</div>
	)
}
