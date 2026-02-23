"use client"

import React, { useEffect, useRef, useState } from "react"
import { useMeeting } from "@videosdk.live/react-sdk"
import {
	Camera,
	CameraOff,
	CircleDot,
	FileUp,
	Loader2,
	Mic,
	MicOff,
	Monitor,
	PhoneOff,
	Square,
	Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

import { formatElapsedMs } from "../../lib/utils"

interface MeetingControlsProps {
	onUploadClick?: () => void
	isUploadDisabled?: boolean
	isUploadLoading?: boolean
	onRecordingToggle?: () => Promise<void> | void
	onLocalRecordingToggle?: () => Promise<void> | void
	localRecordingSupported?: boolean
	isRecording?: boolean
	isRecordingStarting?: boolean
	isLocalRecording?: boolean
	localRecordingStartedAt?: number | null
	participantCount?: number
}

export const MeetingControls = React.memo(function MeetingControls({
	onUploadClick,
	isUploadDisabled,
	isUploadLoading,
	onLocalRecordingToggle,
	isLocalRecording,
	localRecordingStartedAt,
	participantCount,
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
			<div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/65 px-2.5 py-2 shadow-2xl backdrop-blur-xl md:gap-1.5 md:px-3">
				<Button
					variant={isCameraOn ? "ghost" : "destructive"}
					size="icon"
					className={cn(
						"size-9 rounded-full transition-all md:size-10",
						isCameraOn && "text-white/80 hover:bg-white/10 hover:text-white"
					)}
					onClick={handleToggleCamera}
					title={isCameraOn ? "Turn off camera" : "Turn on camera"}
				>
					{isCameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
				</Button>

				<Button
					variant={isMicOn ? "ghost" : "destructive"}
					size="icon"
					className={cn(
						"size-9 rounded-full transition-all md:size-10",
						isMicOn && "text-white/80 hover:bg-white/10 hover:text-white",
						!isMicOn && "animate-pulse"
					)}
					onClick={handleToggleMic}
					title={isMicOn ? "Mute microphone" : "Unmute microphone"}
				>
					{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
				</Button>

				<Button
					variant={isScreenSharing ? "destructive" : "ghost"}
					size="icon"
					className={cn(
						"size-9 rounded-full transition-all md:size-10",
						!isScreenSharing && "text-white/80 hover:bg-white/10 hover:text-white"
					)}
					onClick={handleToggleScreenShare}
					title={isScreenSharing ? "Stop sharing" : "Share screen"}
				>
					<Monitor className="size-4" />
				</Button>

				<Button
					variant={localRecordingActive ? "destructive" : "ghost"}
					size="icon"
					className={cn(
						"size-9 rounded-full transition-all md:size-10",
						!localRecordingActive && "text-white/80 hover:bg-white/10 hover:text-white",
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
						variant="ghost"
						size="icon"
						className={cn(
							"size-9 rounded-full text-white/80 transition-all hover:bg-white/10 hover:text-white md:size-10",
							(isUploadDisabled ?? isUploadLoading) && "cursor-not-allowed opacity-60"
						)}
						onClick={onUploadClick}
						disabled={isUploadDisabled ?? isUploadLoading}
						title="Upload document"
					>
						{isUploadLoading ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<FileUp className="size-4" />
						)}
						{isUploadLoading ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<FileUp className="size-4" />
						)}
					</Button>
				)}

				{/* Divider before leave */}
				<div className="mx-1 h-6 w-px bg-white/15" />

				{participantCount !== undefined && (
					<div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-white/80">
						<Users className="size-3.5" />
						<span className="text-xs font-medium tabular-nums">{participantCount}</span>
					</div>
				)}

				{/* Divider before leave */}
				<div className="mx-1 h-6 w-px bg-white/15" />

				<Button
					variant="destructive"
					size="icon"
					className="size-9 rounded-full transition-all md:size-10"
					onClick={handleLeave}
					title="Leave session"
				>
					<PhoneOff className="size-4" />
				</Button>
			</div>
		</>
	)
})
