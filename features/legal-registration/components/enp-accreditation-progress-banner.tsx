"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { ArrowRight, Check, ChevronDown, Clock, X } from "lucide-react"

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/core/components/animate-ui/components/animate/tooltip"
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/core/components/animate-ui/components/radix/sidebar"
import { Button } from "@/core/components/ui/button"
import { Card } from "@/core/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Progress } from "@/core/components/ui/progress"

import { trpc } from "@/services/trpc/client"

const STEPS = [
	"Start the ENP accreditation journey",
	"Complete the LMS course",
	"Return to QLegal and submit your application",
	"Submit your certificate/credentials to the Supreme Court",
	"Wait for Supreme Court accreditation (we activate your commission after approval)",
] as const

function getCurrentStepIndex(applicationStatus: string | null | undefined): number {
	switch (applicationStatus) {
		case "DRAFT":
			return 2
		case "PENDING":
		case "UNDER_REVIEW":
			return 4
		case "APPROVED":
			return 4
		case "REJECTED":
			return 2
		default:
			return 0
	}
}

type EnpAccreditationProgressBannerProps = {
	variant?: "sidebar" | "page"
}

type StepState = "completed" | "current" | "upcoming" | "not_tracked"

function getStepStateLabel(state: StepState) {
	switch (state) {
		case "completed":
			return "Completed"
		case "current":
			return "Current"
		case "upcoming":
			return "Upcoming"
		case "not_tracked":
			return "Not tracked"
	}
}

function getStepStateIcon(state: StepState) {
	if (state === "completed") return <Check className="size-3" />
	return <span className="size-1.5 rounded-full bg-current opacity-70" />
}

function getStepStateClasses(state: StepState) {
	switch (state) {
		case "completed":
			return "bg-primary text-primary-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full"
		case "current":
			return "border-primary mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border"
		case "not_tracked":
			return "border-muted-foreground/40 text-muted-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed"
		case "upcoming":
			return "border-muted-foreground/30 text-muted-foreground mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border"
	}
}

function StepList({
	currentStepIndex,
	stepStates,
}: {
	currentStepIndex: number
	stepStates: StepState[]
}) {
	return (
		<ul className="space-y-2">
			{STEPS.map((label, idx) => {
				const state: StepState = stepStates[idx] ?? (idx === currentStepIndex ? "current" : "upcoming")

				return (
					<li key={label} className="flex items-start gap-2">
						<span
							className={getStepStateClasses(state)}
							aria-hidden="true"
						>
							{getStepStateIcon(state)}
						</span>

						<div className="min-w-0">
							<p
								className={
									state === "current"
										? "text-sm font-medium"
										: state === "upcoming" || state === "not_tracked"
											? "text-muted-foreground text-sm"
											: "text-sm"
								}
							>
								{label}
							</p>
							<p className="text-muted-foreground mt-0.5 text-xs">
								{getStepStateLabel(state)}
							</p>
						</div>
					</li>
				)
			})}
		</ul>
	)
}

