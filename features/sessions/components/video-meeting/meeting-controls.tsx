"use client"

import React, { useEffect, useRef, useState } from "react"
import { useMeeting } from "@videosdk.live/react-sdk"
import {
	Camera,
	CameraOff,
	CircleDot,
	Loader2,
	Mic,
	MicOff,
	Monitor,
	PhoneOff,
	Square,
	StopCircle,
	UserPlus,
	Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip"
import { cn } from "@/core/lib/utils"

import { formatElapsedMs } from "../../lib/utils"

interface MeetingControlsProps {
	onRecordingToggle?: () => Promise<void> | void
	onLocalRecordingToggle?: () => Promise<void> | void
	localRecordingSupported?: boolean
	isRecording?: boolean
	isRecordingStarting?: boolean
	isLocalRecording?: boolean
	localRecordingStartedAt?: number | null
	participantCount?: number
	canInvitePeople?: boolean
	onInvitePeopleClick?: () => void
	onEndMeetingClick?: () => void
	isEndMeetingDisabled?: boolean
	isEndMeetingLoading?: boolean
	endMeetingDisabledReason?: string
}

export const MeetingControls = React.memo(function MeetingControls({
	onLocalRecordingToggle,
	isLocalRecording,
	localRecordingStartedAt,
	participantCount = 0,
	canInvitePeople = false,
	onInvitePeopleClick,
	onEndMeetingClick,
	isEndMeetingDisabled,
	isEndMeetingLoading,
	endMeetingDisabledReason,
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
	const [isInviteActionOpen, setIsInviteActionOpen] = useState(false)
	const participantControlRef = useRef<HTMLDivElement | null>(null)

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

	useEffect(() => {
		if (!isInviteActionOpen) return
		const handlePointerDown = (event: MouseEvent) => {
			if (!participantControlRef.current) return
			if (participantControlRef.current.contains(event.target as Node)) return
			setIsInviteActionOpen(false)
		}
		document.addEventListener("mousedown", handlePointerDown)
		return () => document.removeEventListener("mousedown", handlePointerDown)
	}, [isInviteActionOpen])

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

	const handleInvitePeopleClick = () => {
		setIsInviteActionOpen(false)
		onInvitePeopleClick?.()
	}

	return (
		<>
			<div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-zinc-900/90 px-4 py-2 shadow-xl backdrop-blur-md">
				<Button
					variant={isCameraOn ? "ghost" : "destructive"}
					className={cn(
						isCameraOn
							? "h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
							: "h-10 rounded-xl px-3"
					)}
					onClick={handleToggleCamera}
					title={isCameraOn ? "Turn off camera" : "Turn on camera"}
				>
					{isCameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
				</Button>

				<Button
					variant={isMicOn ? "ghost" : "destructive"}
					className={cn(
						isMicOn
							? "h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
							: "h-10 rounded-xl px-3",
						!isMicOn && "animate-pulse"
					)}
					onClick={handleToggleMic}
					title={isMicOn ? "Mute microphone" : "Unmute microphone"}
				>
					{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
				</Button>

				<Button
					variant={isScreenSharing ? "destructive" : "ghost"}
					className={cn(
						!isScreenSharing
							? "h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
							: "h-10 rounded-xl px-3"
					)}
					onClick={handleToggleScreenShare}
					title={isScreenSharing ? "Stop sharing" : "Share screen"}
				>
					<Monitor className="size-4" />
				</Button>

				<Button
					variant={localRecordingActive ? "destructive" : "ghost"}
					className={cn(
						!localRecordingActive
							? "h-10 rounded-xl px-3 text-white/80 hover:bg-white/10 hover:text-white"
							: "h-10 rounded-xl px-3",
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

				<Button
					variant="destructive"
					className="h-10 rounded-xl px-3"
					onClick={handleLeave}
					title="Leave session"
				>
					<PhoneOff className="size-4" />
				</Button>

				{onEndMeetingClick && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="inline-flex">
								<Button
									variant="destructive"
									className={cn(
										"h-10 rounded-xl px-3",
										isEndMeetingDisabled && "cursor-not-allowed opacity-60"
									)}
									onClick={onEndMeetingClick}
									disabled={Boolean(isEndMeetingDisabled) || Boolean(isEndMeetingLoading)}
									title="End session"
								>
									{isEndMeetingLoading ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<StopCircle className="size-4" />
									)}
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent side="top">
							{isEndMeetingDisabled
								? endMeetingDisabledReason ?? "You cannot end this session"
								: "End session"}
						</TooltipContent>
					</Tooltip>
				)}

				<div
					ref={participantControlRef}
					className="ml-1 flex h-10 items-center overflow-hidden border-l border-white/10 pl-2 text-white/80"
				>
					<div title="Participants in session" className="flex h-full items-center gap-1.5 px-3">
						<Users className="size-4" />
						<span className="text-xs leading-none font-medium tabular-nums">
							{participantCount}
						</span>
					</div>
					{canInvitePeople && onInvitePeopleClick && (
						<button
							onClick={handleInvitePeopleClick}
							title="Add people"
							className="flex h-full items-center border-l border-white/10 px-3 transition-colors hover:bg-white/10 hover:text-white"
						>
							<UserPlus className="size-4" />
						</button>
					)}
				</div>
			</div>
		</>
	)
})
