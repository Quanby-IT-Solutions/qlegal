"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import { motion, type Transition, type Variants } from "motion/react"

import { cn } from "@/core/lib/utils"

const BUTTON_MOTION_CONFIG = {
	initial: "rest",
	whileHover: "hover",
	whileTap: "tap",
	variants: {
		rest: { maxWidth: "40px" },
		hover: {
			maxWidth: "140px",
			transition: { type: "spring", stiffness: 200, damping: 35, delay: 0.15 },
		},
		tap: { scale: 0.95 },
	},
	transition: { type: "spring", stiffness: 250, damping: 25 },
} as const

const LABEL_VARIANTS: Variants = {
	rest: { opacity: 0, x: 4 },
	hover: { opacity: 1, x: 0, visibility: "visible" },
	tap: { opacity: 1, x: 0, visibility: "visible" },
}

const LABEL_TRANSITION: Transition = {
	type: "spring",
	stiffness: 200,
	damping: 25,
}

export interface ActionButtonProps {
	href: string
	title?: string
	label: string
	Icon: ComponentType<{ className?: string }>
	disabled: boolean
	onClick?: () => void
}

export const ActionButton = ({
	href,
	title,
	label,
	Icon,
	disabled,
	onClick,
}: ActionButtonProps) => {
	const baseButtonClass =
		"flex h-10 items-center space-x-2 overflow-hidden whitespace-nowrap rounded-lg border bg-white/90 shadow-sm backdrop-blur-sm px-2.5 py-2 text-foreground hover:bg-white/95 dark:border-white/10 dark:bg-muted/90 dark:text-foreground dark:hover:bg-muted/95"

	return (
		<Link
			// @ts-expect-error - bypass Next.js 15.5 typed route
			href={href}
			onClick={e => {
				if (disabled) {
					e.preventDefault()
				}
				onClick?.()
			}}
			aria-disabled={disabled}
			title={title ?? label}
			tabIndex={-1}
		>
			<motion.div
				{...BUTTON_MOTION_CONFIG}
				className={cn(
					baseButtonClass,
					"ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				)}
			>
				<Icon className="text-muted-foreground h-4 w-4 shrink-0" />
				<motion.span
					variants={LABEL_VARIANTS}
					transition={LABEL_TRANSITION}
					className="invisible text-sm"
				>
					<span className="text-sm">{label}</span>
				</motion.span>
			</motion.div>
		</Link>
	)
}
