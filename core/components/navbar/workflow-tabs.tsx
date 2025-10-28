"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { type LucideIcon } from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import {
	SidebarGroup,
	SidebarGroupLabel,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/animate-ui/components/radix/tabs"
import {
	TabsHighlight,
	TabsHighlightItem,
} from "@/core/components/animate-ui/primitives/radix/tabs"
import { TransitionPanel } from "@/core/components/ui-motion/transition-panel"
import { cn } from "@/core/lib/utils"

type WorkflowTabItem<T extends string> = {
	value: T
	label: string
	icon: LucideIcon
}

type WorkflowTabsProps<T extends string> = Omit<React.ComponentProps<typeof Tabs>, "children"> & {
	tabs: WorkflowTabItem<T>[]
	defaultValue: T
	cookieName?: string
	cookieMaxAge?: number
	onValueChange?: (value: T) => void
	children: (value: T) => React.ReactNode
	className?: string
}

type WorkflowTabsListProps = React.ComponentProps<typeof TabsList> & {
	className?: string
}

type WorkflowTabsTriggerProps<T extends string> = React.ComponentProps<typeof TabsTrigger> & {
	tab: WorkflowTabItem<T>
	className?: string
}

type WorkflowTabsContentProps<T extends string> = {
	tabs: WorkflowTabItem<T>[]
	activeValue: T
	children: (value: T) => React.ReactNode
	className?: string
}

function WorkflowTabsList({ className, ...props }: WorkflowTabsListProps) {
	const { state: sidebarState } = useSidebar()

	return (
		<TabsList
			data-slot="workflow-tabs-list"
			className={cn(
				"bg-muted text-muted-foreground rounded-lg p-[3px]",
				sidebarState === "collapsed"
					? "inline-flex h-16 w-9 flex-col items-center justify-center"
					: "flex h-9 w-full flex-row items-center justify-center",
				className
			)}
			{...props}
		/>
	)
}

function WorkflowTabsTrigger({ tab, className, ...props }: WorkflowTabsTriggerProps<string>) {
	const { state: sidebarState } = useSidebar()

	if (sidebarState === "collapsed") {
		return (
			<Tooltip side="right" align="center">
				<TooltipTrigger asChild>
					<TabsTrigger
						data-slot="workflow-tabs-trigger"
						className={cn(
							"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex h-[calc(100%-1px)] w-full flex-1 cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-500 ease-in-out focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
							className
						)}
						{...props}
					>
						<tab.icon className="size-4" />
					</TabsTrigger>
				</TooltipTrigger>
				<TooltipContent>
					<p>{tab.label}</p>
				</TooltipContent>
			</Tooltip>
		)
	}

	return (
		<TabsTrigger
			data-slot="workflow-tabs-trigger"
			className={cn(
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-muted-foreground data-[state=active]:text-foreground flex h-[calc(100%-1px)] w-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors duration-500 ease-in-out focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			<tab.icon className="size-4" />
			<span>{tab.label}</span>
		</TabsTrigger>
	)
}

const WorkflowTabsContent = <T extends string>({
	tabs,
	activeValue,
	children,
	className,
}: WorkflowTabsContentProps<T>) => {
	const { state: sidebarState } = useSidebar()
	const [previousValue, setPreviousValue] = useState<T>(activeValue)

	// Update previousValue when activeValue changes
	useEffect(() => {
		setPreviousValue(activeValue)
	}, [activeValue])

	// Calculate direction for animation
	const direction =
		activeValue === tabs[0]?.value
			? previousValue === tabs.find(t => t.value !== activeValue)?.value
				? -1
				: 0
			: previousValue === tabs[0]?.value
				? 1
				: 0

	// Define transition variants
	const variants = {
		enter: (dir: number) => ({
			x: sidebarState === "collapsed" ? 0 : dir > 0 ? 300 : -300,
			y: sidebarState === "collapsed" ? (dir > 0 ? 100 : -100) : 0,
			opacity: 0,
			filter: "blur(8px)",
			scale: 0.95,
		}),
		center: {
			x: 0,
			y: 0,
			opacity: 1,
			filter: "blur(0px)",
			scale: 1,
		},
		exit: (dir: number) => ({
			x: sidebarState === "collapsed" ? 0 : dir < 0 ? 300 : -300,
			y: sidebarState === "collapsed" ? (dir < 0 ? 100 : -100) : 0,
			opacity: 0,
			filter: "blur(8px)",
			scale: 0.95,
		}),
	}

	const activeIndex = tabs.findIndex(tab => tab.value === activeValue)

	return (
		<TransitionPanel
			activeIndex={activeIndex}
			variants={variants}
			custom={direction}
			transition={{
				duration: 0.4,
				ease: [0.4, 0, 0.2, 1],
				opacity: { duration: 0.3 },
				filter: { duration: 0.3 },
				scale: { duration: 0.35 },
			}}
			className={className}
		>
			{tabs.map(tab => (
				<div key={tab.value}>{children(tab.value)}</div>
			))}
		</TransitionPanel>
	)
}

function WorkflowTabs<T extends string>({
	tabs,
	defaultValue,
	cookieName,
	cookieMaxAge = 60 * 60 * 24 * 180, // ~180 days default
	onValueChange,
	children,
	className,
	...props
}: WorkflowTabsProps<T>) {
	const { state: sidebarState } = useSidebar()
	const [activeValue, setActiveValue] = useState<T>(defaultValue)

	// Initialize from cookie and keep it in sync
	useEffect(() => {
		if (!cookieName) return

		const match = document.cookie.split("; ").find(row => row.startsWith(`${cookieName}=`))
		const value = match?.split("=")[1]
		if (value && tabs.some(tab => tab.value === value)) {
			setActiveValue(value as T)
		}
	}, [cookieName, tabs])

	const handleValueChange = (value: string) => {
		const typedValue = value as T
		setActiveValue(typedValue)
		onValueChange?.(typedValue)

		// Persist to cookie
		if (cookieName) {
			document.cookie = `${cookieName}=${value}; Path=/; Max-Age=${cookieMaxAge}`
		}
	}

	return (
		<div className={cn("overflow-x-hidden", className)}>
			<Tabs
				value={activeValue}
				onValueChange={handleValueChange}
				data-slot="workflow-tabs"
				className="gap-0"
				{...props}
			>
				{/* Tab Header */}
				<SidebarGroup className="group-data-[collapsible=icon]:p-[6px]">
					<SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
						Workflow
					</SidebarGroupLabel>
					<TabsHighlight
						className={cn(
							"bg-background dark:border-input dark:bg-input/30 absolute inset-0 z-0 rounded-md border border-transparent shadow-sm",
							sidebarState === "collapsed" ? "ml-0.5 h-18 w-9 p-1" : "w-full p-0"
						)}
					>
						<WorkflowTabsList>
							{tabs.map(tab => (
								<TabsHighlightItem
									key={tab.value}
									value={tab.value}
									className={cn(sidebarState === "collapsed" ? "w-full" : "w-full flex-1")}
								>
									<WorkflowTabsTrigger tab={tab} value={tab.value} />
								</TabsHighlightItem>
							))}
						</WorkflowTabsList>
					</TabsHighlight>
				</SidebarGroup>

				{/* Animated Content */}
				<WorkflowTabsContent tabs={tabs} activeValue={activeValue}>
					{children}
				</WorkflowTabsContent>
			</Tabs>
		</div>
	)
}

export { WorkflowTabs, WorkflowTabsList, WorkflowTabsTrigger, WorkflowTabsContent }
export type { WorkflowTabsProps, WorkflowTabItem }
