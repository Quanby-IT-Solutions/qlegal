"use client"

import { useEffect, useState } from "react"

import { ElegantShape } from "@/core/components/elegant-shape"

type Shape = {
	key: string
	width: number
	height: number
	rotate: number
	borderRadius: number
	delay: number
	gradient: string
	style: React.CSSProperties
}

const GRADIENTS = [
	"from-indigo-500/[0.65] dark:from-indigo-500/[0.45]",
	"from-rose-500/[0.65] dark:from-rose-500/[0.45]",
	"from-violet-500/[0.65] dark:from-violet-500/[0.45]",
	"from-amber-500/[0.65] dark:from-amber-500/[0.45]",
	"from-emerald-500/[0.65] dark:from-emerald-500/[0.45]",
	"from-blue-500/[0.65] dark:from-blue-500/[0.45]",
	"from-purple-500/[0.65] dark:from-purple-500/[0.45]",
	"from-teal-500/[0.65] dark:from-teal-500/[0.45]",
	"from-sky-500/[0.65] dark:from-sky-500/[0.45",
]

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

function generateShapes(): Shape[] {
	const count = rand(7, 10)

	return Array.from({ length: count }).map((_, i) => {
		const width = pick([150, 200, 250, 300, 350, 400, 450, 600])
		const height = pick([80, 120, 150, 200, 250, 300, 400, 500])
		const rotate = rand(-40, 40)
		const borderRadius = pick([8, 12, 16, 18, 20, 24, 28, 32])
		const delay = Number((Math.random() * 0.9 + 0.1).toFixed(2))
		const gradient = pick(GRADIENTS)

		const topOrBottom = Math.random() > 0.5 ? "top" : "bottom"
		const leftOrRight = Math.random() > 0.5 ? "left" : "right"
		const pos = {
			[topOrBottom]: `${rand(-15, 75)}%`,
			[leftOrRight]: `${rand(-20, 75)}%`,
		} as React.CSSProperties

		return {
			key: `shape-${i}`,
			width,
			height,
			rotate,
			borderRadius,
			delay,
			gradient,
			style: { position: "absolute", ...pos },
		}
	})
}

export default function ShapesContainer({ children }: { children: React.ReactNode }) {
	const [shapes, setShapes] = useState<Shape[] | null>(null)

	useEffect(() => {
		if (shapes === null) {
			setShapes(generateShapes())
		}
	}, [shapes])

	return (
		<div className="relative flex min-h-screen w-full justify-center overflow-x-hidden">
			<div
				className="from-background via-background to-muted/20 pointer-events-none absolute inset-0 z-0 flex flex-col bg-gradient-to-br blur-3xl"
				aria-hidden="true"
			/>

			<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
				{shapes?.map(s => (
					<div key={s.key} style={s.style}>
						<ElegantShape
							delay={s.delay}
							width={s.width}
							height={s.height}
							rotate={s.rotate}
							borderRadius={s.borderRadius}
							gradient={s.gradient}
						/>
					</div>
				))}
			</div>

			<div className="relative isolate z-20 w-full">{children}</div>
		</div>
	)
}
