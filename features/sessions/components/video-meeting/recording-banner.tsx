"use client"

import React, { useEffect, useState } from "react"

import type { RecordingBannerProps } from "../../lib/video-meeting"
import { formatElapsedMs } from "../../lib/video-meetins-utils"

export const RecordingBanner = React.memo(function RecordingBanner({
	isLocalRecording,
	localRecordingStartedAt,
	isAnyoneRecording,
	recordingParticipantName,
	recordingStopped,
	stoppedElapsed,
}: RecordingBannerProps) {
	const [elapsed, setElapsed] = useState("00:00")

	// Use local recording state or remote recording state
	const isRecordingActive = isLocalRecording || isAnyoneRecording
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: need || to check falsy boolean, not just null/undefined
	const showBanner = isRecordingActive || recordingStopped

	useEffect(() => {
		if (!isRecordingActive || !localRecordingStartedAt) {
			setElapsed("00:00")
			return
		}

		setElapsed(formatElapsedMs(Date.now() - localRecordingStartedAt))
		const interval = setInterval(() => {
			setElapsed(formatElapsedMs(Date.now() - localRecordingStartedAt))
		}, 1000)

		return () => clearInterval(interval)
	}, [isRecordingActive, localRecordingStartedAt])

	if (!showBanner) return null

	// Show stopped message
	if (recordingStopped && !isRecordingActive) {
		return (
			<div className="bg-muted/50 border-muted-foreground/30 text-muted-foreground mb-3 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
				<div className="flex items-center gap-2">
					<span className="bg-muted-foreground inline-flex h-2 w-2 rounded-full" />
					<span className="font-semibold">Meeting recording stopped.</span>
					<span className="text-muted-foreground/80">{stoppedElapsed ?? "00:00"}</span>
				</div>
				<span className="text-muted-foreground/70 text-xs">
					{recordingParticipantName ?? "Someone"} stopped the recording
				</span>
			</div>
		)
	}

	return (
		<div className="bg-destructive/10 border-destructive/30 text-destructive mb-3 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
			<div className="flex items-center gap-2">
				<span className="bg-destructive inline-flex h-2 w-2 animate-pulse rounded-full" />
				<span className="font-semibold">Meeting is being recorded.</span>
				<span className="text-destructive/80">{elapsed}</span>
			</div>
			<span className="text-destructive/70 text-xs">
				{recordingParticipantName ?? "Someone"} started the recording
			</span>
		</div>
	)
})
