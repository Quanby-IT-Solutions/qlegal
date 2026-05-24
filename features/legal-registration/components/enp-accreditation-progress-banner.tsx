"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Check, ChevronDown, Circle, Clock, Play, X } from "lucide-react"
import { useSession } from "next-auth/react"

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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/ui/collapsible"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Progress } from "@/core/components/ui/progress"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

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

import {
	ENP_COURSE_CERT_CHANGED_EVENT,
	getEnpCourseCertStorageKeys,
	mergeEnpCourseCertificateDownloadedAt,
	readEnpCourseCertificateDownloadedAt,
} from "../lib/enp-course-certificate"
import {
	ENP_SC_CREDENTIALS_CHANGED_EVENT,
	readEnpScCredentialsRecordedAt,
} from "../lib/enp-sc-credentials"

const STEPS = [
	"Start the ENP accreditation journey",
	"Complete the LMS course",
	"Complete your ENP profile (roll registration, licensing, certifications)",
	"Submit your ENP application for review",
	"Commission activation — a QLegal administrator sets your commission to Active after accreditation (sandbox stand-in for Supreme Court approval)",
] as const

/** Shorter copy for narrow modals (full text in `title` tooltip). */
const STEPS_TIMELINE_COMPACT = [
	"Start ENP journey",
	"LMS course",
	"ENP profile",
	"Submit application",
	"Admin activates commission",
] as const

