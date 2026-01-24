"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MeetingProvider, useMeeting, useParticipant, usePubSub } from "@videosdk.live/react-sdk"
import {
	AlertCircle,
	Camera,
	CameraOff,
	CheckCircle2,
	CircleDot,
	Clock,
	Download,
	FileSignature,
	FileText,
	FileUp,
	GripVertical,
	Lock,
	Mic,
	MicOff,
	Monitor,
	MoreVertical,
	PhoneOff,
	Send,
	Square,
	Unlock,
	User,
	Users as UsersIcon,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { cn } from "@/core/lib/utils"

import { normalizeUrl } from "@/services/doconchain"
import { trpc } from "@/services/trpc/client"

import { MeetingDocumentUpload } from "./meeting-document-upload"

function formatElapsedMs(diffMs: number) {
	const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

// Memoized to prevent re-renders from parent state changes
const MeetingControls = React.memo(function MeetingControls({
	onUploadClick,
	onLocalRecordingToggle,
	isLocalRecording,
	localRecordingStartedAt,
}: {
	onUploadClick?: () => void
	onRecordingToggle?: () => Promise<void> | void
	onLocalRecordingToggle?: () => Promise<void> | void
	localRecordingSupported?: boolean
	isRecording?: boolean
	isRecordingStarting?: boolean
	isLocalRecording?: boolean
	localRecordingStartedAt?: number | null
}) {
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
	const [isMicOn, setIsMicOn] = useState(() => {
		// Default to false to avoid any “auto-hot-mic” surprises and to reduce initial work.
		return localMicOn ?? false
	})

	const [isScreenSharing, setIsScreenSharing] = useState(() => localScreenShareOn ?? false)
	const [isRecordingLocal, setIsRecordingLocal] = useState(false)

	useEffect(() => {
		if (meeting?.localWebcamOn !== undefined) {
			setIsCameraOn(meeting.localWebcamOn)
		}
	}, [meeting?.localWebcamOn])

	useEffect(() => {
		if (localMicOn !== undefined) {
			setIsMicOn(localMicOn)
		}
	}, [localMicOn])

	useEffect(() => {
		if (localScreenShareOn !== undefined) {
			setIsScreenSharing(localScreenShareOn)
		}
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
			// Optimistic UI update for instant feedback
			setIsCameraOn(prev => !prev)
			// VideoSDK's typings may mark this as void even when it returns a promise.
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
			// Re-sync back to SDK state on error
			if (meeting?.localWebcamOn !== undefined) setIsCameraOn(meeting.localWebcamOn)
		}
	}

	const handleToggleMic = async () => {
		if (!meeting) return

		try {
			// Optimistic UI for instant feedback; SDK state will resync via effect.
			setIsMicOn(prev => !prev)

			const toggleMicFn = (meeting as { toggleMic?: () => Promise<void> | void }).toggleMic
			await toggleMicFn?.()
		} catch (error) {
			console.error("Error toggling microphone:", error)
			toast.error("Failed to toggle microphone")
			// Re-sync back to SDK state on error
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
			// Optimistic UI update; SDK state will resync via effect
			setIsScreenSharing(prev => !prev)
			await (
				meeting as unknown as { toggleScreenShare?: () => Promise<void> | void }
			).toggleScreenShare?.()
		} catch (error) {
			console.error("Error toggling screen share:", error)
		}
	}

	// Start/stop recording directly on click - no dialog needed
	// (getDisplayMedia requires direct user gesture, dialog breaks the gesture chain)
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

// Simple participant video card with screen share support
// Memoized to prevent re-renders when parent state changes (e.g., document list updates)
const ParticipantView = React.memo(function ParticipantView({
	participantId,
}: {
	participantId: string
}) {
	const { webcamStream, displayName, isLocal, micOn, screenShareStream, screenShareOn, micStream } =
		useParticipant(participantId)
	const videoRef = useRef<HTMLVideoElement>(null)
	const audioRef = useRef<HTMLAudioElement>(null)
	const [hasTrack, setHasTrack] = useState(false)

	// Helper to extract MediaStream from various VideoSDK stream formats
	const getMediaStream = useMemo(() => {
		return (streamObj: unknown): MediaStream | null => {
			if (!streamObj) return null
			if (streamObj instanceof MediaStream) return streamObj
			if ((streamObj as { track?: MediaStreamTrack })?.track instanceof MediaStreamTrack) {
				return new MediaStream([(streamObj as { track: MediaStreamTrack }).track])
			}
			if ((streamObj as { stream?: MediaStream })?.stream instanceof MediaStream) {
				return (streamObj as { stream: MediaStream }).stream
			}
			if ((streamObj as { mediaStream?: MediaStream })?.mediaStream instanceof MediaStream) {
				return (streamObj as { mediaStream: MediaStream }).mediaStream
			}
			if (
				typeof (streamObj as { getTracks?: () => MediaStreamTrack[] })?.getTracks === "function"
			) {
				const tracks = (streamObj as { getTracks: () => MediaStreamTrack[] }).getTracks()
				if (tracks?.length) return new MediaStream(tracks)
			}
			if (
				typeof (streamObj as { getVideoTracks?: () => MediaStreamTrack[] })?.getVideoTracks ===
				"function"
			) {
				const vTracks = (streamObj as { getVideoTracks: () => MediaStreamTrack[] }).getVideoTracks()
				if (vTracks?.length) return new MediaStream(vTracks)
			}
			return null
		}
	}, [])

	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		const isLiveVideoTrack = (track: MediaStreamTrack) =>
			track.kind === "video" && track.readyState === "live" && track.enabled

		const screenStream = getMediaStream(screenShareStream)
		const webcamMediaStream = getMediaStream(webcamStream)

		const screenHasLiveVideo =
			!!screenStream && screenStream.getVideoTracks().some(isLiveVideoTrack)
		const webcamHasLiveVideo =
			!!webcamMediaStream && webcamMediaStream.getVideoTracks().some(isLiveVideoTrack)

		// Prefer screenshare when it has a live track.
		// Otherwise show webcam based on actual track state (more reliable than webcamOn flags).
		const mediaStream = screenHasLiveVideo
			? screenStream
			: webcamHasLiveVideo
				? webcamMediaStream
				: null

		if (mediaStream && mediaStream.getVideoTracks().length > 0) {
			setHasTrack(true)
			videoElement.srcObject = mediaStream
			videoElement.play().catch(() => {
				// ignore autoplay errors
			})
		} else {
			setHasTrack(false)
			videoElement.srcObject = null
		}
	}, [webcamStream, screenShareStream, getMediaStream])

	// Handle audio stream for remote participants
	// VideoSDK.live includes audio tracks in webcamStream when mic is enabled
	useEffect(() => {
		const audioElement = audioRef.current
		if (!audioElement || isLocal) return

		const getAudioStream = (streamObj: unknown): MediaStream | null => {
			if (!streamObj) return null
			if (streamObj instanceof MediaStream) {
				const audioTracks = streamObj.getAudioTracks()
				if (audioTracks.length > 0) {
					return new MediaStream(audioTracks)
				}
				return null
			}

			if ((streamObj as { stream?: MediaStream })?.stream instanceof MediaStream) {
				const stream = (streamObj as { stream: MediaStream }).stream
				const audioTracks = stream.getAudioTracks()
				if (audioTracks.length > 0) {
					return new MediaStream(audioTracks)
				}
			}

			if ((streamObj as { mediaStream?: MediaStream })?.mediaStream instanceof MediaStream) {
				const stream = (streamObj as { mediaStream: MediaStream }).mediaStream
				const audioTracks = stream.getAudioTracks()
				if (audioTracks.length > 0) {
					return new MediaStream(audioTracks)
				}
			}

			if ((streamObj as { track?: MediaStreamTrack })?.track instanceof MediaStreamTrack) {
				const track = (streamObj as { track: MediaStreamTrack }).track
				if (track.kind === "audio") {
					return new MediaStream([track])
				}
			}

			if (
				typeof (streamObj as { getTracks?: () => MediaStreamTrack[] })?.getTracks === "function"
			) {
				const tracks = (streamObj as { getTracks: () => MediaStreamTrack[] }).getTracks()
				const audioTracks = tracks.filter(t => t.kind === "audio")
				if (audioTracks.length > 0) {
					return new MediaStream(audioTracks)
				}
			}

			if (
				typeof (streamObj as { getAudioTracks?: () => MediaStreamTrack[] })?.getAudioTracks ===
				"function"
			) {
				const aTracks = (streamObj as { getAudioTracks: () => MediaStreamTrack[] }).getAudioTracks()
				if (aTracks.length > 0) {
					return new MediaStream(aTracks)
				}
			}
			return null
		}

		// Try micStream first, then webcamStream (which may contain audio)
		let audioStream = getAudioStream(micStream)
		if (!audioStream && webcamStream) {
			audioStream = getAudioStream(webcamStream)
		}

		// Prefer SDK micOn flag; avoid per-participant polling for efficiency.
		if (audioStream && audioStream.getAudioTracks().length > 0 && micOn) {
			// Check if audio tracks are actually enabled and live
			const enabledTracks = audioStream
				.getAudioTracks()
				.filter(track => track.enabled && track.readyState === "live")

			if (enabledTracks.length > 0) {
				const enabledStream = new MediaStream(enabledTracks)
				audioElement.srcObject = enabledStream
				audioElement.volume = 1.0
				audioElement.play().catch(() => {
					// ignore autoplay errors
				})
			} else {
				audioElement.srcObject = null
			}
		} else {
			audioElement.srcObject = null
		}
	}, [micStream, webcamStream, micOn, isLocal])

	const initials = displayName?.charAt(0).toUpperCase() ?? "?"
	const isPresenting = !!screenShareOn
	const showVideo = hasTrack

	return (
		<Card className="border-border/70 bg-card/80 relative size-full overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm">
			<CardContent className="from-muted/40 via-background to-muted/60 relative size-full bg-linear-to-br p-0">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={isLocal}
					className={cn(
						"bg-muted/30 size-full transition-opacity duration-200",
						isPresenting ? "object-contain" : "object-cover",
						"aspect-4/3 md:aspect-16/10",
						!showVideo && "opacity-0"
					)}
				/>

				{/* Hidden audio element for remote participants */}
				{!isLocal && <audio ref={audioRef} autoPlay playsInline className="hidden" />}

				{!showVideo && !isPresenting && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-2xl font-semibold shadow-lg md:size-20">
							{initials}
						</div>
					</div>
				)}

				<div className="absolute right-2 bottom-2 left-2 flex items-center justify-between rounded-lg bg-linear-to-r from-black/80 via-black/70 to-black/60 px-2.5 py-1.5 text-[11px] text-white shadow-md">
					<div className="flex items-center gap-1">
						<span className="max-w-35 truncate font-semibold">{displayName ?? "Guest"}</span>
						{isLocal && <span className="text-[10px] text-white/80">(You)</span>}
						{isPresenting && (
							<span className="ml-1 rounded-full bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-200">
								Presenting
							</span>
						)}
					</div>
					<div className="flex items-center gap-1.5">
						{micOn ? (
							<Mic className="size-3.5 text-green-400" />
						) : (
							<MicOff className="size-3.5 text-red-400" />
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
})

const RecordingBanner = React.memo(function RecordingBanner({
	isLocalRecording,
	localRecordingStartedAt,
	isAnyoneRecording,
	recordingParticipantName,
	recordingStopped,
	stoppedElapsed,
}: {
	isLocalRecording: boolean
	localRecordingStartedAt: number | null
	isAnyoneRecording?: boolean
	recordingParticipantName?: string | null
	recordingStopped?: boolean
	stoppedElapsed?: string | null
}) {
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

type RecordingConsentRequest = {
	id: string
	createdAt: number
	initiatorName: string
	requiredParticipantIds: string[]
}

// Signer Selector - Select which meeting participants are signers for this document (before plotting)
const SignerSelector = React.memo(function SignerSelector({
	participants,
	signerUserIds,
	onSignersChange,
}: {
	participants: Array<{
		userId: string
		user: { id: string; name: string | null; email: string | null; role?: string | null } | null
	}>
	signerUserIds: string[]
	onSignersChange: (userIds: string[]) => void
}) {
	const selectedSet = useMemo(() => new Set(signerUserIds), [signerUserIds])

	const toggle = useCallback(
		(userId: string, checked: boolean) => {
			if (checked) {
				onSignersChange([...signerUserIds, userId])
			} else {
				onSignersChange(signerUserIds.filter(id => id !== userId))
			}
		},
		[onSignersChange, signerUserIds]
	)

	const selected = participants.filter(p => selectedSet.has(p.userId))
	const selectedCount = selected.length
	const totalCount = participants.length

	return (
		<div className="bg-muted/30 mb-3 space-y-1.5 rounded-lg border p-2.5">
			<div className="mb-2 flex items-center gap-1.5">
				<UsersIcon className="text-muted-foreground size-3.5" />
				<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
					Signers ({selectedCount}/{totalCount})
				</span>
			</div>
			<p className="text-muted-foreground mb-2 text-[10px]">
				Select who must sign this document. Only selected signers will be added when you start
				signing.
			</p>
			<div className="space-y-1.5">
				{participants.map(p => {
					const checked = selectedSet.has(p.userId)
					const name = p.user?.name ?? "Unknown"
					const email = p.user?.email ?? ""
					return (
						<label
							key={p.userId}
							className={cn(
								"hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
								checked && "bg-muted/50"
							)}
						>
							<Checkbox
								checked={checked}
								onCheckedChange={c => toggle(p.userId, c === true)}
								aria-label={`${name} (${email})`}
							/>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<User className="text-muted-foreground size-3 shrink-0" />
									<span className="truncate font-medium">{name}</span>
								</div>
								<div className="text-muted-foreground truncate text-[10px]">{email}</div>
							</div>
							{checked && (
								<div className="shrink-0">
									<div className="flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
										<Clock className="text-muted-foreground size-3" />
										<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
											Waiting
										</span>
									</div>
								</div>
							)}
						</label>
					)
				})}
			</div>
		</div>
	)
})

// Signer List Component - Shows all signers and their status
// Memoized to prevent re-renders when unrelated state changes
const SignerList = React.memo(function SignerList({
	signers,
}: {
	signers: Array<{
		id: number
		email: string
		firstName: string
		lastName: string
		status: string
		signedAt: string | null
		sequence: number
		signerRole: string
	}>
}) {
	if (!signers || signers.length === 0) {
		return null
	}

	// Sort signers by sequence
	const sortedSigners = [...signers].sort((a, b) => a.sequence - b.sequence)

	// Helper function to check if a signer has signed (case-insensitive and checks both status and signedAt)
	const isSignerSigned = (signer: {
		status: string
		signedAt: string | null
	}): boolean => {
		const statusUpper = signer.status?.toUpperCase() ?? ""
		const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
		const hasSignedAt = signer.signedAt !== null && signer.signedAt !== undefined && signer.signedAt !== ""
		return hasSignedStatus || hasSignedAt
	}

	// Find the current signer (first one who hasn't signed yet)
	const currentSignerIndex = sortedSigners.findIndex(s => !isSignerSigned(s))

	// Count signed signers
	const signedCount = sortedSigners.filter(isSignerSigned).length

	return (
		<div className="bg-muted/30 mb-3 space-y-1.5 rounded-lg border p-2.5">
			<div className="mb-2 flex items-center gap-1.5">
				<UsersIcon className="text-muted-foreground size-3.5" />
				<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
					Signers ({signedCount}/{sortedSigners.length})
				</span>
			</div>
			<div className="space-y-1">
				{sortedSigners.map((signer, index) => {
					const isSigned = isSignerSigned(signer)
					const isCurrent = index === currentSignerIndex
					const isWaiting = index > currentSignerIndex && currentSignerIndex !== -1

					return (
						<div
							key={signer.id}
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
								isSigned &&
									"border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
								isCurrent &&
									"border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
								isWaiting && "bg-muted/50 opacity-60"
							)}
						>
							<div
								className={cn(
									"flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
									isSigned
										? "bg-green-600 text-white"
										: isCurrent
											? "bg-blue-600 text-white"
											: "bg-muted text-muted-foreground"
								)}
							>
								{signer.sequence}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<User className="text-muted-foreground size-3 shrink-0" />
									<span className="truncate font-medium">
										{signer.firstName} {signer.lastName}
									</span>
								</div>
								<div className="text-muted-foreground truncate text-[10px]">{signer.email}</div>
							</div>
							<div className="shrink-0">
								{isSigned ? (
									<div className="flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 dark:bg-green-900/40">
										<CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
										<span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
											Signed
										</span>
									</div>
								) : isCurrent ? (
									<div className="flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 dark:bg-blue-900/40">
										<AlertCircle className="size-3 text-blue-600 dark:text-blue-400" />
										<span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
											Current
										</span>
									</div>
								) : (
									<div className="flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
										<Clock className="size-3 text-gray-500 dark:text-gray-400" />
										<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
											Waiting
										</span>
									</div>
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
})

// Document Actions Component - ENP can initiate signing directly
// Memoized to prevent re-renders when unrelated state changes
const DocumentActions = React.memo(function DocumentActions({
	document,
	onSignClick,
	onSignersChange,
	isSigningPending,
	isLocked,
	isPreviousDocumentSigned,
	documentIndex,
	signers,
	participants,
	signerUserIds,
	meetingId,
	onCreateProject,
	isCreatingProject,
}: {
	document: { id: string; name: string; docoChainProjectId: string | null }
	onSignClick: (projectUuid: string | null, email: string, documentId: string) => void
	onSignersChange?: (documentId: string, userIds: string[]) => void
	isSigningPending: boolean
	isLocked?: boolean
	isPreviousDocumentSigned?: boolean
	documentIndex?: number
	signers?: Array<{
		id: number
		email: string
		firstName: string
		lastName: string
		status: string
		signedAt: string | null
		sequence: number
		signerRole: string
	}>
	participants?: Array<{
		userId: string
		user: { id: string; name: string | null; email: string | null; role?: string | null } | null
	}>
	signerUserIds?: string[]
	meetingId?: string
	onCreateProject?: (documentId: string, meetingId: string) => void
	isCreatingProject?: boolean
}) {
	const { data: session } = useSession()

	// Helper function to check if a signer has signed (case-insensitive)
	const isSignerSigned = (signer: {
		status: string
		signedAt: string | null
	}): boolean => {
		const statusUpper = signer.status?.toUpperCase() ?? ""
		const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
		const hasSignedAt = signer.signedAt !== null && signer.signedAt !== undefined && signer.signedAt !== ""
		return hasSignedStatus || hasSignedAt
	}

	// Filter signers to only show those selected in the database (signerUserIds)
	// Get participant emails for selected signers
	const selectedSignerEmails = new Set<string>()
	if (signerUserIds && participants) {
		for (const userId of signerUserIds) {
			const participant = participants.find(p => p.userId === userId)
			if (participant?.user?.email) {
				selectedSignerEmails.add(participant.user.email.toLowerCase())
			}
		}
	}
	
	// Filter signers to only include those in the selected list
	const filteredSigners = signers?.filter(signer => 
		selectedSignerEmails.has(signer.email?.toLowerCase() ?? "")
	) ?? []

	// Check if all signers have signed
	const allSignersSigned =
		filteredSigners && filteredSigners.length > 0 && filteredSigners.every(isSignerSigned)

	// Determine button state based on current user's signer status
	const currentUserEmail = session?.user?.email ?? null
	const currentUserSigner = currentUserEmail
		? filteredSigners.find(s => s.email?.toLowerCase() === currentUserEmail.toLowerCase())
		: null
	const isUserAddedAsSigner = !!currentUserSigner
	
	// Check if user has completed signing (status SIGNED/COMPLETED or signedAt is set)
	const hasUserSigned = currentUserSigner
		? isSignerSigned({
				status: currentUserSigner.status,
				signedAt: currentUserSigner.signedAt,
			})
		: false
	
	// Check signer status to determine if they've plotted but not signed
	// Statuses: PENDING, NEXT GROUP (not plotted), or other statuses might indicate plotted
	const signerStatus = (currentUserSigner?.status ?? "").toUpperCase()
	const isPendingOrNextGroup = signerStatus === "PENDING" || signerStatus === "NEXT GROUP"
	
	// Determine button text based on state:
	// 1. Not added → "Start Signing" (adds user, generates edit draft link)
	// 2. Added + PENDING/NEXT GROUP → "Plot Signature" (edit draft link exists, can plot)
	// 3. Added + other status (plotted but not signed) → "Sign Document" (signature plotted, can sign)
	// 4. Signed → button disabled (already completed)
	const getButtonText = () => {
		if (!isUserAddedAsSigner) {
			// User not added yet - clicking will add them and generate edit draft link
			return "Start Signing"
		}
		if (hasUserSigned) {
			// User has completed signing - button should be disabled
			return "Sign Document"
		}
		// Check if user has plotted (status is not PENDING/NEXT GROUP)
		if (!isPendingOrNextGroup) {
			// User has plotted signature marks but hasn't signed yet
			return "Sign Document"
		}
		// User is added but still in PENDING/NEXT GROUP - edit draft link exists, can plot signature
		return "Plot Signature"
	}

	const buttonText = getButtonText()

	// Determine if Start Signing button should be disabled
	const isSigningDisabledByOrder = isLocked && !isPreviousDocumentSigned && (documentIndex ?? 0) > 0
	const hasNoSignersSelected = !document.docoChainProjectId && (signerUserIds?.length ?? 0) === 0
	const hasSigners = (signerUserIds?.length ?? 0) > 0
	const currentUserId = session?.user?.id ?? null
	const isCurrentUserSigner =
		currentUserId !== null && (signerUserIds?.includes(currentUserId) ?? false)
	const userNotInSignerList = hasSigners && !isCurrentUserSigner
	const isSigningDisabled = allSignersSigned
		? true
		: isSigningDisabledByOrder
			? true
			: hasNoSignersSelected
				? true
				: userNotInSignerList

	const handleSignersChange = useCallback(
		(userIds: string[]) => {
			if (onSignersChange && meetingId) onSignersChange(document.id, userIds)
		},
		[onSignersChange, meetingId, document.id]
	)

	return (
		<div className="space-y-2">
			{/* Before project exists: show signer selector. After: show DocoChain signer list */}
			{document.docoChainProjectId && filteredSigners && filteredSigners.length > 0 ? (
				<SignerList signers={filteredSigners} />
			) : (
				participants &&
				participants.length > 0 &&
				meetingId &&
				onSignersChange && (
					<SignerSelector
						participants={participants}
						signerUserIds={signerUserIds ?? []}
						onSignersChange={handleSignersChange}
					/>
				)
			)}
			<Button
				variant="outline"
				size="sm"
				className="hover:bg-primary hover:text-primary-foreground h-9 w-full text-xs shadow-sm transition-all"
				onClick={() => {
					// Open document in new tab
					window.open(`/api/documents/${document.id}`, "_blank")
				}}
			>
				<FileText className="mr-1.5 size-3.5" />
				View Document
			</Button>

			{/* Show "Create Project" button if signers are set but project doesn't exist */}
			{!document.docoChainProjectId && hasSigners && meetingId && onCreateProject && (
				<Button
					variant="default"
					size="sm"
					className="h-9 w-full text-xs shadow-sm"
					onClick={() => {
						if (meetingId) {
							onCreateProject(document.id, meetingId)
						}
					}}
					disabled={isCreatingProject}
				>
					{isCreatingProject ? (
						<>
							<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Creating...
						</>
					) : (
						<>
							<FileSignature className="mr-1.5 size-3.5" />
							Add Signer
						</>
					)}
				</Button>
			)}

			{/* Show "Start Signing" button for all meeting participants */}
			{/* Project must exist before signing can start */}
			<div className="space-y-1.5">
				<Button
					variant="default"
					size="sm"
					className="h-9 w-full text-xs shadow-sm"
					onClick={() => {
						const userEmail = session?.user?.email
						if (userEmail) {
							console.log("🔵 Initiating signing process for document:", document.name)
							console.log("   - Document ID:", document.id)
							console.log("   - DocoChain Project UUID:", document.docoChainProjectId)
							console.log("   - User Email:", userEmail)

							// User clicks to start signing - this will:
							// 1. Add user as signer using Add Project Signer API
							// 2. Generate Edit Draft Project Link
							// 3. Redirect to DocoChain signing page
							onSignClick(document.docoChainProjectId ?? null, userEmail, document.id)
						} else {
							toast.error("User email not found. Please sign in again.")
						}
					}}
					disabled={isSigningPending || isSigningDisabled || !document.docoChainProjectId}
				>
					{isSigningPending ? (
						<>
							<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							{buttonText === "Start Signing"
								? "Starting..."
								: buttonText === "Plot Signature"
									? "Plotting..."
									: "Signing..."}
						</>
					) : (
						<>
							<FileSignature className="mr-1.5 size-3.5" />
							{buttonText}
						</>
					)}
				</Button>
				{/* Show message when button is disabled */}
				{(isSigningDisabled || !document.docoChainProjectId) && (
					<p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
						{!document.docoChainProjectId
							? "Add signer first after setting signers"
							: allSignersSigned
								? "All signers have completed signing"
								: isSigningDisabledByOrder
									? "Previous document must be signed first"
									: hasNoSignersSelected
										? "Select at least one signer for this document"
										: userNotInSignerList
											? "You must be added as a signer to start signing"
											: ""}
					</p>
				)}
			</div>
		</div>
	)
})

// Main meeting view
function MeetingView({ onLeave, meetingId }: { onLeave?: () => void; meetingId?: string }) {
	const { data: session } = useSession()
	const [joined, setJoined] = useState(false)
	const [presenterId, setPresenterId] = useState<string | null>(null)
	const [isRecording, setIsRecording] = useState(false)
	const [recordingStatus, setRecordingStatus] = useState<string>("RECORDING_STOPPED")
	const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
	const [isLocalRecording, setIsLocalRecording] = useState(false)
	const [localRecordingStartedAt, setLocalRecordingStartedAt] = useState<number | null>(null)
	const [recordingConsentRequest, setRecordingConsentRequest] =
		useState<RecordingConsentRequest | null>(null)
	const [recordingConsentOpen, setRecordingConsentOpen] = useState(false)
	const [recordingConsentAcceptedIds, setRecordingConsentAcceptedIds] = useState<Set<string>>(
		() => new Set()
	)
	const [recordingConsentDeclined, setRecordingConsentDeclined] = useState(false)
	// Track if any participant is recording (broadcast via pubsub)
	const [isAnyoneRecording, setIsAnyoneRecording] = useState(false)
	const [recordingParticipantName, setRecordingParticipantName] = useState<string | null>(null)
	// Track when recording stopped to show message briefly
	const [recordingStopped, setRecordingStopped] = useState(false)
	const [stoppedElapsed, setStoppedElapsed] = useState<string | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const localStreamRef = useRef<MediaStream | null>(null)
	const recordingContainerRef = useRef<HTMLDivElement>(null)
	const localRecordingSupported =
		(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia) ||
		(typeof HTMLDivElement !== "undefined" &&
			typeof (HTMLDivElement.prototype as { captureStream?: unknown })?.captureStream ===
				"function")
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [showDocuments, setShowDocuments] = useState(true)
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
	const [selectedSignerId, setSelectedSignerId] = useState<string>("")
	const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
	const [dismissedRequestIds, setDismissedRequestIds] = useState<Set<string>>(new Set())
	const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null)
	const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null)
	const [dragOverDocumentId, setDragOverDocumentId] = useState<string | null>(null)
	const [downloadingProjectUuid, setDownloadingProjectUuid] = useState<string | null>(null)
	const [downloadingCertificateUuid, setDownloadingCertificateUuid] = useState<string | null>(null)
	const [documentSigningStatus, setDocumentSigningStatus] = useState<
		Map<
			string,
			{
				isFullySigned: boolean
				signedCount: number
				totalSigners: number
				signers: Array<{
					id: number
					email: string
					firstName: string
					lastName: string
					status: string
					signedAt: string | null
					sequence: number
					signerRole: string
				}>
			}
		>
	>(new Map())

	// Fetch meeting documents
	const { data: documents, refetch: refetchDocuments } = trpc.meetings.getMeetingDocuments.useQuery(
		meetingId ?? "",
		{
			enabled: !!meetingId,
			refetchInterval: 20000, // Refetch every 20 seconds to get new uploads
			staleTime: 10000, // Consider data fresh for 10 seconds to avoid unnecessary refetches
		}
	)

	// Get tRPC utils for imperative calls
	const utils = trpc.useUtils()

	const [signingStatusPollingPausedUntil, setSigningStatusPollingPausedUntil] = useState<
		number | null
	>(null)
	const hasShownSigningStatusAuthErrorRef = useRef(false)
	const hasShownSigningStatusFetchErrorRef = useRef(false)
	const signingStatusInFlightRef = useRef(false)

	const refreshSigningStatuses = useCallback(async () => {
		// Only poll while the documents panel is visible; avoids re-render storms during video actions.
		if (!showDocuments) return
		if (!documents || documents.length === 0) return

		// Never overlap requests (can create token races + extra load + lag).
		if (signingStatusInFlightRef.current) return

		// Don't poll in background tabs.
		if (typeof document !== "undefined" && document.visibilityState === "hidden") return

		// If we recently got unauthorized, back off to avoid hammering the API + spamming logs.
		if (signingStatusPollingPausedUntil && Date.now() < signingStatusPollingPausedUntil) return

		const docsWithProjects = documents.filter(d => !!d.docoChainProjectId)
		if (docsWithProjects.length === 0) return

		const isUnauthorized = (err: unknown) => {
			const msg =
				err instanceof Error
					? err.message
					: typeof err === "object" && err !== null && "message" in err
						? String(err.message)
						: ""
			const msgLower = msg.toLowerCase()
			return (
				msg.includes("E_UNAUTHORIZED_ACCESS") ||
				msgLower.includes("unauthorized") ||
				msgLower.includes("forbidden") ||
				msgLower.includes("don't have access") ||
				msgLower.includes("created by a different user") ||
				msgLower.includes("not part of this project")
			)
		}

		signingStatusInFlightRef.current = true
		try {
			// Run status checks in parallel, but keep docId so we can reason about failures.
			const results = await Promise.all(
				docsWithProjects.map(async doc => {
					try {
						const status = await utils.signatureRequests.checkSigningStatus.fetch({
							projectUuid: doc.docoChainProjectId!,
						})
						return { ok: true as const, docId: doc.id, status }
					} catch (error: unknown) {
						return { ok: false as const, docId: doc.id, error }
					}
				})
			)

			const unauthorizedHit = results.some(r => !r.ok && isUnauthorized(r.error))
			const anyErrorHit = results.some(r => !r.ok)

			// If any call errors, pause polling to avoid spamming console/network.
			// Unauthorized gets a specific message; other errors (e.g. "fetch failed") get a generic one.
			if (unauthorizedHit || anyErrorHit) {
				setSigningStatusPollingPausedUntil(Date.now() + 60_000)

				if (unauthorizedHit && !hasShownSigningStatusAuthErrorRef.current) {
					hasShownSigningStatusAuthErrorRef.current = true
					toast.error("Cannot check signing status (unauthorized). Pausing status updates.")
				} else if (!unauthorizedHit && !hasShownSigningStatusFetchErrorRef.current) {
					hasShownSigningStatusFetchErrorRef.current = true
					toast.error("Signing status check failed. Pausing status updates.")
				}
				return
			}

			const statusMap = new Map<
				string,
				{
					isFullySigned: boolean
					signedCount: number
					totalSigners: number
					signers: Array<{
						id: number
						email: string
						firstName: string
						lastName: string
						status: string
						signedAt: string | null
						sequence: number
						signerRole: string
					}>
				}
			>()

			for (const result of results) {
				if (result.ok) {
					const { docId, status } = result
					statusMap.set(docId, {
						isFullySigned: status.isFullySigned,
						signedCount: status.signedCount,
						totalSigners: status.totalSigners,
						signers: status.signers || [],
					})
				}
			}

			// Keep previous entries for docs that failed this round
			setDocumentSigningStatus(prev => {
				let changed = false
				const merged = new Map(prev)

				for (const [docId, entry] of statusMap.entries()) {
					const current = merged.get(docId)
					const same =
						!!current &&
						current.isFullySigned === entry.isFullySigned &&
						current.signedCount === entry.signedCount &&
						current.totalSigners === entry.totalSigners &&
						current.signers.length === entry.signers.length

					if (!same) {
						changed = true
						merged.set(docId, entry)
					}
				}

				return changed ? merged : prev
			})
		} finally {
			signingStatusInFlightRef.current = false
		}
	}, [
		documents,
		showDocuments,
		signingStatusPollingPausedUntil,
		utils.signatureRequests.checkSigningStatus,
	])

	// Check signing status for all documents with DocoChain project IDs
	useEffect(() => {
		if (!showDocuments) return
		if (!documents || documents.length === 0) return

		void refreshSigningStatuses()

		// Slow + stable polling interval (avoids spamming when DocoChain is slow/unavailable).
		const interval = setInterval(() => {
			void refreshSigningStatuses()
		}, 60_000)

		return () => clearInterval(interval)
	}, [documents, refreshSigningStatuses, showDocuments])

	// Fetch meeting details to get participants and lock state
	const { data: meetingDetails, refetch: refetchMeetingDetails } = trpc.meetings.getById.useQuery(
		meetingId ?? "",
		{
			enabled: !!meetingId && !!meetingId.trim(),
			retry: false,
			refetchInterval: 15000, // Refetch every 15 seconds to sync lock state
			staleTime: 8000, // Consider data fresh for 8 seconds
		}
	)

	// Mutation to toggle document order lock
	const toggleLockMutation = trpc.meetings.toggleDocumentOrderLock.useMutation({
		onSuccess: () => {
			void refetchMeetingDetails()
			toast.success(
				meetingDetails?.isDocumentOrderLocked ? "Document order unlocked" : "Document order locked"
			)
		},
		onError: error => {
			toast.error(error.message || "Failed to toggle document lock")
		},
	})

	// Mutation to set per-document signers (before plotting)
	const setDocumentSignersMutation = trpc.meetings.setDocumentSigners.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
		},
		onError: error => {
			toast.error(error.message ?? "Failed to update signers")
		},
	})

	// Mutation to create DocoChain project (after signers are set)
	const createDocoChainProjectMutation = trpc.meetings.createDocoChainProject.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
			toast.success("DocoChain project created successfully!")
		},
		onError: error => {
			toast.error(error.message ?? "Failed to create DocoChain project")
		},
	})

	const handleSignersChange = useCallback(
		(documentId: string, userIds: string[]) => {
			if (!meetingId) return
			setDocumentSignersMutation.mutate({ documentId, meetingId, userIds })
		},
		[meetingId, setDocumentSignersMutation]
	)

	// Fetch pending signature requests for current user
	const { data: pendingRequests } = trpc.signatureRequests.getPendingRequests.useQuery(
		{ meetingId: meetingId ?? "" },
		{
			enabled: !!meetingId && !!meetingId.trim(),
			refetchInterval: 5000, // Poll every 5 seconds for new requests (reduced from 3s, kept relatively fast for good UX)
			retry: false,
		}
	)

	// Create signature request mutation
	const createSignatureRequest = trpc.signatureRequests.createRequest.useMutation({
		onSuccess: () => {
			toast.success("Signature request sent successfully!")
			setIsSendDialogOpen(false)
			setSelectedDocumentId(null)
			setSelectedSignerId("")
		},
		onError: error => {
			const errorMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "Failed to send signature request"
			toast.error(errorMessage)
		},
	})

	// Update signature request status mutation
	const updateSignatureStatus = trpc.signatureRequests.updateStatus.useMutation({
		onSuccess: () => {
			toast.success("Signature request declined")
		},
		onError: error => {
			const errorMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "Failed to update request"
			toast.error(errorMessage)
		},
	})

	// Update document order mutation (for drag and drop)
	const updateDocumentOrder = trpc.meetings.updateDocumentOrder.useMutation({
		onSuccess: () => {
			void refetchDocuments() // Refetch to sync with other users
		},
		onError: error => {
			const errorMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "Failed to update document order"
			toast.error(errorMessage)
		},
	})

	const isDocumentOrderLocked = meetingDetails?.isDocumentOrderLocked ?? false

	// Drag and drop handlers
	const handleDragStart = useCallback(
		(e: React.DragEvent, documentId: string) => {
			// Prevent dragging if locked
			if (isDocumentOrderLocked) {
				e.preventDefault()
				return
			}

			// Don't start drag if clicking on interactive elements (buttons, links, etc.)
			const target = e.target as HTMLElement
			if (target.closest("button") || target.closest("a") || target.closest('[role="button"]')) {
				e.preventDefault()
				return
			}

			setDraggedDocumentId(documentId)
			e.dataTransfer.effectAllowed = "move"
			e.dataTransfer.setData("text/plain", documentId)
		},
		[isDocumentOrderLocked]
	)

	const handleDragEnter = useCallback(
		(e: React.DragEvent, targetDocumentId: string) => {
			if (isDocumentOrderLocked) {
				e.preventDefault()
				return
			}
			e.preventDefault()
			if (!draggedDocumentId || targetDocumentId === draggedDocumentId) return
			setDragOverDocumentId(targetDocumentId)
		},
		[draggedDocumentId, isDocumentOrderLocked]
	)

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		const relatedTarget = e.relatedTarget as HTMLElement
		if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
			setDragOverDocumentId(null)
		}
	}, [])

	const handleDragOver = useCallback(
		(e: React.DragEvent, targetDocumentId: string) => {
			if (isDocumentOrderLocked) {
				e.preventDefault()
				return
			}
			e.preventDefault()
			e.dataTransfer.dropEffect = "move"
			if (draggedDocumentId && targetDocumentId !== draggedDocumentId) {
				setDragOverDocumentId(targetDocumentId)
			}
		},
		[draggedDocumentId, isDocumentOrderLocked]
	)

	const handleDrop = useCallback(
		(e: React.DragEvent, targetDocumentId: string) => {
			if (isDocumentOrderLocked) {
				e.preventDefault()
				setDraggedDocumentId(null)
				setDragOverDocumentId(null)
				return
			}
			e.preventDefault()
			setDragOverDocumentId(null)

			if (!draggedDocumentId || !meetingId) {
				setDraggedDocumentId(null)
				return
			}

			if (!documents) {
				setDraggedDocumentId(null)
				return
			}

			const sourceIndex = documents.findIndex(doc => doc.id === draggedDocumentId)
			const targetIndex = documents.findIndex(doc => doc.id === targetDocumentId)

			if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
				setDraggedDocumentId(null)
				return
			}

			// Reorder documents
			const newOrder = [...documents]
			const removed = newOrder.splice(sourceIndex, 1)[0]
			if (!removed) {
				setDraggedDocumentId(null)
				return
			}
			newOrder.splice(targetIndex, 0, removed)

			// Update order in database (this will sync to all users)
			updateDocumentOrder.mutate({
				meetingId,
				documentIds: newOrder.map(doc => doc.id),
			})

			setDraggedDocumentId(null)
		},
		[documents, draggedDocumentId, isDocumentOrderLocked, meetingId, updateDocumentOrder]
	)

	const handleDragEnd = useCallback(() => {
		setDraggedDocumentId(null)
		setDragOverDocumentId(null)
	}, [])

	// Handle signed document - open our server-streamed PDF
	const handleDownloadSignedDocument = useCallback(async (projectUuid: string) => {
		setDownloadingProjectUuid(projectUuid)

		try {
			// Open a QSign API route that streams the signed PDF.
			// This avoids relying on DocoChain guestToken and avoids leaking api_token in URLs.
			const url = `/api/doconchain/projects/${encodeURIComponent(projectUuid)}/signed`
			window.open(url, "_blank", "noopener,noreferrer")
			toast.success("Opening signed document...")
		} catch (error) {
			console.error("Error opening signed document:", error)
			toast.error(error instanceof Error ? error.message : "Failed to open signed document")
		} finally {
			setDownloadingProjectUuid(null)
		}
	}, [])

	// Handle certificate download
	const handleDownloadCertificate = useCallback(
		async (projectUuid: string) => {
			setDownloadingCertificateUuid(projectUuid)

			try {
				// Fetch the certificate using tRPC utils
				// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
				const result = await utils.signatureRequests.downloadCertificate.fetch(projectUuid as any)

				if (result?.base64) {
					// Convert base64 to blob and download
					const byteCharacters = atob(result.base64)
					const byteNumbers = new Array(byteCharacters.length)
					for (let i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i)
					}
					const byteArray = new Uint8Array(byteNumbers)
					const blob = new Blob([byteArray], { type: "application/pdf" })

					const url = window.URL.createObjectURL(blob)
					const link = document.createElement("a")
					link.href = url
					link.download = result.fileName || `certificate-${projectUuid}.pdf`
					document.body.appendChild(link)
					link.click()
					document.body.removeChild(link)
					window.URL.revokeObjectURL(url)

					toast.success("Certificate downloaded successfully!")
				} else {
					toast.error("Failed to download certificate")
				}
			} catch (error) {
				console.error("Error downloading certificate:", error)
				toast.error(error instanceof Error ? error.message : "Failed to download certificate")
			} finally {
				setDownloadingCertificateUuid(null)
			}
		},
		[utils.signatureRequests.downloadCertificate]
	)

	// Generate signing link mutation (for signature request dialog)
	const generateSigningLink = trpc.signatureRequests.generateSigningLink.useMutation({
		onSuccess: data => {
			let signingLink = typeof data.link === "string" ? data.link : null

			if (!signingLink) {
				toast.error("Invalid signing link received")
				return
			}

			// ALWAYS normalize the URL - ensure api=true is set
			signingLink = normalizeUrl(signingLink) ?? signingLink

			try {
				new URL(signingLink)
			} catch {
				toast.error("Invalid URL format for signing link")
				return
			}

			// Open DocoChain signing page in popup window
			const width = Math.min(window.innerWidth - 40, 1400)
			const height = Math.min(window.innerHeight - 40, 900)
			const left = (window.screen.width - width) / 2
			const top = (window.screen.height - height) / 2

			const popup = window.open(
				signingLink,
				"DocoChainSigning",
				`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
			)

			if (popup) {
				toast.success("Opening signing interface...")
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
			}
		},
		onError: error => {
			const errorMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "Failed to generate signing link"
			toast.error(errorMessage)
		},
	})

	// ENP initiates signing - adds them as signer and embeds signing page
	const initiateSigning = trpc.signatureRequests.initiateSigning.useMutation({
		onSuccess: data => {
			// Validate that we have a valid URL string
			let signingLink = typeof data.link === "string" ? data.link : null

			if (!signingLink) {
				console.error("❌ Invalid signing link received:", data)
				toast.error("Invalid signing link received")
				return
			}

			// ALWAYS normalize the URL - ensure api=true is set
			signingLink = normalizeUrl(signingLink) ?? signingLink

			// Validate it's a proper URL
			try {
				new URL(signingLink)
			} catch {
				console.error("❌ Invalid URL format:", signingLink)
				toast.error("Invalid URL format for signing link")
				return
			}

			console.log("✅ Signing process initiated successfully!")
			console.log("   - Project UUID:", data.projectUuid)
			console.log("   - Signing link:", signingLink)

			// Open DocoChain signing page in popup window (iframe blocked by DocoChain)
			// Open in popup window with specific dimensions (centered, almost fullscreen)
			const width = Math.min(window.innerWidth - 40, 1400)
			const height = Math.min(window.innerHeight - 40, 900)
			const left = (window.screen.width - width) / 2
			const top = (window.screen.height - height) / 2

			const popup = window.open(
				signingLink,
				"DocoChainSigning",
				`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
			)

			if (popup) {
				// Monitor popup for closing - check every 1.5s is responsive enough
				const checkClosed = setInterval(() => {
					if (popup.closed) {
						clearInterval(checkClosed)
						setSigningDocumentId(null)
						// Refresh docs + signing status immediately (don't wait for polling interval)
						void refetchDocuments().then(() => {
							void refreshSigningStatuses()
						})
						toast.success("Signing completed. Document status updated.")
					}
				}, 1500)

				toast.success("Opening signing interface in popup window...")
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
				setSigningDocumentId(null) // Clear loading state
			}
		},
		onError: error => {
			console.error("❌ Failed to initiate signing:", error)
			setSigningDocumentId(null) // Clear loading state on error
			const errorMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "Failed to start signing process"
			toast.error(errorMessage)
		},
	})

	const handleSignClick = useCallback(
		(projectUuid: string | null, email: string, documentId: string) => {
			setSigningDocumentId(documentId)
			// If projectUuid exists, use it. Otherwise, pass documentId to create project
			initiateSigning.mutate(
				projectUuid ? { projectUuid, email } : { documentId, email } // No project yet - will be created on signing
			)
		},
		[initiateSigning]
	)

	// Get the first non-dismissed pending request
	const activeSignatureRequest = pendingRequests?.find(req => !dismissedRequestIds.has(req.id))

	// Force re-render when participants change - VideoSDK mutates the Map in place
	// so React doesn't detect changes. We increment this counter to trigger re-renders.
	const [participantVersion, setParticipantVersion] = useState(0)

	const meeting = useMeeting({
		onMeetingJoined: () => {
			setJoined(true)
			console.log("✅ Successfully joined meeting")
			// Force refresh participant list on join
			setParticipantVersion(v => v + 1)
		},
		onMeetingLeft: () => {
			setJoined(false)
			console.log("👋 Left meeting")
			// Clear recording state when leaving
			setIsAnyoneRecording(false)
			setRecordingParticipantName(null)
			setRecordingStopped(false)
			setStoppedElapsed(null)
			setLocalRecordingStartedAt(null)
			// Call the onLeave callback to redirect user
			if (onLeave) {
				onLeave()
			}
		},
		onParticipantJoined: participant => {
			console.log("👋 Participant JOINED (peer-to-peer):", {
				id: participant.id,
				displayName: participant.displayName,
				isLocal: participant.local,
			})
			// Force re-render to show new participant
			setParticipantVersion(v => v + 1)
		},
		onParticipantLeft: participant => {
			console.log("👋 Participant LEFT (peer-to-peer):", {
				id: participant.id,
				displayName: participant.displayName,
			})
			// Force re-render to remove departed participant
			setParticipantVersion(v => v + 1)
		},
		onPresenterChanged: id => {
			setPresenterId(id ?? null)

			console.log("🖥️ Presenter changed:", id)
		},
		onRecordingStateChanged: (data: { status: string }) => {
			console.log("🎥 Recording state changed:", data)
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

	// PubSub for broadcasting local recording status to all participants
	// Message format: "RECORDING_STARTED:1234567890" (with timestamp) or "RECORDING_STOPPED:00:04" (with elapsed time)
	const { publish: publishRecordingStatus } = usePubSub("LOCAL_RECORDING_STATUS", {
		onMessageReceived: (message: { message: string; senderName: string }) => {
			console.log("📢 Received recording status:", message)
			if (message.message.startsWith("RECORDING_STARTED")) {
				setRecordingStopped(false)
				setStoppedElapsed(null)
				setIsAnyoneRecording(true)
				setRecordingParticipantName(message.senderName)
				// Parse start timestamp from message (format: "RECORDING_STARTED:1234567890")
				const parts = message.message.split(":")
				if (parts[1]) {
					const startTime = parseInt(parts[1], 10)
					if (!isNaN(startTime)) {
						setLocalRecordingStartedAt(startTime)
					}
				}
			} else if (message.message.startsWith("RECORDING_STOPPED")) {
				setIsAnyoneRecording(false)
				setLocalRecordingStartedAt(null)
				// Parse elapsed time from message (format: "RECORDING_STOPPED:00:04")
				const elapsed = message.message.split(":").slice(1).join(":") || null
				// Show stopped message with elapsed time
				setRecordingStopped(true)
				setStoppedElapsed(elapsed)
				// Keep the participant name to show who stopped it
				// Hide the stopped banner after 5 seconds
				setTimeout(() => {
					setRecordingStopped(false)
					setStoppedElapsed(null)
					setRecordingParticipantName(null)
				}, 5000)
			}
		},
	})

	// Get real-time participants from VideoSDK - this is the peer-to-peer connection state
	// Only participants who have actually joined the WebRTC room will appear here
	const participants = meeting?.participants as
		| Map<
				string,
				{
					displayName?: string
					webcamOn?: boolean
					local?: boolean
					screenShareOn?: boolean
					// VideoSDK participant properties for connection state
					mode?: string
					quality?: string
				}
		  >
		| null
		| undefined

	const { localParticipant } = useMeeting()

	const localParticipantId = localParticipant?.id ?? null

	// Debug: Log participant changes to help diagnose peer-to-peer issues
	useEffect(() => {
		if (participants && participants.size > 0) {
			const participantList = Array.from(participants.entries()).map(([id, p]) => ({
				id: `${id.substring(0, 8)}...`,
				name: p.displayName,
				isLocal: p.local,
				webcamOn: p.webcamOn,
			}))
			console.log(
				"📡 VideoSDK Participants (peer-to-peer):",
				participantList,
				`v${participantVersion}`
			)
		}
	}, [participants, participantVersion])

	const { participantIds, participantCount } = useMemo(() => {
		// If no meeting or participants map, return empty
		if (!participants || participants.size === 0) {
			return { participantIds: [], participantCount: 0 }
		}

		const participantsMap = participants

		// Filter out non-human participants (bots, recorders, etc.)
		const filterHuman = (
			id: string,
			participant: { displayName?: string; mode?: string } | null | undefined
		) => {
			if (!participant) return false

			const idLower = id.toLowerCase()
			const nameLower = (participant.displayName ?? "").toLowerCase()

			// Filter out system participants
			const isSystemParticipant =
				idLower.includes("recorder") ||
				idLower.includes("bot") ||
				idLower.includes("internal") ||
				idLower.includes("hls") ||
				nameLower.includes("recorder") ||
				nameLower.includes("bot")

			return !isSystemParticipant
		}

		const normalizeName = (name: string | undefined) =>
			(name ?? "").trim().toLowerCase() || "unknown"

		// Deduplicate participants by display name (same user might appear multiple times)
		const uniqueByName = new Map<
			string,
			{
				id: string
				participant: {
					displayName?: string
					webcamOn?: boolean
					local?: boolean
					screenShareOn?: boolean
				}
			}
		>()

		for (const [id, participant] of participantsMap.entries()) {
			if (!filterHuman(id, participant)) continue

			const participantIsPresenting = Boolean(
				(participant as unknown as { screenShareOn?: boolean })?.screenShareOn
			)
			const key = participantIsPresenting
				? `${id}-presenter`
				: normalizeName(participant.displayName ?? id)
			const current = uniqueByName.get(key)
			const currentIsPresenting = Boolean(
				(current?.participant as unknown as { screenShareOn?: boolean })?.screenShareOn
			)

			const shouldReplace =
				!current ||
				(participantIsPresenting && !currentIsPresenting) || // prefer presenter
				(!participantIsPresenting && currentIsPresenting
					? false
					: !!participant?.webcamOn && !current?.participant?.webcamOn) || // otherwise prefer webcam on
				(participant?.local &&
					!current?.participant?.local &&
					participant?.webcamOn === current?.participant?.webcamOn &&
					participantIsPresenting === currentIsPresenting) // prefer local if tied

			if (shouldReplace) {
				uniqueByName.set(key, { id, participant })
			}
		}

		const ids = Array.from(uniqueByName.values())
			.sort((a, b) => {
				const aPresenting = Boolean(a.participant?.screenShareOn)
				const bPresenting = Boolean(b.participant?.screenShareOn)
				if (aPresenting && !bPresenting) return -1
				if (!aPresenting && bPresenting) return 1
				// fall back to local first
				if (a.participant?.local && !b.participant?.local) return -1
				if (!a.participant?.local && b.participant?.local) return 1
				return 0
			})
			.map(entry => entry.id)

		return { participantIds: ids, participantCount: ids.length }
	}, [participants])

	const resetRecordingConsentUi = useCallback(() => {
		setRecordingConsentOpen(false)
		setRecordingConsentRequest(null)
		setRecordingConsentAcceptedIds(new Set())
		setRecordingConsentDeclined(false)
	}, [])

	const buildConsentRequest = useCallback(
		(requiredParticipantIds: string[], initiatorName: string): RecordingConsentRequest => {
			const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
			return { id, createdAt: Date.now(), initiatorName, requiredParticipantIds }
		},
		[]
	)

	// PubSub: recording consent flow
	// Message formats:
	// - REQUEST:{requestId}:{createdAt}:{initiatorName}:{requiredParticipantIdsCsv}
	// - RESPONSE:{requestId}:{participantId}:{participantName}:{ACCEPT|DECLINE}
	// - CANCEL:{requestId}
	const { publish: publishRecordingConsent } = usePubSub("RECORDING_CONSENT", {
		onMessageReceived: (message: { message: string; senderName: string }) => {
			const raw = message.message
			if (typeof raw !== "string") return

			const [kind, ...rest] = raw.split(":")
			if (!kind) return

			if (kind === "REQUEST") {
				const [requestId, createdAtStr, initiatorName, requiredIdsCsv = ""] = rest
				if (!requestId || !createdAtStr || !initiatorName) return

				const requiredParticipantIds = requiredIdsCsv
					.split(",")
					.map(s => s.trim())
					.filter(Boolean)

				// Ignore if we're already handling an active request (prevents modal spam)
				setRecordingConsentRequest(prev => {
					if (prev?.id === requestId) return prev
					return {
						id: requestId,
						createdAt: Number(createdAtStr) || Date.now(),
						initiatorName,
						requiredParticipantIds,
					}
				})
				setRecordingConsentAcceptedIds(new Set())
				setRecordingConsentDeclined(false)
				setRecordingConsentOpen(true)
				return
			}

			if (kind === "RESPONSE") {
				const [requestId, participantId, _participantName, decision] = rest
				if (!requestId || !participantId || !decision) return

				setRecordingConsentRequest(current => {
					if (current?.id !== requestId) return current

					if (decision === "DECLINE") {
						setRecordingConsentDeclined(true)
						// Keep modal open so both parties see the decline immediately
						return current
					}

					if (decision === "ACCEPT") {
						setRecordingConsentAcceptedIds(prev => {
							const next = new Set(prev)
							next.add(participantId)
							return next
						})
					}

					return current
				})
				return
			}

			if (kind === "CANCEL") {
				const [requestId] = rest
				setRecordingConsentRequest(current => {
					if (!current || current.id !== requestId) return current
					resetRecordingConsentUi()
					return null
				})
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

			// START CLOUD RECORDING (VideoSDK)
			const meetingWithRecording = meeting as unknown as {
				startRecording?: () => Promise<void> | void
			}
			const recordingResult = meetingWithRecording.startRecording?.()
			if (recordingResult !== undefined && recordingResult instanceof Promise) {
				await recordingResult
			}

			// Update local UI state
			setIsLocalRecording(true)
			setIsAnyoneRecording(true)
			setLocalRecordingStartedAt(startedAt)
			setRecordingParticipantName(session?.user?.name ?? "Someone")

			// Clear stopped state
			setRecordingStopped(false)
			setStoppedElapsed(null)

			// Broadcast to all participants
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
			if (stopResult !== undefined && stopResult instanceof Promise) {
				await stopResult
			}

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
					layout: {
						type: "GRID",
						priority: "SPEAKER",
						gridSize: 4,
						participants: ["*"],
					},
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

	const closeConsentAsInitiator = useCallback(() => {
		if (!recordingConsentRequest) return
		publishRecordingConsent(`CANCEL:${recordingConsentRequest.id}`, { persist: false })
		resetRecordingConsentUi()
	}, [publishRecordingConsent, recordingConsentRequest, resetRecordingConsentUi])

	const openConsentAndRequest = useCallback(() => {
		// If already recording, keep existing behavior (stop immediately).
		if (isLocalRecording) {
			void stopLocalRecording()
			return
		}

		// Only run consent flow when there is at least 1 other participant.
		if (participantIds.length <= 0) {
			toast.error("Waiting for another participant to join before starting a recording.")
			return
		}

		const initiatorName = session?.user?.name ?? "Someone"
		const requiredIds = participantIds
		const request = buildConsentRequest(requiredIds, initiatorName)

		setRecordingConsentRequest(request)
		setRecordingConsentAcceptedIds(new Set())
		setRecordingConsentDeclined(false)
		setRecordingConsentOpen(true)

		const payload = `REQUEST:${request.id}:${request.createdAt}:${request.initiatorName}:${request.requiredParticipantIds.join(",")}`
		publishRecordingConsent(payload, { persist: false })
	}, [
		buildConsentRequest,
		isLocalRecording,
		participantIds,
		publishRecordingConsent,
		session?.user?.name,
		stopLocalRecording,
	])

	const acceptConsent = useCallback(async () => {
		if (!recordingConsentRequest) return
		if (!localParticipantId) {
			toast.error("Cannot confirm consent yet (participant id not ready). Please try again.")
			return
		}

		const myName = session?.user?.name ?? "Someone"
		publishRecordingConsent(
			`RESPONSE:${recordingConsentRequest.id}:${localParticipantId}:${myName}:ACCEPT`,
			{ persist: false }
		)

		setRecordingConsentAcceptedIds(prev => {
			const next = new Set(prev)
			next.add(localParticipantId)
			return next
		})
	}, [localParticipantId, publishRecordingConsent, recordingConsentRequest, session?.user?.name])

	const declineConsent = useCallback(() => {
		if (!recordingConsentRequest) return
		if (!localParticipantId) {
			resetRecordingConsentUi()
			return
		}

		const myName = session?.user?.name ?? "Someone"
		publishRecordingConsent(
			`RESPONSE:${recordingConsentRequest.id}:${localParticipantId}:${myName}:DECLINE`,
			{ persist: false }
		)
		setRecordingConsentDeclined(true)
	}, [
		localParticipantId,
		publishRecordingConsent,
		recordingConsentRequest,
		resetRecordingConsentUi,
		session?.user?.name,
	])

	// If I'm the initiator and everyone has accepted, start local recording (initiator only).
	useEffect(() => {
		if (!recordingConsentRequest) return
		if (!localParticipantId) return

		const isInitiator = recordingConsentRequest.initiatorName === (session?.user?.name ?? "Someone")
		if (!isInitiator) return
		if (recordingConsentDeclined) return

		const required = recordingConsentRequest.requiredParticipantIds
		if (!required || required.length === 0) return

		const allAccepted = required.every(id => recordingConsentAcceptedIds.has(id))
		if (!allAccepted) return

		// Start recording as a direct consequence of the initiator's Accept click.
		// NOTE: If the last accept came from a remote participant, this won't be a gesture.
		// In practice, the initiator should click Accept last to satisfy getDisplayMedia gesture.
		resetRecordingConsentUi()
		void startLocalRecording()
	}, [
		localParticipantId,
		recordingConsentAcceptedIds,
		recordingConsentDeclined,
		recordingConsentRequest,
		resetRecordingConsentUi,
		session?.user?.name,
		startLocalRecording,
	])

	// Memoize upload dialog open handler
	const handleUploadClick = useCallback(() => {
		setIsUploadDialogOpen(true)
	}, [])

	// Memoize the entire documents panel so meeting state changes (camera/mic) don't rebuild it.
	const documentsPanel = useMemo(() => {
		if (!documents || documents.length === 0) return null

		return (
			<div
				className={cn(
					"bg-card/50 shrink-0 border-t shadow-lg backdrop-blur-sm transition-all duration-300",
					showDocuments ? "max-h-100 min-h-50" : "h-12 md:h-14"
				)}
			>
				<div className="flex h-12 shrink-0 items-center justify-between border-b px-3 md:h-14 md:px-4 lg:px-6">
					{(() => {
						const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
						const isPrincipal = meetingDetails?.createdBy.id === session?.user?.id

						return (
							<>
								<div className="flex items-center gap-2">
									<div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg md:h-8 md:w-8">
										<FileText className="text-primary size-4 md:size-5" />
									</div>
									<span className="text-sm font-semibold md:text-base">
										Documents ({documents.length})
									</span>
									{/* Locked State Indicator */}
									{isLocked && (
										<div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 dark:border-amber-700 dark:bg-amber-900/30">
											<Lock className="size-3 text-amber-700 dark:text-amber-400" />
											<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
												Order Locked
											</span>
										</div>
									)}
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => {
											if (isPrincipal && meetingId) {
												toggleLockMutation.mutate({
													meetingId,
													isLocked: !isLocked,
												})
											}
										}}
										disabled={!isPrincipal || toggleLockMutation.isPending}
										className={cn(
											"hover:bg-muted h-8 px-3 text-xs md:text-sm",
											isLocked &&
												"bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30",
											!isPrincipal && "cursor-not-allowed opacity-50"
										)}
										title={
											!isPrincipal
												? "Only the meeting creator (principal) can lock/unlock documents"
												: isLocked
													? "Unlock document order - allows reordering"
													: "Lock document order - enforces sequential signing"
										}
									>
										{isLocked ? (
											<>
												<Lock className="mr-1.5 size-3.5" />
												Locked
											</>
										) : (
											<>
												<Unlock className="mr-1.5 size-3.5" />
												Unlocked
											</>
										)}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowDocuments(!showDocuments)}
										className="hover:bg-muted h-8 px-3 text-xs md:text-sm"
									>
										{showDocuments ? "Hide" : "Show"}
									</Button>
								</div>
							</>
						)
					})()}
				</div>
				{/* Locked State Banner - Show explanation when locked */}
				{(() => {
					const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
					return (
						isLocked &&
						showDocuments && (
							<div className="border-b border-amber-200 bg-amber-50 px-3 py-2 md:px-4 lg:px-6 dark:border-amber-800 dark:bg-amber-900/10">
								<p className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
									<Lock className="size-3.5 shrink-0" />
									<span>
										Documents are locked in signing order. Each document must be signed before the
										next one can be started.
									</span>
								</p>
							</div>
						)
					)
				})()}
				{showDocuments && (
					<div className="max-h-87.5 overflow-y-auto px-3 py-4 md:px-4 lg:px-6">
						<div className="grid grid-cols-1 gap-3 transition-all duration-300 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
							{documents.map((doc, index) => {
								const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
								const isDragged = draggedDocumentId === doc.id
								const isDragOver = dragOverDocumentId === doc.id

								// Check if previous document is signed (for sequential signing when locked)
								const previousDoc = index > 0 ? documents[index - 1] : null
								const isPreviousDocumentSigned =
									!previousDoc ||
									(documentSigningStatus.get(previousDoc.id)?.isFullySigned ?? false)

								const signingStatus = doc.docoChainProjectId
									? documentSigningStatus.get(doc.id)
									: undefined
								// Check if fully signed: either from API or by comparing signedCount to totalSigners
								// This ensures the badge updates even if the API's isFullySigned is not set correctly
								const isFullySigned =
									signingStatus?.isFullySigned === true ||
									((signingStatus?.totalSigners ?? 0) > 0 &&
										(signingStatus?.signedCount ?? 0) === (signingStatus?.totalSigners ?? 0) &&
										(signingStatus?.signedCount ?? 0) > 0) ||
									false
								const isDownloadingSigned =
									!!doc.docoChainProjectId && downloadingProjectUuid === doc.docoChainProjectId
								const isDownloadingCert =
									!!doc.docoChainProjectId && downloadingCertificateUuid === doc.docoChainProjectId

								return (
									<Card
										key={doc.id}
										style={{
											opacity: isDragged && !isLocked ? 0.5 : 1,
											transform:
												isDragged && !isLocked
													? "scale(0.95)"
													: isDragOver && !isLocked
														? "scale(1.03)"
														: "scale(1)",
											transition:
												isDragged && !isLocked
													? "opacity 0.2s ease-out, transform 0.2s ease-out"
													: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
											zIndex: isDragged && !isLocked ? 50 : isDragOver && !isLocked ? 10 : 1,
										}}
										className={cn(
											"relative border-2 shadow-md hover:shadow-lg",
											isDragged
												? "cursor-grabbing shadow-2xl"
												: "hover:border-primary/50 hover:shadow-xl",
											isDragOver &&
												!isDragged &&
												!isLocked &&
												"border-primary bg-primary/5 border-2 shadow-xl",
											isLocked && "border-muted/50 opacity-90"
										)}
										onDragEnter={e => {
											if (!isLocked) handleDragEnter(e, doc.id)
										}}
										onDragLeave={handleDragLeave}
										onDragOver={e => {
											if (!isLocked) handleDragOver(e, doc.id)
										}}
										onDrop={e => {
											if (!isLocked) handleDrop(e, doc.id)
										}}
									>
										{/* Order indicator when locked - top left corner */}
										{isLocked && (
											<div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 shadow-sm dark:border-amber-700 dark:bg-amber-900/40">
												<div className="flex size-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white dark:bg-amber-500">
													{index + 1}
												</div>
												<Lock className="size-3 text-amber-700 dark:text-amber-400" />
											</div>
										)}
										{/* Signing status + actions - top right corner */}
										{doc.docoChainProjectId && signingStatus && (
											<div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
												{isFullySigned ? (
													<div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30">
														<CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
														<span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
															Signed
														</span>
													</div>
												) : (signingStatus.signedCount ?? 0) > 0 ? (
													<div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/30">
														<Clock className="size-3 text-yellow-600 dark:text-yellow-400" />
														<span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">
															{signingStatus.signedCount ?? 0}/{signingStatus.totalSigners ?? 0}
														</span>
													</div>
												) : (
													<div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
														<Clock className="size-3 text-gray-500 dark:text-gray-400" />
														<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
															Pending
														</span>
													</div>
												)}

												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-7 w-7 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
															title="More actions"
														>
															<MoreVertical className="size-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" sideOffset={6} className="min-w-44">
														<DropdownMenuItem
															disabled={!isFullySigned || isDownloadingSigned}
															onClick={() => {
																if (doc.docoChainProjectId) {
																	void handleDownloadSignedDocument(doc.docoChainProjectId)
																}
															}}
														>
															<FileText className="size-4" />
															<span>
																{isDownloadingSigned
																	? "Opening signed document..."
																	: "View signed document"}
															</span>
														</DropdownMenuItem>
														<DropdownMenuItem
															disabled={!isFullySigned || isDownloadingCert}
															onClick={() => {
																if (doc.docoChainProjectId) {
																	void handleDownloadCertificate(doc.docoChainProjectId)
																}
															}}
														>
															<Download className="size-4" />
															<span>
																{isDownloadingCert
																	? "Downloading certificate..."
																	: "Download certificate"}
															</span>
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>
										)}
										<CardContent className="p-4">
											<div className="mb-3 flex items-start gap-3">
												{/* Drag handle - only draggable element */}
												<div
													className={cn(
														"relative mt-1 shrink-0 transition-colors",
														isLocked
															? "cursor-not-allowed opacity-40"
															: "text-muted-foreground hover:text-primary cursor-move"
													)}
													draggable={!isLocked}
													onDragStart={e => handleDragStart(e, doc.id)}
													onDragEnd={handleDragEnd}
													title={
														isLocked
															? "Document order is locked - cannot reorder"
															: "Drag to reorder documents"
													}
												>
													<GripVertical
														className={cn("size-4", isLocked && "text-muted-foreground/30")}
													/>
												</div>
												<div className="bg-primary/10 shrink-0 rounded-lg p-2.5">
													<FileText className="text-primary size-5" />
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-semibold" title={doc.name}>
														{doc.name}
													</p>
													<p className="text-muted-foreground mt-1 text-xs">
														{(doc.size / 1024).toFixed(1)} KB • PDF
													</p>
												</div>
											</div>
											<DocumentActions
												document={doc}
												onSignClick={handleSignClick}
												onSignersChange={handleSignersChange}
												isSigningPending={initiateSigning.isPending && signingDocumentId === doc.id}
												isLocked={isLocked}
												isPreviousDocumentSigned={isPreviousDocumentSigned}
												documentIndex={index}
												signers={documentSigningStatus.get(doc.id)?.signers}
												participants={meetingDetails?.participants ?? []}
												signerUserIds={(doc as { signerUserIds?: string[] }).signerUserIds ?? []}
												meetingId={meetingId ?? undefined}
												onCreateProject={(documentId, meetingId) => {
													createDocoChainProjectMutation.mutate({ documentId, meetingId })
												}}
												isCreatingProject={createDocoChainProjectMutation.isPending}
											/>
										</CardContent>
									</Card>
								)
							})}
						</div>
					</div>
				)}
			</div>
		)
	}, [
		documents,
		documentSigningStatus,
		dragOverDocumentId,
		draggedDocumentId,
		downloadingCertificateUuid,
		downloadingProjectUuid,
		handleDownloadCertificate,
		handleDownloadSignedDocument,
		handleDragEnd,
		handleDragEnter,
		handleDragLeave,
		handleDragOver,
		handleDragStart,
		handleDrop,
		handleSignClick,
		handleSignersChange,
		initiateSigning.isPending,
		meetingDetails,
		meetingId,
		session?.user?.id,
		showDocuments,
		signingDocumentId,
		toggleLockMutation,
	])

	if (!joined) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<div className="text-center">
					<div className="border-primary mx-auto mb-4 size-12 animate-spin rounded-full border-b-4" />
					<p className="text-muted-foreground font-medium">Joining meeting...</p>
				</div>
			</div>
		)
	}

	return (
		<div
			ref={recordingContainerRef}
			className="from-background via-muted/20 to-background flex h-screen flex-col bg-linear-to-br"
		>
			{/* Header with Controls */}
			<div className="bg-card/50 flex flex-col items-center justify-between gap-3 border-b px-4 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:gap-4 md:px-6 md:py-4">
				<div className="flex items-center gap-2">
					<div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
						<FileSignature className="text-primary h-4 w-4" />
					</div>
					<h1 className="text-base font-bold md:text-lg">Signing Session</h1>
				</div>

				{/* Meeting Controls */}
				<MeetingControls
					onUploadClick={handleUploadClick}
					onRecordingToggle={handleRecordingToggle}
					onLocalRecordingToggle={openConsentAndRequest}
					localRecordingSupported={localRecordingSupported}
					isRecording={isRecording}
					isRecordingStarting={recordingStatus === "RECORDING_STARTING"}
					isLocalRecording={isLocalRecording}
					localRecordingStartedAt={localRecordingStartedAt}
				/>

				<div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-1.5">
					<UsersIcon className="text-muted-foreground size-4" />
					<span className="text-xs font-medium md:text-sm">
						{participantCount} {participantCount === 1 ? "participant" : "participants"}
					</span>
				</div>
			</div>

			{/* Document Upload Dialog */}
			{meetingId && (
				<MeetingDocumentUpload
					meetingId={meetingId}
					isOpen={isUploadDialogOpen}
					onClose={() => setIsUploadDialogOpen(false)}
					onSuccess={() => {
						void refetchDocuments()
						setShowDocuments(true)
					}}
				/>
			)}

			{/* Main Content: Signing-focused layout */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="flex-1 overflow-hidden p-3 md:p-4 lg:p-6">
					<RecordingBanner
						isLocalRecording={isLocalRecording}
						localRecordingStartedAt={localRecordingStartedAt}
						isAnyoneRecording={isAnyoneRecording}
						recordingParticipantName={recordingParticipantName}
						recordingStopped={recordingStopped}
						stoppedElapsed={stoppedElapsed}
					/>
					{participantIds.length === 0 ? (
						<Card className="mx-auto max-w-xl shadow-md">
							<CardContent className="text-muted-foreground p-6 text-center text-sm">
								No participants yet. Turn on your camera to appear in the session.
							</CardContent>
						</Card>
					) : (
						<div className="flex h-full w-full flex-col gap-4 overflow-y-auto">
							{presenterId && (
								<div className="w-full">
									<div className="border-border/70 bg-card/80 overflow-hidden rounded-xl border shadow-lg">
										<ParticipantView participantId={presenterId} />
									</div>
								</div>
							)}
							<div
								className={cn(
									"grid h-full w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 sm:gap-5",
									"auto-rows-[minmax(260px,1fr)]",
									showDocuments && "auto-rows-[minmax(220px,1fr)] md:auto-rows-[minmax(240px,1fr)]"
								)}
							>
								{participantIds
									.filter(id => id !== presenterId)
									.map(participantId => (
										<div key={participantId} className="min-h-65">
											<ParticipantView participantId={participantId} />
										</div>
									))}
							</div>
						</div>
					)}
				</div>

				{/* Documents Panel at Bottom */}
				{documentsPanel}
			</div>

			{/* Send to ENP Dialog */}
			<Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Send className="text-primary size-5" />
							Send Document for Signature
						</DialogTitle>
						<DialogDescription>
							Select which ENP participant should sign this document
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Select ENP Participant</label>
							<Select value={selectedSignerId} onValueChange={setSelectedSignerId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Choose a participant" />
								</SelectTrigger>
								<SelectContent>
									{meetingDetails?.participants
										.filter(p => p.userId !== session?.user?.id)
										.map(participant => (
											<SelectItem key={participant.userId} value={participant.userId}>
												{participant.user.name} - {participant.user.email}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (selectedDocumentId && selectedSignerId) {
									createSignatureRequest.mutate({
										meetingId: meetingId ?? "",
										documentId: selectedDocumentId,
										signerId: selectedSignerId,
									})
								}
							}}
							disabled={!selectedSignerId || createSignatureRequest.isPending}
						>
							{createSignatureRequest.isPending ? (
								<>
									<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Sending...
								</>
							) : (
								<>
									<Send className="mr-2 size-3" />
									Send Request
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Signature Request Notification for ENP */}
			{activeSignatureRequest && (
				<Dialog
					open={true}
					onOpenChange={open => {
						if (!open) {
							// Dismiss this request
							setDismissedRequestIds(prev => new Set(prev).add(activeSignatureRequest.id))
						}
					}}
				>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<FileSignature className="text-primary size-5" />
								Signature Request
							</DialogTitle>
							<DialogDescription>You have been requested to sign a document</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div className="bg-muted/50 space-y-2 rounded-lg p-4">
								<div>
									<p className="text-muted-foreground text-xs">Document</p>
									<p className="font-semibold">{activeSignatureRequest.document.name}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Requested by</p>
									<p className="font-semibold">{activeSignatureRequest.requester.name}</p>
								</div>
								<div>
									<p className="text-muted-foreground text-xs">Meeting</p>
									<p className="font-semibold">{activeSignatureRequest.meeting.title}</p>
								</div>
							</div>
						</div>

						<DialogFooter className="flex-col gap-2 sm:flex-row">
							<Button
								variant="outline"
								className="w-full sm:w-auto"
								onClick={() => {
									// Decline signature request
									updateSignatureStatus.mutate({
										requestId: activeSignatureRequest.id,
										status: "DECLINED",
									})
									setDismissedRequestIds(prev => new Set(prev).add(activeSignatureRequest.id))
								}}
								disabled={updateSignatureStatus.isPending}
							>
								{updateSignatureStatus.isPending ? "Declining..." : "Decline"}
							</Button>
							<Button
								className="w-full sm:w-auto"
								onClick={() => {
									const projectId = activeSignatureRequest.document.docoChainProjectId
									const userEmail = session?.user?.email

									console.log("Document:", activeSignatureRequest.document)
									console.log("DocoChain Project ID:", projectId)
									console.log("ENP Email:", userEmail)

									if (projectId && userEmail) {
										// Generate personalized signing link for this ENP
										console.log("🔵 Generating personalized signing link for ENP...")
										generateSigningLink.mutate({
											projectUuid: projectId,
											email: userEmail,
										})

										// Dismiss this request
										setDismissedRequestIds(prev => new Set(prev).add(activeSignatureRequest.id))
									} else {
										console.error("Missing required data:", { projectId, userEmail })
										toast.error(
											!projectId
												? "DocoChain project not found. Please ensure the document was uploaded correctly."
												: "User email not found. Please sign in again."
										)
									}
								}}
								disabled={generateSigningLink.isPending}
							>
								<FileSignature className="mr-2 size-4" />
								{generateSigningLink.isPending ? "Generating Link..." : "Sign Document"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{/* Recording Consent Dialog (shown to all participants) */}
			<Dialog
				open={recordingConsentOpen}
				onOpenChange={open => {
					// If user closes the modal manually, treat as decline to be safe.
					if (!open && recordingConsentRequest && !recordingConsentDeclined) {
						declineConsent()
					}
					setRecordingConsentOpen(open)
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CircleDot className="text-destructive size-5" />
							Start meeting recording?
						</DialogTitle>
						<DialogDescription>
							{recordingConsentRequest?.initiatorName ?? "Someone"} wants to start a screen
							recording. Recording will begin only after everyone agrees.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 py-2 text-sm">
						<div className="bg-muted/50 rounded-lg border p-3">
							<div className="flex items-center justify-between">
								<span className="font-medium">Consents</span>
								<span className="text-muted-foreground text-xs">
									{recordingConsentRequest
										? `${recordingConsentAcceptedIds.size}/${recordingConsentRequest.requiredParticipantIds.length}`
										: "0/0"}
								</span>
							</div>
							{recordingConsentDeclined ? (
								<p className="mt-2 text-sm text-red-600 dark:text-red-400">
									Someone declined. Recording will not start.
								</p>
							) : (
								<p className="text-muted-foreground mt-2 text-xs">
									Click <span className="font-semibold">Agree</span> to consent, or{" "}
									<span className="font-semibold">Decline</span> to cancel.
								</p>
							)}
						</div>
					</div>

					<DialogFooter className="flex-col gap-2 sm:flex-row">
						<Button
							variant="outline"
							onClick={() => {
								if (recordingConsentRequest?.initiatorName === (session?.user?.name ?? "Someone")) {
									closeConsentAsInitiator()
								} else {
									declineConsent()
								}
							}}
						>
							Decline
						</Button>
						<Button
							disabled={recordingConsentDeclined || !localParticipantId}
							onClick={async () => {
								await acceptConsent()

								if (!recordingConsentRequest || !localParticipantId) return

								const isInitiator =
									recordingConsentRequest.initiatorName === (session?.user?.name ?? "Someone")

								if (!isInitiator) return
								if (recordingConsentDeclined) return

								const required = recordingConsentRequest.requiredParticipantIds
								const allAccepted = required.every(id =>
									id === localParticipantId ? true : recordingConsentAcceptedIds.has(id)
								)

								if (!allAccepted) return

								resetRecordingConsentUi()
								void startLocalRecording()
							}}
						>
							Agree
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

// Main export component
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
	// Only enable debug mode in development
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
