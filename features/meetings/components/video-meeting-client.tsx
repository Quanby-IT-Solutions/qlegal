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
		<Card className="relative size-full overflow-hidden border-2 border-primary/50 shadow-xl">
			<CardContent className="relative p-0 size-full bg-muted/10">
				<video
					ref={screenVideoRef}
					autoPlay
					playsInline
					className="size-full object-contain"
				/>
				<div className="absolute top-3 left-3 rounded-lg bg-card/95 px-3 py-2 text-sm shadow-lg backdrop-blur-md border">
					<Monitor className="mr-2 inline size-4 text-primary" />
					<span className="font-semibold">{displayName} is presenting</span>
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

	// Webcam stream setup - reactive to webcam changes
	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		// Clear existing stream first
		if (videoElement.srcObject) {
			const tracks = (videoElement.srcObject as MediaStream).getTracks()
			tracks.forEach(track => track.stop())
			videoElement.srcObject = null
		}

		// Set webcam stream if camera is on and not screen sharing
		if (webcamOn && webcamStream?.track && !screenShareOn) {
			try {
				if (webcamStream.track instanceof MediaStreamTrack) {
					const mediaStream = new MediaStream([webcamStream.track])
					videoElement.srcObject = mediaStream
					setStreamSet(true)
					
					// Play the video
					const playPromise = videoElement.play()
					if (playPromise !== undefined) {
						playPromise.catch((err) => {
							if (err.name !== 'NotAllowedError') {
								console.error(`Error playing video for ${participantId}:`, err)
							}
						})
					}
				}
			} catch (error) {
				console.error(`Error setting video stream for ${participantId}:`, error)
			}
		} else {
			setStreamSet(false)
		}
	}, [webcamStream, webcamOn, participantId, screenShareOn])

	// Screen share stream setup - reactive to screen share changes
	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		if (screenShareOn && screenShareStream?.track) {
			try {
				if (screenShareStream.track instanceof MediaStreamTrack) {
					// Clear current stream
					if (videoElement.srcObject) {
						const tracks = (videoElement.srcObject as MediaStream).getTracks()
						tracks.forEach(track => track.stop())
					}
					
					const mediaStream = new MediaStream([screenShareStream.track])
					videoElement.srcObject = mediaStream
					
					const playPromise = videoElement.play()
					if (playPromise !== undefined) {
						playPromise.catch(() => void 0)
					}
				}
			} catch (error) {
				console.error(`Error setting screen share for ${participantId}:`, error)
			}
		}
	}, [screenShareStream, screenShareOn, participantId])

	const hasVideo = (webcamOn && webcamStream && webcamStream.track) || (screenShareOn && screenShareStream && screenShareStream.track)

	return (
		<Card className="relative size-full overflow-hidden border-2 shadow-lg transition-all hover:border-primary/50 hover:shadow-xl">
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
						className={cn(
							"size-full object-cover bg-muted/10",
							isLocal && "scale-x-[-1]"
						)}
					/>
				) : (
					<div className="flex size-full items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
						<div className="flex size-20 md:size-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-3xl md:text-4xl font-bold text-primary-foreground shadow-2xl">
							{displayName?.charAt(0).toUpperCase() ?? "?"}
						</div>
					</div>
				)}

				{/* Overlay info */}
				<div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 right-2 md:right-3 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 rounded-lg bg-card/95 px-2.5 md:px-3 py-1.5 text-xs md:text-sm shadow-lg backdrop-blur-md border max-w-[70%]">
						<span className="font-semibold truncate">{displayName ?? "Unknown"}</span>
						{isLocal && <span className="text-[10px] md:text-xs text-muted-foreground flex-shrink-0">(You)</span>}
					</div>
					{!micOn && (
						<div className="rounded-lg bg-destructive/95 p-1.5 md:p-2 shadow-lg backdrop-blur-sm flex-shrink-0">
							<MicOff className="size-3 md:size-4 text-white" />
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
		<div className="flex items-center gap-1.5 md:gap-2">
			<Button
				variant={isMicOn ? "outline" : "destructive"}
				size="icon"
				className="size-9 md:size-10 rounded-full shadow-md hover:shadow-lg transition-all"
				onClick={handleToggleMic}
				title={isMicOn ? "Mute microphone" : "Unmute microphone"}
			>
				{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
			</Button>

			<Button
				variant={isCameraOn ? "outline" : "destructive"}
				size="icon"
				className="size-9 md:size-10 rounded-full shadow-md hover:shadow-lg transition-all"
				onClick={handleToggleCamera}
				title={isCameraOn ? "Turn off camera" : "Turn on camera"}
			>
				{isCameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
			</Button>

			<Button
				variant={isScreenSharing ? "destructive" : "outline"}
				size="icon"
				className="size-9 md:size-10 rounded-full shadow-md hover:shadow-lg transition-all"
				onClick={handleToggleScreenShare}
				title={isScreenSharing ? "Stop sharing" : "Share screen"}
			>
				<Monitor className="size-4" />
			</Button>

			{onUploadClick && (
				<Button
					variant="outline"
					size="icon"
					className="size-9 md:size-10 rounded-full shadow-md hover:shadow-lg transition-all"
					onClick={onUploadClick}
					title="Upload document"
				>
					<FileUp className="size-4" />
				</Button>
			)}

			<Button
				variant="destructive"
				size="icon"
				className="size-9 md:size-10 rounded-full shadow-md hover:shadow-lg transition-all"
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
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<div className="text-center">
					<div className="size-12 animate-spin rounded-full border-b-4 border-primary mx-auto mb-4" />
					<p className="text-muted-foreground font-medium">Joining meeting...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-screen flex-col bg-gradient-to-br from-background via-muted/20 to-background">
			{/* Header with Controls */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 shadow-sm">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
						<Camera className="h-4 w-4 text-primary" />
					</div>
					<h1 className="text-base md:text-lg font-bold">Video Meeting</h1>
				</div>
				
				{/* Meeting Controls */}
				<MeetingControls onUploadClick={() => setIsUploadDialogOpen(true)} />
				
				<div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
					<Users className="size-4 text-muted-foreground" />
					<span className="text-xs md:text-sm font-medium">{participantIds.length} {participantIds.length === 1 ? "participant" : "participants"}</span>
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
					<div className="flex flex-1 flex-col lg:flex-row gap-3 md:gap-4 overflow-hidden p-3 md:p-4">
						{/* Main screen share area */}
						<div className="flex-1 min-h-0">
							<ScreenShareView participantId={presenterId} />
						</div>
						
						{/* Sidebar with participant videos */}
						<div className="flex lg:flex-col flex-row lg:w-56 xl:w-64 gap-2 md:gap-3 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto pb-2 lg:pb-0">
							{participantIds.map((participantId) => (
								<div key={participantId} className="h-32 lg:h-36 flex-shrink-0 w-48 lg:w-full">
									<ParticipantView participantId={participantId} />
								</div>
							))}
						</div>
					</div>
				) : (
					// Normal grid layout when no one is sharing
					<div className="flex-1 overflow-hidden p-3 md:p-4 lg:p-6">
						<div
							className={cn(
								"grid size-full gap-2 md:gap-3 lg:gap-4",
								participantIds.length === 1 && "grid-cols-1",
								participantIds.length === 2 && "grid-cols-1 sm:grid-cols-2",
								participantIds.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
								participantIds.length === 4 && "grid-cols-2",
								participantIds.length > 4 && participantIds.length <= 6 && "grid-cols-2 lg:grid-cols-3",
								participantIds.length > 6 && "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
						"border-t bg-card/50 backdrop-blur-sm transition-all duration-300 flex-shrink-0 shadow-lg",
						showDocuments ? "h-48 md:h-52" : "h-12 md:h-14"
					)}>
						<div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-4 lg:px-6 border-b">
							<div className="flex items-center gap-2">
								<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
									<FileText className="size-3.5 text-primary" />
								</div>
								<span className="text-xs md:text-sm font-semibold">Documents ({documents.length})</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowDocuments(!showDocuments)}
								className="h-8 px-3 text-xs hover:bg-muted"
							>
								{showDocuments ? "Hide" : "Show"}
							</Button>
						</div>
						{showDocuments && (
							<div className="h-36 md:h-38 overflow-x-auto overflow-y-hidden px-3 md:px-4 lg:px-6 py-3">
								<div className="flex gap-3 min-w-max">
									{documents.map((doc) => (
										<Card key={doc.id} className="flex-shrink-0 w-56 md:w-64 shadow-md hover:shadow-lg transition-all border-2 hover:border-primary/50">
											<CardContent className="p-3 md:p-4">
												<div className="flex items-start gap-2.5 md:gap-3 mb-3">
													<div className="rounded-lg bg-primary/10 p-2 md:p-2.5 flex-shrink-0">
														<FileText className="size-4 md:size-5 text-primary" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-xs md:text-sm font-semibold truncate" title={doc.name}>
															{doc.name}
														</p>
														<p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
															{(doc.size / 1024).toFixed(1)} KB • PDF
														</p>
													</div>
												</div>
												<Button
													variant="outline"
													size="sm"
													className="w-full h-7 md:h-8 text-[10px] md:text-xs shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
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

