"use client"

import * as React from "react"
import { Slot as SlotPrimitive } from "radix-ui"

import { cn } from "@/core/lib/utils"

interface DisclosureContextValue {
	open: boolean
	toggle: () => void
	orientation: "vertical" | "horizontal"
}

const DisclosureContext = React.createContext<
	DisclosureContextValue | undefined
>(undefined)

interface DisclosureProps {
	ref?: React.Ref<HTMLDivElement>
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?: (open: boolean) => void
	orientation?: "vertical" | "horizontal"
	className?: string
	children: React.ReactNode
	asChild?: boolean
}

export function Disclosure({
	ref,
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange,
	orientation = "vertical",
	className,
	children,
	asChild = false
}: DisclosureProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
	const isControlled = controlledOpen !== undefined
	const open = isControlled ? controlledOpen : uncontrolledOpen
	const Comp = asChild ? SlotPrimitive.Slot : "div"

	const toggle = React.useCallback(() => {
		const newOpen = !open
		if (!isControlled) {setUncontrolledOpen(newOpen)}
		onOpenChange?.(newOpen)
	}, [open, isControlled, onOpenChange])

	return (
		<DisclosureContext.Provider value={{ open, toggle, orientation }}>
			<Comp
				ref={ref}
				data-state={open ? "open" : "closed"}
				className={cn(
					"flex",
					orientation === "vertical"
						? "w-full flex-col"
						: "h-full w-fit flex-row",
					className
				)}
			>
				{children}
			</Comp>
		</DisclosureContext.Provider>
	)
}

export function useDisclosure() {
	const context = React.useContext(DisclosureContext)
	if (!context) {
		throw new Error("useDisclosure must be used within a Disclosure component")
	}
	return context
}

interface DisclosureTriggerProps extends React.HTMLAttributes<HTMLElement> {
	ref?: React.Ref<HTMLElement>
	asChild?: boolean
}

export function DisclosureTrigger({
	ref,
	asChild = false,
	className,
	children,
	...props
}: DisclosureTriggerProps) {
	const { toggle, open } = useDisclosure()
	const Comp = asChild ? SlotPrimitive.Slot : "button"

	const handleClick = React.useCallback(
		(event: React.MouseEvent<HTMLElement>) => {
			toggle()
			props.onClick?.(event)
		},
		[toggle, props]
	)

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLElement>) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault()
				toggle()
			}
			props.onKeyDown?.(event)
		},
		[props, toggle]
	)

	return (
		<Comp
			ref={ref as React.Ref<HTMLButtonElement>}
			type={!asChild ? "button" : undefined}
			aria-expanded={open}
			data-state={open ? "open" : "closed"}
			className={cn(
				"rounded-md ring-offset-background transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				"disabled:pointer-events-none disabled:opacity-50",
				className
			)}
			{...props}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
		>
			{children}
		</Comp>
	)
}

interface DisclosureContentProps extends React.HTMLAttributes<HTMLDivElement> {
	ref?: React.Ref<HTMLDivElement>
	forceMount?: boolean
}

export function DisclosureContent({
	ref,
	className,
	children,
	asChild = false,
	...props
}: DisclosureContentProps & { asChild?: boolean }) {
	const { open, orientation } = useDisclosure()
	const contentRef = React.useRef<HTMLDivElement>(null)
	const [size, setSize] = React.useState(0)
	const Comp = asChild ? SlotPrimitive.Slot : "div"

	React.useLayoutEffect(() => {
		const element = contentRef.current
		if (!element) {return}

		const updateSize = () => {
			const newSize =
				orientation === "vertical" ? element.scrollHeight : element.scrollWidth
			setSize(newSize)
		}

		updateSize()

		const resizeObserver = new ResizeObserver(updateSize)
		resizeObserver.observe(element)

		return () => resizeObserver.disconnect()
	}, [orientation, children])

	const isVertical = orientation === "vertical"
	const animationStyle = React.useMemo(() => {
		if (isVertical) {
			return {
				height: open ? size : 0,
				overflow: "hidden" as const
			}
		}

		return {
			width: open ? size : 0,
			overflow: "hidden" as const
		}
	}, [open, size, isVertical])

	return (
		<Comp
			style={animationStyle}
			className={cn("transition-all duration-200 ease-out", className)}
			data-state={open ? "open" : "closed"}
			{...props}
		>
			<div ref={contentRef} className={cn(isVertical ? "w-full" : "h-full")}>
				<div ref={ref}>{children}</div>
			</div>
		</Comp>
	)
}
