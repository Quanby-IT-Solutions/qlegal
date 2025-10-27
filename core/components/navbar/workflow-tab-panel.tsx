"use client"

import { useEffect, useState } from "react"
import { type LucideIcon } from "lucide-react"

import {
	SidebarGroup,
	SidebarGroupLabel,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { Highlight, HighlightItem } from "@/core/components/animate-ui/primitives/effects/highlight"
import { TransitionPanel } from "@/core/components/ui-motion/transition-panel"
import { cn } from "@/core/lib/utils"

type WorkflowTabItem<T extends string> = {
	value: T
	label: string
	icon: LucideIcon
}

type WorkflowTabPanelProps<T extends string> = {
	tabs: WorkflowTabItem<T>[]
	defaultValue: T
	cookieName?: string
	cookieMaxAge?: number
	onValueChange?: (value: T) => void
	children: (value: T) => React.ReactNode
	className?: string
}

export function WorkflowTabPanel<T extends string>({
	tabs,
	defaultValue,
	cookieName,
	cookieMaxAge = 60 * 60 * 24 * 180, // ~180 days default
	onValueChange,
	children,
	className,
}: WorkflowTabPanelProps<T>) {
	const { state: sidebarState } = useSidebar()
	const [activeValue, setActiveValue] = useState<T>(defaultValue)
	const [previousValue, setPreviousValue] = useState<T>(defaultValue)

	// Initialize from cookie and keep it in sync
	useEffect(() => {
		if (!cookieName) return

		const match = document.cookie.split("; ").find(row => row.startsWith(`${cookieName}=`))
		const value = match?.split("=")[1]
		if (value && tabs.some(tab => tab.value === value)) {
			setActiveValue(value as T)
		}
	}, [cookieName, tabs])

	const handleValueChange = (value: T) => {
		setPreviousValue(activeValue)
		setActiveValue(value)
		onValueChange?.(value)

		// Persist to cookie
		if (cookieName) {
			document.cookie = `${cookieName}=${value}; Path=/; Max-Age=${cookieMaxAge}`
		}
	}

	// Calculate direction for animation
	const direction =
		activeValue === defaultValue
			? previousValue === tabs.find(t => t.value !== defaultValue)?.value
				? -1
				: 0
			: previousValue === defaultValue
				? 1
				: 0

	// Define transition variants
	const variants = {
		enter: (dir: number) => ({
			x: sidebarState === "collapsed" ? 0 : dir > 0 ? 300 : -300,
			y: sidebarState === "collapsed" ? (dir > 0 ? 100 : -100) : 0,
			opacity: 0,
			filter: "blur(4px)",
		}),
		center: {
			x: 0,
			y: 0,
			opacity: 1,
			filter: "blur(0px)",
		},
		exit: (dir: number) => ({
			x: sidebarState === "collapsed" ? 0 : dir < 0 ? 300 : -300,
			y: sidebarState === "collapsed" ? (dir < 0 ? 100 : -100) : 0,
			opacity: 0,
			filter: "blur(4px)",
		}),
	}

	const activeIndex = tabs.findIndex(tab => tab.value === activeValue)

	return (
		<div className={className}>
			{/* Tab Header */}
			<SidebarGroup>
				<SidebarGroupLabel>Workflow</SidebarGroupLabel>
				<Highlight
					controlledItems
					value={activeValue}
					transition={{ type: "spring", stiffness: 200, damping: 25 }}
					click={false}
					className="bg-background dark:border-input dark:bg-input/30 absolute inset-0 z-0 rounded-md border border-transparent shadow-sm"
				>
					<div className="bg-muted text-muted-foreground grid h-9 w-full grid-cols-2 items-center justify-center rounded-lg p-[3px]">
						{tabs.map(tab => (
							<HighlightItem key={tab.value} value={tab.value}>
								<button
									onClick={() => handleValueChange(tab.value)}
									className={cn(
										"data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground inline-flex h-[calc(100%-1px)] w-full flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-500 ease-in-out focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
										"flex items-center gap-2"
									)}
								>
									<tab.icon className="size-4" />
									<span>{tab.label}</span>
								</button>
							</HighlightItem>
						))}
					</div>
				</Highlight>
			</SidebarGroup>

			{/* Animated Content */}
			<TransitionPanel
				activeIndex={activeIndex}
				variants={variants}
				custom={direction}
				transition={{ duration: 0.3, ease: "easeInOut" }}
			>
				{tabs.map(tab => (
					<div key={tab.value}>{children(tab.value)}</div>
				))}
			</TransitionPanel>
		</div>
	)
}
