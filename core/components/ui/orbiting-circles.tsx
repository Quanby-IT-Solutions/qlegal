import React from "react"

import { cn } from "@/core/lib/utils"

export interface OrbitingCirclesProps {
	className?: string
	children?: React.ReactNode
	reverse?: boolean
	duration?: number
	delay?: number
	radius?: number
	path?: boolean
	iconSize?: number
	speed?: number
}

export function OrbitingCircles({
	className,
	children,
	reverse,
	duration = 20,
	delay = 10,
	radius = 50,
	path = true,
	iconSize = 30,
	speed = 1,
	...props
}: OrbitingCirclesProps) {
	return (
		<>
			{path && (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					version="1.1"
					className="pointer-events-none absolute inset-0 z-0 size-full"
				>
					<circle
						className="stroke-black/10 stroke-1 dark:stroke-white/10"
						cx="50%"
						cy="50%"
						r={radius}
						fill="none"
					/>
				</svg>
			)}

			<div
				style={
					{
						"--duration": duration,
						"--radius": radius,
						"--delay": -delay,
						"animationDirection": reverse ? "reverse" : "normal",
					} as React.CSSProperties
				}
				className={cn(
					"animate-orbit absolute z-10 flex size-full transform-gpu items-center justify-center rounded-full border-none [animation-delay:calc(var(--delay)*1000ms)]",
					className
				)}
				{...props}
			>
				{React.Children.map(children, child => {
					if (React.isValidElement(child)) {
						return React.cloneElement(child as React.ReactElement<any>, {
							width: iconSize,
							height: iconSize,
						})
					}
					return child
				})}
			</div>
		</>
	)
}
