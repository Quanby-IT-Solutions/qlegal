"use client"

import Link from "next/link"
import { ArrowRight01Icon, Clock01Icon, Video01Icon } from "@hugeicons/core-free-icons"
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
import { Skeleton } from "@/core/components/ui/skeleton"

import { type RouterOutputs } from "@/services/trpc/client"

interface DashboardMeetingInvitesProps {
	invites: RouterOutputs["dashboard"]["getMeetingInvites"] | undefined
	isLoading: boolean
	isRespondingToInvite: boolean
	onAccept: (meetingId: string) => void
	onDecline: (meetingId: string) => void
}

export function DashboardMeetingInvites({
	invites,
	isLoading,
	isRespondingToInvite,
	onAccept,
	onDecline,
}: DashboardMeetingInvitesProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Meeting Invitations</CardTitle>
						<CardDescription>Invites to join meetings as a witness/participant</CardDescription>
					</div>
					<Link href="/sessions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						View Meetings
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-3">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				) : invites && invites.length > 0 ? (
					<div className="space-y-3">
						{invites.map(invite => (
							<div key={invite.id} className="rounded-lg border p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<p className="truncate font-semibold">{invite.appointmentTitle}</p>
										<p className="text-muted-foreground mt-1 text-xs">
											Invited by {invite.invitedBy?.name ?? invite.host?.name ?? "Host"}
										</p>
										<div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
											<HugeiconsIcon icon={Clock01Icon} size={12} />
											{format(new Date(invite.createdAt), "PPp")}
										</div>
									</div>
									<Badge variant="secondary">Pending</Badge>
								</div>

								<div className="mt-3 flex gap-2">
									<Button
										size="sm"
										disabled={isRespondingToInvite}
										onClick={() => onAccept(invite.meetingId ?? "")}
									>
										Accept
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={isRespondingToInvite}
										onClick={() => onDecline(invite.meetingId ?? "")}
									>
										Decline
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<HugeiconsIcon icon={Video01Icon} size={48} className="text-muted-foreground/50" />
						<p className="text-muted-foreground mt-4 text-sm">No meeting invites</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
