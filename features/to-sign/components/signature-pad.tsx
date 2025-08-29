"use client"

import Image from "next/image"
import type React from "react"
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState
} from "react"
import { PenTool, RotateCcw, Sparkles, Type, Upload } from "lucide-react"
import SignatureCanvas from "react-signature-canvas"

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
import { Separator } from "@/core/components/ui/separator"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from "@/core/components/ui/tabs"

export interface SignaturePadRef {
	clear: () => void
	getSignatureData: () => string | null
	getSignatureText: () => string
	getSignatureType: () => "drawn" | "typed" | "uploaded" | null
	isEmpty: () => boolean
}

interface SignaturePadProps {
	onSignatureChange?: (hasSignature: boolean) => void
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
	({ onSignatureChange }, ref) => {
		const sigCanvasRef = useRef<SignatureCanvas>(null)
		const containerRef = useRef<HTMLDivElement>(null)
		const [signatureText, setSignatureText] = useState("")
		const [uploadedImage, setUploadedImage] = useState<string | null>(null)
		const [activeTab, setActiveTab] = useState("type")
		const [hasDrawnSignature, setHasDrawnSignature] = useState(false)
		const [canvasInitialized, setCanvasInitialized] = useState(false)

		useImperativeHandle(ref, () => ({
			clear: () => {
				sigCanvasRef.current?.clear()
				setSignatureText("")
				setUploadedImage(null)
				setHasDrawnSignature(false)
				onSignatureChange?.(false)
			},
			getSignatureData: (): string | null => {
				if (activeTab === "draw" && hasDrawnSignature && sigCanvasRef.current) {
					const dataUrl = sigCanvasRef.current.toDataURL("image/png")
					return dataUrl || null
				}
				if (activeTab === "upload" && uploadedImage) {
					return uploadedImage
				}
				return null
			},
			getSignatureText: () => {
				return activeTab === "type" ? signatureText : ""
			},
			getSignatureType: () => {
				if (activeTab === "draw" && hasDrawnSignature) return "drawn"
				if (activeTab === "type" && signatureText.trim()) return "typed"
				if (activeTab === "upload" && uploadedImage) return "uploaded"
				return null
			},
			isEmpty: () => {
				if (activeTab === "draw") return !hasDrawnSignature
				if (activeTab === "type") return !signatureText.trim()
				if (activeTab === "upload") return !uploadedImage
				return true
			}
		}))

		// Stable function to check and notify signature status
		const checkAndNotifySignatureStatus = useCallback(() => {
			let hasSignature = false

			if (activeTab === "draw") {
				hasSignature = hasDrawnSignature
			} else if (activeTab === "type") {
				hasSignature = !!signatureText.trim()
			} else if (activeTab === "upload") {
				hasSignature = !!uploadedImage
			}

			onSignatureChange?.(hasSignature)
		}, [
			activeTab,
			hasDrawnSignature,
			signatureText,
			uploadedImage,
			onSignatureChange
		])

		// Check signature status whenever relevant state changes
		useEffect(() => {
			checkAndNotifySignatureStatus()
		}, [checkAndNotifySignatureStatus])

		const handleClear = () => {
			if (activeTab === "draw") {
				sigCanvasRef.current?.clear()
				setHasDrawnSignature(false)
			} else if (activeTab === "type") {
				setSignatureText("")
			} else if (activeTab === "upload") {
				setUploadedImage(null)
			}
		}

		const handleDrawEnd = () => {
			if (sigCanvasRef.current) {
				const isEmpty = sigCanvasRef.current.isEmpty()
				setHasDrawnSignature(!isEmpty)
			}
		}

		const handleTextChange = (value: string) => {
			setSignatureText(value)
		}

		const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0]
			if (file) {
				const reader = new FileReader()
				reader.onload = (e) => {
					const result = e.target?.result as string
					setUploadedImage(result)
				}
				reader.readAsDataURL(file)
			}
		}

		const handleTabChange = (newTab: string) => {
			setActiveTab(newTab)
			// Initialize canvas when switching to draw tab
			if (newTab === "draw" && !canvasInitialized) {
				setTimeout(() => {
					if (sigCanvasRef.current) {
						setCanvasInitialized(true)
					}
				}, 100)
			}
		}

		// Initialize canvas on mount
		useEffect(() => {
			if (activeTab === "draw" && !canvasInitialized) {
				const initializeCanvas = () => {
					if (sigCanvasRef.current) {
						setCanvasInitialized(true)
					}
				}
				// Small delay to ensure DOM is ready
				const timer = setTimeout(initializeCanvas, 100)
				return () => clearTimeout(timer)
			}
		}, [activeTab, canvasInitialized])

		return (
			<Card className="border-0 bg-white/95 shadow-lg backdrop-blur-sm">
				<CardHeader className="pb-4">
					<CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
						<div className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-2">
							<PenTool className="h-5 w-5 text-white" />
						</div>
						Create Your Signature
						<Badge className="ml-2 border-blue-200 bg-blue-100 text-blue-700">
							Professional
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<Tabs
						value={activeTab}
						onValueChange={handleTabChange}
						className="w-full"
					>
						<TabsList className="grid w-full grid-cols-3 rounded-lg bg-slate-100 p-1">
							<TabsTrigger
								value="draw"
								className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
							>
								<PenTool className="h-4 w-4" />
								Draw
							</TabsTrigger>
							<TabsTrigger
								value="type"
								className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
							>
								<Type className="h-4 w-4" />
								Type
							</TabsTrigger>
							<TabsTrigger
								value="upload"
								className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
							>
								<Upload className="h-4 w-4" />
								Upload
							</TabsTrigger>
						</TabsList>

						<TabsContent value="draw" className="space-y-4">
							<div className="text-center">
								<p className="mb-4 text-sm text-slate-600">
									Draw your signature using your mouse, touchpad, or stylus
								</p>
								<div className="relative">
									<div
										ref={containerRef}
										className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-blue-400"
									>
										<SignatureCanvas
											ref={sigCanvasRef}
											canvasProps={{
												className: "w-full h-48 rounded-lg bg-white shadow-sm",
												style: {
													border: "1px solid #e2e8f0",
													borderRadius: "8px"
												}
											}}
											onEnd={handleDrawEnd}
											penColor="#1e293b"
											backgroundColor="white"
										/>
									</div>
									{!hasDrawnSignature && (
										<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
											<div className="text-center">
												<PenTool className="mx-auto mb-2 h-8 w-8 text-slate-400" />
												<p className="text-sm text-slate-500">
													Draw your signature here
												</p>
											</div>
										</div>
									)}
								</div>
								<div className="mt-4 flex justify-center gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={handleClear}
										className="border-slate-300 text-slate-700 hover:bg-slate-50"
									>
										<RotateCcw className="mr-2 h-4 w-4" />
										Clear
									</Button>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="type" className="space-y-4">
							<div className="text-center">
								<p className="mb-4 text-sm text-slate-600">
									Type your name to create a typed signature
								</p>
								<div className="space-y-4">
									<div>
										<Label
											htmlFor="signature-text"
											className="text-sm font-medium text-slate-700"
										>
											Your Name
										</Label>
										<Input
											id="signature-text"
											placeholder="Enter your full name"
											value={signatureText}
											onChange={(e) => handleTextChange(e.target.value)}
											className="mt-2 border-slate-300 text-center text-lg font-semibold focus:border-blue-500 focus:ring-blue-500"
										/>
									</div>
									{signatureText && (
										<div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
											<p className="font-serif text-2xl font-semibold text-slate-900">
												{signatureText}
											</p>
										</div>
									)}
									<div className="flex justify-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={handleClear}
											className="border-slate-300 text-slate-700 hover:bg-slate-50"
										>
											<RotateCcw className="mr-2 h-4 w-4" />
											Clear
										</Button>
									</div>
								</div>
							</div>
						</TabsContent>

						<TabsContent value="upload" className="space-y-4">
							<div className="text-center">
								<p className="mb-4 text-sm text-slate-600">
									Upload an image of your signature
								</p>
								<div className="space-y-4">
									<div className="rounded-lg border-2 border-dashed border-slate-300 p-8 transition-colors hover:border-blue-400">
										<input
											type="file"
											accept="image/*"
											onChange={handleImageUpload}
											className="hidden"
											id="signature-upload"
										/>
										<label
											htmlFor="signature-upload"
											className="block cursor-pointer"
										>
											<div className="text-center">
												<Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
												<p className="mb-2 text-sm font-medium text-slate-700">
													Click to upload signature image
												</p>
												<p className="text-xs text-slate-500">
													PNG, JPG, or GIF up to 5MB
												</p>
											</div>
										</label>
									</div>
									{uploadedImage && (
										<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
											<Image
												src={uploadedImage}
												alt="Uploaded signature"
												width={300}
												height={100}
												className="mx-auto rounded"
											/>
										</div>
									)}
									<div className="flex justify-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={handleClear}
											className="border-slate-300 text-slate-700 hover:bg-slate-50"
										>
											<RotateCcw className="mr-2 h-4 w-4" />
											Clear
										</Button>
									</div>
								</div>
							</div>
						</TabsContent>
					</Tabs>

					<Separator className="bg-slate-200" />

					<div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
						<div className="flex items-start gap-3">
							<Sparkles className="mt-0.5 h-5 w-5 text-blue-600" />
							<div>
								<p className="mb-1 text-sm font-medium text-slate-900">
									Professional Digital Signature
								</p>
								<p className="text-xs text-slate-600">
									Your signature will be securely applied to the document with
									full legal validity and compliance with digital signature
									standards.
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}
)

SignaturePad.displayName = "SignaturePad"
