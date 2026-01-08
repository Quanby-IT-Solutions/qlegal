// "use client"

// import { useState, useRef, useCallback, useEffect } from "react"
// import { Camera, Scan, FileText, Upload, X, Download, RotateCw, Loader2, Calendar, User } from "lucide-react"
// import { toast } from "sonner"
// import { type Route } from "next"
// import { useSession } from "next-auth/react"
// import { format } from "date-fns"

// import { trpc, type RouterOutputs } from "@/services/trpc/client"
// import { SiteNavbar } from "@/core/components/navbar/site-navbar"
// import { Button } from "@/core/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
// import { Input } from "@/core/components/ui/input"
// import { Label } from "@/core/components/ui/label"
// import { Badge } from "@/core/components/ui/badge"
// import { Alert, AlertDescription } from "@/core/components/ui/alert"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
// import { Checkbox } from "@/core/components/ui/checkbox"

// interface ScannedPage {
// 	id: string
// 	imageData: string // Base64 image
// 	preview: string // Preview URL
// }

// export default function ScanDocumentsPage() {
// 	const { data: session } = useSession()
// 	const videoRef = useRef<HTMLVideoElement>(null)
// 	const canvasRef = useRef<HTMLCanvasElement>(null)
// 	const fileInputRef = useRef<HTMLInputElement>(null)

// 	const [isScanning, setIsScanning] = useState(false)
// 	const [stream, setStream] = useState<MediaStream | null>(null)
// 	const [scannedPages, setScannedPages] = useState<ScannedPage[]>([])
// 	const [documentName, setDocumentName] = useState("")
// 	const [isUploading, setIsUploading] = useState(false)
// 	const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
// 	const [selectedConsultationId, setSelectedConsultationId] = useState<string>("")
// 	const [createEnvelope, setCreateEnvelope] = useState(false)

// 	// Get active IEN consultations for ENP
// 	const { data: activeConsultations } = trpc.consultations.getMyConsultations.useQuery(
// 		{
// 			status: "CONFIRMED",
// 			workflowType: "IEN",
// 			limit: 10,
// 		},
// 		{
// 			enabled: session?.user?.role === "ENP",
// 		}
// 	)

// 	// Create envelope mutation
// 	const createEnvelopeMutation = trpc.envelopeLite.createEnvelope.useMutation({
// 		onSuccess: () => {
// 			toast.success("Envelope created successfully!")
// 		},
// 		onError: (error) => {
// 			toast.error(error?.message ?? "Failed to create envelope")
// 		},
// 	})

// 	// Create documents mutation
// 	const createDocumentsMutation = trpc.envelopeLite.createDocuments.useMutation({
// 		onSuccess: () => {
// 			toast.success("Document added to envelope!")
// 		},
// 		onError: (error) => {
// 			toast.error(error?.message ?? "Failed to add document to envelope")
// 		},
// 	})

// 	// Upload mutation
// 	const uploadDocument = trpc.signatureLite.uploadDocument.useMutation({
// 		onSuccess: () => {
// 			toast.success("Document uploaded successfully!")
// 			setScannedPages([])
// 			setDocumentName("")
// 			setIsUploading(false)
// 		},
// 		onError: (error) => {
// 			toast.error(error?.message ?? "Failed to upload document")
// 			setIsUploading(false)
// 		},
// 	})

// 	// Start camera
// 	const startCamera = useCallback(async () => {
// 		try {
// 			const mediaStream = await navigator.mediaDevices.getUserMedia({
// 				video: {
// 					facingMode,
// 					width: { ideal: 1920 },
// 					height: { ideal: 1080 },
// 				},
// 			})

// 			setStream(mediaStream)
// 			setIsScanning(true)

// 			if (videoRef.current) {
// 				videoRef.current.srcObject = mediaStream
// 			}
// 		} catch (error) {
// 			console.error("Error accessing camera:", error)
// 			toast.error("Failed to access camera. Please check permissions.")
// 		}
// 	}, [facingMode])

// 	// Stop camera
// 	const stopCamera = useCallback(() => {
// 		if (stream) {
// 			stream.getTracks().forEach(track => track.stop())
// 			setStream(null)
// 		}
// 		setIsScanning(false)
// 		if (videoRef.current) {
// 			videoRef.current.srcObject = null
// 		}
// 	}, [stream])

