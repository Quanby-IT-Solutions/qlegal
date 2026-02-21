"use client"

import { useEffect, useState } from "react"
import { FileText } from "lucide-react"

interface FileFlightAnimationProps {
	/** Set to true to trigger the animation */
	trigger: boolean
	/** Called when animation completes */
	onComplete?: () => void
	/**
	 * Origin position (center of the upload dialog / upload button).
	 * Defaults to center of the screen if not provided.
	 */
	originX?: number
	originY?: number
	/**
	 * Target position (the sidebar icon).
	 * Provide this from DocumentCards.getSidebarTarget().
	 * Defaults to top-right of viewport.
	 */
	targetX?: number
	targetY?: number
}

/**
 * Renders a floating file icon that flies from the origin point
 * toward the document sidebar when `trigger` becomes true.
 *
 * Usage in your meeting page:
 *
 * ```tsx
 * const docCardsRef = useRef<DocumentCardsHandle>(null)
 * const [flyTrigger, setFlyTrigger] = useState(false)
 * const [flyOrigin, setFlyOrigin] = useState({ x: 0, y: 0 })
 * const [flyTarget, setFlyTarget] = useState({ x: 0, y: 0 })
 *
 * // On upload success, before calling onSuccess:
 * const target = docCardsRef.current?.getSidebarTarget()
 * if (target) setFlyTarget(target)
 * setFlyTrigger(true)
 *
 * <DocumentCards ref={docCardsRef} ... />
 * <FileFlightAnimation
 *   trigger={flyTrigger}
 *   onComplete={() => setFlyTrigger(false)}
 *   originX={flyOrigin.x}
 *   originY={flyOrigin.y}
 *   targetX={flyTarget.x}
 *   targetY={flyTarget.y}
 * />
 * ```
 */
export function FileFlightAnimation({
	trigger,
	onComplete,
	originX,
	originY,
	targetX,
	targetY,
}: FileFlightAnimationProps) {
	const [isAnimating, setIsAnimating] = useState(false)
	const [start, setStart] = useState({ x: 0, y: 0 })
	const [end, setEnd] = useState({ x: 0, y: 0 })

	useEffect(() => {
		if (!trigger || isAnimating) return

		const sx = originX ?? window.innerWidth / 2
		const sy = originY ?? window.innerHeight / 2

		const ex = targetX ?? window.innerWidth - 24
		const ey = targetY ?? window.innerHeight * 0.1

		setStart({ x: sx, y: sy })
		setEnd({ x: ex, y: ey })
		setIsAnimating(true)
	}, [trigger, isAnimating, originX, originY, targetX, targetY])

	const handleAnimationEnd = () => {
		setIsAnimating(false)
		onComplete?.()
	}

	if (!isAnimating) return null

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
					"animation": "fileFlight 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards",
					"--dx": `${dx}px`,
					"--dy": `${dy}px`,
				} as React.CSSProperties
			}
			onAnimationEnd={handleAnimationEnd}
		>
			{/* Glowing radial burst */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					borderRadius: "50%",
					background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)",
					transform: "scale(2.5)",
					animation: "trailPulse 0.65s ease-out forwards",
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
					Adding to sidebar&hellip;
				</span>
			</div>

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
						transform: translate(var(--dx), var(--dy)) scale(0.45);
						opacity: 0;
					}
				}
				@keyframes trailPulse {
					0% { opacity: 0.6; transform: scale(2.5); }
					100% { opacity: 0; transform: scale(4.5); }
				}
			`}</style>
		</div>
	)
}
