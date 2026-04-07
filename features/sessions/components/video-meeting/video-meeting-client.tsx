"use client"

import { MeetingProvider } from "@videosdk.live/react-sdk"

import { MeetingView } from "./meeting-view"

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export interface VideoMeetingClientProps {
	meetingId: string // VideoSDK room ID
	dbMeetingId?: string // Database meeting ID for uploads
	token: string
	participantName: string
	onLeave?: () => void
}

export function VideoMeetingClient({
	meetingId,
	dbMeetingId,
	token,
	participantName,
	onLeave,
}: VideoMeetingClientProps) {
	const isDevelopment =
		typeof window === "undefined" ? false : window.location.hostname === "localhost"

	return (
		<MeetingProvider
			config={{
				meetingId,
				micEnabled: false,
				webcamEnabled: false,
				name: participantName,
				mode: "SEND_AND_RECV",
				multiStream: true,
				debugMode: isDevelopment,
			}}
			token={token}
			joinWithoutUserInteraction
		>
			<MeetingView onLeave={onLeave} meetingId={dbMeetingId} />
		</MeetingProvider>
	)
}
