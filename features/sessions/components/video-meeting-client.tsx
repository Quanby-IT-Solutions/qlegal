"use client"

import React from "react"
import { MeetingProvider } from "@videosdk.live/react-sdk"

import type { VideoMeetingClientProps } from "../lib/video-meeting"
import { MeetingView } from "./video-meeting/meeting-view"

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