// 	// Capture image from camera
// 	const captureImage = useCallback(() => {
// 		if (!videoRef.current || !canvasRef.current) return

// 		const video = videoRef.current
// 		const canvas = canvasRef.current
// 		const ctx = canvas.getContext("2d")

// 		if (!ctx) return

// 		// Set canvas dimensions to match video
// 		canvas.width = video.videoWidth
// 		canvas.height = video.videoHeight

// 		// Draw video frame to canvas
// 		ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

// 		// Convert to base64
// 		const imageData = canvas.toDataURL("image/jpeg", 0.9)
// 		const preview = URL.createObjectURL(
// 			new Blob([imageData], { type: "image/jpeg" })
// 		)

// 		// Add to scanned pages
// 		const newPage: ScannedPage = {
// 			id: `page-${Date.now()}-${Math.random()}`,
// 			imageData,
// 			preview,
// 		}

// 		setScannedPages(prev => [...prev, newPage])
// 		toast.success("Page captured!")
// 	}, [])

// 	// Handle file upload (for scanning from file)
// 	const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
// 		const file = event.target.files?.[0]
// 		if (!file) return

// 		if (!file.type.startsWith("image/")) {
// 			toast.error("Please select an image file")
// 			return
// 		}

// 		const reader = new FileReader()
// 		reader.onload = (e) => {
// 			const imageData = e.target?.result as string
// 			const preview = URL.createObjectURL(file)

// 			const newPage: ScannedPage = {
// 				id: `page-${Date.now()}-${Math.random()}`,
// 				imageData,
// 				preview,
// 			}

// 			setScannedPages(prev => [...prev, newPage])
// 			toast.success("Image added!")
// 		}
// 		reader.readAsDataURL(file)
// 	}, [])

// 	// Remove scanned page
// 	const removePage = useCallback((id: string) => {
// 		setScannedPages(prev => {
// 			const page = prev.find(p => p.id === id)
// 			if (page?.preview) {
// 				URL.revokeObjectURL(page.preview)
// 			}
// 			return prev.filter(p => p.id !== id)
// 		})
// 	}, [])

// 	// Generate PDF from scanned pages
// 	const generatePDF = useCallback(async (): Promise<Blob> => {
// 		// Dynamic import of pdf-lib to avoid SSR issues
// 		const { PDFDocument } = await import("pdf-lib")

// 		const pdfDoc = await PDFDocument.create()

// 		for (const page of scannedPages) {
// 			try {
// 				// Convert base64 data URL to Uint8Array
// 				const base64Data = page.imageData.split(",")[1] ?? page.imageData
// 				const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

// 				// Embed the image (try JPEG first, then PNG)
// 				let image
// 				try {
// 					image = await pdfDoc.embedJpg(imageBytes)
// 				} catch {
// 					image = await pdfDoc.embedPng(imageBytes)
// 				}

// 				// Get image dimensions
// 				const imageDims = image.scale(1)
				
// 				// Create a new page with image dimensions (A4 if too large)
// 				const maxWidth = 595 // A4 width in points
// 				const maxHeight = 842 // A4 height in points
				
// 				let pageWidth = imageDims.width
// 				let pageHeight = imageDims.height
				
// 				// Scale down if too large
// 				if (pageWidth > maxWidth || pageHeight > maxHeight) {
// 					const scale = Math.min(maxWidth / pageWidth, maxHeight / pageHeight)
// 					pageWidth = pageWidth * scale
// 					pageHeight = pageHeight * scale
// 				}

// 				const pdfPage = pdfDoc.addPage([pageWidth, pageHeight])

// 				// Draw image on page
// 				pdfPage.drawImage(image, {
// 					x: 0,
// 					y: 0,
// 					width: pageWidth,
// 					height: pageHeight,
// 				})
// 			} catch (error) {
// 				console.error("Error adding page to PDF:", error)
// 				// Continue with next page even if one fails
// 			}
// 		}

// 		const pdfBytes = await pdfDoc.save()
// 		// Use buffer property and cast to ensure compatibility with Blob
// 		return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
// 	}, [scannedPages])

