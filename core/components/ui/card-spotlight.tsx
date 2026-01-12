"use client"

import { useRef, useState } from "react"

import { cn } from "@/core/lib/utils"

export const CardSpotlight = ({
	children,
	className = "",
	spotlightColor = "rgba(255, 255, 255, 0.25)",
}: {
	children: React.ReactNode
	className?: string
	spotlightColor?: string
}) => {
	const divRef = useRef<HTMLDivElement>(null)
	const [position, setPosition] = useState({ x: 0, y: 0 })
	const [opacity, setOpacity] = useState(0)

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!divRef.current) return

		const div = divRef.current
		const rect = div.getBoundingClientRect()

		setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
	}

	const handleMouseEnter = () => {
		setOpacity(1)
	}

	const handleMouseLeave = () => {
		setOpacity(0)
	}

	return (
		<div
			ref={divRef}
			onMouseMove={handleMouseMove}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			className={cn(
				"border-border bg-card text-card-foreground relative overflow-hidden rounded-xl border pb-6 shadow-sm",
				className
			)}
		>
			<div
				className="pointer-events-none absolute -inset-px z-10 opacity-0 transition duration-300"
				style={{
					opacity,
					background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
				}}
			/>
			<div className="relative z-0 h-full">{children}</div>
		</div>
	)
}
