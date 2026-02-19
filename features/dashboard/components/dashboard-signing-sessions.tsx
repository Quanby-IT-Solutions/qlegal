"use client"

import { type Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
	ArrowRight01Icon,
	Calendar01Icon,
	Clock01Icon,
	Video01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format } from "date-fns"

import { Badge } from "@/core/components/ui/badge"
import { Button, buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { type RouterOutputs } from "@/services/trpc/client"

interface DashboardSigningSessionsProps {
	sessions: RouterOutputs["dashboard"]["getSigningSessions"] | undefined
	isLoading: boolean
	isPrincipal: boolean
}

export function DashboardSigningSessions({
	sessions,
	isLoading,
	isPrincipal,
}: DashboardSigningSessionsProps) {
	const router = useRouter()

	if (!isLoading && (!sessions || sessions.length === 0)) {
		return null
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							Your Signing Sessions
							{sessions?.filter(s => s.canJoin).length ? (
								<Badge className="animate-pulse bg-green-600 hover:bg-green-600">
									{sessions.filter(s => s.canJoin).length} Live
								</Badge>
							) : null}
						</CardTitle>
						<CardDescription>
							{sessions?.filter(s => s.canJoin).length
								? "You have sessions ready to join"
								: sessions?.some(s => s.status === "CONFIRMED")
									? "Waiting for the notary to start the session"
									: "Waiting for the notary to accept your booking"}
						</CardDescription>
					</div>
					<Link href="/appointments" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						View All
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{sessions?.map(session => {
						const canJoin = session.canJoin
						const isConfirmed = session.status === "CONFIRMED"
						const otherPartyName = isPrincipal ? session.lawyerName : session.clientName

						return (
							<div key={session.id} className="flex flex-col gap-3 rounded-lg border p-4">
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="truncate font-medium">Document Signing</p>
											{canJoin && (
												<span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-green-500" />
											)}
										</div>
										<p className="text-muted-foreground text-sm">with {otherPartyName}</p>
									</div>
									{canJoin ? (
										<Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
											Live
										</Badge>
									) : isConfirmed ? (
										<Badge variant="secondary">Confirmed</Badge>
									) : (
										<Badge variant="outline">Pending</Badge>
									)}
								</div>

								<div className="text-muted-foreground flex items-center gap-4 text-sm">
									<div className="flex items-center gap-1.5">
										<HugeiconsIcon icon={Calendar01Icon} size={14} />
										<span>{format(new Date(session.appointmentDate), "MMM d, yyyy")}</span>
									</div>
									<div className="flex items-center gap-1.5">
										<HugeiconsIcon icon={Clock01Icon} size={14} />
										<span>{format(new Date(session.appointmentDate), "h:mm a")}</span>
									</div>
								</div>

								{canJoin && session.activeMeetingId && (
									<Button
										size="sm"
										className="bg-green-600 hover:bg-green-700"
										onClick={() =>
											router.push(`/sessions/${session.activeMeetingId}/lobby` as Route)
										}
									>
										<HugeiconsIcon icon={Video01Icon} size={16} className="mr-1.5" />
										Join Meeting
									</Button>
								)}
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
