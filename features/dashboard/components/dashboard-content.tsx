"use client"

import { type Route } from "next"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo } from "react"
import {
	Calendar01Icon,
	CheckmarkCircle01Icon,
	ClipboardIcon,
	Clock01Icon,
	File01Icon,
	FileAddIcon,
	UserIcon,
} from "@hugeicons/core-free-icons"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import {
	buildActivityChartData,
	buildAppointmentStatusChartData,
	buildAppointmentTypeChartData,
	buildDocumentStatusChartData,
} from "../lib/dashboard-chart-utils"
import { usePendingRequestsDot } from "../lib/use-pending-requests-dot"
import { DashboardCharts } from "./dashboard-charts"
import { DashboardMeetingInvites } from "./dashboard-meeting-invites"
import { DashboardQuickActions } from "./dashboard-quick-actions"
import { DashboardRecentDocuments } from "./dashboard-recent-documents"
import { DashboardRecentMeetings } from "./dashboard-recent-meetings"
import { DashboardSigningSessions } from "./dashboard-signing-sessions"
import { DashboardStatsCards } from "./dashboard-stats-cards"
import { DashboardUpcomingAppointments } from "./dashboard-upcoming-appointments"

type DashboardStatistics = RouterOutputs["dashboard"]["getStatistics"]

