"use client"

import type { Route } from "next"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { BookOpen01Icon, Diamond01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight, X } from "lucide-react"

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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

const PLAN_CARD_COOKIE = "sidebar-plan-card-dismissed"
const PLAN_CARD_COOKIE_VALUE = "true"
const PLAN_CARD_COOKIE_EXPIRES = "Fri, 31 Dec 9999 23:59:59 GMT"

const ENP_COURSE_HREF = "/auth/legal-registration/course" as const satisfies Route

const setPlanCardDismissed = () => {
	document.cookie = `${PLAN_CARD_COOKIE}=${PLAN_CARD_COOKIE_VALUE}; expires=${PLAN_CARD_COOKIE_EXPIRES}; path=/`
}

const clearPlanCardDismissed = () => {
	document.cookie = `${PLAN_CARD_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

const isPlanCardDismissed = (): boolean => {
	if (typeof document === "undefined") return false
	try {
		return document.cookie.includes(`${PLAN_CARD_COOKIE}=${PLAN_CARD_COOKIE_VALUE}`)
	} catch {
		return false
	}
}

function SidebarCourseMenuIcon() {
	return (
		<span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4" aria-hidden>
			<HugeiconsIcon icon={BookOpen01Icon} size={16} className="shrink-0" />
		</span>
	)
}

export const SidebarCourseCard = () => {
	const { data: session } = useSession()
	const role = session?.user?.role
	const [open, setOpen] = useState(false)
	const [dismissed, setDismissed] = useState<boolean | null>(null)
	const { state: sidebarState } = useSidebar()

	const headline =
		role === "PRINCIPAL" || role === "ENA"
			? "Become an Electronic Notary Public"
			: role === "ENP"
				? "ENP training course"
				: "Want to be an ENP?"
	const subline =
		role === "PRINCIPAL" || role === "ENA"
			? "Complete the course to qualify for the ENP program and advanced notarization sessions."
			: "Unlock advanced legal workflows by finishing our ENP course."

	useEffect(() => {
		setDismissed(isPlanCardDismissed())
	}, [])

	const handleDismiss = () => {
		setPlanCardDismissed()
		setDismissed(true)
	}
	const handleRestoreCard = () => {
		clearPlanCardDismissed()
		setDismissed(false)
	}

	if (dismissed === null) {
		return null
	}

	return (
		<SidebarGroup className="px-2 py-0 group-data-[collapsible=icon]:py-1">
			{dismissed ? (
				<SidebarMenu>
					<SidebarMenuItem>
						{sidebarState === "collapsed" ? (
							<Tooltip side="right" align="center">
								<TooltipTrigger asChild>
									<SidebarMenuButton onClick={handleRestoreCard}>
										<SidebarCourseMenuIcon />
									</SidebarMenuButton>
								</TooltipTrigger>
								<TooltipContent>
									<p>ENP Course</p>
								</TooltipContent>
							</Tooltip>
						) : (
							<SidebarMenuButton onClick={handleRestoreCard}>
								<SidebarCourseMenuIcon />
								<span>ENP Course</span>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			) : sidebarState === "collapsed" ? (
				<SidebarMenu>
					<SidebarMenuItem>
						<Tooltip side="right" align="center">
							<TooltipTrigger asChild>
								<SidebarMenuButton onClick={() => setOpen(true)}>
									<SidebarCourseMenuIcon />
								</SidebarMenuButton>
							</TooltipTrigger>
							<TooltipContent>
								<p>Want to be an ENP?</p>
							</TooltipContent>
						</Tooltip>
					</SidebarMenuItem>
				</SidebarMenu>
			) : (
				<div className="border-sidebar-border/60 space-y-3 rounded-lg border bg-gradient-to-br from-slate-400/15 via-slate-300/10 to-slate-400/15 p-3 backdrop-blur-md">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="bg-primary/10 text-primary rounded-md p-1.5">
								<HugeiconsIcon icon={Diamond01Icon} size={16} />
							</div>
							<p className="text-sm font-semibold">{headline}</p>
						</div>
						<Button variant="ghost" size="icon" className="size-7" onClick={handleDismiss}>
							<X className="size-4" />
							<span className="sr-only">Dismiss ENP card</span>
						</Button>
					</div>
					<p className="text-muted-foreground text-xs leading-relaxed">{subline}</p>
					<div className="flex flex-col gap-2">
						<Button size="sm" className="w-full" asChild>
							<Link href={ENP_COURSE_HREF}>Open ENP course</Link>
						</Button>
						<Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
							Learn more
						</Button>
					</div>
				</div>
			)}

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="bg-card max-w-md border-0 shadow-lg">
					<DialogHeader className="space-y-4">
						<DialogTitle className="text-2xl font-semibold">{headline}</DialogTitle>
						<DialogDescription className="text-muted-foreground text-base">
							Finish this course as part of becoming an ENP. You can open the course in this window
							or keep browsing and return anytime from the sidebar.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3 pt-4">
						<Button className="w-full" asChild>
							<Link href={ENP_COURSE_HREF} onClick={() => setOpen(false)}>
								Open ENP course
							</Link>
						</Button>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="group bg-card w-full rounded-lg border p-4 transition-all duration-200 hover:border-gray-300 active:scale-95"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-orange-50 p-2 dark:bg-orange-900/20">
										<HugeiconsIcon icon={BookOpen01Icon} size={20} className="text-orange-600" />
									</div>
									<div className="text-left">
										<p className="font-medium text-orange-600">Course overview</p>
									</div>
								</div>
								<span className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
									Dismiss
									<ArrowRight className="size-5" />
								</span>
							</div>
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</SidebarGroup>
	)
}
