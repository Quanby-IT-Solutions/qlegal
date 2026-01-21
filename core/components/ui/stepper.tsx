"use client"

import * as React from "react"
import * as Stepperize from "@stepperize/react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot as SlotPrimitive } from "radix-ui"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

type StepperVariant = "horizontal" | "vertical"
type StepperLabelOrientation = "horizontal" | "vertical"

interface StepperContextConfig {
	variant?: StepperVariant
	labelOrientation?: StepperLabelOrientation
	tracking?: boolean
}

const StepperContext = React.createContext<StepperContextConfig | null>(null)

const useStepperContext = (): StepperContextConfig => {
	const context = React.useContext(StepperContext)
	if (!context) {
		throw new Error("useStepperContext must be used within a StepperProvider.")
	}
	return context
}

const defineStepper = <const Steps extends Stepperize.Step[]>(
	...steps: Steps
): StepperDefineReturn<Steps> => {
	const { Scoped, useStepper, ...rest } = Stepperize.defineStepper(...steps)

	const StepperContainer = ({
		children,
		className,
		...props
	}: Omit<React.ComponentProps<"div">, "children"> & {
		children: React.ReactNode | ((props: { methods: Stepperize.Stepper<Steps> }) => React.ReactNode)
	}) => {
		const methods = useStepper()
		return (
			<div data-component="stepper" className={cn("w-full", className)} {...props}>
				{typeof children === "function" ? children({ methods }) : children}
			</div>
		)
	}

	const StepperProvider = ({
		variant = "horizontal",
		labelOrientation = "horizontal",
		tracking = false,
		children,
		className,
		...props
	}: Omit<Stepperize.ScopedProps<Steps>, "children"> &
		Omit<React.ComponentProps<"div">, "children"> &
		StepperContextConfig & {
			children:
				| React.ReactNode
				| ((props: { methods: Stepperize.Stepper<Steps> }) => React.ReactNode)
		}) => {
		return (
			<StepperContext.Provider value={{ variant, labelOrientation, tracking }}>
				<Scoped initialStep={props.initialStep} initialMetadata={props.initialMetadata}>
					<StepperContainer className={className} {...props}>
						{children}
					</StepperContainer>
				</Scoped>
			</StepperContext.Provider>
		)
	}

	const StepperNavigation = ({
		children,
		"aria-label": ariaLabel = "Stepper Navigation",
		...props
	}: React.ComponentProps<"nav">) => {
		const { variant } = useStepperContext()
		return (
			<nav data-component="stepper-navigation" aria-label={ariaLabel} role="tablist" {...props}>
				<ol
					data-component="stepper-navigation-list"
					className={classForNavigationList({ variant })}
				>
					{children}
				</ol>
			</nav>
		)
	}

	const HorizontalStep = React.memo(
		({
			children,
			icon,
			...props
		}: React.ComponentProps<"button"> & {
			of: Stepperize.Get.Id<Steps>
			icon?: React.ReactNode
		}) => {
			const { labelOrientation } = useStepperContext()
			const { current } = useStepper()
			const utils = rest.utils
			const stepsList = rest.steps
			const stepIndex = utils.getIndex(props.of)
			const step = stepsList[stepIndex]
			const currentIndex = utils.getIndex(current.id)
			const isLast = utils.getLast().id === props.of
			const isActive = current.id === props.of
			const dataState = getStepState(currentIndex, stepIndex)
			const childMap = useStepChildren(children)
			const title = childMap.get("title")
			const description = childMap.get("description")

			return (
				<>
					<li
						data-component="stepper-step"
						className={cn([
							"group peer relative flex flex-col items-center gap-1",
							"data-[label-orientation=vertical]:w-full",
							"data-[label-orientation=vertical]:justify-center",
						])}
						data-label-orientation={labelOrientation}
						data-state={dataState}
						data-disabled={props.disabled}
					>
						<Button
							id={`step-${step?.id}`}
							data-component="stepper-step-indicator"
							type="button"
							role="tab"
							tabIndex={dataState !== "inactive" ? 0 : -1}
							className="size-8 rounded-full text-sm"
							variant={dataState !== "inactive" ? "default" : "secondary"}
							size="icon"
							aria-controls={`step-panel-${props.of}`}
							aria-current={isActive ? "step" : undefined}
							aria-posinset={stepIndex + 1}
							aria-setsize={stepsList.length}
							aria-selected={isActive}
							onKeyDown={e => onStepKeyDown(e, utils.getNext(props.of), utils.getPrev(props.of))}
							{...props}
						>
							{icon ?? stepIndex + 1}
						</Button>
						<div
							data-component="stepper-step-content"
							className={cn(
								"flex flex-col items-center text-center",
								dataState !== "active" && "text-muted-foreground"
							)}
						>
							{title}
							{description}
						</div>
					</li>
					{labelOrientation === "horizontal" && (
						<StepperSeparator isLast={isLast} state={dataState} disabled={props.disabled} />
					)}
				</>
			)
		}
	)

	HorizontalStep.displayName = "HorizontalStep"

	const VerticalStep = React.memo(
		({
			children,
			icon,
			...props
		}: React.ComponentProps<"button"> & {
			of: Stepperize.Get.Id<Steps>
			icon?: React.ReactNode
		}) => {
			const { labelOrientation } = useStepperContext()
			const { current } = useStepper()
			const utils = rest.utils
			const stepsList = rest.steps
			const stepIndex = utils.getIndex(props.of)
			const step = stepsList[stepIndex]
			const currentIndex = utils.getIndex(current.id)
			const isLast = utils.getLast().id === props.of
			const isActive = current.id === props.of
			const dataState = getStepState(currentIndex, stepIndex)
			const childMap = useStepChildren(children)
			const title = childMap.get("title")
			const description = childMap.get("description")
			const panel = childMap.get("panel")

			return (
				<>
					<li
						data-component="stepper-step"
						className={cn(["group peer relative flex flex-row items-center gap-1"])}
						data-label-orientation={labelOrientation}
						data-state={dataState}
						data-disabled={props.disabled}
					>
						<Button
							id={`step-${step?.id}`}
							data-component="stepper-step-indicator"
							type="button"
							role="tab"
							tabIndex={dataState !== "inactive" ? 0 : -1}
							className="size-8 shrink-0 rounded-full text-sm"
							variant={dataState !== "inactive" ? "default" : "secondary"}
							size="icon"
							aria-controls={`step-panel-${props.of}`}
							aria-current={isActive ? "step" : undefined}
							aria-posinset={stepIndex + 1}
							aria-setsize={stepsList.length}
							aria-selected={isActive}
							onKeyDown={e => onStepKeyDown(e, utils.getNext(props.of), utils.getPrev(props.of))}
							{...props}
						>
							{icon ?? stepIndex + 1}
						</Button>
						<div
							data-component="stepper-step-content"
							className={cn(
								"flex flex-col items-start gap-1",
								dataState !== "active" && "text-muted-foreground"
							)}
						>
							{title}
							{description}
						</div>
					</li>
					{!isLast && (
						<div className="flex gap-4">
							<div className="flex justify-center ps-[calc(var(--spacing)*4.5-1px)]">
								<StepperSeparator
									isLast={isLast}
									state={dataState}
									disabled={props.disabled}
									orientation="vertical"
								/>
							</div>
							<div className="my-3 flex-1 ps-4">{panel}</div>
						</div>
					)}
				</>
			)
		}
	)

	VerticalStep.displayName = "VerticalStep"

	const StepperStep = ({
		children,
		className,
		icon,
		...props
	}: React.ComponentProps<"button"> & {
		of: Stepperize.Get.Id<Steps>
		icon?: React.ReactNode
	}) => {
		const { variant } = useStepperContext()

		if (variant === "vertical") {
			return (
				<VerticalStep className={className} icon={icon} {...props}>
					{children}
				</VerticalStep>
			)
		}

		return (
			<HorizontalStep className={className} icon={icon} {...props}>
				{children}
			</HorizontalStep>
		)
	}

	const StepperTitle = ({
		children,
		className,
		asChild,
		...props
	}: React.ComponentProps<"h4"> & { asChild?: boolean }) => {
		const Comp = asChild ? SlotPrimitive.Slot : "h4"
		return (
			<Comp
				data-component="stepper-step-title"
				className={cn("text-sm font-medium", className)}
				{...props}
			>
				{children}
			</Comp>
		)
	}

	StepperTitle.displayName = "StepperTitle"

	const StepperDescription = ({
		children,
		className,
		asChild,
		...props
	}: React.ComponentProps<"p"> & { asChild?: boolean }) => {
		const Comp = asChild ? SlotPrimitive.Slot : "p"
		return (
			<Comp
				data-component="stepper-step-description"
				className={cn("text-muted-foreground text-sm", className)}
				{...props}
			>
				{children}
			</Comp>
		)
	}

	StepperDescription.displayName = "StepperDescription"

	const StepperPanel = ({
		children,
		asChild,
		...props
	}: React.ComponentProps<"div"> & { asChild?: boolean }) => {
		const Comp = asChild ? SlotPrimitive.Slot : "div"
		const { tracking } = useStepperContext()
		return (
			<Comp
				data-component="stepper-step-panel"
				ref={node => scrollIntoStepperPanel(node, tracking)}
				{...props}
			>
				{children}
			</Comp>
		)
	}

	const StepperControls = ({
		children,
		className,
		asChild,
		...props
	}: React.ComponentProps<"div"> & { asChild?: boolean }) => {
		const Comp = asChild ? SlotPrimitive.Slot : "div"
		return (
			<Comp
				data-component="stepper-controls"
				className={cn("flex justify-end gap-4", className)}
				{...props}
			>
				{children}
			</Comp>
		)
	}

	return {
		...rest,
		useStepper,
		StepperProvider,
		StepperNavigation,
		StepperStep,
		StepperTitle,
		StepperDescription,
		StepperPanel,
		StepperControls,
	}
}