export function DashboardContent() {
	const router = useRouter()
	const pathname = usePathname()
	const { data: session } = useSession()
	const userRole = session?.user?.role ?? "PRINCIPAL"
	const isENP = userRole === "ENP"
	const isPrincipal = userRole === "PRINCIPAL"
	const utils = trpc.useUtils()

	const { broadcast } = useKycBroadcast()

	const { data: statistics, isLoading: isLoadingStats } = trpc.dashboard.getStatistics.useQuery()

	useEffect(() => {
		if (session?.user?.kycStatus === "VERIFIED") {
			broadcast({
				type: "KYC_VERIFIED",
				userId: session.user.id,
				timestamp: Date.now(),
			})
		}
	}, [session?.user?.kycStatus, session?.user?.id, broadcast])

	const { data: upcomingAppointments, isLoading: isLoadingUpcoming } =
		trpc.dashboard.getUpcomingAppointments.useQuery({ limit: 5 })
	const { data: recentDocuments, isLoading: isLoadingDocuments } =
		trpc.dashboard.getRecentDocuments.useQuery({ limit: 5 })
	const { data: recentMeetings, isLoading: isLoadingMeetings } =
		trpc.dashboard.getRecentMeetings.useQuery({ limit: 5 })
	const { data: signingSessions, isLoading: isLoadingSessions } =
		trpc.dashboard.getSigningSessions.useQuery(
			{ limit: 5 },
			{
				refetchInterval: 3000,
				refetchOnWindowFocus: true,
				staleTime: 0,
			}
		)
	const { data: meetingInvites, isLoading: isLoadingInvites } =
		trpc.dashboard.getMeetingInvites.useQuery({ limit: 5 })

	const respondToInvite = trpc.meetings.respondToInvite.useMutation({
		onSuccess: async () => {
			await utils.dashboard.getMeetingInvites.invalidate()
			await utils.dashboard.getRecentMeetings.invalidate()
			await utils.meetings.getUserMeetings.invalidate()
		},
	})

	const { data: activityData, isLoading: isLoadingActivity } =
		trpc.dashboard.getActivitySummary.useQuery({ days: 30 })
	const { data: appointmentTypeData, isLoading: isLoadingAppointmentTypes } =
		trpc.dashboard.getAppointmentTypeDistribution.useQuery()
	const { data: appointmentStatusData, isLoading: isLoadingAppointmentStatus } =
		trpc.dashboard.getAppointmentStatusDistribution.useQuery()
	const { data: documentStatusData, isLoading: isLoadingDocumentStatus } =
		trpc.dashboard.getDocumentStatusDistribution.useQuery()

	const { hasViewedRequests, markAsViewed } = usePendingRequestsDot({ isENP, statistics, pathname })

	const activityChartData = useMemo(
		() =>
			buildActivityChartData(
				activityData ?? {
					appointments: [],
					documents: [],
				}
			),
		[activityData]
	)
	const appointmentTypeChartData = useMemo(
		() => buildAppointmentTypeChartData(appointmentTypeData ?? []),
		[appointmentTypeData]
	)
	const appointmentStatusChartData = useMemo(
		() => buildAppointmentStatusChartData(appointmentStatusData ?? []),
		[appointmentStatusData]
	)
	const documentStatusChartData = useMemo(
		() => buildDocumentStatusChartData(documentStatusData ?? []),
		[documentStatusData]
	)

	const statsCards = useMemo(() => {
		if (!statistics) {
			return []
		}
		const stats: DashboardStatistics = statistics
		const baseStats = [
			{
				title: isENP ? "Total Clients" : "Total Appointments",
				value: stats.totalAppointments ?? 0,
				icon: isENP ? UserIcon : Calendar01Icon,
				description: "All time",
				color: "text-blue-600",
				bgColor: "bg-blue-50",
			},
			{
				title: "Pending",
				value: stats.pendingAppointments ?? 0,
				icon: Clock01Icon,
				description: isENP ? "Pending requests" : "Awaiting confirmation",
				color: "text-orange-600",
				bgColor: "bg-orange-50",
			},
			{
				title: "Documents",
				value: stats.totalDocuments ?? 0,
				icon: File01Icon,
				description: "Total uploaded",
				color: "text-purple-600",
				bgColor: "bg-purple-50",
			},
		]

		if (isENP) {
			baseStats.push({
				title: "Notarization Requests",
				value: stats.pendingNotarizationRequests ?? 0,
				icon: ClipboardIcon,
				description: "Pending requests",
				color: "text-orange-600",
				bgColor: "bg-orange-50",
			})
			baseStats.push({
				title: "Signature Requests",
				value: stats.pendingSignatureRequests ?? 0,
				icon: FileAddIcon,
				description: "Pending signatures",
				color: "text-pink-600",
				bgColor: "bg-pink-50",
			})
		} else {
			baseStats.push({
				title: "Completed",
				value: stats.completedAppointments ?? 0,
				icon: CheckmarkCircle01Icon,
				description: "Successfully finished",
				color: "text-green-600",
				bgColor: "bg-green-50",
			})
		}

		return baseStats
	}, [statistics, isENP])

	function handleAcceptInvite(meetingId: string) {
		respondToInvite.mutate(
			{ meetingId, response: "ACCEPT" },
			{
				onSuccess: () => {
					toast.success("Invite accepted")
					router.push(`/sessions/${meetingId}` as Route)
				},
				onError: err => {
					toast.error(err.message || "Failed to accept invite")
				},
			}
		)
	}

	function handleDeclineInvite(meetingId: string) {
		respondToInvite.mutate(
			{ meetingId, response: "DECLINE" },
			{
				onSuccess: () => {
					toast.message("Invite declined")
				},
				onError: err => {
					toast.error(err.message || "Failed to decline invite")
				},
			}
		)
	}

	return (
		<main className="flex-1 p-4 md:p-6 lg:p-8">
			<div className="mx-auto max-w-7xl space-y-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{isENP ? "ENP Dashboard" : "Dashboard"}
					</h1>
					<p className="text-muted-foreground mt-2">
						{isENP
							? "Welcome back! Manage your clients and track your notarization services."
							: "Welcome back! Here's an overview of your notarization activities."}
					</p>
				</div>

				<DashboardStatsCards
					statsCards={statsCards}
					isLoading={isLoadingStats}
					isENP={isENP}
					pendingNotarizationRequests={statistics?.pendingNotarizationRequests ?? 0}
					hasViewedRequests={hasViewedRequests}
				/>

				<DashboardQuickActions
					isENP={isENP}
					isPrincipal={isPrincipal}
					pendingNotarizationRequests={statistics?.pendingNotarizationRequests ?? 0}
					hasViewedRequests={hasViewedRequests}
					onMarkRequestsViewed={markAsViewed}
				/>

				<DashboardSigningSessions
					sessions={signingSessions}
					isLoading={isLoadingSessions}
					isPrincipal={isPrincipal}
				/>

				<DashboardCharts
					activityChartData={activityChartData}
					appointmentTypeChartData={appointmentTypeChartData}
					appointmentStatusChartData={appointmentStatusChartData}
					documentStatusChartData={documentStatusChartData}
					isLoadingActivity={isLoadingActivity}
					isLoadingAppointmentTypes={isLoadingAppointmentTypes}
					isLoadingAppointmentStatus={isLoadingAppointmentStatus}
					isLoadingDocumentStatus={isLoadingDocumentStatus}
				/>

				<div className="grid gap-8 lg:grid-cols-2">
					<DashboardMeetingInvites
						invites={meetingInvites}
						isLoading={isLoadingInvites}
						isRespondingToInvite={respondToInvite.isPending}
						onAccept={handleAcceptInvite}
						onDecline={handleDeclineInvite}
					/>
					<DashboardUpcomingAppointments
						appointments={upcomingAppointments}
						isLoading={isLoadingUpcoming}
						isENP={isENP}
					/>
					<DashboardRecentDocuments documents={recentDocuments} isLoading={isLoadingDocuments} />
				</div>

				<DashboardRecentMeetings meetings={recentMeetings} isLoading={isLoadingMeetings} />
			</div>
		</main>
	)
}
