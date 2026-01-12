"use client"

import React, { useEffect, useRef, useState } from "react"
import { MeetingProvider, useMeeting, useParticipant } from "@videosdk.live/react-sdk"
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
	Monitor,
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

import { trpc } from "@/services/trpc/client"

import { MeetingDocumentUpload } from "./meeting-document-upload"

// Meeting controls focused on signing workflow (video actions removed)
type RecordingState = {
	isRecording: boolean
	isStarting: boolean
	isStopping: boolean
}

type LocalRecordingState = {
	isRecording: boolean
	elapsed: string
}

function MeetingControls({
	onUploadClick,
	recordingState,
	onRecordingToggle,
	localRecordingState,
	onLocalRecordingToggle,
	localRecordingSupported,
}: {
	onUploadClick?: () => void
	recordingState?: RecordingState
	onRecordingToggle?: () => Promise<void> | void
	localRecordingState?: LocalRecordingState
	onLocalRecordingToggle?: () => Promise<void> | void
	localRecordingSupported?: boolean
}) {
	const meeting = useMeeting()
	const [isCameraOn, setIsCameraOn] = useState(() => meeting?.localWebcamOn ?? false)
	 
	const [isScreenSharing, setIsScreenSharing] = useState(() => (meeting as { localScreenShareOn?: boolean })?.localScreenShareOn ?? false)
	const [isRecordingLocal, setIsRecordingLocal] = useState(false)

	useEffect(() => {
		if (meeting?.localWebcamOn !== undefined) {
			setIsCameraOn(meeting.localWebcamOn)
		}
	}, [meeting?.localWebcamOn])

	useEffect(() => {
		 
		const current = meeting as { localScreenShareOn?: boolean } | null | undefined
		if (current?.localScreenShareOn !== undefined) {
			setIsScreenSharing(current.localScreenShareOn)
		}
	}, [meeting])

	useEffect(() => {
		 
		const current = meeting as { recordingState?: string } | null | undefined
		const state = current?.recordingState
		if (state) {
			const recording = state === "RECORDING_STARTED" || state === "RECORDING_STARTING"
			setIsRecordingLocal(recording)
		}
	}, [meeting])

	const effectiveRecording = recordingState?.isRecording ?? isRecordingLocal
	const isRecordingStarting = recordingState?.isStarting ?? false
	const localRecordingActive = localRecordingState?.isRecording ?? false
	const localRecordingElapsed = localRecordingState?.elapsed ?? "00:00"
	const localRecordingDisabled = !localRecordingSupported

	const handleToggleCamera = async () => {
		if (!meeting) return
		try {
			// eslint-disable-next-line @typescript-eslint/await-thenable
			await meeting.toggleWebcam()
		} catch (error) {
			console.error("Error toggling camera:", error)
		}
	}

	const handleLeave = () => {
		meeting?.leave()
	}

	const handleToggleScreenShare = async () => {
		if (!meeting) return
		try {
			 
			await (meeting as unknown as { toggleScreenShare?: () => Promise<void> | void }).toggleScreenShare?.()
		} catch (error) {
			console.error("Error toggling screen share:", error)
		}
	}

	const handleToggleRecording = async () => {
		if (onRecordingToggle) {
			await onRecordingToggle()
			return
		}

		if (!meeting) return
		try {
			 
			if (effectiveRecording) {
				await (meeting as unknown as { stopRecording?: () => Promise<void> | void }).stopRecording?.()
				setIsRecordingLocal(false)
			} else {
				 
				await (meeting as unknown as { startRecording?: () => Promise<void> | void }).startRecording?.()
				setIsRecordingLocal(true)
			}
		} catch (error: unknown) {
			console.error("Error toggling recording:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to toggle recording"
			toast.error(errorMessage)
		}
	}

	return (
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
				variant={isScreenSharing ? "destructive" : "outline"}
				size="icon"
				className="size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10"
				onClick={handleToggleScreenShare}
				title={isScreenSharing ? "Stop sharing" : "Share screen"}
			>
				<Monitor className="size-4" />
			</Button>

			<Button
				variant={effectiveRecording ? "destructive" : "outline"}
				size="icon"
				className={cn(
					"size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10",
					effectiveRecording && "animate-pulse"
				)}
				onClick={handleToggleRecording}
				title={
					isRecordingStarting
						? "Recording starting..."
						: effectiveRecording
							? "Stop recording"
							: "Start recording"
				}
				disabled={isRecordingStarting}
			>
				{effectiveRecording ? (
					<Square className="size-4 fill-current" />
				) : (
					<CircleDot className="size-4" />
				)}
			</Button>

			<Button
				variant={localRecordingActive ? "destructive" : "outline"}
				size="icon"
				className="size-9 rounded-full shadow-md transition-all hover:shadow-lg md:size-10"
				onClick={localRecordingDisabled ? undefined : onLocalRecordingToggle}
				title={
					localRecordingDisabled
						? "Local recording requires Chrome/Edge desktop with captureStream support"
						: localRecordingActive
							? `Stop local recording (${localRecordingElapsed})`
							: "Start local (on-screen) recording"
				}
				disabled={localRecordingDisabled}
			>
				<Download className="size-4" />
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
	)
}

// Simple participant video card with screen share support
function ParticipantView({ participantId }: { participantId: string }) {
	const { webcamStream, webcamOn, displayName, isLocal, micOn, screenShareStream, screenShareOn } =
		useParticipant(participantId)
	const videoRef = useRef<HTMLVideoElement>(null)
	const [hasTrack, setHasTrack] = useState(false)

	useEffect(() => {
		const videoElement = videoRef.current
		if (!videoElement) return

		const getMediaStream = (streamObj: unknown): MediaStream | null => {
			if (!streamObj) return null
			if (streamObj instanceof MediaStream) return streamObj
			 
			if ((streamObj as { stream?: MediaStream })?.stream instanceof MediaStream) {
				 
				return (streamObj as { stream: MediaStream }).stream
			}
			 
			if ((streamObj as { mediaStream?: MediaStream })?.mediaStream instanceof MediaStream) {
				 
				return (streamObj as { mediaStream: MediaStream }).mediaStream
			}
			 
			if ((streamObj as { track?: MediaStreamTrack })?.track instanceof MediaStreamTrack) {
				 
				return new MediaStream([(streamObj as { track: MediaStreamTrack }).track])
			}
			 
			if (typeof (streamObj as { getTracks?: () => MediaStreamTrack[] })?.getTracks === "function") {
				 
				const tracks = (streamObj as { getTracks: () => MediaStreamTrack[] }).getTracks()
				 
				if (tracks?.length) {
					 
					return new MediaStream(tracks)
				}
			}
			 
			if (typeof (streamObj as { getVideoTracks?: () => MediaStreamTrack[] })?.getVideoTracks === "function") {
				 
				const vTracks = (streamObj as { getVideoTracks: () => MediaStreamTrack[] }).getVideoTracks()
				 
				if (vTracks?.length) {
					 
					return new MediaStream(vTracks)
				}
			}
			return null
		}

		const mediaStream =
			(screenShareOn && getMediaStream(screenShareStream)) ||
			(webcamOn && getMediaStream(webcamStream))

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
	}, [webcamOn, webcamStream, screenShareOn, screenShareStream])

	const initials = displayName?.charAt(0).toUpperCase() ?? "?"
	const isPresenting = !!screenShareOn
	const showVideo = hasTrack

	return (
		<Card className="border-border/70 bg-card/80 relative size-full overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm">
			<CardContent className="from-muted/40 via-background to-muted/60 relative size-full bg-gradient-to-br p-0">
				<video
					ref={videoRef}
					autoPlay
					playsInline
					muted={isLocal}
					className={cn(
						"bg-muted/30 size-full transition-opacity duration-200",
						isPresenting ? "object-contain" : "object-cover",
						"aspect-[4/3] md:aspect-[16/10]",
                                                                                                            						!showVideo && "opacity-0"
					)}
				/>

				{!showVideo && !isPresenting && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full text-2xl font-semibold shadow-lg md:size-20">
							{initials}
						</div>
					</div>
				)}

				<div className="absolute right-2 bottom-2 left-2 flex items-center justify-between rounded-lg bg-gradient-to-r from-black/80 via-black/70 to-black/60 px-2.5 py-1.5 text-[11px] text-white shadow-md">
					<div className="flex items-center gap-1">
						<span className="max-w-[140px] truncate font-semibold">{displayName ?? "Guest"}</span>
						{isLocal && <span className="text-[10px] text-white/80">(You)</span>}
						{isPresenting && (
							<span className="ml-1 rounded-full bg-emerald-900/60 px-1.5 py-0.5 text-[10px] text-emerald-200">
								Presenting
							</span>
						)}
					</div>
					{!micOn && <AlertCircle className="size-3.5 text-amber-300" />}
				</div>
			</CardContent>
		</Card>
	)
}