const StepperSeparator = ({
	orientation = "horizontal",
	isLast,
	labelOrientation,
	state,
	disabled,
}: {
	isLast: boolean
	state: string
	orientation?: "horizontal" | "vertical"
	disabled?: boolean
} & VariantProps<typeof classForSeparator>) => {
	if (isLast) {
		return null
	}
	return (
		<div
			data-component="stepper-separator"
			data-orientation={orientation}
			data-state={state}
			data-disabled={disabled}
			role="separator"
			tabIndex={-1}
			className={classForSeparator({ orientation, labelOrientation })}
		/>
	)
}

const classForNavigationList = cva("flex", {
	variants: {
		variant: {
			horizontal: "flex-row items-center gap-0",
			vertical: "flex-col gap-2",
		},
	},
})

const classForSeparator = cva(
	[
		"bg-muted",
		"data-[state=completed]:bg-primary data-[disabled]:opacity-50",
		"transition-all duration-300 ease-in-out",
	],
	{
		variants: {
			orientation: {
				horizontal: "h-0.5 flex-1",
				vertical: "h-full w-0.5",
			},
			labelOrientation: {
				vertical: "absolute left-[calc(50%+30px)] right-[calc(-50%+20px)] top-5 block shrink-0",
			},
		},
	}
)

function scrollIntoStepperPanel(node: HTMLDivElement | null, tracking?: boolean) {
	if (tracking) {
		node?.scrollIntoView({ behavior: "smooth", block: "center" })
	}
}

