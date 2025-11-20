"use client"

import { Camera, CameraOff, FileText, FileUp, Mic, MicOff, Monitor, PhoneOff, Users, Send, FileSignature, CircleDot, Square, X, GripVertical, Download, CheckCircle2, Clock } from "lucide-react"
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

// Participant video component - SIMPLIFIED AND CLEAN
function ParticipantView({ participantId }: { participantId: string }) {
	const { webcamStream, micOn, webcamOn, displayName, isLocal, screenShareStream, screenShareOn } = useParticipant(participantId)
	const videoRef = useRef<HTMLVideoElement>(null)

	// Update video element when stream changes
	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		let mediaStream: MediaStream | null = null
		let trackEndHandler: ((e: Event) => void) | null = null

		// Helper to extract MediaStream from VideoSDK stream object
		const getMediaStream = (streamObj: any): MediaStream | null => {
			if (!streamObj) return null
			
			// If it's already a MediaStream
			if (streamObj instanceof MediaStream) {
				return streamObj
			}
			
			// Try .stream property (most common VideoSDK pattern)
			if (streamObj.stream instanceof MediaStream) {
				return streamObj.stream
			}
			
			// Try .track property and create MediaStream
			if (streamObj.track && streamObj.track instanceof MediaStreamTrack) {
				return new MediaStream([streamObj.track])
			}
			
			// Try getVideoTracks() method
			if (typeof streamObj.getVideoTracks === 'function') {
				const tracks = streamObj.getVideoTracks()
				if (tracks && tracks.length > 0) {
					return new MediaStream(tracks)
				}
			}
			
			// Try getTracks() method and filter for video
			if (typeof streamObj.getTracks === 'function') {
				const tracks = streamObj.getTracks().filter((t: MediaStreamTrack) => t.kind === 'video')
				if (tracks && tracks.length > 0) {
					return new MediaStream(tracks)
				}
			}
			
			return null
		}

		// Screen share takes priority
		if (screenShareOn && screenShareStream) {
			mediaStream = getMediaStream(screenShareStream)
		}
		
		// Webcam stream (only if no screen share)
		if (!mediaStream && webcamOn && webcamStream) {
			mediaStream = getMediaStream(webcamStream)
		}
		
		// Update video element
		if (mediaStream) {
			const videoTracks = mediaStream.getVideoTracks()
			
			if (videoTracks.length > 0) {
				const currentStream = videoElement.srcObject as MediaStream | null
				const currentVideoTrack = currentStream?.getVideoTracks()[0]
				const newVideoTrack = videoTracks[0]
				
				// Ensure newVideoTrack exists before using it
				if (newVideoTrack) {
					// Update if track changed or no current stream
					if (!currentVideoTrack || currentVideoTrack.id !== newVideoTrack.id) {
						// Set the stream
						videoElement.srcObject = mediaStream
						
						// Listen for track ended event
						trackEndHandler = () => {
							if (videoElement.srcObject === mediaStream) {
								videoElement.srcObject = null
							}
						}
						
						newVideoTrack.addEventListener('ended', trackEndHandler)
						
						// Play the video
						videoElement.play().catch((error) => {
							// Silently handle autoplay errors
							if (error.name !== 'NotAllowedError' && error.name !== 'NotReadableError') {
								console.error("Video play error:", error)
							}
						})
					} else if (videoElement.paused) {
						// Same stream but paused - try to play
						videoElement.play().catch(() => {})
					}
				}
			} else {
				// Stream exists but no video tracks - clear
				if (videoElement.srcObject === mediaStream) {
					videoElement.srcObject = null
				}
			}
		} else {
			// No valid stream - clear the video element
			if (videoElement.srcObject) {
				videoElement.srcObject = null
			}
		}
		
		// Cleanup function
		return () => {
			if (trackEndHandler && mediaStream) {
				const tracks = mediaStream.getVideoTracks()
				tracks.forEach(track => {
					track.removeEventListener('ended', trackEndHandler!)
				})
			}
		}
	}, [webcamStream, webcamOn, screenShareStream, screenShareOn])

	// Determine what to display based on actual video tracks
	const [hasVideoTracks, setHasVideoTracks] = useState(false)
	
	useEffect(() => {
		if (videoRef.current?.srcObject) {
			const stream = videoRef.current.srcObject as MediaStream
			const tracks = stream.getVideoTracks()
			setHasVideoTracks(tracks.length > 0 && tracks.some(t => t.readyState === 'live'))
		} else {
			setHasVideoTracks(false)
		}
	}, [webcamStream, webcamOn, screenShareStream, screenShareOn])
	
	const showPlaceholder = !hasVideoTracks || (!webcamOn && !screenShareOn)

	return (
		<Card className="relative size-full overflow-hidden border-2 shadow-lg transition-all hover:border-primary/50 hover:shadow-xl">
			<CardContent className="relative p-0 size-full">
				{/* Video element - always render so stream can be attached */}
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={isLocal}
					className={cn(
						"size-full object-cover bg-muted/10",
						isLocal && "scale-x-[-1]",
						showPlaceholder && "opacity-0 pointer-events-none"
					)}
				/>
				
				{/* Placeholder avatar - show when no video */}
				{showPlaceholder && (
					<div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 z-0">
						<div className="flex size-20 md:size-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-3xl md:text-4xl font-bold text-primary-foreground shadow-2xl">
							{displayName?.charAt(0).toUpperCase() ?? "?"}
						</div>
					</div>
				)}

				{/* Overlay info */}
				<div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 right-2 md:right-3 flex items-center justify-between gap-2 z-10">
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
function MeetingControls({ onUploadClick, isRecording, onRecordingChange }: { 
	onUploadClick?: () => void
	isRecording?: boolean
	onRecordingChange?: (recording: boolean) => void
}) {
	const meeting = useMeeting()
	
	// Initialize state from VideoSDK - use actual values from meeting object
	const [isMicOn, setIsMicOn] = useState(() => meeting?.localMicOn ?? false)
	const [isCameraOn, setIsCameraOn] = useState(() => meeting?.localWebcamOn ?? false)
	const [isScreenSharing, setIsScreenSharing] = useState(() => meeting?.localScreenShareOn ?? false)

	// Sync with VideoSDK state - update whenever meeting state changes
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

	const handleToggleMic = async () => {
		if (meeting) {
			await meeting.toggleMic()
		}
	}

	const handleToggleCamera = async () => {
		if (meeting) {
			try {
				await meeting.toggleWebcam()
				// State will update automatically via useEffect when VideoSDK state changes
			} catch (error) {
				console.error("Error toggling camera:", error)
			}
		}
	}

	const handleToggleScreenShare = async () => {
		if (meeting) {
			await meeting.toggleScreenShare()
		}
	}

	const handleToggleRecording = async () => {
		if (!meeting) return
		
		try {
			if (isRecording) {
				await meeting.stopRecording()
				// State will update via onRecordingStateChanged callback
			} else {
				await meeting.startRecording()
				// State will update via onRecordingStateChanged callback
			}
		} catch (error: any) {
			console.error("Error toggling recording:", error)
			toast.error(error?.message || "Failed to toggle recording")
		}
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

			<Button
				variant={isRecording ? "destructive" : "outline"}
				size="icon"
				className={cn(
					"size-9 md:size-10 rounded-full shadow-md hover:shadow-lg transition-all",
					isRecording && "animate-pulse"
				)}
				onClick={handleToggleRecording}
				title={isRecording ? "Stop recording" : "Start recording"}
			>
				{isRecording ? (
					<Square className="size-4 fill-current" />
				) : (
					<CircleDot className="size-4" />
				)}
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

// Document Actions Component - ENP can initiate signing directly
function DocumentActions({
	document,
	isPrincipal,
	isENP,
	onSignClick,
	isSigningPending,
	onDownloadCertificate,
	isDownloadingCertificate,
	onDownloadSignedDocument,
	isDownloadingSignedDocument,
	isFullySigned,
}: {
	document: { id: string; name: string; docoChainProjectId: string | null }
	isPrincipal: boolean
	isENP: boolean
	onSignClick: (projectUuid: string, email: string, documentId: string) => void
	isSigningPending: boolean
	onDownloadCertificate?: (projectUuid: string) => void
	isDownloadingCertificate?: boolean
	onDownloadSignedDocument?: (projectUuid: string) => void
	isDownloadingSignedDocument?: boolean
	isFullySigned?: boolean
}) {
	const { data: session } = useSession()

	return (
		<div className="space-y-2">
			<Button
				variant="outline"
				size="sm"
				className="w-full h-9 text-xs shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
				onClick={() => {
					// Open document in new tab
					window.open(`/api/documents/${document.id}`, '_blank')
				}}
			>
				<FileText className="size-3.5 mr-1.5" />
				View Document
			</Button>
			
			{/* Show "Start Signing" button for ENP users - they initiate the signing process */}
			{/* ENP clicks this to add themselves as signer and redirect to DocoChain signing page */}
			{isENP && document.docoChainProjectId && (
				<Button
					variant="default"
					size="sm"
					className="w-full h-9 text-xs shadow-sm"
					onClick={() => {
						const userEmail = session?.user?.email
						if (document.docoChainProjectId && userEmail) {
							console.log("🔵 ENP initiating signing process for document:", document.name)
							console.log("   - DocoChain Project UUID:", document.docoChainProjectId)
							console.log("   - ENP Email:", userEmail)
							
							// ENP clicks to start signing - this will:
							// 1. Add ENP as signer using Add Project Signer API
							// 2. Generate signing link
							// 3. Redirect to DocoChain signing page
							onSignClick(document.docoChainProjectId, userEmail, document.id)
						} else {
							toast.error(
								!document.docoChainProjectId 
									? "DocoChain project not found. Please ensure the document was uploaded correctly."
									: "User email not found. Please sign in again."
							)
						}
					}}
					disabled={isSigningPending}
				>
					{isSigningPending ? (
						<>
							<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Starting...
						</>
					) : (
						<>
							<FileSignature className="size-3.5 mr-1.5" />
							Start Signing
						</>
					)}
				</Button>
			)}

			{/* Download Signed Document button - only show for fully signed documents */}
			{document.docoChainProjectId && onDownloadSignedDocument && isFullySigned && (
				<Button
					variant="outline"
					size="sm"
					className="w-full h-9 text-xs shadow-sm hover:bg-primary/10 hover:text-primary transition-all"
					onClick={() => {
						if (document.docoChainProjectId) {
							onDownloadSignedDocument(document.docoChainProjectId)
						}
					}}
					disabled={isDownloadingSignedDocument}
				>
					{isDownloadingSignedDocument ? (
						<>
							<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Downloading...
						</>
					) : (
						<>
							<Download className="size-3.5 mr-1.5" />
							Download Signed Document
						</>
					)}
				</Button>
			)}

			{/* Download Certificate button - only show for fully signed documents */}
			{document.docoChainProjectId && onDownloadCertificate && isFullySigned && (
				<Button
					variant="outline"
					size="sm"
					className="w-full h-9 text-xs shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all"
					onClick={() => {
						if (document.docoChainProjectId) {
							onDownloadCertificate(document.docoChainProjectId)
						}
					}}
					disabled={isDownloadingCertificate}
				>
					{isDownloadingCertificate ? (
						<>
							<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
							Downloading...
						</>
					) : (
						<>
							<Download className="size-3.5 mr-1.5" />
							Download Certificate
						</>
					)}
				</Button>
			)}
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
	const [signingUrl, setSigningUrl] = useState<string | null>(null)
	const [signingProjectUuid, setSigningProjectUuid] = useState<string | null>(null)
	const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null)
	const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null)
	const [dragOverDocumentId, setDragOverDocumentId] = useState<string | null>(null)
	const [downloadingProjectUuid, setDownloadingProjectUuid] = useState<string | null>(null)
	const [downloadingCertificateUuid, setDownloadingCertificateUuid] = useState<string | null>(null)
	const [documentSigningStatus, setDocumentSigningStatus] = useState<Map<string, { isFullySigned: boolean; signedCount: number; totalSigners: number }>>(new Map())
	
	// Fetch meeting documents
	const { data: documents, refetch: refetchDocuments } = trpc.meetings.getMeetingDocuments.useQuery(
		meetingId || "",
		{
			enabled: !!meetingId,
			refetchInterval: 5000, // Refetch every 5 seconds to get new uploads
		}
	)

	// Get tRPC utils for imperative calls
	const utils = trpc.useUtils()

	// Check signing status for all documents with DocoChain project IDs
	useEffect(() => {
		if (!documents || documents.length === 0) return

		const checkStatuses = async () => {
			const statusMap = new Map<string, { isFullySigned: boolean; signedCount: number; totalSigners: number }>()
			
			for (const doc of documents) {
				if (doc.docoChainProjectId) {
					try {
						const status = await utils.signatureRequests.checkSigningStatus.fetch({
							projectUuid: doc.docoChainProjectId,
						})
						statusMap.set(doc.id, {
							isFullySigned: status.isFullySigned,
							signedCount: status.signedCount,
							totalSigners: status.totalSigners,
						})
					} catch (error) {
						// If status check fails, assume not signed
						statusMap.set(doc.id, {
							isFullySigned: false,
							signedCount: 0,
							totalSigners: 0,
						})
					}
				}
			}
			
			setDocumentSigningStatus(statusMap)
		}

		void checkStatuses()
		
		// Refresh status every 5 seconds to show real-time updates
		const interval = setInterval(() => {
			void checkStatuses()
		}, 5000)

		return () => clearInterval(interval)
	}, [documents, utils])

	// Fetch meeting details to get participants
	const { data: meetingDetails } = trpc.meetings.getById.useQuery(meetingId || "", {
		enabled: !!meetingId && !!meetingId.trim(),
		retry: false,
	})

	// Fetch pending signature requests for current user
	const { data: pendingRequests } = trpc.signatureRequests.getPendingRequests.useQuery(
		{ meetingId: meetingId || "" },
		{
			enabled: !!meetingId && !!meetingId.trim(),
			refetchInterval: 3000, // Poll every 3 seconds for new requests
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

	// Update document order mutation (for drag and drop)
	const updateDocumentOrder = trpc.meetings.updateDocumentOrder.useMutation({
		onSuccess: () => {
			refetchDocuments() // Refetch to sync with other users
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update document order")
		},
	})

	// Drag and drop handlers
	const handleDragStart = (e: React.DragEvent, documentId: string) => {
		// Don't start drag if clicking on interactive elements (buttons, links, etc.)
		const target = e.target as HTMLElement
		if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
			e.preventDefault()
			return
		}
		
		setDraggedDocumentId(documentId)
		e.dataTransfer.effectAllowed = "move"
		e.dataTransfer.setData("text/plain", documentId)
	}

	const handleDragEnter = (e: React.DragEvent, targetDocumentId: string) => {
		e.preventDefault()
		if (!draggedDocumentId || targetDocumentId === draggedDocumentId) return
		setDragOverDocumentId(targetDocumentId)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		const relatedTarget = e.relatedTarget as HTMLElement
		if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
			setDragOverDocumentId(null)
		}
	}

	const handleDragOver = (e: React.DragEvent, targetDocumentId: string) => {
		e.preventDefault()
		e.dataTransfer.dropEffect = "move"
		if (draggedDocumentId && targetDocumentId !== draggedDocumentId) {
			setDragOverDocumentId(targetDocumentId)
		}
	}

	const handleDrop = (e: React.DragEvent, targetDocumentId: string) => {
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
	}

	const handleDragEnd = () => {
		setDraggedDocumentId(null)
		setDragOverDocumentId(null)
	}

	// Handle signed document download
	const handleDownloadSignedDocument = async (projectUuid: string) => {
		setDownloadingProjectUuid(projectUuid)
		
		try {
			// Fetch the signed document using tRPC utils
			const result = await utils.signatureRequests.downloadSignedDocument.fetch(projectUuid as any)
			
			if (result && result.base64) {
				// Convert base64 to blob and download
				const byteCharacters = atob(result.base64)
				const byteNumbers = new Array(byteCharacters.length)
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i)
				}
				const byteArray = new Uint8Array(byteNumbers)
				const blob = new Blob([byteArray], { type: 'application/pdf' })
				
				const url = window.URL.createObjectURL(blob)
				const link = document.createElement('a')
				link.href = url
				link.download = result.fileName || `signed-document-${projectUuid}.pdf`
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				window.URL.revokeObjectURL(url)
				
				toast.success("Signed document downloaded successfully!")
			} else {
				toast.error("Failed to download signed document")
			}
		} catch (error) {
			console.error("Error downloading signed document:", error)
			toast.error(error instanceof Error ? error.message : "Failed to download signed document")
		} finally {
			setDownloadingProjectUuid(null)
		}
	}

	// Handle certificate download
	const handleDownloadCertificate = async (projectUuid: string) => {
		setDownloadingCertificateUuid(projectUuid)
		
		try {
			// Fetch the certificate using tRPC utils
			const result = await utils.signatureRequests.downloadCertificate.fetch(projectUuid as any)
			
			if (result && result.base64) {
				// Convert base64 to blob and download
				const byteCharacters = atob(result.base64)
				const byteNumbers = new Array(byteCharacters.length)
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i)
				}
				const byteArray = new Uint8Array(byteNumbers)
				const blob = new Blob([byteArray], { type: 'application/pdf' })
				
				const url = window.URL.createObjectURL(blob)
				const link = document.createElement('a')
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
	}

	// Generate signing link mutation (for signature request dialog)
	const generateSigningLink = trpc.signatureRequests.generateSigningLink.useMutation({
		onSuccess: (data) => {
			const signingLink = typeof data.link === 'string' ? data.link : null
			
			if (!signingLink) {
				toast.error("Invalid signing link received")
				return
			}

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
				'DocoChainSigning',
				`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
			)
			
			if (popup) {
				toast.success("Opening signing interface...")
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
			}
		},
		onError: (error) => {
			toast.error(error.message || "Failed to generate signing link")
		},
	})

	// ENP initiates signing - adds them as signer and embeds signing page
	const initiateSigning = trpc.signatureRequests.initiateSigning.useMutation({
		onSuccess: (data) => {
			// Validate that we have a valid URL string
			const signingLink = typeof data.link === 'string' ? data.link : null
			
			if (!signingLink) {
				console.error("❌ Invalid signing link received:", data)
				toast.error("Invalid signing link received")
				return
			}

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
				'DocoChainSigning',
				`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
			)
			
			if (popup) {
				// Store reference for monitoring
				setSigningUrl(signingLink)
				setSigningProjectUuid(data.projectUuid)
				
				// Monitor popup for closing
				const checkClosed = setInterval(() => {
					if (popup.closed) {
						clearInterval(checkClosed)
						setSigningUrl(null)
						setSigningProjectUuid(null)
						setSigningDocumentId(null)
						refetchDocuments()
						toast.success("Signing completed. Document status updated.")
					}
				}, 500)
				
				toast.success("Opening signing interface in popup window...")
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
				setSigningDocumentId(null) // Clear loading state
			}
		},
		onError: (error) => {
			console.error("❌ Failed to initiate signing:", error)
			setSigningDocumentId(null) // Clear loading state on error
			toast.error(error.message || "Failed to start signing process")
		},
	})

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
		onRecordingStateChanged: (data: { status: string }) => {
			// eslint-disable-next-line no-console
			console.log("🎥 Recording state changed:", data)
			// VideoSDK returns { status: 'RECORDING_STARTED' | 'RECORDING_STOPPING' | 'RECORDING_STOPPED' | 'RECORDING_STARTING' }
			const status = data.status as string
			const recording = status === 'RECORDING_STARTED' || status === 'RECORDING_STARTING'
			setIsRecording(recording)
			
			if (status === 'RECORDING_STARTED') {
				toast.success("Recording started")
			} else if (status === 'RECORDING_STOPPED') {
				toast.success("Recording stopped")
			}
		},
	})

	const { participants } = meeting
	
	// Initialize and sync recording state with VideoSDK
	const [isRecording, setIsRecording] = useState(false)
	
	// Sync recording state from VideoSDK
	useEffect(() => {
		if (meeting) {
			// Check if recording is active (VideoSDK might expose this differently)
			// Some VideoSDK versions use meeting.recordingState or meeting.isRecording
			const recordingState = (meeting as any)?.recordingState
			if (recordingState) {
				const recording = recordingState === 'RECORDING_STARTED' || recordingState === 'RECORDING_STARTING'
				setIsRecording(recording)
			}
		}
	}, [meeting])

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
			{/* Recording Indicator Banner - Visible to all participants */}
			{isRecording && (
				<div className="bg-destructive/90 text-destructive-foreground px-4 py-2 flex items-center justify-center gap-2 shadow-lg z-50">
					<div className="flex items-center gap-2 animate-pulse">
						<CircleDot className="size-4 fill-current" />
						<span className="text-sm font-semibold">RECORDING</span>
					</div>
				</div>
			)}

			{/* Header with Controls */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 py-3 md:py-4 shadow-sm">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
						<Camera className="h-4 w-4 text-primary" />
					</div>
					<h1 className="text-base md:text-lg font-bold">Video Meeting</h1>
				</div>
				
				{/* Meeting Controls */}
				<MeetingControls 
					onUploadClick={() => setIsUploadDialogOpen(true)}
					isRecording={isRecording}
					onRecordingChange={setIsRecording}
				/>
				
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
						showDocuments ? "min-h-[200px] max-h-[400px]" : "h-12 md:h-14"
					)}>
						<div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-4 lg:px-6 border-b flex-shrink-0">
							<div className="flex items-center gap-2">
								<div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg bg-primary/10">
									<FileText className="size-4 md:size-5 text-primary" />
								</div>
								<span className="text-sm md:text-base font-semibold">Documents ({documents.length})</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowDocuments(!showDocuments)}
								className="h-8 px-3 text-xs md:text-sm hover:bg-muted"
							>
								{showDocuments ? "Hide" : "Show"}
							</Button>
						</div>
						{showDocuments && (
							<div className="overflow-y-auto max-h-[350px] px-3 md:px-4 lg:px-6 py-4">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 transition-all duration-300">
									{documents.map((doc) => {
										const isPrincipal = meetingDetails?.createdBy.id === session?.user?.id
										const isDragged = draggedDocumentId === doc.id
										const isDragOver = dragOverDocumentId === doc.id
										
										return (
											<Card 
												key={doc.id} 
												style={{
													opacity: isDragged ? 0.5 : 1,
													transform: isDragged 
														? 'scale(0.95)' 
														: isDragOver 
															? 'scale(1.03)' 
															: 'scale(1)',
													transition: isDragged 
														? 'opacity 0.2s ease-out, transform 0.2s ease-out' 
														: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
													zIndex: isDragged ? 50 : isDragOver ? 10 : 1,
												}}
												className={cn(
													"shadow-md hover:shadow-lg border-2 relative",
													isDragged 
														? "cursor-grabbing shadow-2xl" 
														: "hover:border-primary/50 hover:shadow-xl",
													isDragOver && !isDragged && "border-primary border-2 shadow-xl bg-primary/5"
												)}
												onDragEnter={(e) => handleDragEnter(e, doc.id)}
												onDragLeave={handleDragLeave}
												onDragOver={(e) => handleDragOver(e, doc.id)}
												onDrop={(e) => handleDrop(e, doc.id)}
											>
												{/* Signing status indicator - top right corner */}
												{doc.docoChainProjectId && documentSigningStatus.has(doc.id) && (() => {
													const status = documentSigningStatus.get(doc.id)!
													return status.isFullySigned ? (
														<div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 z-10">
															<CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
															<span className="text-[10px] font-semibold text-green-700 dark:text-green-400">Signed</span>
														</div>
													) : status.signedCount > 0 ? (
														<div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 z-10">
															<Clock className="size-3 text-yellow-600 dark:text-yellow-400" />
															<span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">
																{status.signedCount}/{status.totalSigners}
															</span>
														</div>
													) : (
														<div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 z-10">
															<Clock className="size-3 text-gray-500 dark:text-gray-400" />
															<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Pending</span>
														</div>
													)
												})()}
												<CardContent className="p-4">
													<div className="flex items-start gap-3 mb-3">
														{/* Drag handle - only draggable element */}
														<div 
															className="cursor-move text-muted-foreground hover:text-foreground mt-1 flex-shrink-0"
															draggable={true}
															onDragStart={(e) => handleDragStart(e, doc.id)}
															onDragEnd={handleDragEnd}
														>
															<GripVertical className="size-4" />
														</div>
														<div className="rounded-lg bg-primary/10 p-2.5 flex-shrink-0">
															<FileText className="size-5 text-primary" />
														</div>
														<div className="flex-1 min-w-0">
															<p className="text-sm font-semibold truncate" title={doc.name}>
																{doc.name}
															</p>
															<p className="text-xs text-muted-foreground mt-1">
																{(doc.size / 1024).toFixed(1)} KB • PDF
															</p>
														</div>
													</div>
													<DocumentActions 
														document={doc}
														isPrincipal={isPrincipal}
														isENP={session?.user?.role === "ENP"}
														onSignClick={(projectUuid, email, documentId) => {
															// Set the document ID being signed before mutation
															setSigningDocumentId(documentId)
															// ENP clicks to initiate signing - adds them as signer and redirects
															initiateSigning.mutate({
																projectUuid,
																email,
															})
														}}
														isSigningPending={initiateSigning.isPending && signingDocumentId === doc.id}
														onDownloadSignedDocument={handleDownloadSignedDocument}
														isDownloadingSignedDocument={downloadingProjectUuid === doc.docoChainProjectId}
														onDownloadCertificate={handleDownloadCertificate}
														isDownloadingCertificate={downloadingCertificateUuid === doc.docoChainProjectId}
														isFullySigned={documentSigningStatus.get(doc.id)?.isFullySigned ?? false}
													/>
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
	// Only enable debug mode in development
	const isDevelopment = process.env.NODE_ENV === 'development'
	
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

