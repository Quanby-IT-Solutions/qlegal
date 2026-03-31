"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import {
	ArrowRight,
	Check,
	ChevronDown,
	Circle,
	Clock,
	Play,
	X,
} from "lucide-react"

import { Badge } from "@/components/reui/badge"
import {
	Timeline,
	TimelineContent,
	TimelineDate,
	TimelineHeader,
	TimelineIndicator,
	TimelineItem,
	TimelineSeparator,
	TimelineTitle,
} from "@/components/reui/timeline"
import { cn } from "@/core/lib/utils"

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

import {
	ENP_COURSE_CERT_CHANGED_EVENT,
	getEnpCourseCertStorageKeys,
	readEnpCourseCertificateDownloadedAt,
} from "../lib/enp-course-certificate"
import {
	ENP_SC_CREDENTIALS_CHANGED_EVENT,
	getEnpScCredentialsStorageKey,
	readEnpScCredentialsRecordedAt,
} from "../lib/enp-sc-credentials"

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

function PageStepsTimeline({
	stepIndex,
	stepStates,
}: {
	stepIndex: number
	stepStates: StepState[]
}) {
	return (
		<div className="min-w-0 w-full overflow-x-auto overscroll-x-contain px-1 pt-10 pb-2 sm:px-2">
			<Timeline
				orientation="horizontal"
				className="w-full min-w-[560px] md:min-w-full"
				value={stepIndex + 1}
			>
				{STEPS.map((label, idx) => {
					const state: StepState =
						stepStates[idx] ?? (idx === stepIndex ? "current" : "upcoming")
					const stepNum = idx + 1
					return (
						<TimelineItem key={label} step={stepNum} className="min-w-0 ps-0.5 pe-0.5 first:ps-0 last:pe-2">
							<TimelineHeader>
								<TimelineSeparator className="bg-input! group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:left-2.5 group-data-[orientation=horizontal]/timeline:w-[calc(100%-2.25rem)]" />
								<TimelineDate>{getStepStateLabel(state)}</TimelineDate>
								<TimelineTitle className="flex flex-wrap items-center gap-2">
									Step {stepNum}
									{state === "current" ? (
										<Badge variant="primary-light" radius="full" size="sm">
											Current
										</Badge>
									) : null}
								</TimelineTitle>
								<TimelineIndicator
									className={cn(
										"flex size-6 shrink-0 items-center justify-center",
										state === "completed" && "border-none bg-emerald-500 text-white",
										state === "current" && "border-none bg-primary text-primary-foreground",
										state === "upcoming" && "border-none bg-muted text-muted-foreground",
										state === "not_tracked" &&
											"border-muted-foreground/50 bg-transparent text-muted-foreground border border-dashed"
									)}
								>
									{state === "completed" ? (
										<Check className="size-3.5" />
									) : state === "current" ? (
										<Play className="size-3" />
									) : (
										<Circle className="size-3" />
									)}
								</TimelineIndicator>
							</TimelineHeader>
							<TimelineContent className="text-muted-foreground min-w-0 text-xs leading-snug break-words">
								{label}
							</TimelineContent>
						</TimelineItem>
					)
				})}
			</Timeline>
		</div>
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
	const [isStepsTimelineOpen, setIsStepsTimelineOpen] = useState(false)
	const [courseCertificateDownloadedAt, setCourseCertificateDownloadedAt] = useState<string | null>(null)
	const [scCredentialsRecordedAt, setScCredentialsRecordedAt] = useState<string | null>(null)

	useEffect(() => {
		setIsClient(true)
	}, [])

	useEffect(() => {
		if (!isClient) return
		setCourseCertificateDownloadedAt(
			readEnpCourseCertificateDownloadedAt(session?.user?.id, session?.user?.email)
		)
	}, [isClient, session?.user?.id, session?.user?.email])

	useEffect(() => {
		if (!isClient) return
		const keys = new Set(getEnpCourseCertStorageKeys(session?.user?.id, session?.user?.email))
		if (keys.size === 0) return
		const handler = (event: StorageEvent) => {
			if (!event.key || !keys.has(event.key)) return
			setCourseCertificateDownloadedAt(
				readEnpCourseCertificateDownloadedAt(session?.user?.id, session?.user?.email)
			)
		}
		window.addEventListener("storage", handler)
		return () => window.removeEventListener("storage", handler)
	}, [isClient, session?.user?.id, session?.user?.email])

	useEffect(() => {
		if (!isClient) return
		const sync = () => {
			setCourseCertificateDownloadedAt(
				readEnpCourseCertificateDownloadedAt(session?.user?.id, session?.user?.email)
			)
		}
		window.addEventListener(ENP_COURSE_CERT_CHANGED_EVENT, sync)
		window.addEventListener("focus", sync)
		window.addEventListener("pageshow", sync)
		return () => {
			window.removeEventListener(ENP_COURSE_CERT_CHANGED_EVENT, sync)
			window.removeEventListener("focus", sync)
			window.removeEventListener("pageshow", sync)
		}
	}, [isClient, session?.user?.id, session?.user?.email])

	useEffect(() => {
		if (!isClient) return
		setScCredentialsRecordedAt(readEnpScCredentialsRecordedAt(session?.user?.id))
	}, [isClient, session?.user?.id])

	useEffect(() => {
		if (!isClient) return
		const handler = (event: StorageEvent) => {
			const key = getEnpScCredentialsStorageKey(session?.user?.id)
			if (!key) return
			if (event.key !== key) return
			setScCredentialsRecordedAt(readEnpScCredentialsRecordedAt(session?.user?.id))
		}
		window.addEventListener("storage", handler)
		return () => window.removeEventListener("storage", handler)
	}, [isClient, session?.user?.id])

	useEffect(() => {
		if (!isClient) return
		const sync = () => setScCredentialsRecordedAt(readEnpScCredentialsRecordedAt(session?.user?.id))
		window.addEventListener(ENP_SC_CREDENTIALS_CHANGED_EVENT, sync)
		return () => window.removeEventListener(ENP_SC_CREDENTIALS_CHANGED_EVENT, sync)
	}, [isClient, session?.user?.id])

	const openCoursePlaceholder = () => {
		const url = `${window.location.origin}/auth/legal-registration/course`
		window.open(url, "_blank", "noopener,noreferrer")
	}

	useEffect(() => {
		if (!isClient) return
		// Same behavior for both sidebar + page:
		// if user navigates (or refreshes), banner comes back.
		setIsDismissed(false)
		setIsStepsTimelineOpen(false)
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

	const rawStepIndex = useMemo(() => getCurrentStepIndex(application?.status), [application?.status])

	/** Until the placeholder certificate exists, keep “Complete the LMS course” as the current step for draft flows (don’t skip ahead to submit). */
	const stepIndex = useMemo(() => {
		const hasCert = Boolean(courseCertificateDownloadedAt)
		const hasSc = Boolean(scCredentialsRecordedAt)
		const status = application?.status
		if (!hasCert && (status === "DRAFT" || status === "REJECTED") && rawStepIndex >= 2) {
			return 1
		}

		// Once you submit your application (PENDING/UNDER_REVIEW/APPROVED), the next required action is
		// to record Supreme Court credentials (placeholder). Only after that should we move to the final wait step.
		if (status === "PENDING" || status === "UNDER_REVIEW" || status === "APPROVED") {
			if (!hasSc) return 3
			return 4
		}

		// If accreditation is already active, force the final step to be current.
		if (userRole === "ENP" && userStatus === "ACTIVE") {
			return 4
		}
		return rawStepIndex
	}, [
		application?.status,
		courseCertificateDownloadedAt,
		scCredentialsRecordedAt,
		rawStepIndex,
		userRole,
		userStatus,
	])

	const progressValue = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex])

	const stepStates = useMemo<StepState[]>(() => {
		// IMPORTANT: We do NOT assume earlier steps are completed.
		// Only mark "completed" when we can verify it from QLegal data.
		const states: StepState[] = STEPS.map((_, idx) =>
			idx === stepIndex ? "current" : idx > stepIndex ? "upcoming" : "not_tracked"
		)

		// Step 1 (index 0): Journey started — verifiable when they have an application record or finished the LMS placeholder.
		if (application || courseCertificateDownloadedAt) {
			states[0] = "completed"
		}

		// Step 2 (index 1): LMS course completion is verifiable via placeholder certificate download.
		if (courseCertificateDownloadedAt) {
			states[1] = "completed"
		}

		// Step 3 (index 2): "submit your application" is verifiable.
		if (application?.status && application.status !== "DRAFT" && application.status !== "REJECTED") {
			states[2] = "completed"
		}

		// Step 4 (index 3): Supreme Court credentials — placeholder until SC integration exists.
		if (scCredentialsRecordedAt) {
			states[3] = "completed"
		}

		// If commission is active, final step is verifiable.
		if (userRole === "ENP" && userStatus === "ACTIVE") {
			states[4] = "completed"
		}

		return states
	}, [
		application,
		courseCertificateDownloadedAt,
		scCredentialsRecordedAt,
		stepIndex,
		userRole,
		userStatus,
	])

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
		const sidebarIcon = (
			<span
				className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4"
				aria-hidden
			>
				<Clock className="size-4 shrink-0" />
			</span>
		)

		return (
			<SidebarGroup className="px-2 py-0 group-data-[collapsible=icon]:py-1">
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
										{sidebarIcon}
									</SidebarMenuButton>
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">
									<p>{headline}</p>
								</TooltipContent>
							</Tooltip>
						) : (
							<SidebarMenuButton type="button" onClick={() => setSidebarDialogOpen(true)}>
								{sidebarIcon}
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
							<Button type="button" className="w-full" variant="secondary" onClick={openCoursePlaceholder}>
								{courseCertificateDownloadedAt ? "View course & certificate" : "Complete LMS course"}
							</Button>
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
											We only mark steps “Completed” when QLegal can verify them. Submit your
											application via <span className="text-foreground font-medium">Open</span> below.
											After it&apos;s submitted, use the Supreme Court section on that same page to
											record credentials (placeholder until integration).
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
		<section
			role="region"
			aria-label="ENP accreditation status"
			className="border-border/70 bg-muted/35 dark:bg-muted/20 w-full border-b backdrop-blur-sm"
		>
			<div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<Clock className="text-muted-foreground size-4 shrink-0" />
							<p className="text-sm font-semibold">{headline}</p>
						</div>
						<p className="text-muted-foreground mt-1 text-sm">{subtext}</p>
						<p className="text-muted-foreground mt-3 text-xs leading-relaxed">
							Submit your application from{" "}
							<span className="text-foreground font-medium">View ENP application</span>. After it&apos;s
							submitted, use the Supreme Court section on that page to record credentials (placeholder).
						</p>
					</div>

					<div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto md:items-end">
						<div className="flex justify-end">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-foreground size-8 shrink-0"
								onClick={handleDismiss}
								aria-label="Dismiss"
							>
								<X className="size-4" />
							</Button>
						</div>
						<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
							<Button type="button" variant="secondary" onClick={openCoursePlaceholder}>
								{courseCertificateDownloadedAt ? "View course & certificate" : "Complete LMS course"}
							</Button>
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
				</div>

				<Collapsible open={isStepsTimelineOpen} onOpenChange={setIsStepsTimelineOpen}>
					<div className="flex flex-wrap items-center gap-2">
						<CollapsibleTrigger asChild>
							<Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 px-2">
								{isStepsTimelineOpen ? "Hide steps" : "Show steps"}
								<ChevronDown
									className={
										isStepsTimelineOpen
											? "ml-1 size-3.5 rotate-180 transition-transform"
											: "ml-1 size-3.5 transition-transform"
									}
								/>
							</Button>
						</CollapsibleTrigger>
					</div>
					<CollapsibleContent className="data-[state=open]:overflow-visible data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
						<div className="border-border/50 mt-4 min-w-0 w-full border-t border-dotted pt-4">
							<PageStepsTimeline stepIndex={stepIndex} stepStates={stepStates} />
						</div>
					</CollapsibleContent>
				</Collapsible>

				<div className="pt-1">
					<Progress value={progressValue} />
					<p className="text-muted-foreground mt-2 text-xs leading-relaxed">
						On step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
					</p>
				</div>
			</div>
		</section>
	)
}

export function EnpAccreditationProgressSidebarBanner() {
	return <EnpAccreditationProgressBanner variant="sidebar" />
}