// 	// Upload scanned document
// 	const handleUpload = useCallback(async () => {
// 		if (scannedPages.length === 0) {
// 			toast.error("Please scan at least one page")
// 			return
// 		}

// 		if (!documentName.trim()) {
// 			toast.error("Please enter a document name")
// 			return
// 		}

// 		setIsUploading(true)

// 		try {
// 			// Generate PDF
// 			const pdfBlob = await generatePDF()
// 			const fileName = `${documentName.trim()}.pdf`

// 			// Convert PDF to base64
// 			const base64 = await new Promise<string>((resolve, reject) => {
// 				const reader = new FileReader()
// 				reader.onload = () => {
// 					const result = reader.result as string
// 					const base64Data = result.split(",")[1]
// 					if (base64Data) {
// 						resolve(base64Data)
// 					} else {
// 						reject(new Error("Failed to convert PDF to base64"))
// 					}
// 				}
// 				reader.onerror = reject
// 				reader.readAsDataURL(pdfBlob)
// 			})

// 			// Upload document
// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// 			const uploadedDocResult = await uploadDocument.mutateAsync({
// 				name: fileName,
// 				file: base64,
// 				mimeType: "application/pdf",
// 				size: pdfBlob.size,
// 				description: `Scanned document with ${scannedPages.length} page(s)${selectedConsultationId ? ` - IEN Consultation` : ""}`,
// 			})
// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
// 			const uploadedDoc = (uploadedDocResult as unknown) as RouterOutputs["signatureLite"]["uploadDocument"]
// 			// Extract path with proper typing
// 			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
// 			const documentPath: string = uploadedDoc.path ?? ""

// 			// If creating envelope, create it and add the document
// 			if (createEnvelope) {
// 				const envelopeResult = await createEnvelopeMutation.mutateAsync({
// 					title: documentName.trim(),
// 					description: `Scanned document from IEN session`,
// 				})
				
// 				if (!envelopeResult || !("id" in envelopeResult)) {
// 					throw new Error("Failed to create envelope")
// 				}
				
// 				// TypeScript now knows envelopeResult has an id property
// 				const envelopeId = (envelopeResult as { id: string }).id

// 				// Add document to envelope
// 				await createDocumentsMutation.mutateAsync({
// 					envelopeId,
					 
// 					files: [{
// 						name: fileName,
// 						type: "application/pdf",
// 						size: pdfBlob.size,
// 						path: documentPath,
// 					}],
// 				})

// 				toast.success("Document uploaded and envelope created!")
// 			} else {
// 				toast.success("Document uploaded successfully!")
// 			}

// 			// Reset form
// 			setScannedPages([])
// 			setDocumentName("")
// 			setSelectedConsultationId("")
// 			setCreateEnvelope(false)
// 			setIsUploading(false)
// 		} catch (error) {
// 			console.error("Upload error:", error)
// 			toast.error("Failed to upload document")
// 			setIsUploading(false)
// 		}
// 	}, [scannedPages, documentName, generatePDF, uploadDocument, createEnvelope, createEnvelopeMutation, createDocumentsMutation, selectedConsultationId])

// 	// Cleanup on unmount
// 	useEffect(() => {
// 		return () => {
// 			stopCamera()
// 			scannedPages.forEach(page => {
// 				if (page.preview) {
// 					URL.revokeObjectURL(page.preview)
// 				}
// 			})
// 		}
// 	}, [stopCamera, scannedPages])

// 	return (
// 		<>
// 			<SiteNavbar items={[{ label: "Scan Documents", url: "/scan" as Route }]} />

// 			<div className="min-h-screen bg-muted/30">
// 				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
// 					{/* Header */}
// 					<div className="mb-8">
// 						<h1 className="text-3xl font-bold tracking-tight">Scan Documents</h1>
// 						<p className="mt-2 text-muted-foreground">
// 							Scan physical documents for in-person notarization (IEN workflow)
// 						</p>
// 					</div>

// 					{/* Instructions */}
// 					<Alert className="mb-6">
// 						<Scan className="h-4 w-4" />
// 						<AlertDescription>
// 							Use your device camera to scan physical documents. You can capture multiple pages
// 							and combine them into a single PDF document.
// 						</AlertDescription>
// 					</Alert>

