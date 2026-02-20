"use client"

import Link from "next/link"
import { ArrowRight01Icon, Clock01Icon, Video01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format } from "date-fns"

import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { type RouterOutputs } from "@/services/trpc/client"

import { getStatusVariant } from "../lib/dashboard-utils"

interface DashboardRecentMeetingsProps {
	meetings: RouterOutputs["dashboard"]["getRecentMeetings"] | undefined
	isLoading: boolean
}

export function DashboardRecentMeetings({ meetings, isLoading }: DashboardRecentMeetingsProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Recent Video Meetings</CardTitle>
						<CardDescription>Your latest video consultations</CardDescription>
					</div>
					<Link href="/sessions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						View All
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				) : meetings && meetings.length > 0 ? (
					<div className="space-y-4">
						{meetings.map(meeting => (
							<div
								key={meeting.id}
								className="hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
									<HugeiconsIcon icon={Video01Icon} size={20} className="text-green-600" />
								</div>
								<div className="flex-1">
									<div className="flex items-center justify-between">
										<p className="font-medium">{meeting.title}</p>
										<Badge variant={getStatusVariant(meeting.status)}>{meeting.status}</Badge>
									</div>
									<div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
										<HugeiconsIcon icon={Clock01Icon} size={12} />
										{format(new Date(meeting.createdAt), "PPp")}
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						{}
						<HugeiconsIcon icon={Video01Icon} size={48} className="text-muted-foreground/50" />
						<p className="text-muted-foreground mt-4 text-sm">No video meetings yet</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
