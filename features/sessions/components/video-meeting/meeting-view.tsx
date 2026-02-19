"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk"
import {
	CheckCircle2,
	CircleDot,
	Clock,
	Download,
	FileSignature,
	FileText,
	GripVertical,
	Loader2,
	Lock,
	MoreVertical,
	RefreshCw,
	Send,
	Unlock,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
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

import { trpc } from "@/services/trpc/client"

import type { MeetingViewProps, RecordingConsentRequest } from "../../lib/video-meeting"
import {
	forceApiTruePreservingParams,
	formatElapsedMs,
	PRE_GENERATED_LINK_MAX_AGE_MS,
	STALE_LINK_CHECK_INTERVAL_MS,
} from "../../lib/video-meetins-utils"
import { MeetingDocumentUpload } from "../meeting-document-upload"
import { DocumentActions } from "./document-action"
import { DocumentSidebar } from "./document-sidebar"
import { FileFlightAnimation } from "./file-flight-animation"
import { MeetingControls } from "./meeting-controls"
import { ParticipantView } from "./participant-view"
import { RecordingBanner } from "./recording-banner"

export function MeetingView({ onLeave, meetingId }: { onLeave?: () => void; meetingId?: string }) {
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
	const [isPlottingAction, setIsPlottingAction] = useState(false)
	const isPlottingActionRef = useRef(false)
	const [plotCloseConfirmOpen, setPlotCloseConfirmOpen] = useState(false)
	const [plotCloseConfirmDocumentId, setPlotCloseConfirmDocumentId] = useState<string | null>(null)
	const plotPopupDocumentIdRef = useRef<string | null>(null)
	const [userConfirmedPlottedDocumentIds, setUserConfirmedPlottedDocumentIds] = useState<
		Set<string>
	>(new Set())
	const openingPlatformToastIdRef = useRef<string | number | null>(null)
	const openingSignedDocumentToastIdRef = useRef<string | number | null>(null)
	type PreGeneratedLinkEntry = { link: string; projectUuid: string; storedAt: number }
	// Store pre-generated links per document (keyed by documentId). storedAt used to skip stale links on click.
	// IMPORTANT: Plot and Sign links must NEVER share the same slot, otherwise Plot can accidentally open a Sign link (token=...).
	const [preGeneratedPlotLinks, setPreGeneratedPlotLinks] = useState<
		Map<string, PreGeneratedLinkEntry>
	>(new Map())
	const [preGeneratedSignLinks, setPreGeneratedSignLinks] = useState<
		Map<string, PreGeneratedLinkEntry>
	>(new Map())

	// Proactively clear stale links so pre-gen runs again and we keep a fresh link ready
	useEffect(() => {
		const interval = setInterval(() => {
			const clearStale = (prev: Map<string, PreGeneratedLinkEntry>) => {
				if (prev.size === 0) return prev
				const now = Date.now()
				const next = new Map(prev)
				next.forEach((v, docId) => {
					if (typeof v.storedAt === "number" && now - v.storedAt > PRE_GENERATED_LINK_MAX_AGE_MS) {
						next.delete(docId)
					}
				})
				return next.size === prev.size ? prev : next
			}
			setPreGeneratedPlotLinks(clearStale)
			setPreGeneratedSignLinks(clearStale)
		}, STALE_LINK_CHECK_INTERVAL_MS)
		return () => clearInterval(interval)
	}, [STALE_LINK_CHECK_INTERVAL_MS])

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
				projectStatus?: string
				completedAt?: string | null
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
	const {
		data: documents,
		refetch: refetchDocuments,
		isFetching: isDocumentsFetching,
	} = trpc.meetings.getMeetingDocuments.useQuery(meetingId ?? "", {
		enabled: !!meetingId,
		refetchInterval: 10000, // Refetch every 10 seconds (reduced from 20s) for faster status updates
		staleTime: 5000, // Consider data fresh for 5 seconds (reduced from 10s)
	})

	// Get tRPC utils for imperative calls
	const utils = trpc.useUtils()

	const [signingStatusPollingPausedUntil, setSigningStatusPollingPausedUntil] = useState<
		number | null
	>(null)
	const [isRefreshingSigningStatus, setIsRefreshingSigningStatus] = useState(false)
	const hasShownSigningStatusAuthErrorRef = useRef(false)
	const hasShownSigningStatusFetchErrorRef = useRef(false)
	const signingStatusInFlightRef = useRef(false)

	// Core refresh logic extracted for reuse
	const performSigningStatusRefresh = useCallback(
		async (force = false) => {
			if (!documents || documents.length === 0) return

			// Wait for in-flight request to complete if forcing, otherwise skip if already in progress
			if (signingStatusInFlightRef.current) {
				if (!force) return
				// Wait for current request to finish (max 10 seconds)
				const startTime = Date.now()
				while (signingStatusInFlightRef.current && Date.now() - startTime < 10000) {
					await new Promise(resolve => setTimeout(resolve, 100))
				}
				if (signingStatusInFlightRef.current) {
					console.warn("Signing status refresh timed out waiting for previous request")
					return
				}
			}

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
			setIsRefreshingSigningStatus(true)
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
				// Only pause automatic polling, not manual refreshes
				if (!force && (unauthorizedHit || anyErrorHit)) {
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
						projectStatus?: string
						completedAt?: string | null
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
							projectStatus: status.projectStatus ?? undefined,
							completedAt: status.completedAt,
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
							current.projectStatus === entry.projectStatus &&
							current.completedAt === entry.completedAt &&
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
				setIsRefreshingSigningStatus(false)
			}
		},
		[documents, utils.signatureRequests.checkSigningStatus]
	)

	// Automatic polling refresh (respects visibility and pause state)
	const refreshSigningStatuses = useCallback(async () => {
		// Only poll while the documents panel is visible; avoids re-render storms during video actions.
		if (!showDocuments) return

		// Don't poll in background tabs.
		if (typeof document !== "undefined" && document.visibilityState === "hidden") return

		// If we recently got unauthorized, back off to avoid hammering the API + spamming logs.
		if (signingStatusPollingPausedUntil && Date.now() < signingStatusPollingPausedUntil) return

		await performSigningStatusRefresh(false)
	}, [showDocuments, signingStatusPollingPausedUntil, performSigningStatusRefresh])

	// Manual refresh function (bypasses checks and resets pause state)
	const manualRefreshSigningStatuses = useCallback(async () => {
		// Reset pause state when manually refreshing
		setSigningStatusPollingPausedUntil(null)
		// Reset error flags so errors can be shown again if they persist
		hasShownSigningStatusAuthErrorRef.current = false
		hasShownSigningStatusFetchErrorRef.current = false
		// Force refresh even if panel is hidden or other conditions
		await performSigningStatusRefresh(true)
	}, [performSigningStatusRefresh])

	// Check signing status for all documents with DocoChain project IDs
	useEffect(() => {
		if (!showDocuments) return
		if (!documents || documents.length === 0) return

		void refreshSigningStatuses()

		// Faster polling interval for real-time signing status updates (reduced from 60s to 5s)
		// This ensures users see status changes quickly when others sign
		const interval = setInterval(() => {
			void refreshSigningStatuses()
		}, 5000) // Poll every 5 seconds for real-time updates

		return () => clearInterval(interval)
	}, [documents, refreshSigningStatuses, showDocuments])

	// Fetch meeting details to get participants and lock state
	const queryId = meetingId?.trim() ?? ""
	const { data: meetingDetails, refetch: refetchMeetingDetails } = trpc.meetings.getById.useQuery(
		queryId,
		{
			enabled: !!meetingId?.trim(),
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

	const removeDocumentMutation = trpc.meetings.removeDocument.useMutation({
		onSuccess: () => {
			void refetchDocuments()
			toast.success("Document removed successfully")
		},
		onError: error => {
			toast.error(error.message ?? "Failed to remove document")
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

	// Ensure DocoChain token as soon as ENP enters the meeting (not just when Create Project is needed).
	// This fixes Edit Draft links being wrong until page refresh - token must be ready before any link generation.
	const hasAnyCreateProjectEligibleDoc =
		(documents ?? []).some(
			d =>
				!d.docoChainProjectId &&
				((d as { signerUserIds?: string[] }).signerUserIds?.length ?? 0) > 0
		) ?? false
	const isEnp = session?.user?.role === "ENP"
	const {
		data: ensureTokenData,
		isSuccess: ensureTokenSuccess,
		isFetching: ensureTokenFetching,
	} = trpc.meetings.ensureDocoChainToken.useQuery(
		{ meetingId: meetingId ?? "" },
		{
			enabled: !!(meetingId ?? "").trim() && !!isEnp,
			retry: false,
			staleTime: 60_000, // Treat as fresh for 1 min so we don't refetch constantly
		}
	)
	const docoChainTokenReady = !!isEnp && ensureTokenSuccess && !!ensureTokenData?.ready
	const docoChainTokenLoading = !!isEnp && !!hasAnyCreateProjectEligibleDoc && ensureTokenFetching

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

	// Handle signed document - only open when fully processed (Completed)
	const handleDownloadSignedDocument = useCallback(
		async (projectUuid: string) => {
			setDownloadingProjectUuid(projectUuid)

			// Clear any previous toast
			if (openingSignedDocumentToastIdRef.current !== null) {
				toast.dismiss(openingSignedDocumentToastIdRef.current)
				openingSignedDocumentToastIdRef.current = null
			}

			openingSignedDocumentToastIdRef.current = toast.loading("Opening notarized document…")

			try {
				// Wait until DocoChain reports the project as completed (processing done)
				const maxAttempts = 10
				let delayMs = 1500

				for (let attempt = 0; attempt < maxAttempts; attempt++) {
					const status = await utils.signatureRequests.checkSigningStatus.fetch({ projectUuid })
					const statusUpper = String(status?.projectStatus ?? "").toUpperCase()
					const isCompleted = statusUpper === "COMPLETED" || status?.completedAt !== null

					if (isCompleted) break

					// Not ready yet: wait and retry
					await new Promise(resolve => setTimeout(resolve, delayMs))
					delayMs = Math.min(delayMs + 500, 4000)
				}

				// Final check (one last fetch) before opening
				const finalStatus = await utils.signatureRequests.checkSigningStatus.fetch({
					projectUuid,
				})
				const finalStatusUpper = String(finalStatus?.projectStatus ?? "").toUpperCase()
				const isFinallyCompleted =
					finalStatusUpper === "COMPLETED" || finalStatus?.completedAt !== null

				if (!isFinallyCompleted) {
					toast.error("Signed document is still processing. Please try again in a moment.")
					return
				}

				// Only open once completed (ensures sealed document is available).
				// This avoids relying on DocoChain guestToken and avoids leaking api_token in URLs.
				const url = `/api/doconchain/projects/${encodeURIComponent(projectUuid)}/signed`
				const opened = window.open(url, "_blank", "noopener,noreferrer")
				if (!opened) {
					toast.error("Popup blocked. Please allow popups for this site and try again.")
					return
				}
				toast.success("Opening notarized document…")
			} catch (error) {
				console.error("Error opening notarized document:", error)
				toast.error(error instanceof Error ? error.message : "Failed to open notarized document")
			} finally {
				if (openingSignedDocumentToastIdRef.current !== null) {
					toast.dismiss(openingSignedDocumentToastIdRef.current)
					openingSignedDocumentToastIdRef.current = null
				}
				setDownloadingProjectUuid(null)
			}
		},
		[utils.signatureRequests.checkSigningStatus]
	)

	// Handle certificate download
	const handleDownloadCertificate = useCallback(
		async (projectUuid: string) => {
			setDownloadingCertificateUuid(projectUuid)

			try {
				// Fetch the certificate using tRPC utils
				if (typeof projectUuid !== "string") {
					throw new Error("Invalid projectUuid: must be a string")
				}
				const result = (await utils.signatureRequests.downloadCertificate.fetch(projectUuid)) as {
					base64?: string
					fileName?: string
				}

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
					link.download = result.fileName ?? `certificate-${projectUuid}.pdf`
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

			// For signing, preserve recipient token params; only force api=true.
			signingLink = forceApiTruePreservingParams(signingLink)

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
		onMutate: variables => {
			// Clear any previous toast
			if (openingPlatformToastIdRef.current !== null) {
				toast.dismiss(openingPlatformToastIdRef.current)
				openingPlatformToastIdRef.current = null
			}

			if (variables.isPlotting === true) {
				openingPlatformToastIdRef.current = toast.loading("Opening plotting platform…")
			}
		},
		onSuccess: data => {
			// Clear loading toast (if any)
			if (openingPlatformToastIdRef.current !== null) {
				toast.dismiss(openingPlatformToastIdRef.current)
				openingPlatformToastIdRef.current = null
			}

			// Validate that we have a valid URL string
			let signingLink = typeof data.link === "string" ? data.link : null

			if (!signingLink) {
				console.error("❌ Invalid signing link received:", data)
				toast.error("Invalid signing link received")
				return
			}

			// For plotting, keep link as-is (enterprise draft plotting URL). For signing, preserve token params; only force api=true.
			const wasPlotting = isPlottingActionRef.current
			if (!wasPlotting) signingLink = forceApiTruePreservingParams(signingLink)
			// SAFETY: Always force api=true for plotting links (DocOnChain UI mode toggle).
			// Some upstream links can omit it on first load; missing api=true shows the full sidebar/editor shell.
			if (wasPlotting) {
				try {
					const url = new URL(signingLink)
					url.searchParams.set("api", "true")
					signingLink = url.toString()
				} catch {
					// Ignore if URL parsing fails; later validation will catch invalid URLs.
				}
			}

			// Validate it's a proper URL
			try {
				const url = new URL(signingLink)
				// SAFETY: Plot Signature must never open a per-recipient "signing" link (token=...).
				// stg-app / app domain is allowed for plot links (DOCONCHAIN_APP_URL).
				if (wasPlotting) {
					const hasSignerTokenParam = url.searchParams.has("token")
					if (hasSignerTokenParam) {
						toast.error(
							"Plot Signature must open the draft plotting platform. Please click Plot Signature again."
						)
						setSigningDocumentId(null)
						setIsPlottingAction(false)
						isPlottingActionRef.current = false
						plotPopupDocumentIdRef.current = null
						return
					}
				}
			} catch {
				console.error("❌ Invalid URL format:", signingLink)
				toast.error("Invalid URL format for signing link")
				return
			}

			console.log("✅ Signing process initiated successfully! Project UUID:", data.projectUuid)

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
						setIsPlottingAction(false)
						isPlottingActionRef.current = false

						if (wasPlotting) {
							const docId = plotPopupDocumentIdRef.current
							setPlotCloseConfirmDocumentId(docId)
							setPlotCloseConfirmOpen(true)
						} else {
							plotPopupDocumentIdRef.current = null
							void refetchDocuments().then(() => {
								void manualRefreshSigningStatuses()
							})
							toast.success("Signing completed. Document status updated.")
						}
					}
				}, 1500)

				toast.success(
					wasPlotting
						? "Opening plotting platform in popup window..."
						: "Opening signing interface in popup window..."
				)
			} else {
				toast.error("Popup blocked. Please allow popups for this site and try again.")
				setSigningDocumentId(null) // Clear loading state
				setIsPlottingAction(false) // Clear plotting state
				isPlottingActionRef.current = false // Clear ref
			}
		},
		onError: error => {
			console.error("❌ Failed to initiate signing:", error)
			// Clear loading toast (if any)
			if (openingPlatformToastIdRef.current !== null) {
				toast.dismiss(openingPlatformToastIdRef.current)
				openingPlatformToastIdRef.current = null
			}
			setSigningDocumentId(null)
			setIsPlottingAction(false)
			isPlottingActionRef.current = false
			plotPopupDocumentIdRef.current = null
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
		(projectUuid: string | null, email: string, documentId: string, isPlotting?: boolean) => {
			const plotting = isPlotting ?? false
			const preGeneratedMap = plotting ? preGeneratedPlotLinks : preGeneratedSignLinks
			const setPreGeneratedMap = plotting ? setPreGeneratedPlotLinks : setPreGeneratedSignLinks
			const preGenerated = preGeneratedMap.get(documentId)

			// Pre-generated link can go stale (api_token expires after ~2 min). Skip use when stale and regenerate.
			const ageMs =
				typeof preGenerated?.storedAt === "number" ? Date.now() - preGenerated.storedAt : Infinity
			const isStale = ageMs > PRE_GENERATED_LINK_MAX_AGE_MS
			if (preGenerated?.link && isStale) {
				setPreGeneratedMap(prev => {
					const next = new Map(prev)
					next.delete(documentId)
					return next
				})
			}

			// Use pre-generated link only when we have it and it's fresh
			if (preGenerated?.link && !isStale) {
				console.log("✅ Using pre-generated link (fresh)")
				setSigningDocumentId(documentId)
				setIsPlottingAction(plotting)
				isPlottingActionRef.current = plotting
				if (plotting) plotPopupDocumentIdRef.current = documentId

				let signingLink = preGenerated.link
				// For plotting, keep link as-is (enterprise draft plotting URL). For signing, preserve token params.
				if (!plotting) {
					signingLink = forceApiTruePreservingParams(signingLink)
				} else {
					// SAFETY: Always force api=true for plotting links (ensures "no sidebar" DocOnChain view).
					try {
						const url = new URL(signingLink)
						url.searchParams.set("api", "true")
						signingLink = url.toString()
					} catch {
						// Ignore; validation below will handle invalid URLs.
					}
				}

				try {
					const url = new URL(signingLink)
					// SAFETY: Plot Signature must never open a "signing" link (token=...) or app-domain link.
					if (plotting) {
						const hasTokenParam = url.searchParams.has("token")
						const isAppDomain =
							url.hostname.includes("stg-app.doconchain.com") ||
							url.hostname.includes("app.doconchain.com")
						if (hasTokenParam || isAppDomain) {
							toast.error(
								"Plot Signature must open the draft plotting platform. Please click Plot Signature again."
							)
							setSigningDocumentId(null)
							setIsPlottingAction(false)
							isPlottingActionRef.current = false
							plotPopupDocumentIdRef.current = null
							return
						}
					}
				} catch {
					console.error("❌ Invalid URL format:", signingLink)
					toast.error("Invalid URL format for signing link")
					return
				}

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
					const checkClosed = setInterval(() => {
						if (popup.closed) {
							clearInterval(checkClosed)
							setSigningDocumentId(null)
							setIsPlottingAction(false)
							isPlottingActionRef.current = false

							if (plotting) {
								const docId = plotPopupDocumentIdRef.current
								setPlotCloseConfirmDocumentId(docId)
								setPlotCloseConfirmOpen(true)
							} else {
								void refetchDocuments().then(() => {
									void manualRefreshSigningStatuses()
								})
								toast.success("Signing completed. Document status updated.")
							}
						}
					}, 1500)
					toast.success(
						plotting
							? "Opening plotting platform in popup window..."
							: "Opening signing interface in popup window..."
					)
					setPreGeneratedMap(prev => {
						const next = new Map(prev)
						next.delete(documentId)
						return next
					})
				} else {
					toast.error("Popup blocked. Please allow popups for this site and try again.")
					setSigningDocumentId(null)
					setIsPlottingAction(false)
					isPlottingActionRef.current = false
					plotPopupDocumentIdRef.current = null
				}
				return
			}

			// No pre-generated link or stale — generate on demand (fresh link every time)
			if (isStale && plotting) {
				toast.info("Generating fresh link…")
			}
			setSigningDocumentId(documentId)
			setIsPlottingAction(plotting)
			isPlottingActionRef.current = plotting
			if (plotting) plotPopupDocumentIdRef.current = documentId
			const effectiveProjectUuid = preGenerated?.projectUuid ?? projectUuid
			initiateSigning.mutate(
				effectiveProjectUuid
					? { projectUuid: effectiveProjectUuid, email, isPlotting: plotting }
					: { documentId, email, isPlotting: plotting }
			)
		},
		[
			initiateSigning,
			preGeneratedPlotLinks,
			preGeneratedSignLinks,
			refetchDocuments,
			manualRefreshSigningStatuses,
		]
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
		if (!recordingConsentRequest || !localParticipantId) return

		const requiredIds = recordingConsentRequest.requiredParticipantIds
		if (!requiredIds || requiredIds.length === 0) return

		const allAccepted = requiredIds.every(id => recordingConsentAcceptedIds.has(id))

		// ✅ If all accepted, close modal and start recording (initiator only)
		if (allAccepted) {
			const isInitiator =
				recordingConsentRequest.initiatorName === (session?.user?.name ?? "Someone")
			if (isInitiator) {
				void startLocalRecording()
			}
			setRecordingConsentOpen(false)
			resetRecordingConsentUi()
		}

		// ❌ If anyone declined, close modal
		if (recordingConsentDeclined) {
			setRecordingConsentOpen(false)
			resetRecordingConsentUi()
		}
	}, [
		recordingConsentAcceptedIds,
		recordingConsentDeclined,
		recordingConsentRequest,
		localParticipantId,
		session?.user?.name,
		startLocalRecording,
		resetRecordingConsentUi,
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
										onClick={async () => {
											// Refresh documents - this always works
											await refetchDocuments()
											// Manual refresh signing statuses - bypasses all checks and resets pause state
											await manualRefreshSigningStatuses()
										}}
										disabled={isDocumentsFetching || isRefreshingSigningStatus}
										className="hover:bg-muted size-8 px-0 md:size-8 md:px-0"
										title="Refresh documents and signing statuses"
									>
										<RefreshCw
											className={cn(
												"size-4 md:size-4",
												(isDocumentsFetching || isRefreshingSigningStatus) && "animate-spin"
											)}
										/>
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
								// Document is COMPLETED when DocoChain has finished processing (seal + signature applied)
								const statusUpper = String(signingStatus?.projectStatus ?? "").toUpperCase()
								const isCompleted =
									statusUpper === "COMPLETED" ||
									(signingStatus?.completedAt !== null && signingStatus?.completedAt !== undefined)
								const isPreparingNotarized =
									isFullySigned && !isCompleted && (signingStatus?.signedCount ?? 0) > 0
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
															disabled={!isCompleted || isDownloadingSigned || isPreparingNotarized}
															onClick={() => {
																if (doc.docoChainProjectId && isCompleted) {
																	void handleDownloadSignedDocument(doc.docoChainProjectId)
																}
															}}
														>
															{isPreparingNotarized || isDownloadingSigned ? (
																<Loader2 className="size-4 animate-spin" />
															) : (
																<FileText className="size-4" />
															)}
															<span>
																{isDownloadingSigned
																	? "Opening notarized document..."
																	: isPreparingNotarized
																		? "Preparing Notarized Document"
																		: "View notarized document"}
															</span>
														</DropdownMenuItem>
														<DropdownMenuItem
															disabled={!isCompleted || isDownloadingCert}
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
													{doc.notarizationType && (
														<p className="text-muted-foreground mt-1 text-xs font-medium">
															{(() => {
																switch (doc.notarizationType) {
																	case "ACKNOWLEDGMENT":
																		return "Acknowledgment"
																	case "AFFIRMATION":
																		return "Affirmation"
																	case "JURAT":
																		return "Jurat"
																	case "SIGNATURE_WITNESSING":
																		return "Signature Witnessing"
																	default:
																		return doc.notarizationType
																}
															})()}
														</p>
													)}
													{(() => {
														const fees = (doc as { fees?: number | null }).fees
														const showFees =
															isFullySigned &&
															fees !== null &&
															fees !== undefined &&
															typeof fees === "number" &&
															!Number.isNaN(fees)
														return showFees ? (
															<p className="text-muted-foreground mt-1 text-xs font-semibold">
																Fees: {fees.toFixed(2)}
															</p>
														) : null
													})()}
												</div>
											</div>
											<DocumentActions
												document={doc}
												onSignClick={handleSignClick}
												onSignersChange={handleSignersChange}
												isSigningPending={initiateSigning.isPending && signingDocumentId === doc.id}
												isPlottingAction={signingDocumentId === doc.id ? isPlottingAction : false}
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
												docoChainTokenReady={docoChainTokenReady}
												docoChainTokenLoading={docoChainTokenLoading}
												onPreGeneratedLink={(documentId, link, projectUuid, kind) => {
													const setMap =
														kind === "plot" ? setPreGeneratedPlotLinks : setPreGeneratedSignLinks
													setMap(prev => {
														const next = new Map(prev)
														next.set(documentId, { link, projectUuid, storedAt: Date.now() })
														return next
													})
												}}
												plotLinkReady={!!preGeneratedPlotLinks.get(doc.id)?.link}
												userConfirmedPlottedDocumentIds={userConfirmedPlottedDocumentIds}
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
		createDocoChainProjectMutation,
		documentSigningStatus,
		documents,
		docoChainTokenLoading,
		docoChainTokenReady,
		dragOverDocumentId,
		isPlottingAction,
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
		isDocumentsFetching,
		meetingDetails,
		meetingId,
		preGeneratedPlotLinks,
		refetchDocuments,
		refreshSigningStatuses,
		session?.user?.id,
		showDocuments,
		signingDocumentId,
		toggleLockMutation,
		userConfirmedPlottedDocumentIds,
	])

	// Sidebar document list with full file metadata
	const sidebarDocuments = useMemo(() => {
		if (!documents) return []
		return documents.map(doc => ({
			id: doc.id,
			name: doc.name,
			docoChainProjectId: doc.docoChainProjectId ?? null,
			size: (doc as { size?: number | null }).size ?? null,
			fileType: (doc as { fileType?: string | null }).fileType ?? null,
			notarizationType: (doc as { notarizationType?: string | null }).notarizationType ?? null,
			signerUserIds: (doc as { signerUserIds?: string[] | null }).signerUserIds ?? null,
			cost:
				(doc as { fees?: number | null; cost?: number | null }).fees ??
				(doc as { cost?: number | null }).cost ??
				null,
			currency: (doc as { currency?: string | null }).currency ?? "PHP",
		}))
	}, [documents])

	const handleSidebarRefresh = useCallback(async () => {
		await refetchDocuments()
		await manualRefreshSigningStatuses()
	}, [refetchDocuments, manualRefreshSigningStatuses])

	const handleToggleLock = useCallback(() => {
		const isPrincipal = meetingDetails?.createdBy.id === session?.user?.id
		if (isPrincipal && meetingId) {
			const isLocked = meetingDetails?.isDocumentOrderLocked ?? false
			toggleLockMutation.mutate({
				meetingId,
				isLocked: !isLocked,
			})
		}
	}, [meetingDetails, meetingId, session?.user?.id, toggleLockMutation])

	const handleRemoveDocument = useCallback(
		(documentId: string) => {
			if (meetingId) {
				removeDocumentMutation.mutate({ meetingId, documentId })
			}
		},
		[meetingId, removeDocumentMutation]
	)
	const [flyTrigger, setFlyTrigger] = useState(false)

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
		<div className="flex h-screen flex-col">
			{/* Standard app header — outside recordingContainerRef so it's not captured */}
			<PageHeader
				items={[{ label: "Sessions", href: "/sessions" }, { label: "Signing Session" }]}
			/>

			<div
				ref={recordingContainerRef}
				className="from-background via-muted/20 to-background flex flex-1 flex-col overflow-hidden bg-linear-to-br"
			>
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
						onUploadAnimationStart={() => setFlyTrigger(true)}
						isEnp={session?.user?.role === "ENP"}
					/>
				)}
				<FileFlightAnimation trigger={flyTrigger} onComplete={() => setFlyTrigger(false)} />

				{/* Main Content: Signing-focused layout */}
				<div className="flex flex-1 flex-col overflow-hidden">
					<div className="relative flex-1 overflow-hidden p-3 md:p-4 lg:p-6">
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
							<div className="relative flex h-full w-full flex-col overflow-y-auto pr-14">
								{presenterId && (
									<div className="mb-4 w-full">
										<div className="border-border/70 bg-card/80 overflow-hidden rounded-xl border shadow-lg">
											<ParticipantView participantId={presenterId} />
										</div>
									</div>
								)}
								<div
									className={cn(
										"grid w-full grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 sm:gap-5",
										"auto-rows-[minmax(260px,1fr)]",
										showDocuments &&
											"auto-rows-[minmax(220px,1fr)] md:auto-rows-[minmax(240px,1fr)]"
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

								{/* Sticky Meeting Controls - Stays at bottom */}
								<div className="pointer-events-none sticky bottom-0 z-50 flex justify-center py-4">
									<div className="bg-card pointer-events-auto flex items-center gap-1.5 rounded-full p-2 shadow-2xl">
										<MeetingControls
											onUploadClick={handleUploadClick}
											onRecordingToggle={handleRecordingToggle}
											onLocalRecordingToggle={openConsentAndRequest}
											localRecordingSupported={localRecordingSupported}
											isRecording={isRecording}
											isRecordingStarting={recordingStatus === "RECORDING_STARTING"}
											isLocalRecording={isLocalRecording}
											localRecordingStartedAt={localRecordingStartedAt}
											participantCount={participantCount}
										/>
									</div>
								</div>
							</div>
						)}

						{/* Document Sidebar — overlay drawer, floats above participant grid */}
						<DocumentSidebar
							documents={sidebarDocuments}
							documentSigningStatus={documentSigningStatus}
							participants={meetingDetails?.participants ?? []}
							onSignersChange={handleSignersChange}
							isDocumentOrderLocked={meetingDetails?.isDocumentOrderLocked ?? false}
							isPrincipal={meetingDetails?.createdBy.id === session?.user?.id}
							onToggleLock={handleToggleLock}
							onRemoveDocument={handleRemoveDocument}
							isRefreshing={isDocumentsFetching || isRefreshingSigningStatus}
							onRefresh={handleSidebarRefresh}
							onDownloadSigned={handleDownloadSignedDocument}
							onDownloadCertificate={handleDownloadCertificate}
							downloadingProjectUuid={downloadingProjectUuid}
							downloadingCertificateUuid={downloadingCertificateUuid}
						/>
					</div>
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

				{/* Plot Signature close confirmation – "Did you plot?" before assuming done */}
				<AlertDialog
					open={plotCloseConfirmOpen}
					onOpenChange={open => {
						setPlotCloseConfirmOpen(open)
						if (!open) plotPopupDocumentIdRef.current = null
						// Do not clear plotCloseConfirmDocumentId here – Radix may run this before
						// "Yes" onClick, so we’d clear it before the handler runs. Clear only in Yes/No.
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Did you plot your signature?</AlertDialogTitle>
							<AlertDialogDescription>
								You closed the Plot Signature window. Double-check that you&apos;ve plotted your
								signature before confirming. If you closed by accident, you can click Plot Signature
								again to reopen.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={() => {
									toast.info("You can click Plot Signature again to reopen.")
									setPlotCloseConfirmDocumentId(null)
								}}
							>
								No, I closed by accident
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									const docId = plotCloseConfirmDocumentId
									if (docId) {
										setUserConfirmedPlottedDocumentIds(prev => new Set(prev).add(docId))
									}
									setPlotCloseConfirmDocumentId(null)
									void refetchDocuments().then(() => {
										void manualRefreshSigningStatuses()
									})
									toast.success("Signature plotted. Document status updated.")
								}}
							>
								Yes, I&apos;m done
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

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
									if (
										recordingConsentRequest?.initiatorName === (session?.user?.name ?? "Someone")
									) {
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
									await acceptConsent() // adds your participant to acceptedIds
								}}
							>
								Agree
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