// 					<div className="grid gap-6 lg:grid-cols-2">
// 						{/* Camera Section */}
// 						<Card>
// 							<CardHeader>
// 								<CardTitle className="flex items-center gap-2">
// 									<Camera className="h-5 w-5" />
// 									Camera Scanner
// 								</CardTitle>
// 								<CardDescription>
// 									Capture documents using your device camera
// 								</CardDescription>
// 							</CardHeader>
// 							<CardContent className="space-y-4">
// 								{!isScanning ? (
// 									<div className="space-y-4">
// 										<div className="flex gap-2">
// 											<Button onClick={startCamera} className="flex-1">
// 												<Camera className="mr-2 h-4 w-4" />
// 												Start Camera
// 											</Button>
// 											<Button
// 												variant="outline"
// 												onClick={() => fileInputRef.current?.click()}
// 											>
// 												<Upload className="mr-2 h-4 w-4" />
// 												Upload Image
// 											</Button>
// 										</div>
// 										<Input
// 											ref={fileInputRef}
// 											type="file"
// 											accept="image/*"
// 											onChange={handleFileUpload}
// 											className="hidden"
// 										/>
// 										<div className="flex items-center gap-2">
// 											<Label>Camera:</Label>
// 											<Button
// 												variant="outline"
// 												size="sm"
// 												onClick={() =>
// 													setFacingMode(prev =>
// 														prev === "environment" ? "user" : "environment"
// 													)
// 												}
// 											>
// 												<RotateCw className="mr-2 h-3 w-3" />
// 												{facingMode === "environment" ? "Back Camera" : "Front Camera"}
// 											</Button>
// 										</div>
// 									</div>
// 								) : (
// 									<div className="space-y-4">
// 										{/* Video Preview */}
// 										<div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
// 											<video
// 												ref={videoRef}
// 												autoPlay
// 												playsInline
// 												className="h-full w-full object-contain"
// 											/>
// 											{/* Capture Button Overlay */}
// 											<div className="absolute bottom-4 left-1/2 -translate-x-1/2">
// 												<Button
// 													size="lg"
// 													className="h-16 w-16 rounded-full"
// 													onClick={captureImage}
// 												>
// 													<Camera className="h-6 w-6" />
// 												</Button>
// 											</div>
// 										</div>

// 										<div className="flex gap-2">
// 											<Button onClick={captureImage} variant="outline" className="flex-1">
// 												<Camera className="mr-2 h-4 w-4" />
// 												Capture Page
// 											</Button>
// 											<Button onClick={stopCamera} variant="destructive">
// 												<X className="mr-2 h-4 w-4" />
// 												Stop Camera
// 											</Button>
// 										</div>
// 									</div>
// 								)}

// 								{/* Hidden canvas for image capture */}
// 								<canvas ref={canvasRef} className="hidden" />
// 							</CardContent>
// 						</Card>

// 						{/* Scanned Pages Preview */}
// 						<Card>
// 							<CardHeader>
// 								<CardTitle className="flex items-center gap-2">
// 									<FileText className="h-5 w-5" />
// 									Scanned Pages ({scannedPages.length})
// 								</CardTitle>
// 								<CardDescription>
// 									Review and manage your scanned pages
// 								</CardDescription>
// 							</CardHeader>
// 							<CardContent className="space-y-4">
// 								{scannedPages.length === 0 ? (
// 									<div className="py-12 text-center text-muted-foreground">
// 										<FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
// 										<p>No pages scanned yet</p>
// 										<p className="text-sm">Start scanning to add pages</p>
// 									</div>
// 								) : (
// 									<div className="space-y-3">
// 										{scannedPages.map((page, index) => (
// 											<div
// 												key={page.id}
// 												className="flex items-center gap-3 rounded-lg border p-3"
// 											>
// 												<div className="relative h-20 w-16 overflow-hidden rounded bg-muted">
// 													<img
// 														src={page.preview}
// 														alt={`Page ${index + 1}`}
// 														className="h-full w-full object-cover"
// 													/>
// 												</div>
// 												<div className="flex-1">
// 													<p className="font-medium">Page {index + 1}</p>
// 													<Badge variant="outline" className="mt-1">
// 														Scanned
// 													</Badge>
// 												</div>
// 												<Button
// 													variant="ghost"
// 													size="icon"
// 													onClick={() => removePage(page.id)}
// 												>
// 													<X className="h-4 w-4" />
// 												</Button>
// 											</div>
// 										))}
// 									</div>
// 								)}
// 							</CardContent>
// 						</Card>
// 					</div>

