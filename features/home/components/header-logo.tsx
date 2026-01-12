"use client"

import { motion } from "motion/react"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { cn } from "@/core/lib/utils"

type HeaderLogoProps = {
	size?: "centered" | "navbar"
	draw?: boolean
	text?: string
	isCentered?: boolean
}

export function HeaderLogo({
	size = "navbar",
	draw = false,
	text = "Quanby Legal",
	isCentered = false,
}: HeaderLogoProps) {
	const isLarge = size === "centered"

	return (
		<div className={cn("flex items-center gap-3", isCentered && "flex-col")}>
			<motion.div
				initial={draw ? { pathLength: 0, opacity: 0 } : false}
				animate={draw ? { pathLength: 1, opacity: 1 } : false}
				transition={
					draw
						? {
								pathLength: { duration: 2, ease: "easeInOut" },
								opacity: { duration: 0.5 },
							}
						: undefined
				}
			>
				<QuanbyLogo className={cn(isLarge ? "h-24 w-24" : "h-8 w-8")} />
			</motion.div>

			<motion.span
				initial={draw ? { opacity: 0, y: 20 } : false}
				animate={draw ? { opacity: 1, y: 0 } : false}
				transition={draw ? { delay: 1, duration: 0.8 } : undefined}
				className={cn(
					"from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text leading-tight font-bold tracking-tight text-transparent",
					isLarge ? "text-4xl md:text-5xl" : "text-xl",
					isCentered && "text-center"
				)}
			>
				{text}
			</motion.span>
		</div>
	)
}
