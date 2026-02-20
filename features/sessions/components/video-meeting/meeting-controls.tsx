"use client"

import React, { useEffect, useRef, useState } from "react"
import { useMeeting } from "@videosdk.live/react-sdk"
import {
	Camera,
	CameraOff,
	CircleDot,
	FileUp,
	Mic,
	MicOff,
	Monitor,
	PhoneOff,
	Square,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

import { formatElapsedMs } from "../../lib/utils"

interface MeetingControlsProps {
	onUploadClick?: () => void
	onRecordingToggle?: () => Promise<void> | void
	onLocalRecordingToggle?: () => Promise<void> | void
	localRecordingSupported?: boolean
	isRecording?: boolean
	isRecordingStarting?: boolean
	isLocalRecording?: boolean
	localRecordingStartedAt?: number | null
}

export const MeetingControls = React.memo(function MeetingControls({
	onUploadClick,
	onLocalRecordingToggle,
	isLocalRecording,
	localRecordingStartedAt,
}: MeetingControlsProps) {
	const cameraSetterRef = useRef<((v: boolean) => void) | null>(null)
	const meeting = useMeeting({
		onError: ({ code, message }: { code: string; message: string }) => {
			const isVideoRelated =
				/camera|video|webcam|video track|video source|unable to initiate|permission/i.test(
					message
				) || /video|webcam|camera/i.test(String(code ?? ""))
			if (isVideoRelated) {
				cameraSetterRef.current?.(meeting?.localWebcamOn ?? false)
				toast.error(
					"Camera access denied or unavailable. Check browser permissions and ensure no other app is using the camera."
				)
			}
		},
	})
	const localMicOn = (meeting as { localMicOn?: boolean } | null)?.localMicOn
	const localScreenShareOn = (meeting as { localScreenShareOn?: boolean } | null)
		?.localScreenShareOn
	const recordingState = (meeting as { recordingState?: string } | null)?.recordingState

	const [isCameraOn, setIsCameraOn] = useState(() => meeting?.localWebcamOn ?? false)
	cameraSetterRef.current = setIsCameraOn
	const [isMicOn, setIsMicOn] = useState(() => localMicOn ?? false)
	const [isScreenSharing, setIsScreenSharing] = useState(() => localScreenShareOn ?? false)
	const [isRecordingLocal, setIsRecordingLocal] = useState(false)

	useEffect(() => {
		if (meeting?.localWebcamOn !== undefined) setIsCameraOn(meeting.localWebcamOn)
	}, [meeting?.localWebcamOn])

	useEffect(() => {
		if (localMicOn !== undefined) setIsMicOn(localMicOn)
	}, [localMicOn])

	useEffect(() => {
		if (localScreenShareOn !== undefined) setIsScreenSharing(localScreenShareOn)
	}, [localScreenShareOn])

	useEffect(() => {
		if (recordingState) {
			const recording =
				recordingState === "RECORDING_STARTED" || recordingState === "RECORDING_STARTING"
			setIsRecordingLocal(recording)
		}
	}, [recordingState])

	const localRecordingActive = isLocalRecording ?? false
	const [localRecordingElapsed, setLocalRecordingElapsed] = useState("00:00")

	useEffect(() => {
		if (!localRecordingActive || !localRecordingStartedAt) {
			setLocalRecordingElapsed("00:00")
			return
		}

		setLocalRecordingElapsed(formatElapsedMs(Date.now() - localRecordingStartedAt))
		const interval = setInterval(() => {
			setLocalRecordingElapsed(formatElapsedMs(Date.now() - localRecordingStartedAt))
		}, 1000)

		return () => clearInterval(interval)
	}, [localRecordingActive, localRecordingStartedAt])

	const handleToggleCamera = async () => {
		if (!meeting) return
		try {
			setIsCameraOn(prev => !prev)
			const maybePromise = (meeting as unknown as { toggleWebcam: () => unknown }).toggleWebcam()
			if (
				typeof maybePromise === "object" &&
				maybePromise !== null &&
				"then" in maybePromise &&
				typeof (maybePromise as { then?: unknown }).then === "function"
			) {
				await (maybePromise as Promise<void>)
			}
		} catch (error) {
			console.error("Error toggling camera:", error)
			const raw = error instanceof Error ? error.message : String(error)
			const isPermissionOrSource =
				/camera|video|webcam|video track|video source|unable to initiate|permission|denied|not found|in use/i.test(
					raw
				)
			const message = isPermissionOrSource
				? "Camera access denied or unavailable. Check browser permissions and ensure no other app is using the camera."
				: raw || "Failed to toggle camera"
			toast.error(message)
			if (meeting?.localWebcamOn !== undefined) setIsCameraOn(meeting.localWebcamOn)
		}
	}

	const handleToggleMic = async () => {
		if (!meeting) return
		try {
			setIsMicOn(prev => !prev)
			const toggleMicFn = (meeting as { toggleMic?: () => Promise<void> | void }).toggleMic
			await toggleMicFn?.()
		} catch (error) {
			console.error("Error toggling microphone:", error)
			toast.error("Failed to toggle microphone")
			const localMicOn = (meeting as { localMicOn?: boolean } | null)?.localMicOn
			if (localMicOn !== undefined) setIsMicOn(localMicOn)
		}
	}

	const handleLeave = () => {
		meeting?.leave()
	}

	const handleToggleScreenShare = async () => {
		if (!meeting) return
		try {
			setIsScreenSharing(prev => !prev)
			await (
				meeting as unknown as { toggleScreenShare?: () => Promise<void> | void }
			).toggleScreenShare?.()
		} catch (error) {
			console.error("Error toggling screen share:", error)
		}
	}

	const handleToggleRecording = async () => {
		if (onLocalRecordingToggle) {
			await onLocalRecordingToggle()
		}
	}

	return (
		<>
			<div className="flex items-center gap-1.5 md:gap-2">
				<Button
					variant={isCameraOn ? "outline" : "destructive"}
					size="icon"
					className="size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10"
					onClick={handleToggleCamera}
					title={isCameraOn ? "Turn off camera" : "Turn on camera"}
				>
					{isCameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
				</Button>

				<Button
					variant={isMicOn ? "outline" : "destructive"}
					size="icon"
					className={cn(
						"size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10",
						!isMicOn && "animate-pulse"
					)}
					onClick={handleToggleMic}
					title={isMicOn ? "Mute microphone" : "Unmute microphone"}
				>
					{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
				</Button>

				<Button
					variant={isScreenSharing ? "destructive" : "outline"}
					size="icon"
					className="size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10"
					onClick={handleToggleScreenShare}
					title={isScreenSharing ? "Stop sharing" : "Share screen"}
				>
					<Monitor className="size-4" />
				</Button>

				<Button
					variant={localRecordingActive ? "destructive" : "outline"}
					size="icon"
					className={cn(
						"size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10",
						localRecordingActive && "animate-pulse"
					)}
					onClick={handleToggleRecording}
					title={
						localRecordingActive ? `Stop recording (${localRecordingElapsed})` : "Start recording"
					}
				>
					{localRecordingActive ? (
						<Square className="size-4 fill-current" />
					) : (
						<CircleDot className="size-4" />
					)}
				</Button>

				{onUploadClick && (
					<Button
						variant="outline"
						size="icon"
						className="size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10"
						onClick={onUploadClick}
						title="Upload document"
					>
						<FileUp className="size-4" />
					</Button>
				)}

				<Button
					variant="destructive"
					size="icon"
					className="size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10"
					onClick={handleLeave}
					title="Leave session"
				>
					<PhoneOff className="size-4" />
				</Button>
			</div>
		</>
	)
})