function isNonEmpty(value: unknown): boolean {
	if (typeof value !== "string") return false
	return value.trim().length > 0
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

function PageStepsTimeline({
	stepIndex,
	stepStates,
	variant = "page",
}: {
	stepIndex: number
	stepStates: StepState[]
	/** `dialog`: shorter labels + tighter layout so the horizontal timeline fits modals. */
	variant?: "page" | "dialog"
}) {
	const compact = variant === "dialog"
	return (
		<div
			className={cn(
				"w-full min-w-0 px-1 pb-1 sm:px-2",
				compact ? "overflow-x-hidden pt-7" : "overflow-x-auto overscroll-x-contain pt-8"
			)}
		>
			<Timeline
				orientation="horizontal"
				className={cn("w-full min-w-0", compact ? "max-w-full" : "min-w-[560px] md:min-w-full")}
				value={stepIndex + 1}
			>
				{STEPS.map((fullLabel, idx) => {
					const label = compact ? STEPS_TIMELINE_COMPACT[idx] : fullLabel
					const state: StepState = stepStates[idx] ?? (idx === stepIndex ? "current" : "upcoming")
					const stepNum = idx + 1
					return (
						<TimelineItem
							key={fullLabel}
							step={stepNum}
							className={cn(
								"min-w-0 ps-0.5 pe-0.5 first:ps-0 last:pe-2",
								compact && "group-data-[orientation=horizontal]/timeline:not-last:!pe-2"
							)}
						>
							<TimelineHeader>
								<TimelineSeparator className="bg-input! group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:left-2.5 group-data-[orientation=horizontal]/timeline:w-[calc(100%-2.25rem)]" />
								<TimelineDate className={compact ? "text-[0.65rem]" : undefined}>
									{getStepStateLabel(state)}
								</TimelineDate>
								<TimelineTitle
									className={cn(
										"gap-1",
										compact
											? "flex flex-col items-start text-xs leading-tight"
											: "flex flex-wrap items-center gap-2"
									)}
								>
									<span className="font-medium">Step {stepNum}</span>
									{state === "current" ? (
										<Badge variant="primary-light" radius="full" size={compact ? "xs" : "sm"}>
											Current
										</Badge>
									) : null}
								</TimelineTitle>
								<TimelineIndicator
									className={cn(
										"flex size-6 shrink-0 items-center justify-center",
										state === "completed" && "border-none bg-emerald-500 text-white",
										state === "current" && "bg-primary text-primary-foreground border-none",
										state === "upcoming" && "bg-muted text-muted-foreground border-none",
										state === "not_tracked" &&
											"border-muted-foreground/50 text-muted-foreground border border-dashed bg-transparent"
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
							<TimelineContent
								className={cn(
									"text-muted-foreground min-w-0 text-xs leading-snug break-words",
									compact && "line-clamp-3"
								)}
								title={compact ? fullLabel : undefined}
							>
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

	const utils = trpc.useUtils()
	const { data: application } = trpc.legalRegistration.getMyApplication.useQuery(undefined, {
		enabled: isAuth,
		refetchOnWindowFocus: false,
		retry: false,
	})

	const { data: lmsCompletion, isFetched: lmsCompletionFetched } =
		trpc.legalRegistration.getMyEnpLmsCompletion.useQuery(undefined, {
			enabled: isAuth,
			refetchOnWindowFocus: true,
		})

	const { data: enpProfile } = trpc.profile.getEnpProfile.useQuery(undefined, {
		enabled: isAuth && session?.user?.role === "ENP",
		refetchOnWindowFocus: true,
	})

	const lmsBackfillDoneRef = useRef(false)
	const recordLmsBackfill = trpc.legalRegistration.recordEnpLmsCourseCompletion.useMutation({
		onSuccess: () => {
			void utils.legalRegistration.getMyEnpLmsCompletion.invalidate()
		},
		onError: () => {
			lmsBackfillDoneRef.current = false
		},
	})

	const userRole = session?.user?.role
	const userStatus = session?.user?.status

	const [isClient, setIsClient] = useState(false)
	const [isDismissed, setIsDismissed] = useState(false)
	const [isStepsTimelineOpen, setIsStepsTimelineOpen] = useState(false)
	const [courseCertificateDownloadedAt, setCourseCertificateDownloadedAt] = useState<string | null>(
		null
	)

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
		if (!isClient || !isAuth || !lmsCompletionFetched || lmsBackfillDoneRef.current) return
		const local = readEnpCourseCertificateDownloadedAt(session?.user?.id, session?.user?.email)
		if (!local || lmsCompletion?.completedAt) return
		lmsBackfillDoneRef.current = true
		void recordLmsBackfill.mutate({ completedAtIso: local })
		// recordLmsBackfill.mutate is stable enough; including the mutation object re-runs this effect every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- exclude recordLmsBackfill
	}, [
		isAuth,
		isClient,
		lmsCompletion?.completedAt,
		lmsCompletionFetched,
		session?.user?.email,
		session?.user?.id,
	])

	useEffect(() => {
		if (!isClient) return
		const sync = () => void readEnpScCredentialsRecordedAt(session?.user?.id)
		window.addEventListener(ENP_SC_CREDENTIALS_CHANGED_EVENT, sync)
		return () => window.removeEventListener(ENP_SC_CREDENTIALS_CHANGED_EVENT, sync)
	}, [isClient, session?.user?.id])

	const openCoursePlaceholder = () => {
		const url = `${window.location.origin}/auth/legal-registration/course`
		window.open(url, "_blank", "noopener,noreferrer")
	}

	const mergedCertificateAt = useMemo(
		() =>
			mergeEnpCourseCertificateDownloadedAt(
				lmsCompletion?.completedAt ?? null,
				courseCertificateDownloadedAt
			),
		[courseCertificateDownloadedAt, lmsCompletion?.completedAt]
	)

	const isEnpProfileComplete = useMemo(() => {
		if (session?.user?.role !== "ENP") return false
		if (!enpProfile) return false

		// Roll Registration
		if (!isNonEmpty(enpProfile.rollNo)) return false
		if (!isNonEmpty(enpProfile.rollNoDate)) return false

		// Licensing
		if (!isNonEmpty(enpProfile.commissionNo)) return false
		if (!isNonEmpty(enpProfile.commissionNoValidUntil)) return false
		if (!isNonEmpty(enpProfile.ptrNo)) return false
		if (!isNonEmpty(enpProfile.ptrNoLocation)) return false
		if (!isNonEmpty(enpProfile.ptrNoDate)) return false
		if (!isNonEmpty(enpProfile.ibpNo)) return false
		if (!isNonEmpty(enpProfile.ibpNoDate)) return false
		if (!isNonEmpty(enpProfile.notaryAddress)) return false
		// Supreme Court eNotarization API sync requires per-ENP NPN; NFN is env-configured.
		if (!isNonEmpty(enpProfile.notaryPublicNumber)) return false

		// Certifications
		if (!isNonEmpty(enpProfile.mcleNoPeriod)) return false
		if (!isNonEmpty(enpProfile.mcleNo)) return false
		if (!isNonEmpty(enpProfile.mcleNoDate)) return false

		return true
	}, [enpProfile, session?.user?.role])

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
		// Principals start as users; show ENP path (LMS → QLegal application) on the dashboard sidebar.
		if (userRole === "PRINCIPAL") {
			if (!lmsCompletion?.completedAt) return true
			if (application?.status !== "APPROVED") return true
			return false
		}
		if (application && application.status !== "APPROVED") return true
		if (userRole === "ENP" && userStatus && userStatus !== "ACTIVE") return true
		return false
	}, [application, isAuth, lmsCompletion?.completedAt, userRole, userStatus])

	const applicationSubmittedForReview =
		application?.status === "PENDING" ||
		application?.status === "UNDER_REVIEW" ||
		application?.status === "APPROVED"

	/** Step ordering: LMS cert → ENP profile → submit application → admin activates commission. */
	const stepIndex = useMemo(() => {
		// Already active commission: final step.
		if (userRole === "ENP" && userStatus === "ACTIVE") return 4

		// Principals: guide them through LMS until they become ENP.
		if (userRole === "PRINCIPAL" || userRole === "ENA") {
			if (!mergedCertificateAt) return 1
			return 3
		}

		// ENP flow.
		if (!mergedCertificateAt) return 1
		if (!isEnpProfileComplete) return 2
		if (!applicationSubmittedForReview) return 3
		return 4
	}, [
		applicationSubmittedForReview,
		isEnpProfileComplete,
		mergedCertificateAt,
		userRole,
		userStatus,
	])

	const progressValue = useMemo(
		() => Math.round(((stepIndex + 1) / STEPS.length) * 100),
		[stepIndex]
	)

	const stepStates = useMemo<StepState[]>(() => {
		// IMPORTANT: We do NOT assume earlier steps are completed.
		// Only mark "completed" when we can verify it from QLegal data.
		const states: StepState[] = STEPS.map((_, idx) =>
			idx === stepIndex ? "current" : idx > stepIndex ? "upcoming" : "not_tracked"
		)

		// Step 1 (index 0): Journey started — verifiable when they have an application record or finished the LMS placeholder.
		if (application || mergedCertificateAt) {
			states[0] = "completed"
		}

		// Step 2 (index 1): LMS course completion is verifiable via placeholder certificate download.
		if (mergedCertificateAt) {
			states[1] = "completed"
		}

		// Step 3 (index 2): ENP profile is verifiable by required fields being filled.
		if (isEnpProfileComplete) {
			states[2] = "completed"
		}

		// Step 4 (index 3): ENP application submitted for review.
		if (applicationSubmittedForReview) {
			states[3] = "completed"
		}

		// If commission is active, final step is verifiable.
		if (userRole === "ENP" && userStatus === "ACTIVE") {
			states[4] = "completed"
		}

		return states
	}, [
		application,
		applicationSubmittedForReview,
		isEnpProfileComplete,
		mergedCertificateAt,
		stepIndex,
		userRole,
		userStatus,
	])

	const headline = useMemo(() => {
		if (application?.status === "REJECTED") return "Your ENP application needs updates"
		if (application?.status === "DRAFT") return "Finish your ENP application"
		if (application?.status === "PENDING" || application?.status === "UNDER_REVIEW")
			return "Your ENP application is under review"
		if (userRole === "ENP" && userStatus && userStatus !== "ACTIVE")
			return "Your ENP commission is pending"
		return "ENP accreditation in progress"
	}, [application?.status, userRole, userStatus])

	const subtext = useMemo(() => {
		if (application?.status === "REJECTED")
			return "Please review the remarks in your application and resubmit."
		if (application?.status === "DRAFT")
			return "Complete the requirements and submit. You can continue using QLegal while you work on this."
		if (application?.status === "PENDING" || application?.status === "UNDER_REVIEW")
			return "You can continue using QLegal. A QLegal administrator sets your commission to Active when accreditation is complete (step 5 in the checklist)."
		if (userRole === "ENP" && userStatus && userStatus !== "ACTIVE")
			return "Video sessions and booking stay off until your commission is Active. An administrator turns that on after accreditation—completing every box in the optional 5-module course checklist does not unlock them."
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
			<span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4" aria-hidden>
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
					<DialogContent className="bg-card border-border/60 isolate flex max-h-[min(90dvh,42rem)] w-[min(98vw,58rem)] max-w-[min(98vw,58rem)] flex-col gap-3 overflow-hidden border p-5 shadow-xl sm:p-6">
						<DialogHeader className="space-y-1.5 text-left">
							<DialogTitle className="text-lg leading-tight font-semibold sm:text-xl">
								{headline}
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-snug">
								{subtext}
							</DialogDescription>
						</DialogHeader>
						<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto pt-2 pr-1 pb-1">
							<p className="text-muted-foreground text-xs leading-snug">
								Submit your application from{" "}
								<span className="text-foreground font-medium">Open</span> below. After it&apos;s
								submitted, the checklist advances. Complete your ENP profile from{" "}
								<span className="text-foreground font-medium">Profile</span> before submitting.
								Commission Active is set by an administrator after accreditation.
							</p>
							<div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="h-7 rounded-full px-3 text-xs"
									onClick={openCoursePlaceholder}
								>
									{mergedCertificateAt ? "View course & certificate" : "Complete LMS course"}
								</Button>
								<Button
									asChild
									variant="secondary"
									size="sm"
									className="h-7 rounded-full px-3 text-xs"
								>
									<Link href="/auth/legal-registration">View ENP application</Link>
								</Button>
							</div>
							<Collapsible open={sidebarStepsOpen} onOpenChange={setSidebarStepsOpen}>
								<div className="flex flex-wrap items-center gap-1">
									<CollapsibleTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="-ms-1 h-7 px-2 text-xs"
										>
											{sidebarStepsOpen ? "Hide steps" : "Show steps"}
											<ChevronDown
												className={
													sidebarStepsOpen
														? "ml-1 size-3.5 rotate-180 transition-transform"
														: "ml-1 size-3.5 transition-transform"
												}
											/>
										</Button>
									</CollapsibleTrigger>
								</div>
								<CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 min-h-0 overflow-hidden">
									<div className="border-border/50 bg-card mt-2 min-h-0 w-full min-w-0 border-t border-dotted pt-3">
										<PageStepsTimeline
											variant="dialog"
											stepIndex={stepIndex}
											stepStates={stepStates}
										/>
									</div>
								</CollapsibleContent>
							</Collapsible>
							<div className="border-border/40 border-t pt-2">
								<Progress value={progressValue} className="h-1.5" />
								<p className="text-muted-foreground mt-1 text-xs leading-snug">
									On step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
								</p>
							</div>
							<div className="flex shrink-0 justify-center pt-1">
								<Button
									asChild
									variant="secondary"
									size="sm"
									className="h-7 rounded-full px-8 text-xs"
								>
									<Link href="/auth/legal-registration">Open</Link>
								</Button>
							</div>
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
			<div className="flex flex-col gap-2 px-4 py-3 sm:px-5">
				<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4 lg:gap-6">
					<div className="min-w-0 flex-1 space-y-1 md:pr-2">
						<div className="flex items-center gap-2">
							<Clock className="text-muted-foreground size-4 shrink-0" />
							<p className="text-sm leading-tight font-semibold">{headline}</p>
						</div>
						<p className="text-muted-foreground text-sm leading-snug">{subtext}</p>
						<p className="text-muted-foreground text-xs leading-snug">
							Submit your application from{" "}
							<span className="text-foreground font-medium">View ENP application</span>. After
							it&apos;s submitted, the checklist advances. Make sure you&apos;ve completed your ENP
							profile (roll registration, licensing, certifications) from{" "}
							<span className="text-foreground font-medium">Profile</span> first. Final step: an
							administrator activates your commission.
						</p>
					</div>

					<div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:self-end md:self-start md:pt-0.5">
						<div className="flex flex-wrap items-center justify-end gap-1.5">
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="h-7 rounded-full px-3 text-xs"
								onClick={openCoursePlaceholder}
							>
								{mergedCertificateAt ? "View course & certificate" : "Complete LMS course"}
							</Button>
							<Button
								asChild
								variant="secondary"
								size="sm"
								className="h-7 rounded-full px-3 text-xs"
							>
								<Link href="/auth/legal-registration">View ENP application</Link>
							</Button>
							<Button asChild size="sm" className="h-7 rounded-full px-3 text-xs">
								<Link href="/dashboard">
									Continue to dashboard
									<ArrowRight className="size-3.5" />
								</Link>
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								className="text-muted-foreground hover:text-foreground -me-0.5 shrink-0"
								onClick={handleDismiss}
								aria-label="Dismiss"
							>
								<X className="size-3.5" />
							</Button>
						</div>
					</div>
				</div>

				<Collapsible open={isStepsTimelineOpen} onOpenChange={setIsStepsTimelineOpen}>
					<div className="flex flex-wrap items-center gap-1">
						<CollapsibleTrigger asChild>
							<Button type="button" variant="ghost" size="sm" className="-ml-2 h-7 px-2 text-xs">
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
					<CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:overflow-visible">
						<div className="border-border/50 mt-2 w-full min-w-0 border-t border-dotted pt-3">
							<PageStepsTimeline stepIndex={stepIndex} stepStates={stepStates} />
						</div>
					</CollapsibleContent>
				</Collapsible>

				<div className="border-border/40 border-t pt-2">
					<Progress value={progressValue} className="h-1.5" />
					<p className="text-muted-foreground mt-1 text-xs leading-snug">
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
