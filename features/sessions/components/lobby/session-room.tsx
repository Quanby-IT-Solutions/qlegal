"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useSession } from "next-auth/react"

import { KycRequiredDialog } from "@/core/components/kyc-required-dialog"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	isLawyerBookingBlockedForKyc,
	KYC_ENP_PRINCIPAL_SESSION_JOIN_MESSAGE,
} from "@/core/lib/kyc-restriction-guards"

import { useMeetings } from "@/features/sessions/api/meetings.hooks"

// Dynamically import VideoSDK component (client-only, no SSR)
const VideoMeetingClient = dynamic(
	() =>
		import("@/features/sessions/components/video-meeting/video-meeting-client").then(
			mod => mod.VideoMeetingClient
		),
	{
		ssr: false,
		loading: () => (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<div className="text-center">
					<div className="border-primary mx-auto mb-4 size-12 animate-spin rounded-full border-b-4" />
					<p className="text-muted-foreground font-medium">Loading video SDK...</p>
				</div>
			</div>
		),
	}
)

interface SessionRoomProps {
	id: string
	onLeave: () => void
}

function trpcErrorMessage(err: unknown): string | undefined {
	if (err && typeof err === "object" && "message" in err) {
		const m = (err as { message: unknown }).message
		return typeof m === "string" ? m : undefined
	}
	return undefined
}

export function SessionRoom({ id, onLeave }: SessionRoomProps) {
	const router = useRouter()
	const { data: session, status } = useSession()
	const sessionKyc =
		typeof session?.user?.kycStatus === "string" ? session.user.kycStatus : undefined
	const kycJoinBlocked = isLawyerBookingBlockedForKyc(session?.user?.role, sessionKyc)
	const tokenEnabled = status === "authenticated" && !kycJoinBlocked && Boolean(id?.trim())

	const { getById, getToken } = useMeetings()
	const { data: meeting, isLoading: isMeetingLoading, error: meetingError } = getById(id)
	const {
		data: tokenData,
		isLoading: isTokenLoading,
		error: tokenError,
		isError: isTokenError,
	} = getToken(id, { enabled: tokenEnabled })

	useEffect(() => {
		if (!session) {
			router.push(`/auth/login?callbackUrl=/sessions/${id}`)
		}
	}, [session, router, id])

	if (status === "loading" || status === "unauthenticated") {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	if (status === "authenticated" && kycJoinBlocked) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br p-4">
				<KycRequiredDialog
					open
					onOpenChange={open => {
						if (!open) router.push("/sessions")
					}}
					returnToPath="/sessions"
					description="Complete identity verification before joining a session. You can finish verification from here."
				/>
			</div>
		)
	}

	if (isMeetingLoading || (tokenEnabled && isTokenLoading)) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	const tokenBlockedByKyc =
		isTokenError &&
		(trpcErrorMessage(tokenError) === KYC_ENP_PRINCIPAL_SESSION_JOIN_MESSAGE ||
			trpcErrorMessage(tokenError)?.includes("Complete identity verification before joining"))

	if (tokenBlockedByKyc) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br p-4">
				<KycRequiredDialog
					open
					onOpenChange={open => {
						if (!open) router.push("/sessions")
					}}
					returnToPath="/sessions"
					description="Complete identity verification before joining a session. You can finish verification from here."
				/>
			</div>
		)
	}

	if (!meeting || meetingError || !tokenData) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-bold">Meeting not found</h2>
						<p className="text-muted-foreground mt-2">
							The meeting you're looking for doesn't exist.
						</p>
						<Button className="mt-6" onClick={() => router.push("/sessions")}>
							Back to Sessions
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Check if meeting is ongoing
	if (meeting.status !== "ONGOING") {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="mb-2 text-2xl font-bold">{meeting.title}</h2>
						<p className="text-muted-foreground mb-6">
							{meeting.status === "SCHEDULED"
								? "This meeting has not started yet. Please wait for the host to start the meeting."
								: "This meeting has ended."}
						</p>
						<Button onClick={() => router.push("/sessions")}>Back to Sessions</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!meeting.roomId) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-bold">Meeting room not available</h2>
						<p className="text-muted-foreground mt-4">This meeting has not been started yet</p>
						<Button className="mt-6" onClick={() => router.push("/sessions")}>
							Back to Sessions
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Directly render video meeting - no extra "Ready to join" screen
	return (
		<VideoMeetingClient
			meetingId={meeting.roomId}
			dbMeetingId={id}
			token={tokenData.token}
			participantName={session?.user?.name ?? "Guest"}
			onLeave={onLeave}
		/>
	)
}
