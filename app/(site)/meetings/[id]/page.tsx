"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { use, useEffect } from "react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useMeetings } from "@/features/meetings/api/meetings.hooks"

// Dynamically import VideoSDK component (client-only, no SSR)
const VideoMeetingClient = dynamic(
	() => import("@/features/meetings/components/video-meeting-client").then((mod) => mod.VideoMeetingClient),
	{ 
		ssr: false,
		loading: () => (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<div className="text-center">
					<div className="size-12 animate-spin rounded-full border-b-4 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground font-medium">Loading video SDK...</p>
				</div>
			</div>
		)
	}
)

// Main page component
export default function MeetingRoomPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { data: session } = useSession()
	const { getById, getToken } = useMeetings()
	const { data: meeting, isLoading: isMeetingLoading } = getById(id)
	const { data: tokenData, isLoading: isTokenLoading } = getToken(id)

	useEffect(() => {
		if (!session) {
			router.push(`/auth/login?callbackUrl=/meetings/${id}`)
		}
	}, [session, router, id])

	const handleLeave = () => {
		router.push("/meetings")
	}

	if (isMeetingLoading || isTokenLoading) {
		return (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	if (!meeting || !tokenData) {
		return (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-bold">Meeting not found</h2>
						<p className="mt-2 text-muted-foreground">The meeting you're looking for doesn't exist.</p>
						<Button className="mt-6" onClick={() => router.push("/meetings")}>
							Back to Meetings
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	// Check if meeting is ongoing
	if (meeting.status !== "ONGOING") {
		return (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="mb-2 text-2xl font-bold">{meeting.title}</h2>
						<p className="mb-6 text-muted-foreground">
							{meeting.status === "SCHEDULED" 
								? "This meeting has not started yet. Please wait for the host to start the meeting."
								: "This meeting has ended."
							}
						</p>
						<Button onClick={() => router.push("/meetings")}>
							Back to Meetings
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!meeting.roomId) {
		return (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-bold">Meeting room not available</h2>
						<p className="mt-4 text-muted-foreground">This meeting has not been started yet</p>
						<Button className="mt-6" onClick={() => router.push("/meetings")}>
							Back to Meetings
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
			dbMeetingId={id} // Pass the database meeting ID for uploads
			token={tokenData.token}
			participantName={session?.user?.name ?? "Guest"}
			onLeave={handleLeave}
		/>
	)
}


