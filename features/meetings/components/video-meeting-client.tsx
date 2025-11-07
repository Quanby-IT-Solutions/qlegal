"use client"

import { Camera, CameraOff, FileText, FileUp, Mic, MicOff, Monitor, PhoneOff, Users, Send, FileSignature } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { cn } from "@/core/lib/utils"
import { MeetingDocumentUpload } from "./meeting-document-upload"

// Screen share view component
function ScreenShareView({ participantId }: { participantId: string }) {
	const { screenShareStream, displayName } = useParticipant(participantId)
	const screenVideoRef = useRef<HTMLVideoElement>(null)

	useEffect(() => {
		if (screenShareStream?.track && screenVideoRef.current) {
			const mediaStream = new MediaStream([screenShareStream.track])
			screenVideoRef.current.srcObject = mediaStream
			screenVideoRef.current.play().catch(() => {})
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

	// Webcam stream setup
	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		if (webcamOn && webcamStream?.track) {
			const mediaStream = new MediaStream([webcamStream.track])
			videoElement.srcObject = mediaStream
			videoElement.play().catch(() => {})
			setStreamSet(true)
		} else if (!webcamOn) {
			videoElement.srcObject = null
			setStreamSet(false)
		}
	}, [webcamStream, webcamOn])

	// Screen share stream setup
	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		if (screenShareOn && screenShareStream?.track) {
			const mediaStream = new MediaStream([screenShareStream.track])
			videoElement.srcObject = mediaStream
			videoElement.play().catch(() => {})
		}
	}, [screenShareStream, screenShareOn])

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
	const { data: session } = useSession()
	const [joined, setJoined] = useState(false)
	const [presenterId, setPresenterId] = useState<string | null>(null)
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [showDocuments, setShowDocuments] = useState(false)
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
	const [selectedSignerId, setSelectedSignerId] = useState<string>("")
	const [isSendDialogOpen, setIsSendDialogOpen] = useState(false)
	const [dismissedRequestIds, setDismissedRequestIds] = useState<Set<string>>(new Set())
	
	// Fetch meeting documents
	const { data: documents, refetch: refetchDocuments } = trpc.meetings.getMeetingDocuments.useQuery(
		meetingId || "",
		{
			enabled: !!meetingId,
			refetchInterval: 5000, // Refetch every 5 seconds to get new uploads
		}
	)

	// Fetch meeting details to get participants
	const { data: meetingDetails } = trpc.meetings.getById.useQuery(meetingId || "", {
		enabled: !!meetingId,
	})

	// Fetch pending signature requests for current user
	const { data: pendingRequests } = trpc.signatureRequests.getPendingRequests.useQuery(
		{ meetingId: meetingId || "" },
		{
			enabled: !!meetingId,
			refetchInterval: 3000, // Poll every 3 seconds for new requests
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
		onError: (error) => {
			toast.error(error.message || "Failed to send signature request")
		},
	})

	// Update signature request status mutation
	const updateSignatureStatus = trpc.signatureRequests.updateStatus.useMutation({
		onSuccess: () => {
			toast.success("Signature request declined")
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update request")
		},
	})

	// Get tRPC utils for imperative queries
	const utils = trpc.useUtils()

	// NOTE: ENP gets direct DRAFT project access to drag and place their own signature fields

	// Get the first non-dismissed pending request
	const activeSignatureRequest = pendingRequests?.find(
		(req) => !dismissedRequestIds.has(req.id)
	)
	
	const meeting = useMeeting({
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

	const { participants } = meeting

	// Enable camera immediately after joining
	useEffect(() => {
		if (joined && meeting?.toggleWebcam) {
			// Request permissions first
			navigator.mediaDevices.getUserMedia({ video: true, audio: true })
				.then((stream) => {
					// Stop the test stream
					stream.getTracks().forEach(track => track.stop())
					
					// Enable camera
					setTimeout(() => {
						meeting.toggleWebcam()
						// eslint-disable-next-line no-console
						console.log("🎥 Camera enabled")
					}, 1000)
				})
				.catch((err) => {
					console.error("Camera permission denied:", err)
				})
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [joined])

	// Get unique participants - deduplicate by name
	const allParticipantIds = Array.from(participants.keys())
	
	// Filter out system participants
	const humanParticipants = allParticipantIds.filter((id) => {
		const participant = participants.get(id)
		if (!participant) return false
		
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
	
	// Deduplicate by name - keep only one per unique display name
	const participantsByName = new Map<string, string>()
	humanParticipants.forEach((id) => {
		const participant = participants.get(id)
		if (!participant) return
		
		const name = participant.displayName || id
		
		// Prefer local participant if duplicate names exist
		if (participant.local) {
			participantsByName.set(name, id)
		} else if (!participantsByName.has(name)) {
			participantsByName.set(name, id)
		} else {
			// If name exists, keep the one that's already there unless current is local
			const existingId = participantsByName.get(name)
			const existingParticipant = participants.get(existingId!)
			if (!existingParticipant?.local) {
				participantsByName.set(name, id)
			}
		}
	})
	
	const participantIds = Array.from(participantsByName.values())

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
						showDocuments ? "h-60 sm:h-64 md:h-72 lg:h-80 xl:h-[22rem]" : "h-12 md:h-14"
					)}>
						<div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-4 lg:px-6 border-b flex-shrink-0">
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
							<div className="flex-1 overflow-x-auto overflow-y-hidden px-3 md:px-4 lg:px-6 py-4 pb-6">
								<div className="flex gap-3 md:gap-4 min-w-max h-full">
									{documents.map((doc) => {
										const isPrincipal = meetingDetails?.createdBy.id === session?.user?.id
										return (
											<Card key={doc.id} className="flex-shrink-0 w-52 sm:w-56 md:w-60 lg:w-64 h-fit shadow-md hover:shadow-lg transition-all border-2 hover:border-primary/50 mb-3">
												<CardContent className="p-3 md:p-4 pb-4 md:pb-5">
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
													<div className="space-y-2">
														<Button
															variant="outline"
															size="sm"
															className="w-full h-8 md:h-9 text-xs md:text-sm shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
															onClick={() => {
																// Open document in new tab
																window.open(`/api/documents/${doc.id}`, '_blank')
															}}
														>
															<FileText className="size-3 md:size-3.5 mr-1.5" />
															View Document
														</Button>
														
														{isPrincipal && (
															<Button
																variant="default"
																size="sm"
																className="w-full h-8 md:h-9 text-xs md:text-sm shadow-sm"
																onClick={() => {
																	setSelectedDocumentId(doc.id)
																	setIsSendDialogOpen(true)
																}}
															>
																<Send className="size-3 md:size-3.5 mr-1.5" />
																Send to ENP
															</Button>
														)}
													</div>
												</CardContent>
											</Card>
										)
									})}
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Send to ENP Dialog */}
			<Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Send className="size-5 text-primary" />
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
										.filter((p) => p.userId !== session?.user?.id)
										.map((participant) => (
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
										meetingId: meetingId || "",
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
					onOpenChange={(open) => {
						if (!open) {
							// Dismiss this request
							setDismissedRequestIds(prev => new Set(prev).add(activeSignatureRequest.id))
						}
					}}
				>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<FileSignature className="size-5 text-primary" />
								Signature Request
							</DialogTitle>
							<DialogDescription>
								You have been requested to sign a document
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4 py-4">
							<div className="rounded-lg bg-muted/50 p-4 space-y-2">
								<div>
									<p className="text-xs text-muted-foreground">Document</p>
									<p className="font-semibold">{activeSignatureRequest.document.name}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Requested by</p>
									<p className="font-semibold">{activeSignatureRequest.requester.name}</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Meeting</p>
									<p className="font-semibold">{activeSignatureRequest.meeting.title}</p>
								</div>
							</div>

							<div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
								<p className="text-sm font-medium mb-2">✍️ You're in control!</p>
								<p className="text-xs text-muted-foreground mb-2">
									When you click "Sign Document":
								</p>
								<ul className="text-xs text-muted-foreground ml-4 space-y-1">
									<li>• DocoChain will open in a new tab (DRAFT mode)</li>
									<li>• Click the green "SIGNATURE" button on the left sidebar</li>
									<li>• Drag and place signature fields where you want to sign</li>
									<li>• Click on the field to create your signature</li>
									<li>• Click "SIGN NOW" when ready - no "Send" needed!</li>
								</ul>
							</div>
						</div>

						<DialogFooter className="flex-col sm:flex-row gap-2">
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
							onClick={async () => {
								try {
									// Get the ENP's personalized DRAFT link
									const result = await utils.signatureRequests.getDraftSigningUrl.fetch({
										requestId: activeSignatureRequest.id,
									})
									
									console.log("Opening DocoChain DRAFT for ENP:", result.draftUrl)
									window.open(result.draftUrl, '_blank')
									toast.success("Opening DocoChain - place your signature and sign!")
									
									// Dismiss this request
									setDismissedRequestIds(prev => new Set(prev).add(activeSignatureRequest.id))
								} catch (error) {
									console.error("Failed to get DocoChain URL:", error)
									toast.error("Failed to open signing interface. Please try again.")
								}
							}}
						>
							<FileSignature className="mr-2 size-4" />
							Sign Document
						</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
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