// Signer List Component - Shows all signers and their status
function SignerList({
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

	// Find the current signer (first one who hasn't signed yet)
	const currentSignerIndex = sortedSigners.findIndex(s => s.status !== "SIGNED" && !s.signedAt)

	return (
		<div className="bg-muted/30 mb-3 space-y-1.5 rounded-lg border p-2.5">
			<div className="mb-2 flex items-center gap-1.5">
				<UsersIcon className="text-muted-foreground size-3.5" />
				<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
					Signers ({sortedSigners.filter(s => s.status === "SIGNED" || s.signedAt).length}/
					{sortedSigners.length})
				</span>
			</div>
			<div className="space-y-1">
				{sortedSigners.map((signer, index) => {
					const isSigned = signer.status === "SIGNED" || signer.signedAt !== null
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
									"flex size-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
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
									<User className="text-muted-foreground size-3 flex-shrink-0" />
									<span className="truncate font-medium">
										{signer.firstName} {signer.lastName}
									</span>
								</div>
								<div className="text-muted-foreground truncate text-[10px]">{signer.email}</div>
							</div>
							<div className="flex-shrink-0">
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
}

// Document Actions Component - ENP can initiate signing directly
function DocumentActions({
	document,
	onSignClick,
	isSigningPending,
	onDownloadCertificate,
	isDownloadingCertificate,
	onDownloadSignedDocument,
	isDownloadingSignedDocument,
	isFullySigned,
	isLocked,
	isPreviousDocumentSigned,
	documentIndex,
	signers,
}: {
	document: { id: string; name: string; docoChainProjectId: string | null }
	onSignClick: (projectUuid: string, email: string, documentId: string) => void
	isSigningPending: boolean
	onDownloadCertificate?: (projectUuid: string) => void
	isDownloadingCertificate?: boolean
	onDownloadSignedDocument?: (projectUuid: string) => void
	isDownloadingSignedDocument?: boolean
	isFullySigned?: boolean
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
}) {
	const { data: session } = useSession()

	// Determine if Start Signing button should be disabled
	const isSigningDisabled = isLocked && !isPreviousDocumentSigned && (documentIndex ?? 0) > 0

	return (
		<div className="space-y-2">
			{/* Show signer list if available */}
			{signers && signers.length > 0 && <SignerList signers={signers} />}
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

			{/* Show "Start Signing" button for all meeting participants */}
			{/* Any participant (Principal, ENP, etc.) can click to sign */}
			{document.docoChainProjectId && (
				<div className="space-y-1.5">
					<Button
						variant="default"
						size="sm"
						className="h-9 w-full text-xs shadow-sm"
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
						disabled={isSigningPending || isSigningDisabled}
					>
						{isSigningPending ? (
							<>
								<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Starting...
							</>
						) : (
							<>
								<FileSignature className="mr-1.5 size-3.5" />
								Start Signing
							</>
						)}
					</Button>
					{/* Show message when button is disabled due to locked order */}
					{isSigningDisabled && (
						<p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
							Previous document must be signed first
						</p>
					)}
				</div>
			)}

			{/* Download Signed Document button - only show for fully signed documents */}
			{document.docoChainProjectId && onDownloadSignedDocument && isFullySigned && (
				<Button
					variant="outline"
					size="sm"
					className="hover:bg-primary/10 hover:text-primary h-9 w-full text-xs shadow-sm transition-all"
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
							<Download className="mr-1.5 size-3.5" />
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
					className="h-9 w-full text-xs shadow-sm transition-all hover:border-green-300 hover:bg-green-50 hover:text-green-700"
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
							<Download className="mr-1.5 size-3.5" />
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
	const [isRecording, setIsRecording] = useState(false)
	const [recordingStatus, setRecordingStatus] = useState<string>("RECORDING_STOPPED")
	const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
	const [recordingElapsed, setRecordingElapsed] = useState<string>("00:00")
	const [isLocalRecording, setIsLocalRecording] = useState(false)
	const [localRecordingElapsed, setLocalRecordingElapsed] = useState("00:00")
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const localStreamRef = useRef<MediaStream | null>(null)
	const recordingContainerRef = useRef<HTMLDivElement>(null)
	const localRecordingSupported =
		(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia) ||
		 
		(typeof HTMLDivElement !== "undefined" && typeof (HTMLDivElement.prototype as { captureStream?: unknown })?.captureStream === "function")
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
			refetchInterval: 5000, // Refetch every 5 seconds to get new uploads
		}
	)

	// Get tRPC utils for imperative calls
	const utils = trpc.useUtils()

	// Check signing status for all documents with DocoChain project IDs
	useEffect(() => {
		if (!documents || documents.length === 0) return

		const checkStatuses = async () => {
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
							signers: status.signers || [],
						})
					} catch {
						// If status check fails, assume not signed
						statusMap.set(doc.id, {
							isFullySigned: false,
							signedCount: 0,
							totalSigners: 0,
							signers: [],
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

	// Fetch meeting details to get participants and lock state
	const { data: meetingDetails, refetch: refetchMeetingDetails } = trpc.meetings.getById.useQuery(meetingId ?? "", {
		enabled: !!meetingId && !!meetingId.trim(),
		retry: false,
		refetchInterval: 3000, // Refetch every 3 seconds to sync lock state
	})

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

	// Fetch pending signature requests for current user
	const { data: pendingRequests } = trpc.signatureRequests.getPendingRequests.useQuery(
		{ meetingId: meetingId ?? "" },
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
			const errorMessage = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : "Failed to send signature request"
			toast.error(errorMessage)
		},
	})

	// Update signature request status mutation
	const updateSignatureStatus = trpc.signatureRequests.updateStatus.useMutation({
		onSuccess: () => {
			toast.success("Signature request declined")
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : "Failed to update request"
			toast.error(errorMessage)
		},
	})

	// Update document order mutation (for drag and drop)
	const updateDocumentOrder = trpc.meetings.updateDocumentOrder.useMutation({
		onSuccess: () => {
			void refetchDocuments() // Refetch to sync with other users
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : "Failed to update document order"
			toast.error(errorMessage)
		},
	})

	// Drag and drop handlers
	const handleDragStart = (e: React.DragEvent, documentId: string) => {
		const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
		// Prevent dragging if locked
		if (isLocked) {
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
	}

	const handleDragEnter = (e: React.DragEvent, targetDocumentId: string) => {
		const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
		if (isLocked) {
			e.preventDefault()
			return
		}
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
		const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
		if (isLocked) {
			e.preventDefault()
			return
		}
		e.preventDefault()
		e.dataTransfer.dropEffect = "move"
		if (draggedDocumentId && targetDocumentId !== draggedDocumentId) {
			setDragOverDocumentId(targetDocumentId)
		}
	}

	const handleDrop = (e: React.DragEvent, targetDocumentId: string) => {
		const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
		if (isLocked) {
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
			const result = await utils.signatureRequests.downloadSignedDocument.fetch(projectUuid as any)

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
				link.download = result.fileName ?? `signed-document-${projectUuid}.pdf`
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
	}

	// Generate signing link mutation (for signature request dialog)
	const generateSigningLink = trpc.signatureRequests.generateSigningLink.useMutation({
		onSuccess: data => {
			let signingLink = typeof data.link === "string" ? data.link : null

			if (!signingLink) {
				toast.error("Invalid signing link received")
				return
			}

			// Clean up the URL - remove api=null parameter if present
			try {
				const url = new URL(signingLink)
				if (
					url.searchParams.has("api") &&
					(url.searchParams.get("api") === "null" || url.searchParams.get("api") === "")
				) {
					url.searchParams.delete("api")
					signingLink = url.toString()
					console.log("🧹 Cleaned URL - removed api=null parameter")
				}
			} catch {
				// If URL parsing fails, try simple string replacement
				signingLink = signingLink
					.replace(/\?api=null(&|$)/, "?")
					.replace(/&api=null(&|$)/, "&")
					.replace(/\?$/, "")
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
				"DocoChainSigning",
				`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
			)

			if (popup) {
				toast.success("Opening signing interface...")
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
			}
		},
		onError: (error) => {
			const errorMessage = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : "Failed to generate signing link"
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

			// Clean up the URL - remove api=null parameter if present
			try {
				const url = new URL(signingLink)
				if (
					url.searchParams.has("api") &&
					(url.searchParams.get("api") === "null" || url.searchParams.get("api") === "")
				) {
					url.searchParams.delete("api")
					signingLink = url.toString()
					console.log("🧹 Cleaned URL - removed api=null parameter")
				}
			} catch {
				// If URL parsing fails, try simple string replacement
				signingLink = signingLink
					.replace(/\?api=null(&|$)/, "?")
					.replace(/&api=null(&|$)/, "&")
					.replace(/\?$/, "")
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
				"DocoChainSigning",
				`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no`
			)

			if (popup) {
				// Monitor popup for closing
				const checkClosed = setInterval(() => {
					if (popup.closed) {
						clearInterval(checkClosed)
						setSigningDocumentId(null)
						void refetchDocuments()
						toast.success("Signing completed. Document status updated.")
					}
				}, 500)

				toast.success("Opening signing interface in popup window...")
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
				setSigningDocumentId(null) // Clear loading state
			}
		},
		onError: error => {
			console.error("❌ Failed to initiate signing:", error)
			setSigningDocumentId(null) // Clear loading state on error
			const errorMessage = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : "Failed to start signing process"
			toast.error(errorMessage)
		},
	})

	// Get the first non-dismissed pending request
	const activeSignatureRequest = pendingRequests?.find(req => !dismissedRequestIds.has(req.id))

	const meeting = useMeeting({
		onMeetingJoined: () => {
			setJoined(true)

			console.log("✅ Successfully joined meeting")
		},
		onMeetingLeft: () => {
			setJoined(false)

			console.log("👋 Left meeting")
			// Call the onLeave callback to redirect user
			if (onLeave) {
				onLeave()
			}
		},
		onParticipantJoined: participant => {
			console.log("👋 Participant joined:", participant.id, participant.displayName)
		},
		onParticipantLeft: participant => {
			console.log("👋 Participant left:", participant.id, participant.displayName)
		},
		onPresenterChanged: (id) => {
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

	const participants = meeting?.participants ?? new Map<string, { displayName?: string; webcamOn?: boolean; local?: boolean; screenShareOn?: boolean }>()

	const filterHuman = (id: string, participant: { displayName?: string } | null | undefined) => {
		if (!participant) return false

		const idLower = id.toLowerCase()
		 
		const nameLower = (participant.displayName ?? "").toLowerCase()
		
		return !(
			idLower.includes("recorder") ||
			idLower.includes("bot") ||
			idLower.includes("internal") ||
			idLower.includes("hls") ||
			nameLower.includes("recorder") ||
			nameLower.includes("bot")
		)
	}
	
	const normalizeName = (name: string | undefined) => (name ?? "").trim().toLowerCase() || "unknown"
	
	const uniqueByName = new Map<string, { id: string; participant: { displayName?: string; webcamOn?: boolean; local?: boolean; screenShareOn?: boolean } }>()
	Array.from(participants.entries()).forEach(([id, participant]) => {
		if (!filterHuman(id, participant)) return
		
		const participantIsPresenting = Boolean((participant as { screenShareOn?: boolean })?.screenShareOn)
		const key = participantIsPresenting ? `${id}-presenter` : normalizeName(participant.displayName ?? id)
		const current = uniqueByName.get(key)
		const currentIsPresenting = Boolean(
			(current?.participant as { screenShareOn?: boolean })?.screenShareOn
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
	})

	const participantIds = Array.from(uniqueByName.values())
		.sort((a, b) => {
			const aPresenting = Boolean((a.participant as { screenShareOn?: boolean })?.screenShareOn)
			const bPresenting = Boolean((b.participant as { screenShareOn?: boolean })?.screenShareOn)
			if (aPresenting && !bPresenting) return -1
			if (!aPresenting && bPresenting) return 1
			// fall back to local first
			if (a.participant?.local && !b.participant?.local) return -1
			if (!a.participant?.local && b.participant?.local) return 1
			return 0
		})
		.map(entry => entry.id)
	const participantCount = participantIds.length

	useEffect(() => {
		if (!isRecording || !recordingStartedAt) {
			setRecordingElapsed("00:00")
			return
		}

		const interval = setInterval(() => {
			const diff = Date.now() - recordingStartedAt
			const totalSeconds = Math.max(0, Math.floor(diff / 1000))
			const minutes = Math.floor(totalSeconds / 60)
			const seconds = totalSeconds % 60
			setRecordingElapsed(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`)
		}, 1000)

		return () => clearInterval(interval)
	}, [isRecording, recordingStartedAt])

	useEffect(() => {
		if (!isLocalRecording || !localStreamRef.current) {
			setLocalRecordingElapsed("00:00")
			return
		}

		 
		const started = (mediaRecorderRef.current as { __startedAt?: number })?.__startedAt
		if (!started) {
			setLocalRecordingElapsed("00:00")
			return
		}

		const interval = setInterval(() => {
			const diff = Date.now() - started
			const totalSeconds = Math.max(0, Math.floor(diff / 1000))
			const minutes = Math.floor(totalSeconds / 60)
			const seconds = totalSeconds % 60
			setLocalRecordingElapsed(
				`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
			)
		}, 1000)

		return () => clearInterval(interval)
	}, [isLocalRecording])

	const startLocalRecording = async () => {
		if (isLocalRecording) return

		const container = recordingContainerRef.current
		 
		const canCapture = container && typeof (container as { captureStream?: unknown })?.captureStream === "function"
		const canShareDisplay = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia

		if (!canCapture && !canShareDisplay) {
			toast.error("Local recording not supported here. Please use Chrome/Edge desktop on HTTPS.")
			return
		}

		try {
			 
			const stream = canCapture
				? (container as unknown as { captureStream: (fps: number) => MediaStream }).captureStream(30)
				: await navigator.mediaDevices.getDisplayMedia({
						video: { frameRate: 30 },
						audio: true,
					})
			const mimeTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
			let recorder: MediaRecorder | null = null
			for (const type of mimeTypes) {
				if (MediaRecorder.isTypeSupported(type)) {
					 
					recorder = new MediaRecorder(stream, { mimeType: type })
					break
				}
			}
			 
			recorder ??= new MediaRecorder(stream)

			const chunks: BlobPart[] = []
			recorder.ondataavailable = e => {
				if (e.data && e.data.size > 0) {
					chunks.push(e.data)
				}
			}
			recorder.onstop = () => {
				 
				const firstChunk = chunks[0] as { type?: string } | undefined
				const inferredType = typeof firstChunk === "object" && firstChunk?.type ? firstChunk.type : "video/webm"
				 
				const blob = new Blob(chunks, { type: inferredType })
				const url = URL.createObjectURL(blob)
				const a = document.createElement("a")
				a.href = url
				a.download = `meeting-local-recording-${new Date().toISOString()}.webm`
				document.body.appendChild(a)
				a.click()
				document.body.removeChild(a)
				URL.revokeObjectURL(url)
				toast.success("Local recording saved")
				setIsLocalRecording(false)
				setLocalRecordingElapsed("00:00")
				localStreamRef.current?.getTracks().forEach(t => t.stop())
				localStreamRef.current = null
			}

			 
			;(recorder as { __startedAt?: number }).__startedAt = Date.now()
			recorder.start(500)
			mediaRecorderRef.current = recorder
			 
			localStreamRef.current = stream
			setIsLocalRecording(true)
			toast.message("Local recording started. It will capture what you see.")
		} catch (error: unknown) {
			console.error("Local recording error:", error)
			const errorMessage = error instanceof Error ? error.message : "Failed to start local recording"
			toast.error(errorMessage)
		}
	}

	const stopLocalRecording = async () => {
		if (!isLocalRecording) return
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop()
		}
	}

	const handleRecordingToggle = async () => {
		if (!meeting) return
		if (recordingStatus === "RECORDING_STARTING") return

		try {
			 
			const meetingWithRecording = meeting as unknown as { stopRecording?: () => Promise<void> | void; startRecording?: (config?: unknown) => Promise<void> | void }
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
	}

	if (!joined) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-gradient-to-br">
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
			className="from-background via-muted/20 to-background flex h-screen flex-col bg-gradient-to-br"
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
					onUploadClick={() => setIsUploadDialogOpen(true)}
					recordingState={{
						isRecording,
						isStarting: recordingStatus === "RECORDING_STARTING",
						isStopping: recordingStatus === "RECORDING_STOPPING",
					}}
					onRecordingToggle={handleRecordingToggle}
					localRecordingState={{
						isRecording: isLocalRecording,
						elapsed: localRecordingElapsed,
					}}
					onLocalRecordingToggle={async () => {
						if (isLocalRecording) {
							await stopLocalRecording()
						} else {
							await startLocalRecording()
						}
					}}
					localRecordingSupported={localRecordingSupported}
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
					{isRecording && (
						<div className="bg-destructive/10 border-destructive/30 text-destructive mb-3 flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
							<div className="flex items-center gap-2">
								<span className="bg-destructive inline-flex h-2 w-2 animate-pulse rounded-full" />
								<span className="font-semibold">Recording</span>
								<span className="text-destructive/80">• {recordingElapsed}</span>
							</div>
							<span className="text-destructive/70 text-xs">{recordingStatus}</span>
						</div>
					)}
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
										<div key={participantId} className="min-h-[260px]">
											<ParticipantView participantId={participantId} />
										</div>
									))}
							</div>
						</div>
					)}
				</div>

				{/* Documents Panel at Bottom */}
				{documents && documents.length > 0 && (
					<div
						className={cn(
							"bg-card/50 flex-shrink-0 border-t shadow-lg backdrop-blur-sm transition-all duration-300",
							showDocuments ? "max-h-[400px] min-h-[200px]" : "h-12 md:h-14"
						)}
					>
						<div className="flex h-12 flex-shrink-0 items-center justify-between border-b px-3 md:h-14 md:px-4 lg:px-6">
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
											<Lock className="size-3.5 flex-shrink-0" />
											<span>
												Documents are locked in signing order. Each document must be signed before
												the next one can be started.
											</span>
										</p>
									</div>
								)
							)
						})()}
						{showDocuments && (
							<div className="max-h-[350px] overflow-y-auto px-3 py-4 md:px-4 lg:px-6">
								<div className="grid grid-cols-1 gap-3 transition-all duration-300 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
									{documents.map((doc, index) => {
										const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
										const isDragged = draggedDocumentId === doc.id
										const isDragOver = dragOverDocumentId === doc.id

										// Check if previous document is signed (for sequential signing when locked)
										const previousDoc = index > 0 ? documents[index - 1] : null
										const isPreviousDocumentSigned = !previousDoc || (documentSigningStatus.get(previousDoc.id)?.isFullySigned ?? false)
										
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
												{/* Signing status indicator - top right corner */}
												{doc.docoChainProjectId &&
													documentSigningStatus.has(doc.id) &&
													(() => {
														const status = documentSigningStatus.get(doc.id)!
														return status.isFullySigned ? (
															<div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/30">
																<CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
																<span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
																	Signed
																</span>
															</div>
														) : status.signedCount > 0 ? (
															<div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900/30">
																<Clock className="size-3 text-yellow-600 dark:text-yellow-400" />
																<span className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">
																	{status.signedCount}/{status.totalSigners}
																</span>
															</div>
														) : (
															<div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
																<Clock className="size-3 text-gray-500 dark:text-gray-400" />
																<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
																	Pending
																</span>
															</div>
														)
													})()}
												<CardContent className="p-4">
													<div className="mb-3 flex items-start gap-3">
														{/* Drag handle - only draggable element */}
														<div
															className={cn(
																"relative mt-1 flex-shrink-0 transition-colors",
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
														<div className="bg-primary/10 flex-shrink-0 rounded-lg p-2.5">
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
														onSignClick={(projectUuid, email, documentId) => {
															// Set the document ID being signed before mutation
															setSigningDocumentId(documentId)
															// ENP clicks to initiate signing - adds them as signer and redirects
															initiateSigning.mutate({
																projectUuid,
																email,
															})
														}}
														isSigningPending={
															initiateSigning.isPending && signingDocumentId === doc.id
														}
														onDownloadSignedDocument={handleDownloadSignedDocument}
														isDownloadingSignedDocument={
															downloadingProjectUuid === doc.docoChainProjectId
														}
														onDownloadCertificate={handleDownloadCertificate}
														isDownloadingCertificate={
															downloadingCertificateUuid === doc.docoChainProjectId
														}
														isFullySigned={
															documentSigningStatus.get(doc.id)?.isFullySigned ?? false
														}
														isLocked={isLocked}
														isPreviousDocumentSigned={isPreviousDocumentSigned}
														documentIndex={index}
														signers={documentSigningStatus.get(doc.id)?.signers}
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
	const isDevelopment = typeof window === 'undefined' ? false : window.location.hostname === 'localhost'
	
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
