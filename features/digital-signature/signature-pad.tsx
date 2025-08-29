"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { ImageIcon, Pen, Save, Trash2, Type } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from "@/core/components/ui/tabs"

interface SignaturePadProps {
	onSave: (signatureData: string, signatureType: string) => void
	onCancel?: () => void
	defaultType?: "draw" | "type" | "upload"
}

export function SignaturePad({
	onSave,
	onCancel,
	defaultType = "draw"
}: SignaturePadProps) {
	const [signatureType, setSignatureType] = useState<
		"draw" | "type" | "upload"
	>(defaultType)
	const [typedName, setTypedName] = useState("")
	const [signatureImage, setSignatureImage] = useState<string | null>(null)

	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [isDrawing, setIsDrawing] = useState(false)
	const [canvasContext, setCanvasContext] =
		useState<CanvasRenderingContext2D | null>(null)

	// Initialize canvas
	useEffect(() => {
		if (canvasRef.current) {
			const canvas = canvasRef.current
			const ctx = canvas.getContext("2d")

			if (ctx) {
				ctx.lineWidth = 2
				ctx.lineCap = "round"
				ctx.lineJoin = "round"
				ctx.strokeStyle = "#000000"
				setCanvasContext(ctx)
			}
		}
	}, [])

	// Handle drawing on canvas
	const startDrawing = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (!canvasContext) return

		setIsDrawing(true)
		canvasContext.beginPath()

		// Get coordinates
		const { offsetX, offsetY } = getCoordinates(e)
		canvasContext.moveTo(offsetX, offsetY)
	}

	const draw = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		if (!isDrawing || !canvasContext) return

		// Get coordinates
		const { offsetX, offsetY } = getCoordinates(e)
		canvasContext.lineTo(offsetX, offsetY)
		canvasContext.stroke()
	}

	const stopDrawing = () => {
		if (!canvasContext) return

		setIsDrawing(false)
		canvasContext.closePath()
	}

	// Helper to get coordinates from mouse or touch event
	const getCoordinates = (
		e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
	) => {
		const canvas = canvasRef.current
		if (!canvas) return { offsetX: 0, offsetY: 0 }

		if ("touches" in e) {
			// Touch event
			const rect = canvas.getBoundingClientRect()
			const touch = e.touches[0]
			if (!touch) return { offsetX: 0, offsetY: 0 }
			return {
				offsetX: touch.clientX - rect.left,
				offsetY: touch.clientY - rect.top
			}
		} else {
			// Mouse event
			return {
				offsetX: e.nativeEvent.offsetX,
				offsetY: e.nativeEvent.offsetY
			}
		}
	}

	// Clear canvas
	const clearCanvas = () => {
		if (canvasRef.current && canvasContext) {
			canvasContext.clearRect(
				0,
				0,
				canvasRef.current.width,
				canvasRef.current.height
			)
		}
	}

	// Handle file upload
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		const reader = new FileReader()
		reader.onload = (event) => {
			if (event.target?.result) {
				setSignatureImage(event.target.result as string)
			}
		}
		reader.readAsDataURL(file)
	}

	// Save signature
	const handleSave = () => {
		let signatureData = ""

		switch (signatureType) {
			case "draw":
				signatureData = canvasRef.current?.toDataURL("image/png") ?? ""
				break
			case "type":
				// For typed signatures, we'll just pass the name
				signatureData = typedName
				break
			case "upload":
				signatureData = signatureImage ?? ""
				break
		}

		onSave(signatureData, signatureType)
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle>Create Your Signature</CardTitle>
			</CardHeader>
			<CardContent>
				<Tabs
					value={signatureType}
					onValueChange={(value) =>
						setSignatureType(value as "draw" | "type" | "upload")
					}
				>
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="draw" className="flex items-center gap-1">
							<Pen className="h-3.5 w-3.5" />
							Draw
						</TabsTrigger>
						<TabsTrigger value="type" className="flex items-center gap-1">
							<Type className="h-3.5 w-3.5" />
							Type
						</TabsTrigger>
						<TabsTrigger value="upload" className="flex items-center gap-1">
							<ImageIcon className="h-3.5 w-3.5" />
							Upload
						</TabsTrigger>
					</TabsList>

					<TabsContent value="draw" className="space-y-4">
						<div className="rounded-lg border-2 border-dashed border-gray-300 p-2">
							<canvas
								ref={canvasRef}
								width={300}
								height={150}
								className="h-32 w-full cursor-crosshair rounded border"
								onMouseDown={startDrawing}
								onMouseMove={draw}
								onMouseUp={stopDrawing}
								onMouseLeave={stopDrawing}
								onTouchStart={startDrawing}
								onTouchMove={draw}
								onTouchEnd={stopDrawing}
							/>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={clearCanvas}
							className="w-full"
						>
							<Trash2 className="mr-1 h-3.5 w-3.5" />
							Clear
						</Button>
					</TabsContent>

					<TabsContent value="type" className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="typed-name">Type your full name</Label>
							<Input
								id="typed-name"
								value={typedName}
								onChange={(e) => setTypedName(e.target.value)}
								placeholder="Enter your full name"
							/>
						</div>
						{typedName && (
							<div className="rounded-lg border bg-white p-4">
								<p className="text-center font-serif text-2xl italic text-gray-800">
									{typedName}
								</p>
							</div>
						)}
					</TabsContent>

					<TabsContent value="upload" className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="signature-file">Upload signature image</Label>
							<input
								id="signature-file"
								type="file"
								accept="image/*"
								onChange={handleFileUpload}
								className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
							/>
						</div>
						{signatureImage && (
							<div className="rounded-lg border bg-white p-4">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={signatureImage ?? "/placeholder.svg"}
									alt="Uploaded signature"
									className="mx-auto h-auto max-h-32 max-w-full"
								/>
							</div>
						)}
					</TabsContent>
				</Tabs>
			</CardContent>
			<CardFooter className="flex gap-2">
				{onCancel && (
					<Button variant="outline" onClick={onCancel} className="flex-1">
						Cancel
					</Button>
				)}
				<Button onClick={handleSave} className="flex-1">
					<Save className="mr-1 h-3.5 w-3.5" />
					Save Signature
				</Button>
			</CardFooter>
		</Card>
	)
}