export function EnpAccreditationProgressBanner({
	variant = "page",
}: EnpAccreditationProgressBannerProps) {
	const { state: sidebarState } = useSidebar()
	const [sidebarDialogOpen, setSidebarDialogOpen] = useState(false)
	const [sidebarStepsOpen, setSidebarStepsOpen] = useState(false)

	const { data: session } = useSession()
	const isAuth = Boolean(session?.user?.id)
	const pathname = usePathname()

	const { data: application } = trpc.legalRegistration.getMyApplication.useQuery(undefined, {
		enabled: isAuth,
		refetchOnWindowFocus: false,
		retry: false,
	})

	const userRole = session?.user?.role
	const userStatus = session?.user?.status

	const [isClient, setIsClient] = useState(false)
	const [isDismissed, setIsDismissed] = useState(false)
	const [isStepsOpen, setIsStepsOpen] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (!isClient) return
		// Same behavior for both sidebar + page:
		// if user navigates (or refreshes), banner comes back.
		setIsDismissed(false)
		setIsStepsOpen(false)
		setSidebarDialogOpen(false)
		setSidebarStepsOpen(false)
	}, [isClient, pathname])

	const shouldShow = useMemo(() => {
		if (!isAuth) return false
		if (userStatus === "SUSPENDED") return false
		if (application && application.status !== "APPROVED") return true
		if (userRole === "ENP" && userStatus && userStatus !== "ACTIVE") return true
		return false
	}, [application, isAuth, userRole, userStatus])

	const stepIndex = useMemo(() => getCurrentStepIndex(application?.status), [application?.status])
	const progressValue = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex])

	const stepStates = useMemo<StepState[]>(() => {
		// IMPORTANT: We do NOT assume earlier steps are completed.
		// Only mark "completed" when we can verify it from QLegal data.
		const states: StepState[] = STEPS.map((_, idx) =>
			idx === stepIndex ? "current" : idx > stepIndex ? "upcoming" : "not_tracked"
		)

		// Step 3 (index 2): "submit your application" is verifiable.
		if (application?.status && application.status !== "DRAFT" && application.status !== "REJECTED") {
			states[2] = "completed"
		}

		// If commission is active, final step is verifiable.
		if (userRole === "ENP" && userStatus === "ACTIVE") {
			states[4] = "completed"
		}

		return states
	}, [application?.status, stepIndex, userRole, userStatus])

	const headline = useMemo(() => {
		if (application?.status === "REJECTED") return "Your ENP application needs updates"
		if (application?.status === "DRAFT") return "Finish your ENP application"
		if (application?.status === "PENDING" || application?.status === "UNDER_REVIEW")
			return "Your ENP application is under review"
		if (userRole === "ENP" && userStatus && userStatus !== "ACTIVE") return "Your ENP commission is pending"
		return "ENP accreditation in progress"
	}, [application?.status, userRole, userStatus])

	const subtext = useMemo(() => {
		if (application?.status === "REJECTED")
			return "Please review the remarks in your application and resubmit."
		if (application?.status === "DRAFT")
			return "Complete the requirements and submit. You can continue using QLegal while you work on this."
		if (application?.status === "PENDING" || application?.status === "UNDER_REVIEW")
			return "You can continue using QLegal. We’ll activate your commission once accreditation is confirmed."
		if (userRole === "ENP" && userStatus && userStatus !== "ACTIVE")
			return "You can continue using QLegal. Commission-only actions will be available once you’re accredited."
		return "You can continue using QLegal while you complete your accreditation requirements."
	}, [application?.status, userRole, userStatus])

	if (!isClient) return null
	if (!shouldShow) return null
	if (isDismissed) return null

	const handleDismiss = () => {
		setIsDismissed(true)
	}

	if (variant === "sidebar") {
		return (
			<SidebarGroup>
				<SidebarMenu>
					<SidebarMenuItem>
						{sidebarState === "collapsed" ? (
							<Tooltip side="right" align="center">
								<TooltipTrigger asChild>
									<SidebarMenuButton
										type="button"
										onClick={() => setSidebarDialogOpen(true)}
										aria-label={headline}
									>
										<Clock className="size-4" />
									</SidebarMenuButton>
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">
									<p>{headline}</p>
								</TooltipContent>
							</Tooltip>
						) : (
							<SidebarMenuButton type="button" onClick={() => setSidebarDialogOpen(true)}>
								<Clock className="size-4" />
								<span className="truncate">{headline}</span>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>

				<Dialog
					open={sidebarDialogOpen}
					onOpenChange={open => {
						setSidebarDialogOpen(open)
						if (!open) setSidebarStepsOpen(false)
					}}
				>
					<DialogContent className="bg-card max-w-md border-0 shadow-lg">
						<DialogHeader className="space-y-2">
							<DialogTitle className="text-xl font-semibold">{headline}</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm">{subtext}</DialogDescription>
						</DialogHeader>
						<div className="space-y-3 pt-2">
							<div>
								<Progress value={progressValue} />
								<p className="text-muted-foreground mt-1 text-xs">
									On step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
								</p>
							</div>
							<div className="border-border/60 rounded-lg border p-3">
								<p className="text-sm font-medium">ENP accreditation steps</p>
								<Collapsible open={sidebarStepsOpen} onOpenChange={setSidebarStepsOpen}>
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="text-muted-foreground mt-1 h-8 w-full justify-between px-2 font-normal"
										>
											{sidebarStepsOpen ? "Hide step list" : "Show all steps"}
											<ChevronDown
												className={
													sidebarStepsOpen
														? "size-3.5 shrink-0 rotate-180 transition-transform"
														: "size-3.5 shrink-0 transition-transform"
												}
											/>
										</Button>
									</CollapsibleTrigger>
									<CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
										<p className="text-muted-foreground mt-2 text-xs leading-relaxed">
											We only mark steps “Completed” when QLegal can verify them.
										</p>
										<div className="max-h-[min(50vh,20rem)] overflow-y-auto overscroll-contain pr-1 pt-3">
											<StepList currentStepIndex={stepIndex} stepStates={stepStates} />
										</div>
									</CollapsibleContent>
								</Collapsible>
							</div>
							<Button asChild className="w-full" variant="secondary">
								<Link href="/auth/legal-registration">Open</Link>
							</Button>
							{/* <Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-muted-foreground w-full"
								onClick={() => {
									setSidebarDialogOpen(false)
									handleDismiss()
								}}
							>
								
							</Button> */}
						</div>
					</DialogContent>
				</Dialog>
			</SidebarGroup>
		)
	}

	return (
		<Card
			className="border-border/60 bg-card/70 relative mx-auto mb-4 max-w-6xl backdrop-blur"
		>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute top-2 right-2 z-10 size-7"
				onClick={handleDismiss}
				aria-label="Dismiss"
			>
				<X className="size-4" />
			</Button>
			<div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<Clock className="text-muted-foreground size-4" />
						<p className="truncate text-sm font-semibold">{headline}</p>
					</div>
					<p className="text-muted-foreground mt-1 text-sm">{subtext}</p>
					<div className="mt-3">
						<Progress value={progressValue} />
						<p className="text-muted-foreground mt-1 text-xs">
							On step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
						</p>
						<div className="mt-2">
							<Collapsible open={isStepsOpen} onOpenChange={setIsStepsOpen}>
								<CollapsibleTrigger asChild>
									<Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2">
										{isStepsOpen ? "Hide steps" : "Show all steps"}
										<ChevronDown
											className={
												isStepsOpen
													? "ml-1 size-3.5 rotate-180 transition-transform"
													: "ml-1 size-3.5 transition-transform"
											}
										/>
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="mt-3 overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
									<StepList currentStepIndex={stepIndex} stepStates={stepStates} />
								</CollapsibleContent>
							</Collapsible>
						</div>
					</div>
				</div>

				<div className="flex shrink-0 flex-col gap-2 sm:flex-row">
					<Button asChild variant="secondary">
						<Link href="/auth/legal-registration">View ENP application</Link>
					</Button>
					<Button asChild>
						<Link href="/dashboard">
							Continue to dashboard
							<ArrowRight className="ml-2 size-4" />
						</Link>
					</Button>
				</div>
			</div>
		</Card>
	)
}

export function EnpAccreditationProgressSidebarBanner() {
	return <EnpAccreditationProgressBanner variant="sidebar" />
}

