"use client"

import { useEffect, useRef, useState } from "react"
import { FileText } from "lucide-react"

interface FileFlightAnimationProps {
	/** Set to true to trigger the animation */
	trigger: boolean
	/** Called when animation completes */
	onComplete?: () => void
	/**
	 * Origin position (e.g. center of the upload dialog).
	 * Defaults to center of the screen if not provided.
	 */
	originX?: number
	originY?: number
}

/**
 * Renders a floating file icon that flies from the origin point
 * toward the right-side document sidebar when `trigger` becomes true.
 *
 * Mount this once at the page/layout level and pass `trigger` + `originX/Y`.
 *
 * Example usage in your meeting page:
 *
 * ```tsx
 * const [flyTrigger, setFlyTrigger] = useState(false)
 *
 * <MeetingDocumentUpload
 *   ...
 *   onUploadAnimationStart={() => setFlyTrigger(true)}
 * />
 * <FileFlightAnimation
 *   trigger={flyTrigger}
 *   onComplete={() => setFlyTrigger(false)}
 * />
 * ```
 */
export function FileFlightAnimation({
	trigger,
	onComplete,
	originX,
	originY,
}: FileFlightAnimationProps) {
	const [isAnimating, setIsAnimating] = useState(false)
	const [start, setStart] = useState({ x: 0, y: 0 })
	const [end, setEnd] = useState({ x: 0, y: 0 })
	const rafRef = useRef<number | null>(null)

	useEffect(() => {
		if (!trigger || isAnimating) return

		// Compute start: provided origin or center of viewport
		const sx = originX ?? window.innerWidth / 2
		const sy = originY ?? window.innerHeight / 2

		// Compute end: right sidebar (48px wide), vertically centered
		const ex = window.innerWidth - 24 // center of the 48px collapsed sidebar
		const ey = window.innerHeight * 0.35 // roughly where the first file icon sits

		setStart({ x: sx, y: sy })
		setEnd({ x: ex, y: ey })
		setIsAnimating(true)
	}, [trigger, isAnimating, originX, originY])

	const handleAnimationEnd = () => {
		setIsAnimating(false)
		onComplete?.()
	}

	if (!isAnimating) return null

	// Translate from start → end (relative to fixed 0,0)
	const dx = end.x - start.x
	const dy = end.y - start.y

	return (
		<div
			aria-hidden="true"
			style={
				{
					"position": "fixed",
					"left": start.x,
					"top": start.y,
					"zIndex": 9999,
					"pointerEvents": "none",
					// The keyframe is defined inline via a style tag below
					"animation": "fileFlight 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards",
					"--dx": `${dx}px`,
					"--dy": `${dy}px`,
				} as React.CSSProperties
			}
			onAnimationEnd={handleAnimationEnd}
		>
			{/* Glowing trail dot */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: "50%",
					background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
					transform: "scale(2.5)",
					animation: "trailPulse 0.7s ease-out forwards",
				}}
			/>

			{/* File icon chip */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					background: "rgba(139,92,246,0.95)",
					backdropFilter: "blur(8px)",
					border: "1px solid rgba(196,181,253,0.5)",
					borderRadius: "999px",
					padding: "5px 10px 5px 7px",
					boxShadow: "0 4px 24px rgba(139,92,246,0.5), 0 1px 4px rgba(0,0,0,0.3)",
					transform: "translateX(-50%) translateY(-50%)",
					whiteSpace: "nowrap",
				}}
			>
				<FileText size={13} color="white" strokeWidth={2.5} />
				<span
					style={{
						color: "white",
						fontSize: "11px",
						fontWeight: 600,
						letterSpacing: "0.01em",
					}}
				>
					Adding to sidebar…
				</span>
			</div>

			{/* Keyframe styles injected once */}
			<style>{`
				@keyframes fileFlight {
					0% {
						transform: translate(0, 0) scale(1);
						opacity: 1;
					}
					60% {
						opacity: 1;
					}
					100% {
						transform: translate(var(--dx), var(--dy)) scale(0.55);
						opacity: 0;
					}
				}
				@keyframes trailPulse {
					0% { opacity: 0.6; transform: scale(2.5); }
					100% { opacity: 0; transform: scale(4); }
				}
			`}</style>
		</div>
	)
}
