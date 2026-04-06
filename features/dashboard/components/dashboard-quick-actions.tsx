"use client"

import Link from "next/link"
import { Calendar01Icon, ClipboardIcon, FileAddIcon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

interface DashboardQuickActionsProps {
	isENP: boolean
	isPrincipal: boolean
	pendingNotarizationRequests: number
	hasViewedRequests: boolean
	onMarkRequestsViewed: () => void
}

export function DashboardQuickActions({
	isENP,
	isPrincipal,
	pendingNotarizationRequests,
	hasViewedRequests,
	onMarkRequestsViewed,
}: DashboardQuickActionsProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
				<CardDescription>Common tasks to get you started</CardDescription>
			</CardHeader>
			<CardContent>
				<div className={`grid gap-4 sm:grid-cols-2 ${isENP ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
					{isPrincipal && (
						<Link
							href="/browse"
							className={buttonVariants({
								variant: "outline",
								className: "h-auto flex-col items-start gap-2 p-4",
							})}
						>
							<HugeiconsIcon icon={UserIcon} size={20} />
							<div className="text-left">
								<div className="font-semibold">Book a Notary</div>
								<div className="text-muted-foreground text-xs">
									View availability and book a time
								</div>
							</div>
						</Link>
					)}
					{isENP && (
						<Link
							// @ts-expect-error -- Next.js typed routes: /requests is a valid route
							href="/requests"
							className={buttonVariants({
								variant: "outline",
								className: "relative h-auto flex-col items-start gap-2 overflow-visible p-4",
							})}
							onClick={onMarkRequestsViewed}
						>
							{pendingNotarizationRequests > 0 && !hasViewedRequests && (
								<div className="border-background absolute -top-2 -right-2 z-20 h-4 w-4 animate-pulse rounded-full border-2 bg-red-500 shadow-lg" />
							)}
							<HugeiconsIcon icon={ClipboardIcon} size={20} />
							<div className="text-left">
								<div className="font-semibold">Notarization Requests</div>
								<div className="text-muted-foreground text-xs">
									{pendingNotarizationRequests} pending request
									{pendingNotarizationRequests !== 1 ? "s" : ""}
								</div>
							</div>
						</Link>
					)}
					<Link
						// @ts-expect-error Next.js typed routes (conditional href)
						href={isENP ? "/appointments" : "/consultations"}
						className={buttonVariants({
							variant: "outline",
							className: "h-auto flex-col items-start gap-2 p-4",
						})}
					>
						<HugeiconsIcon icon={Calendar01Icon} size={20} />
						<div className="text-left">
							<div className="font-semibold">
								{isENP ? "View Consultations" : "Book Consultation"}
							</div>
							<div className="text-muted-foreground text-xs">
								{isENP ? "Manage consultation requests" : "Schedule a consultation"}
							</div>
						</div>
					</Link>
					<Link
						href="/envelopes"
						className={buttonVariants({
							variant: "outline",
							className: "h-auto flex-col items-start gap-2 p-4",
						})}
					>
						<HugeiconsIcon icon={FileAddIcon} size={20} />
						<div className="text-left">
							<div className="font-semibold">Upload Document</div>
							<div className="text-muted-foreground text-xs">Create new envelope</div>
						</div>
					</Link>
					<Link
						href="/appointments"
						className={buttonVariants({
							variant: "outline",
							className: "h-auto flex-col items-start gap-2 p-4",
						})}
					>
						<HugeiconsIcon icon={ClipboardIcon} size={20} />
						<div className="text-left">
							<div className="font-semibold">View Appointments</div>
							<div className="text-muted-foreground text-xs">Manage your schedule</div>
						</div>
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
