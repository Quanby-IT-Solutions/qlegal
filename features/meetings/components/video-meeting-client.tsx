"use client"

import { Camera, CameraOff, Mic, MicOff, Monitor, PhoneOff, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

// Screen share view component
function ScreenShareView({ participantId }: { participantId: string }) {
	const { screenShareStream, displayName } = useParticipant(participantId)
	const screenVideoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (screenShareStream && screenVideoRef.current) {
			const mediaStream = new MediaStream()
			mediaStream.addTrack(screenShareStream.track)
			screenVideoRef.current.srcObject = mediaStream
			void screenVideoRef.current.play().catch(() => void 0)
		}
	}, [screenShareStream])

	return (
		<Card className="relative size-full overflow-hidden border border-primary">
			<CardContent className="relative p-0 size-full bg-gray-900">
				<video
					ref={screenVideoRef}
					autoPlay
					playsInline
					className="size-full object-contain"
				/>
				<div className="absolute top-2 left-2 rounded bg-black/70 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
					<Monitor className="mr-2 inline size-4" />
					<span className="font-medium">{displayName} is presenting</span>
				</div>
			</CardContent>
		</Card>
	)
}

// Participant video component
function ParticipantView({ participantId }: { participantId: string }) {
	const { webcamStream, micOn, webcamOn, displayName, isLocal } = useParticipant(participantId)
	const videoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (webcamStream && videoRef.current && webcamOn) {
			const mediaStream = new MediaStream()
			mediaStream.addTrack(webcamStream.track)
			videoRef.current.srcObject = mediaStream
			void videoRef.current.play().catch(() => void 0)
		}
	}, [webcamStream, webcamOn])

	return (
		<Card className="relative size-full overflow-hidden border border-gray-800 transition-all hover:border-primary">
			<CardContent className="relative p-0 size-full">
				{webcamOn && webcamStream ? (
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted={isLocal}
						className="size-full object-contain bg-gray-900"
					/>
				) : (
					<div className="flex size-full items-center justify-center bg-gray-900">
						<div className="flex size-24 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
							{displayName?.charAt(0).toUpperCase() ?? "?"}
						</div>
					</div>
				)}

				{/* Overlay info */}
				<div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
					<div className="flex items-center gap-2 rounded bg-black/70 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
						<span className="font-medium">{displayName ?? "Unknown"}</span>
						{isLocal && <span className="text-xs text-gray-300">(You)</span>}
					</div>
					{!micOn && (
						<div className="rounded bg-red-500/90 p-1.5 backdrop-blur-sm">
							<MicOff className="size-4 text-white" />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}

// Meeting controls
function MeetingControls() {
	const meeting = useMeeting()
	const [isMicOn, setIsMicOn] = useState(true)
	const [isCameraOn, setIsCameraOn] = useState(false)
	const [isScreenSharing, setIsScreenSharing] = useState(false)

	// Sync with VideoSDK state
	useEffect(() => {
		if (meeting?.localMicOn !== undefined) {
			setIsMicOn(meeting.localMicOn)
		}
	}, [meeting?.localMicOn])

	useEffect(() => {
		if (meeting?.localWebcamOn !== undefined) {
			setIsCameraOn(meeting.localWebcamOn)
		}
	}, [meeting?.localWebcamOn])

	useEffect(() => {
		if (meeting?.localScreenShareOn !== undefined) {
			setIsScreenSharing(meeting.localScreenShareOn)
		}
	}, [meeting?.localScreenShareOn])

	const handleToggleMic = () => {
		meeting?.toggleMic()
	}

	const handleToggleCamera = () => {
		meeting?.toggleWebcam()
	}

	const handleToggleScreenShare = () => {
		meeting?.toggleScreenShare()
	}

	const handleLeave = () => {
		meeting?.leave()
	}

	return (
		<div className="flex items-center gap-2">
			<Button
				variant={isMicOn ? "ghost" : "destructive"}
				size="sm"
				className="size-9 rounded-full p-0"
				onClick={handleToggleMic}
				title={isMicOn ? "Mute microphone" : "Unmute microphone"}
			>
				{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
			</Button>

			<Button
				variant={isCameraOn ? "ghost" : "destructive"}
				size="sm"
				className="size-9 rounded-full p-0"
				onClick={handleToggleCamera}
				title={isCameraOn ? "Turn off camera" : "Turn on camera"}
			>
				{isCameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
			</Button>

			<Button
				variant={isScreenSharing ? "destructive" : "ghost"}
				size="sm"
				className="size-9 rounded-full p-0"
				onClick={handleToggleScreenShare}
				title={isScreenSharing ? "Stop sharing" : "Share screen"}
			>
				<Monitor className="size-4" />
			</Button>

			<Button
				variant="destructive"
				size="sm"
				className="size-9 rounded-full p-0"
				onClick={handleLeave}
				title="Leave meeting"
			>
				<PhoneOff className="size-4" />
			</Button>
		</div>
	)
}

// Main meeting view
function MeetingView({ onLeave }: { onLeave?: () => void }) {
	const [joined, setJoined] = useState(false)
	const [joinCalled, setJoinCalled] = useState(false)
	const [presenterId, setPresenterId] = useState<string | null>(null)
	
	const { participants, join } = useMeeting({
		onMeetingJoined: () => {
			setJoined(true)
		},
		onMeetingLeft: () => {
			setJoined(false)
			// Call the onLeave callback to redirect user
			if (onLeave) {
				onLeave()
			}
		},
		onPresenterChanged: (presenterId) => {
			setPresenterId(presenterId)
		},
	})

	// Get actual participant IDs from the Map, excluding duplicates and system participants
	const allParticipantIds = Array.from(participants.keys())
	
	// First, filter out system participants
	const humanParticipants = allParticipantIds.filter((id) => {
		const participant = participants.get(id)
		if (!participant) {
			return false
		}
		
		const idLower = id.toLowerCase()
		const nameLower = (participant.displayName || "").toLowerCase()
		
		const isSystemParticipant = 
			idLower.includes("recorder") ||
			idLower.includes("bot") ||
			idLower.includes("internal") ||
			idLower.includes("hls") ||
			nameLower.includes("recorder") ||
			nameLower.includes("bot")
		
		return !isSystemParticipant
	})
	
	// Then deduplicate by displayName (keep only local or first occurrence)
	const seenNames = new Set<string>()
	const participantIds = humanParticipants.filter((id) => {
		const participant = participants.get(id)
		if (!participant) {return false}
		
		const name = participant.displayName || id
		
		// If this is the local participant, always include it
		if (participant.local) {
			seenNames.add(name)
			return true
		}
		
		// If we haven't seen this name yet, include it
		if (!seenNames.has(name)) {
			seenNames.add(name)
			return true
		}
		
		// Duplicate - exclude it
		return false
	})

	// Debug: Log unique participants only
	useEffect(() => {
		if (participantIds.length > 0) {
			// eslint-disable-next-line no-console
			console.log("Unique participants:", participantIds.length)
			participantIds.forEach((id) => {
				const p = participants.get(id)
				// eslint-disable-next-line no-console
				console.log("→", { 
					id, 
					displayName: p?.displayName, 
					local: p?.local,
				})
			})
		}
	}, [participantIds.length, participantIds, participants])

	useEffect(() => {
		if (!joinCalled) {
			// Add a small delay to prevent duplicate joins
			const timer = setTimeout(() => {
				join()
				setJoinCalled(true)
			}, 100)
			return () => clearTimeout(timer)
		}
	}, [join, joinCalled]) // Only run once

	if (!joined) {
		return (
			<div className="flex h-screen items-center justify-center bg-gray-950">
				<div className="text-center">
					<div className="size-8 animate-spin rounded-full border-b-2 border-primary mx-auto mb-4" />
					<p className="text-gray-300">Joining meeting...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-screen flex-col bg-gray-950 text-white">
			{/* Header with Controls */}
			<div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-3">
				<h1 className="text-lg font-bold">Video Meeting</h1>
				
				{/* Meeting Controls */}
				<MeetingControls />
				
				<div className="flex items-center gap-2 text-sm text-gray-400">
					<Users className="size-4" />
					<span>{participantIds.length} {participantIds.length === 1 ? "participant" : "participants"}</span>
				</div>
			</div>

			{/* Video Grid or Screen Share Layout */}
			{presenterId ? (
				// Screen share layout: Main screen + sidebar with participants
				<div className="flex flex-1 gap-4 overflow-hidden p-4">
					{/* Main screen share area */}
					<div className="flex-1">
						<ScreenShareView participantId={presenterId} />
					</div>
					
					{/* Sidebar with participant videos */}
					<div className="flex w-64 flex-col gap-2 overflow-y-auto">
						{participantIds.map((participantId) => (
							<div key={participantId} className="h-36 flex-shrink-0">
								<ParticipantView participantId={participantId} />
							</div>
						))}
					</div>
				</div>
			) : (
				// Normal grid layout when no one is sharing
				<div className="flex-1 overflow-hidden p-4">
					<div
						className={cn(
							"grid size-full gap-4",
							participantIds.length === 1 && "grid-cols-1",
							participantIds.length === 2 && "grid-cols-2",
							participantIds.length > 2 && participantIds.length <= 4 && "grid-cols-2",
							participantIds.length > 4 && "grid-cols-3"
						)}
					>
						{participantIds.map((participantId) => (
							<ParticipantView key={participantId} participantId={participantId} />
						))}
					</div>
				</div>
			)}
		</div>
	)
}

// Main export component
export interface VideoMeetingClientProps {
	meetingId: string
	token: string
	participantName: string
	onLeave?: () => void
}

export function VideoMeetingClient({ meetingId, token, participantName, onLeave }: VideoMeetingClientProps) {
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true)
	}, [])

	if (!isClient) {
		return (
			<div className="flex h-screen items-center justify-center bg-gray-950">
				<div className="text-center">
					<div className="size-8 animate-spin rounded-full border-b-2 border-primary mx-auto mb-4" />
					<p className="text-gray-300">Loading...</p>
				</div>
			</div>
		)
	}

	return (
		<MeetingProvider
			config={{
				meetingId,
				micEnabled: true,
				webcamEnabled: false,
				name: participantName,
				debugMode: false,
			}}
			token={token}
			joinWithoutUserInteraction
		>
			<MeetingView onLeave={onLeave} />
		</MeetingProvider>
	)
}

