"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CameraOff, FlipHorizontal, RefreshCw } from "lucide-react"

import { Button } from "@/core/components/ui/button"

type FacingMode = "user" | "environment"

export function CameraCapture(props: {
	title: string
	description?: string
	initialFacingMode?: FacingMode
	overlayVariant?: "face" | "document"
	autoStart?: boolean
	onCapture: (imageDataUrl: string) => void
}) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const startInFlightRef = useRef(false)
	const prevFacingModeRef = useRef<FacingMode | null>(null)

	const [cameraActive, setCameraActive] = useState(false)
	const [cameraError, setCameraError] = useState<string | null>(null)
	const [isStarting, setIsStarting] = useState(false)
	const [capturedImage, setCapturedImage] = useState<string | null>(null)
	const [facingMode, setFacingMode] = useState<FacingMode>(props.initialFacingMode ?? "environment")

	const waitForVideoFrame = async (video: HTMLVideoElement) => {
		// Ensure metadata is ready and the element has actual frame dimensions.
		if (video.readyState < 2) {
			await new Promise<void>(resolve => {
				const onReady = () => {
					video.removeEventListener("loadeddata", onReady)
					video.removeEventListener("canplay", onReady)
					resolve()
				}
				video.addEventListener("loadeddata", onReady, { once: true })
				video.addEventListener("canplay", onReady, { once: true })
			})
		}

		// Give the browser a tick to render a real frame.
		await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
	}

	const isMostlyBlack = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
		// Sample a small downscaled image to detect blank/black captures.
		const sampleW = 32
		const sampleH = 24
		const imageData = ctx.getImageData(
			Math.floor((width - sampleW) / 2),
			Math.floor((height - sampleH) / 2),
			sampleW,
			sampleH
		)

		let dark = 0
		const total = sampleW * sampleH
		for (let i = 0; i < imageData.data.length; i += 4) {
			const r = imageData.data[i] ?? 0
			const g = imageData.data[i + 1] ?? 0
			const b = imageData.data[i + 2] ?? 0
			const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
			if (luminance < 0.05) dark += 1
		}

		return dark / total > 0.9
	}

	const stopCamera = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop())
			streamRef.current = null
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null
		}
		setCameraActive(false)
	}, [])

	const attachStreamToVideo = async (stream: MediaStream) => {
		if (!videoRef.current) return

		const video = videoRef.current
		video.srcObject = stream

		// Some browsers require waiting for metadata before play()
		await new Promise<void>(resolve => {
			if (video.readyState >= 1) return resolve()
			const onLoaded = () => {
				video.removeEventListener("loadedmetadata", onLoaded)
				resolve()
			}
			video.addEventListener("loadedmetadata", onLoaded)
		})

		try {
			await video.play()
		} catch (err) {
			// If autoplay is blocked, user can retry via Start Camera button
			console.warn("video.play() failed (possibly autoplay blocked):", err)
		}
	}

	const getStream = async (mode: FacingMode) => {
		return await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: mode,
				width: { ideal: 1280 },
				height: { ideal: 720 },
			},
			audio: false,
		})
	}

	const startCamera = useCallback(async () => {
		if (startInFlightRef.current) return
		startInFlightRef.current = true
		try {
			setCameraError(null)
			setIsStarting(true)

			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop())
			}

			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error("Camera API not supported in this browser.")
			}

			let stream: MediaStream | null = null

			// On desktop, "environment" frequently fails (no rear camera). Fallback to "user".
			try {
				stream = await getStream(facingMode)
			} catch (err) {
				if (facingMode === "environment") {
					stream = await getStream("user")
					setFacingMode("user")
				} else {
					// Final fallback: ask browser to pick any camera
					stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
				}
			}

			streamRef.current = stream
			await attachStreamToVideo(stream)
			setCameraActive(true)
		} catch (error) {
			console.error("Camera error:", error)

			const message =
				error instanceof DOMException
					? // Chrome sometimes provides empty message; name is more useful.
						error.message || `Camera error: ${error.name}`
					: error instanceof Error
						? error.message || "Failed to access camera."
						: "Failed to access camera. Please ensure camera permissions are granted."

			setCameraError(message)
			setCameraActive(false)
		} finally {
			setIsStarting(false)
			startInFlightRef.current = false
		}
	}, [facingMode])

	const flipCamera = useCallback(async () => {
		const newMode: FacingMode = facingMode === "user" ? "environment" : "user"

		try {
			// Get the new stream first, before tearing down the old one
			let newStream: MediaStream
			try {
				newStream = await getStream(newMode)
			} catch {
				// If the requested mode isn't available, try the other one
				newStream = await getStream(facingMode)
				// Couldn't actually flip — bail out quietly
				return
			}

			// Stop old tracks
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop())
			}

			// Attach the new stream without going through the "camera off" state
			streamRef.current = newStream
			await attachStreamToVideo(newStream)
			setFacingMode(newMode)
			// Keep prevFacingModeRef in sync so the old effect guard doesn't fire
			prevFacingModeRef.current = newMode
		} catch (err) {
			console.warn("Failed to flip camera:", err)
		}
	}, [facingMode])

	useEffect(() => {
		// Guard: only restart when facingMode was changed externally (not via flipCamera).
		const prev = prevFacingModeRef.current
		prevFacingModeRef.current = facingMode
		if (!cameraActive) return
		if (prev === null) return
		if (prev === facingMode) return

		// This path is now only hit by the internal fallback in startCamera
		// (which already updates the ref), so in practice it won't trigger.
		void startCamera()
	}, [facingMode, cameraActive, startCamera])

	useEffect(() => {
		return () => stopCamera()
	}, [stopCamera])

	useEffect(() => {
		// Best-effort auto-start (may still require user gesture depending on browser settings)
		if (!props.autoStart) return
		if (cameraActive || capturedImage || isStarting) return
		void startCamera()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.autoStart])

	const captureImage = useCallback(() => {
		void (async () => {
			if (!videoRef.current || !canvasRef.current) return

			const video = videoRef.current
			const canvas = canvasRef.current
			const ctx = canvas.getContext("2d", { willReadFrequently: true })
			if (!ctx) return

			try {
				await waitForVideoFrame(video)
			} catch {
				// ignore
			}

			const trackSettings = streamRef.current?.getVideoTracks?.()?.[0]?.getSettings?.()
			const width = video.videoWidth || trackSettings?.width || 1280
			const height = video.videoHeight || trackSettings?.height || 720

			if (!width || !height) {
				setCameraError("Camera is still starting. Please try again.")
				return
			}

			canvas.width = width
			canvas.height = height

			if (facingMode === "user") {
				ctx.save()
				ctx.scale(-1, 1)
				ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
				ctx.restore()
			} else {
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
			}

			// Reject blank captures (common when width/height were 0 or frame not ready).
			if (isMostlyBlack(ctx, canvas.width, canvas.height)) {
				setCameraError("Captured image is too dark/blank. Please retake in better lighting.")
				return
			}

			const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9)
			setCapturedImage(imageDataUrl)
			stopCamera()
			props.onCapture(imageDataUrl)
		})()
	}, [facingMode, props, stopCamera])

	const retake = useCallback(() => {
		setCapturedImage(null)
		void startCamera()
	}, [startCamera])

	return (
		<div className="space-y-3">
			<div className="space-y-1">
				<p className="text-sm font-medium">{props.title}</p>
				{props.description && <p className="text-muted-foreground text-xs">{props.description}</p>}
			</div>

			<div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-black">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted
					className={`absolute inset-0 h-full w-full object-cover ${
						capturedImage ? "hidden" : ""
					} ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
				/>
				<canvas ref={canvasRef} className="hidden" />

				{capturedImage && (
					<img
						src={capturedImage}
						alt="Captured"
						className="absolute inset-0 h-full w-full object-cover"
					/>
				)}

				{!cameraActive && !capturedImage && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white">
						<CameraOff className="mb-3 size-10 text-gray-400" />
						<p className="text-sm text-gray-200">
							{isStarting ? "Starting camera…" : "Camera is not active"}
						</p>
						{cameraError && (
							<p className="mt-2 px-4 text-center text-xs text-red-300">{cameraError}</p>
						)}
					</div>
				)}

				{cameraActive && !capturedImage && props.overlayVariant === "face" && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="h-64 w-48 rounded-full border-2 border-white/50" />
					</div>
				)}

				{cameraActive && !capturedImage && props.overlayVariant === "document" && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="h-56 w-80 rounded-lg border-2 border-white/50" />
					</div>
				)}

				{cameraActive && !capturedImage && (
					<div className="absolute right-0 bottom-4 left-0 flex justify-center gap-3">
						<Button
							onClick={flipCamera}
							variant="secondary"
							size="icon"
							className="rounded-full bg-white/20 backdrop-blur hover:bg-white/30"
							title="Flip camera"
							type="button"
						>
							<FlipHorizontal className="size-5 text-white" />
						</Button>
						<Button
							onClick={captureImage}
							variant="default"
							size="lg"
							className="rounded-full px-8"
							type="button"
						>
							<Camera className="mr-2 size-5" />
							Capture
						</Button>
					</div>
				)}
			</div>

			<div className="flex gap-2">
				{!cameraActive && !capturedImage && (
					<Button
						onClick={() => void startCamera()}
						className="flex-1"
						type="button"
						disabled={isStarting}
					>
						<Camera className="mr-2 size-4" />
						{isStarting ? "Starting…" : "Start Camera"}
					</Button>
				)}
				{capturedImage && (
					<Button onClick={retake} variant="outline" className="flex-1" type="button">
						<RefreshCw className="mr-2 size-4" />
						Retake
					</Button>
				)}
			</div>
		</div>
	)
}