// 					{/* Document Upload Section */}
// 					{scannedPages.length > 0 && (
// 						<Card className="mt-6">
// 							<CardHeader>
// 								<CardTitle>Save Document</CardTitle>
// 								<CardDescription>
// 									Enter a name and upload your scanned document
// 								</CardDescription>
// 							</CardHeader>
// 							<CardContent className="space-y-4">
// 								{/* Active IEN Consultations */}
// 								{session?.user?.role === "ENP" && activeConsultations && activeConsultations.length > 0 && (
// 									<div>
// 										<Label htmlFor="consultation-select">Associate with IEN Consultation (Optional)</Label>
// 										<Select value={selectedConsultationId} onValueChange={setSelectedConsultationId}>
// 											<SelectTrigger id="consultation-select" className="mt-1">
// 												<SelectValue placeholder="Select an active IEN consultation" />
// 											</SelectTrigger>
// 											<SelectContent>
// 												<SelectItem value="">None (Standalone)</SelectItem>
// 												{activeConsultations.map((consultation) => (
// 													<SelectItem key={consultation.id} value={consultation.id}>
// 														<div className="flex items-center gap-2">
// 															<Calendar className="h-4 w-4" />
// 															<span>
// 																{consultation.client?.name ?? "Client"} - {format(new Date(consultation.appointmentDate), "MMM dd, yyyy h:mm a")}
// 															</span>
// 														</div>
// 													</SelectItem>
// 												))}
// 											</SelectContent>
// 										</Select>
// 										<p className="mt-1 text-xs text-muted-foreground">
// 											Optionally associate this scanned document with an active IEN consultation
// 										</p>
// 									</div>
// 								)}

// 								<div>
// 									<Label htmlFor="document-name">Document Name</Label>
// 									<Input
// 										id="document-name"
// 										placeholder="e.g., Contract Agreement"
// 										value={documentName}
// 										onChange={(e) => setDocumentName(e.target.value)}
// 										className="mt-1"
// 									/>
// 								</div>

// 								{/* Create Envelope Option */}
// 								<div className="flex items-center space-x-2">
// 									<Checkbox
// 										id="create-envelope"
// 										checked={createEnvelope}
// 										onCheckedChange={(checked) => setCreateEnvelope(!!checked)}
// 									/>
// 									<Label htmlFor="create-envelope" className="text-sm font-normal cursor-pointer">
// 										Create a new envelope with this document
// 									</Label>
// 								</div>
// 								<div className="flex gap-2">
// 									<Button
// 										onClick={handleUpload}
// 										disabled={isUploading || !documentName.trim()}
// 										className="flex-1"
// 									>
// 										{isUploading ? (
// 											<>
// 												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
// 												Uploading...
// 											</>
// 										) : (
// 											<>
// 												<Upload className="mr-2 h-4 w-4" />
// 												Upload Document
// 											</>
// 										)}
// 									</Button>
// 									<Button
// 										variant="outline"
// 										onClick={async () => {
// 											try {
// 												const pdfBlob = await generatePDF()
// 												const url = URL.createObjectURL(pdfBlob)
// 												const a = document.createElement("a")
// 												a.href = url
// 												a.download = `${documentName ?? "scanned-document"}.pdf`
// 												document.body.appendChild(a)
// 												a.click()
// 												document.body.removeChild(a)
// 												URL.revokeObjectURL(url)
// 												toast.success("PDF downloaded!")
// 											} catch (error) {
// 												toast.error("Failed to generate PDF")
// 											}
// 										}}
// 										disabled={scannedPages.length === 0}
// 									>
// 										<Download className="mr-2 h-4 w-4" />
// 										Download PDF
// 									</Button>
// 								</div>
// 							</CardContent>
// 						</Card>
// 					)}
// 				</div>
// 			</div>
// 		</>
// 	)
// }

export default function ScanDocumentsPage() {
	return null
}
