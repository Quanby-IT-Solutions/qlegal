"use client"

import { useCallback, useRef, useState } from "react"
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk"
import { toast } from "sonner"

import { formatElapsedMs } from "@/features/sessions/lib/utils"

interface UseRecordingParams {
	meeting: ReturnType<typeof useMeeting>
	session: { user?: { name?: string | null } } | null | undefined
	onLeave?: () => void
}

export function useRecording({ meeting, session, onLeave: _onLeave }: UseRecordingParams) {
	const [isRecording, setIsRecording] = useState(false)
	const [recordingStatus, setRecordingStatus] = useState<string>("RECORDING_STOPPED")
	const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
	const [isLocalRecording, setIsLocalRecording] = useState(false)
	const [localRecordingStartedAt, setLocalRecordingStartedAt] = useState<number | null>(null)
	const [isAnyoneRecording, setIsAnyoneRecording] = useState(false)
	const [recordingParticipantName, setRecordingParticipantName] = useState<string | null>(null)
	const [recordingStopped, setRecordingStopped] = useState(false)
	const [stoppedElapsed, setStoppedElapsed] = useState<string | null>(null)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const localStreamRef = useRef<MediaStream | null>(null)

	const localRecordingSupported =
		(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia) ||
		(typeof HTMLDivElement !== "undefined" &&
			typeof (HTMLDivElement.prototype as { captureStream?: unknown })?.captureStream ===
				"function")

	useMeeting({
		onRecordingStateChanged: (data: { status: string }) => {
			const status = data.status
			setRecordingStatus(status)
			if (status === "RECORDING_STARTED") {
				setIsRecording(true)
				setRecordingStartedAt(Date.now())
				toast.success("Recording started")
			} else if (status === "RECORDING_STOPPED") {
				setIsRecording(false)
				setRecordingStartedAt(null)
				toast.success("Recording stopped")
			} else if (status === "RECORDING_STARTING") {
				toast.message("Starting recording...")
			}
		},
	})

	const { publish: publishRecordingStatus } = usePubSub("LOCAL_RECORDING_STATUS", {
		onMessageReceived: (message: { message: string; senderName: string }) => {
			if (message.message.startsWith("RECORDING_STARTED")) {
				setRecordingStopped(false)
				setStoppedElapsed(null)
				setIsAnyoneRecording(true)
				setRecordingParticipantName(message.senderName)
				const parts = message.message.split(":")
				if (parts[1]) {
					const startTime = parseInt(parts[1], 10)
					if (!isNaN(startTime)) setLocalRecordingStartedAt(startTime)
				}
			} else if (message.message.startsWith("RECORDING_STOPPED")) {
				setIsAnyoneRecording(false)
				setLocalRecordingStartedAt(null)
				const elapsed = message.message.split(":").slice(1).join(":") || null
				setRecordingStopped(true)
				setStoppedElapsed(elapsed)
				setTimeout(() => {
					setRecordingStopped(false)
					setStoppedElapsed(null)
					setRecordingParticipantName(null)
				}, 5000)
			}
		},
	})

	const startLocalRecording = useCallback(async () => {
		if (isLocalRecording) return
		if (!meeting) {
			toast.error("Meeting not ready yet")
			return
		}
		try {
			const startedAt = Date.now()
			const meetingWithRecording = meeting as unknown as {
				startRecording?: () => Promise<void> | void
			}
			const recordingResult = meetingWithRecording.startRecording?.()
			if (recordingResult !== undefined && recordingResult instanceof Promise) {
				await recordingResult
			}
			setIsLocalRecording(true)
			setIsAnyoneRecording(true)
			setLocalRecordingStartedAt(startedAt)
			setRecordingParticipantName(session?.user?.name ?? "Someone")
			setRecordingStopped(false)
			setStoppedElapsed(null)
			publishRecordingStatus(`RECORDING_STARTED:${startedAt}`, { persist: false })
			toast.success("Cloud recording started")
		} catch (error) {
			console.error("Cloud recording error:", error)
			toast.error("Failed to start cloud recording")
		}
	}, [isLocalRecording, meeting, publishRecordingStatus, session?.user?.name])

	const stopLocalRecording = useCallback(async () => {
		if (!meeting || !isLocalRecording) return
		try {
			const meetingWithRecording = meeting as unknown as {
				stopRecording?: () => Promise<void> | void
			}
			const stopResult = meetingWithRecording.stopRecording?.()
			if (stopResult !== undefined && stopResult instanceof Promise) await stopResult

			const elapsed = localRecordingStartedAt
				? formatElapsedMs(Date.now() - localRecordingStartedAt)
				: "00:00"
			setIsLocalRecording(false)
			setIsAnyoneRecording(false)
			setLocalRecordingStartedAt(null)
			setRecordingStopped(true)
			setStoppedElapsed(elapsed)
			setTimeout(() => {
				setRecordingStopped(false)
				setStoppedElapsed(null)
				setRecordingParticipantName(null)
			}, 5000)
			publishRecordingStatus(`RECORDING_STOPPED:${elapsed}`, { persist: false })
			toast.success("Cloud recording stopped")
		} catch (error) {
			console.error("Stop recording error:", error)
			toast.error("Failed to stop cloud recording")
		}
	}, [meeting, isLocalRecording, localRecordingStartedAt, publishRecordingStatus])

	const handleRecordingToggle = useCallback(async () => {
		if (!meeting) return
		if (recordingStatus === "RECORDING_STARTING") return
		try {
			const meetingWithRecording = meeting as unknown as {
				stopRecording?: () => Promise<void> | void
				startRecording?: (config?: unknown) => Promise<void> | void
			}
			if (isRecording) {
				setRecordingStatus("RECORDING_STOPPING")
				await meetingWithRecording.stopRecording?.()
			} else {
				setRecordingStatus("RECORDING_STARTING")
				await meetingWithRecording.startRecording?.({
					layout: { type: "GRID", priority: "SPEAKER", gridSize: 4, participants: ["*"] },
					theme: "DARK",
				})
			}
		} catch (error: unknown) {
			console.error("Error toggling recording:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to toggle recording"
			toast.error(errorMessage)
			setRecordingStatus(isRecording ? "RECORDING_STARTED" : "RECORDING_STOPPED")
		}
	}, [meeting, recordingStatus, isRecording])

	return {
		isRecording,
		recordingStatus,
		recordingStartedAt,
		isLocalRecording,
		localRecordingStartedAt,
		isAnyoneRecording,
		recordingParticipantName,
		recordingStopped,
		stoppedElapsed,
		localRecordingSupported,
		handleRecordingToggle,
		startLocalRecording,
		stopLocalRecording,
		publishRecordingStatus,
		mediaRecorderRef,
		localStreamRef,
	}
}