const useStepChildren = (children: React.ReactNode) => {
	return React.useMemo(() => extractChildren(children), [children])
}

const extractChildren = (children: React.ReactNode) => {
	const childrenArray = React.Children.toArray(children)
	const map = new Map<string, React.ReactNode>()

	for (const child of childrenArray) {
		if (React.isValidElement(child)) {
			const childType = child.type as React.FC & { displayName?: string }
			if (childType?.displayName === "StepperTitle") {
				map.set("title", child)
			} else if (childType?.displayName === "StepperDescription") {
				map.set("description", child)
			} else {
				map.set("panel", child)
			}
		}
	}
	return map
}

const onStepKeyDown = (
	e: React.KeyboardEvent<HTMLButtonElement>,
	nextStep: Stepperize.Step,
	prevStep: Stepperize.Step
) => {
	const { key } = e
	const directions = {
		next: ["ArrowRight", "ArrowDown"],
		prev: ["ArrowLeft", "ArrowUp"],
	}

	if (directions.next.includes(key) || directions.prev.includes(key)) {
		const direction = directions.next.includes(key) ? "next" : "prev"
		const step = direction === "next" ? nextStep : prevStep

		if (!step) {
			return
		}

		const stepElement = document.getElementById(`step-${step.id}`)
		if (!stepElement) {
			return
		}

		const isActive = stepElement.parentElement?.getAttribute("data-state") !== "inactive"
		if (isActive || direction === "prev") {
			stepElement.focus()
		}
	}
}

const getStepState = (currentIndex: number, stepIndex: number) => {
	if (currentIndex === stepIndex) {
		return "active"
	}
	if (currentIndex > stepIndex) {
		return "completed"
	}
	return "inactive"
}

type StepperDefineReturn<Steps extends Stepperize.Step[]> = Omit<
	Stepperize.StepperReturn<Steps>,
	"Scoped"
> & {
	StepperProvider: (
		props: Omit<Stepperize.ScopedProps<Steps>, "children"> &
			Omit<React.ComponentProps<"div">, "children"> &
			StepperContextConfig & {
				children:
					| React.ReactNode
					| ((props: { methods: Stepperize.Stepper<Steps> }) => React.ReactNode)
			}
	) => React.ReactElement
	StepperNavigation: (props: React.ComponentProps<"nav">) => React.ReactElement
	StepperStep: (
		props: React.ComponentProps<"button"> & {
			of: Stepperize.Get.Id<Steps>
			icon?: React.ReactNode
		}
	) => React.ReactElement
	StepperTitle: (props: React.ComponentProps<"h4"> & { asChild?: boolean }) => React.ReactElement
	StepperDescription: (
		props: React.ComponentProps<"p"> & { asChild?: boolean }
	) => React.ReactElement
	StepperPanel: (props: React.ComponentProps<"div"> & { asChild?: boolean }) => React.ReactElement
	StepperControls: (
		props: React.ComponentProps<"div"> & { asChild?: boolean }
	) => React.ReactElement
}

export { defineStepper }
