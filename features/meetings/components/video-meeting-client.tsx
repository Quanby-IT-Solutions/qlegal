"use client"

import { Camera, CameraOff, FileText, FileUp, Mic, MicOff, Monitor, PhoneOff, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk"

import { trpc } from "@/services/trpc/client"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"
import { MeetingDocumentUpload } from "./meeting-document-upload"

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
	const { webcamStream, micOn, webcamOn, displayName, isLocal, screenShareStream, screenShareOn } = useParticipant(participantId)
	const videoRef = useRef<HTMLVideoElement>(null)
	const [streamSet, setStreamSet] = useState(false)

	const getDisplayName = () => displayName ?? `Participant ${participantId.slice(-4)}`

	// Webcam stream setup
	useEffect(() => {
		const videoElement = videoRef.current

		// Only set webcam stream if not currently screen sharing
		if (videoElement && webcamStream && webcamOn && !streamSet && !screenShareOn) {
			try {
				if (webcamStream.track && webcamStream.track instanceof MediaStreamTrack) {
					const mediaStream = new MediaStream([webcamStream.track])
					videoElement.srcObject = mediaStream
					setStreamSet(true)
					// eslint-disable-next-line no-console
					console.log("📹 Webcam stream set for:", participantId)
				} else {
					console.error(`❌ Invalid stream for ${participantId}:`, webcamStream)
				}
			} catch (error) {
				console.error(`❌ Error setting video stream for ${participantId}:`, error)
			}
		}

		// Reset if webcam is turned off
		if (!webcamOn && streamSet) {
			setStreamSet(false)
			if (videoElement) {
				videoElement.srcObject = null
			}
		}
	}, [webcamStream, webcamOn, participantId, streamSet, screenShareOn])

	// Screen share stream setup
	useEffect(() => {
		const videoElement = videoRef.current

		if (videoElement && screenShareStream && screenShareOn) {
			try {
				if (screenShareStream.track && screenShareStream.track instanceof MediaStreamTrack) {
					const mediaStream = new MediaStream([screenShareStream.track])
					videoElement.srcObject = mediaStream
					// eslint-disable-next-line no-console
					console.log("🖥️ Screen share stream set for:", participantId)
				}
			} catch (error) {
				console.error(`❌ Error setting screen share for ${participantId}:`, error)
			}
		}

		// Reset if screen share is turned off
		if (!screenShareOn && videoElement && videoElement.srcObject) {
			videoElement.srcObject = null
		}
	}, [screenShareStream, screenShareOn, participantId])

	const hasVideo = (webcamOn && webcamStream && webcamStream.track) || (screenShareOn && screenShareStream && screenShareStream.track)

	return (
		<Card className="relative size-full overflow-hidden border border-gray-800 transition-all hover:border-primary">
			<CardContent className="relative p-0 size-full">
				{hasVideo ? (
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted={isLocal}
						onLoadedMetadata={() => {
							// eslint-disable-next-line no-console
							console.log("📹 Video loaded for:", participantId, getDisplayName())
						}}
						onError={(e) => {
							console.error(`❌ Video error for ${participantId}:`, e)
							setStreamSet(false)
						}}
						className="size-full object-cover bg-gray-900"
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
function MeetingControls({ onUploadClick }: { onUploadClick?: () => void }) {
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

		{onUploadClick && (
			<Button
				variant="ghost"
				size="sm"
				className="size-9 rounded-full p-0"
				onClick={onUploadClick}
				title="Upload document"
			>
				<FileUp className="size-4" />
			</Button>
		)}

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
function MeetingView({ onLeave, meetingId }: { onLeave?: () => void; meetingId?: string }) {
	const [joined, setJoined] = useState(false)
	const [presenterId, setPresenterId] = useState<string | null>(null)
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [showDocuments, setShowDocuments] = useState(false)
	
	// Fetch meeting documents
	const { data: documents, refetch: refetchDocuments } = trpc.meetings.getMeetingDocuments.useQuery(
		meetingId || "",
		{
			enabled: !!meetingId,
			refetchInterval: 5000, // Refetch every 5 seconds to get new uploads
		}
	)
	
	const { participants } = useMeeting({
		onMeetingJoined: () => {
			setJoined(true)
			// eslint-disable-next-line no-console
			console.log("✅ Successfully joined meeting")
		},
		onMeetingLeft: () => {
			setJoined(false)
			// eslint-disable-next-line no-console
			console.log("👋 Left meeting")
			// Call the onLeave callback to redirect user
			if (onLeave) {
				onLeave()
			}
		},
		onParticipantJoined: (participant) => {
			// eslint-disable-next-line no-console
			console.log("👋 Participant joined:", participant.id, participant.displayName)
		},
		onParticipantLeft: (participant) => {
			// eslint-disable-next-line no-console
			console.log("👋 Participant left:", participant.id, participant.displayName)
		},
		onPresenterChanged: (presenterId) => {
			setPresenterId(presenterId)
			// eslint-disable-next-line no-console
			console.log("🖥️ Presenter changed:", presenterId)
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
				<MeetingControls onUploadClick={() => setIsUploadDialogOpen(true)} />
				
				<div className="flex items-center gap-2 text-sm text-gray-400">
					<Users className="size-4" />
					<span>{participantIds.length} {participantIds.length === 1 ? "participant" : "participants"}</span>
				</div>
			</div>

			{/* Document Upload Dialog */}
			{meetingId && (
				<MeetingDocumentUpload
					meetingId={meetingId}
					isOpen={isUploadDialogOpen}
					onClose={() => setIsUploadDialogOpen(false)}
					onSuccess={() => {
						refetchDocuments()
						setShowDocuments(true)
					}}
				/>
			)}

			{/* Main Content: Video Grid or Screen Share Layout */}
			<div className="flex flex-1 flex-col overflow-hidden">
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

				{/* Documents Panel at Bottom */}
				{documents && documents.length > 0 && (
					<div className={cn(
						"border-t border-gray-800 bg-gray-900 transition-all duration-300 flex-shrink-0",
						showDocuments ? "h-48" : "h-12"
					)}>
						<div className="flex h-12 items-center justify-between px-4 md:px-6 border-b border-gray-800">
							<div className="flex items-center gap-2 text-sm text-gray-300">
								<FileText className="size-4" />
								<span className="font-medium">Documents ({documents.length})</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowDocuments(!showDocuments)}
								className="h-7 px-3 text-xs"
							>
								{showDocuments ? "Hide" : "Show"}
							</Button>
						</div>
						{showDocuments && (
							<div 
								className="h-36 overflow-x-auto overflow-y-hidden px-4 md:px-6 py-3"
								style={{
									scrollbarWidth: 'thin',
									scrollbarColor: '#4B5563 #1F2937'
								}}
							>
								<div className="flex gap-3 min-w-max">
									{documents.map((doc) => (
										<Card key={doc.id} className="flex-shrink-0 w-64 border-gray-700 bg-gray-800 hover:bg-gray-700 transition-colors">
											<CardContent className="p-4">
												<div className="flex items-start gap-3 mb-3">
													<div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
														<FileText className="size-5 text-primary" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-sm font-medium text-white truncate" title={doc.name}>
															{doc.name}
														</p>
														<p className="text-xs text-gray-400 mt-1">
															{(doc.size / 1024).toFixed(1)} KB • PDF
														</p>
													</div>
												</div>
												<Button
													variant="outline"
													size="sm"
													className="w-full h-8 text-xs border-gray-600 hover:bg-primary hover:text-primary-foreground hover:border-primary"
													onClick={() => {
														// Open document in new tab
														window.open(`/api/documents/${doc.id}`, '_blank')
													}}
												>
													<FileText className="size-3 mr-1.5" />
													View Document
												</Button>
											</CardContent>
										</Card>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
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

export function VideoMeetingClient({ meetingId, dbMeetingId, token, participantName, onLeave }: VideoMeetingClientProps) {
	return (
		<MeetingProvider
			config={{
				meetingId,
				micEnabled: false,
				webcamEnabled: false,
				name: participantName,
				mode: "SEND_AND_RECV",
				multiStream: true,
				debugMode: true,
			}}
			token={token}
			joinWithoutUserInteraction
		>
			<MeetingView onLeave={onLeave} meetingId={dbMeetingId} />
		</MeetingProvider>
	)
}

