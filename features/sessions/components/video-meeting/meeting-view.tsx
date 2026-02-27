"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMeeting, usePubSub } from "@videosdk.live/react-sdk"
import { CircleDot, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
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

import { trpc } from "@/services/trpc/client"

import {
	MEETING_LOCK_API_MESSAGE,
	isMeetingLockActionBlocked,
} from "@/features/sessions/lib/meeting-lock-contract"

import {
	extractDoconchainLink,
	formatElapsedMs,
	openCenteredPopup,
	PRE_GENERATED_LINK_MAX_AGE_MS,
	sanitizeDoconchainPayloadForLog,
	SEALED_DOCUMENT_SETTLE_DELAY_MS,
	STALE_LINK_CHECK_INTERVAL_MS,
	type PreGeneratedLinkEntry,
	type RecordingConsentRequest,
} from "../../lib/utils"
import { MeetingDocumentUpload } from "../meeting-document-upload"
import { DocumentCards, type DocumentCardsHandle } from "./document-cards"
import { FileFlightAnimation } from "./file-flight-animation"
import { MeetingControls } from "./meeting-controls"
import { MeetingInviteDialog } from "./meeting-invite-dialog"
import { ParticipantView } from "./participant-view"
import { RecordingBanner } from "./recording-banner"

// ─────────────────────────────────────────────────────────────
// MeetingView
// ─────────────────────────────────────────────────────────────

export function MeetingView({ onLeave, meetingId }: { onLeave?: () => void; meetingId?: string }) {
	const { data: session } = useSession()

	// ─── Join state ─────────────────────────────────────────────
	const [joined, setJoined] = useState(false)
	const [presenterId, setPresenterId] = useState<string | null>(null)

	// ─── Recording state ────────────────────────────────────────
	const [isRecording, setIsRecording] = useState(false)
	const [recordingStatus, setRecordingStatus] = useState<string>("RECORDING_STOPPED")
	const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null)
	const [isLocalRecording, setIsLocalRecording] = useState(false)
	const [localRecordingStartedAt, setLocalRecordingStartedAt] = useState<number | null>(null)
	const [isAnyoneRecording, setIsAnyoneRecording] = useState(false)
	const [recordingParticipantName, setRecordingParticipantName] = useState<string | null>(null)
	const [recordingStopped, setRecordingStopped] = useState(false)
	const [stoppedElapsed, setStoppedElapsed] = useState<string | null>(null)

	// ─── Recording consent state ────────────────────────────────
	const [recordingConsentRequest, setRecordingConsentRequest] =
		useState<RecordingConsentRequest | null>(null)
	const [recordingConsentOpen, setRecordingConsentOpen] = useState(false)
	const [recordingConsentAcceptedIds, setRecordingConsentAcceptedIds] = useState<Set<string>>(
		() => new Set()
	)
	const [recordingConsentDeclined, setRecordingConsentDeclined] = useState(false)

	// ─── Refs ───────────────────────────────────────────────────
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const localStreamRef = useRef<MediaStream | null>(null)
	const recordingContainerRef = useRef<HTMLDivElement>(null)
	const docCardsRef = useRef<DocumentCardsHandle>(null)

	const localRecordingSupported =
		(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia) ||
		(typeof HTMLDivElement !== "undefined" &&
			typeof (HTMLDivElement.prototype as { captureStream?: unknown })?.captureStream ===
				"function")

	// ─── UI state ───────────────────────────────────────────────
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
	const [showDocuments, setShowDocuments] = useState(true)
	const [isPreparingUpload, setIsPreparingUpload] = useState(false)
	const [flyTrigger, setFlyTrigger] = useState(false)
	const [flyOrigin, setFlyOrigin] = useState({ x: 0, y: 0 })
	const [flyTarget, setFlyTarget] = useState({ x: 0, y: 0 })

	// ─── Signing state ──────────────────────────────────────────
	const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null)
	const [isPlottingAction, setIsPlottingAction] = useState(false)
	const isPlottingActionRef = useRef(false)
	const plotPopupDocumentIdRef = useRef<string | null>(null)
	const [plotConfirmDocumentId, setPlotConfirmDocumentId] = useState<string | null>(null)
	const [isConfirmingPlot, setIsConfirmingPlot] = useState(false)
	const [userConfirmedPlottedDocumentIds, setUserConfirmedPlottedDocumentIds] = useState<
		Set<string>
	>(new Set())
	const openingPlatformToastIdRef = useRef<string | number | null>(null)
	const openingSignedDocumentToastIdRef = useRef<string | number | null>(null)

	// ─── Pre-generated links ────────────────────────────────────
	const [preGeneratedPlotLinks, setPreGeneratedPlotLinks] = useState<
		Map<string, PreGeneratedLinkEntry>
	>(new Map())
	const [preGeneratedSignLinks, setPreGeneratedSignLinks] = useState<
		Map<string, PreGeneratedLinkEntry>
	>(new Map())

	// Proactively clear stale links
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
	}, [])

	const [downloadingProjectUuid, setDownloadingProjectUuid] = useState<string | null>(null)
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

	// ─── tRPC queries ────────────────────────────────────────────
	const {
		data: documents,
		refetch: refetchDocuments,
		isFetching: isDocumentsFetching,
	} = trpc.meetings.getMeetingDocuments.useQuery(meetingId ?? "", {
		enabled: !!meetingId,
		refetchInterval: 10000,
		staleTime: 5000,
	})

	const utils = trpc.useUtils()

	const [signingStatusPollingPausedUntil, setSigningStatusPollingPausedUntil] = useState<
		number | null
	>(null)
	const [isRefreshingSigningStatus, setIsRefreshingSigningStatus] = useState(false)
	const hasShownSigningStatusAuthErrorRef = useRef(false)
	const hasShownSigningStatusFetchErrorRef = useRef(false)

	const performSigningStatusRefresh = useCallback(async (_force = false) => {
		// External signing status polling is disabled while the signing integration is rebuilt.
		return
	}, [])

	const refreshSigningStatuses = useCallback(async () => {
		if (!showDocuments) return
		if (typeof document !== "undefined" && document.visibilityState === "hidden") return
		if (signingStatusPollingPausedUntil && Date.now() < signingStatusPollingPausedUntil) return
		await performSigningStatusRefresh(false)
	}, [showDocuments, signingStatusPollingPausedUntil, performSigningStatusRefresh])

	const manualRefreshSigningStatuses = useCallback(async () => {
		setSigningStatusPollingPausedUntil(null)
		hasShownSigningStatusAuthErrorRef.current = false
		hasShownSigningStatusFetchErrorRef.current = false
		await performSigningStatusRefresh(true)
	}, [performSigningStatusRefresh])

	useEffect(() => {
		if (!showDocuments) return
		if (!documents || documents.length === 0) return

		void refreshSigningStatuses()
		const interval = setInterval(() => {
			void refreshSigningStatuses()
		}, 5000)
		return () => clearInterval(interval)
	}, [documents, refreshSigningStatuses, showDocuments])

	const queryId = meetingId?.trim() ?? ""
	const { data: meetingDetails, refetch: refetchMeetingDetails } = trpc.meetings.getById.useQuery(
		queryId,
		{
			enabled: !!meetingId?.trim(),
			retry: false,
			refetchInterval: 15000,
			staleTime: 8000,
		}
	)

	const { data: notarizationDetails } = trpc.meetings.getMeetingNotarizationDetails.useQuery(
		{ meetingId: meetingId ?? "" },
		{ enabled: !!meetingId?.trim() }
	)
	const isDocumentChangesLocked = meetingDetails?.isDocumentOrderLocked ?? false
	const isUploadBlockedByLock = isMeetingLockActionBlocked("uploadAdd", isDocumentChangesLocked)

	const { refetch: ensureDoconchainToken, isFetching: isEnsuringDoconchainToken } =
		trpc.meetings.ensureDocoChainToken.useQuery(
			{ meetingId: meetingId ?? "" },
			{ enabled: false, retry: false }
		)

	// ─── Mutations ───────────────────────────────────────────────

	const toggleLockMutation = trpc.meetings.toggleDocumentOrderLock.useMutation({
		onSuccess: () => {
			void refetchMeetingDetails()
			toast.success(
				meetingDetails?.isDocumentOrderLocked
					? "Document changes unlocked"
					: "Document changes locked"
			)
		},
		onError: error => {
			toast.error(error.message || "Failed to toggle document lock")
		},
	})

	const setAllowPublicLinkMutation = trpc.meetings.setAllowPublicLink.useMutation({
		onSuccess: (_, variables) => {
			void refetchMeetingDetails()
			toast.success(variables.allow ? "Join link enabled" : "Join link disabled")
		},
		onError: error => toast.error(error.message ?? "Failed to update"),
	})

	const inviteWitnessByEmailMutation = trpc.meetings.inviteWitnessByEmail.useMutation({
		onSuccess: (result, variables) => {
			void refetchMeetingDetails()
			if (result.created) toast.success("Invite sent")
			else
				toast.message(
					result.status === "PENDING" ? "Invite already sent" : "Already in meeting"
				)
		},
		onError: error => toast.error(error.message ?? "Failed to invite"),
	})

	const setDocumentSignersMutation = trpc.meetings.setDocumentSigners.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
		},
		onError: error => {
			toast.error(error.message === MEETING_LOCK_API_MESSAGE ? MEETING_LOCK_API_MESSAGE : "Failed to update signers")
		},
	})

	const markDocumentPlottedMutation = trpc.meetings.markDocumentPlotted.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
			void refetchDocuments()
		},
		onError: error => {
			toast.error(error.message ?? "Failed to mark document as plotted")
		},
	})

	const createDocoChainProjectMutation = {
		mutate: (_input: { documentId: string; meetingId: string }) => {
			toast.error(
				"Project creation is temporarily unavailable while we rebuild the signing integration."
			)
		},
		isPending: false,
	}

	const docoChainTokenReady = true
	const docoChainTokenLoading = false

	const handleSignersChange = useCallback(
		(
			documentId: string,
			userIds: string[],
			roles: Record<string, "principal" | "witness">
		) => {
			if (!meetingId) return
			setDocumentSignersMutation.mutate({
				documentId,
				meetingId,
				signers: userIds.map(userId => ({
					userId,
					role: roles[userId] ?? "principal",
				})),
			})
		},
		[meetingId, setDocumentSignersMutation]
	)

	const updateDocumentOrder = trpc.meetings.updateDocumentOrder.useMutation({
		onSuccess: () => {
			void refetchDocuments()
		},
		onError: error => {
			const errorMessage =
				error instanceof Error
					? error.message
					: typeof error === "object" && error !== null && "message" in error
						? String(error.message)
						: "Failed to update document order"
			toast.error(errorMessage === MEETING_LOCK_API_MESSAGE ? MEETING_LOCK_API_MESSAGE : errorMessage)
		},
	})

	const handleViewNotarizedDocument = useCallback(
		async (projectUuid: string) => {
			if (!projectUuid?.trim()) return
			const toastId = toast.loading("Opening notarized document…")
			try {
				setDownloadingProjectUuid(projectUuid)
				const status = await utils.signatureRequests.checkSigningStatus.fetch({ projectUuid })
				const statusUpper = String(status?.projectStatus ?? "").toUpperCase()
				const isCompleted = statusUpper === "COMPLETED" || (status?.completedAt ?? null) !== null
				if (!isCompleted) {
					toast.error("Signed document is still processing. Please try again in a moment.")
					return
				}
				await new Promise(resolve => setTimeout(resolve, SEALED_DOCUMENT_SETTLE_DELAY_MS))
				const url = `/api/doconchain/projects/${encodeURIComponent(projectUuid)}/signed`
				const opened = window.open(url, "_blank", "noopener,noreferrer")
				if (!opened) {
					toast.error("Popup blocked. Please allow popups for this site and try again.")
					return
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : "Failed to fetch notarized document."
				toast.error(msg)
			} finally {
				toast.dismiss(toastId)
				setDownloadingProjectUuid(null)
			}
		},
		[utils.signatureRequests.checkSigningStatus]
	)

	const generateSigningLink = trpc.signatureRequests.generateSigningLink.useMutation({
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

	const markSignedForCurrentUser = trpc.signatureRequests.markSignedForCurrentUser.useMutation({
		onSuccess: () => {
			const id = meetingId?.trim()
			if (id) {
				void utils.meetings.getMeetingNotarizationDetails.invalidate({ meetingId: id })
				void utils.signatureRequests.getPendingRequests.invalidate({ meetingId: id })
			}
			void refetchDocuments()
		},
		onError: error => {
			console.warn("Failed to mark signed for current user:", error)
		},
	})

	const initiateSigning = trpc.signatureRequests.initiateSigning.useMutation({
		onMutate: variables => {
			if (openingPlatformToastIdRef.current !== null) {
				toast.dismiss(openingPlatformToastIdRef.current)
				openingPlatformToastIdRef.current = null
			}
			if (variables.isPlotting === true) {
				openingPlatformToastIdRef.current = toast.loading("Opening plotting platform…")
			}
		},
		onError: error => {
			console.error("❌ Failed to initiate signing:", error)
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
		async (projectUuid: string | null, email: string, documentId: string, isPlotting?: boolean) => {
			if (!projectUuid) {
				toast.error("DocOnChain project not found. Please create the project first.")
				return
			}
			if (!email) {
				toast.error("User email not found. Please sign in again.")
				return
			}

			const kind = isPlotting === true ? "plot" : "sign"
			const existingSign = preGeneratedSignLinks.get(documentId)

			const nowMs = Date.now()
			const requestId = `${kind}-click-${documentId}-${nowMs.toString(36)}-${Math.random()
				.toString(16)
				.slice(2, 8)}`

			// Plot MUST always use a freshly generated link. Only Sign links can be cached briefly.
			const isCachedSignLinkUsable =
				kind === "sign" &&
				!!existingSign?.link &&
				existingSign.projectUuid === projectUuid &&
				typeof existingSign.storedAt === "number" &&
				nowMs - existingSign.storedAt <= PRE_GENERATED_LINK_MAX_AGE_MS

			if (kind === "sign" && existingSign && !isCachedSignLinkUsable) {
				setPreGeneratedSignLinks(prev => {
					if (!prev.has(documentId)) return prev
					const next = new Map(prev)
					next.delete(documentId)
					return next
				})
			}

			const linkFromCache = isCachedSignLinkUsable ? existingSign?.link : undefined

			setSigningDocumentId(documentId)
			setIsPlottingAction(kind === "plot")
			isPlottingActionRef.current = kind === "plot"

			try {
				const data = linkFromCache
					? { projectUuid, link: linkFromCache, kind }
					: await initiateSigning.mutateAsync({
							projectUuid,
							documentId,
							email,
							isPlotting: kind === "plot",
							requestId,
						})

				console.log(
					"🟣 [DocOnChain] initiateSigning response (redacted)",
					sanitizeDoconchainPayloadForLog(data)
				)

				let link = extractDoconchainLink(data)
				if (!link && kind === "sign") {
					const fallback = await generateSigningLink.mutateAsync({ projectUuid, email })
					console.log(
						"🟣 [DocOnChain] generateSigningLink response (redacted)",
						sanitizeDoconchainPayloadForLog(fallback)
					)
					link = extractDoconchainLink(fallback)
				}
				if (!link) throw new Error("Missing DocOnChain link.")

				if (kind === "sign") {
					setPreGeneratedSignLinks(prev => {
						const next = new Map(prev)
						next.set(documentId, { link, projectUuid, storedAt: Date.now() })
						return next
					})
				}

				if (openingPlatformToastIdRef.current !== null) {
					toast.dismiss(openingPlatformToastIdRef.current)
					openingPlatformToastIdRef.current = null
				}

				if (kind === "plot") {
					// Always open the freshly-generated DocOnChain plot link (includes token params).
					const popup = openCenteredPopup(link, `doconchain-plot-${documentId}`, "signing")
					plotPopupDocumentIdRef.current = documentId
					if (!popup) {
						toast.info("If nothing opened, allow pop-ups for this site and try again.")
						return
					}
					const interval = window.setInterval(() => {
						if (popup.closed) {
							window.clearInterval(interval)
							// Consume any pre-generated plot link so the next click always fetches fresh.
							setPreGeneratedPlotLinks(prev => {
								if (!prev.has(documentId)) return prev
								const next = new Map(prev)
								next.delete(documentId)
								return next
							})
							if (plotPopupDocumentIdRef.current === documentId) {
								plotPopupDocumentIdRef.current = null
								setPlotConfirmDocumentId(documentId)
							}
						}
					}, 800)
				} else {
					const popup = openCenteredPopup(link, `doconchain-sign-${documentId}`, "signing")
					if (!popup) {
						window.open(link, "_blank", "noopener,noreferrer")
						return
					}
					const startedAt = Date.now()
					const interval = window.setInterval(() => {
						if (popup.closed) {
							window.clearInterval(interval)
							if (!meetingId) return
							const elapsedMs = Date.now() - startedAt
							if (elapsedMs < 1500) return
							markSignedForCurrentUser.mutate({ meetingId, documentId })
							void refetchDocuments()
						}
					}, 800)
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: typeof error === "object" && error !== null && "message" in error
							? String((error as { message?: unknown }).message)
							: "Failed to open signing platform"
				toast.error(errorMessage)
			} finally {
				setSigningDocumentId(null)
				setIsPlottingAction(false)
				isPlottingActionRef.current = false
			}
		},
		[
			generateSigningLink,
			initiateSigning,
			meetingId,
			markDocumentPlottedMutation,
			manualRefreshSigningStatuses,
			preGeneratedPlotLinks,
			preGeneratedSignLinks,
			refetchDocuments,
			setPreGeneratedPlotLinks,
			setPreGeneratedSignLinks,
		]
	)

	const plotConfirmDocumentName = useMemo(() => {
		if (!plotConfirmDocumentId) return null
		const doc = (documents ?? []).find(d => d.id === plotConfirmDocumentId)
		return doc?.name ?? null
	}, [documents, plotConfirmDocumentId])

	const handleConfirmPlotDone = useCallback(async () => {
		const documentId = plotConfirmDocumentId
		const mId = meetingId
		if (!documentId || !mId) {
			setPlotConfirmDocumentId(null)
			return
		}
		setIsConfirmingPlot(true)
		try {
			await markDocumentPlottedMutation.mutateAsync({ meetingId: mId, documentId })
			setUserConfirmedPlottedDocumentIds(prev => new Set(prev).add(documentId))
			void refetchDocuments().then(() => {
				void manualRefreshSigningStatuses()
			})
			toast.success("Document marked as plotted. Signing can now begin.")
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Failed to mark document as plotted."
			toast.error(msg)
		} finally {
			setIsConfirmingPlot(false)
			setPlotConfirmDocumentId(null)
		}
	}, [
		manualRefreshSigningStatuses,
		markDocumentPlottedMutation,
		meetingId,
		plotConfirmDocumentId,
		refetchDocuments,
	])

	// ─── VideoSDK meeting hooks ──────────────────────────────────

	const [participantVersion, setParticipantVersion] = useState(0)

	const meeting = useMeeting({
		onMeetingJoined: () => {
			setJoined(true)
			setParticipantVersion(v => v + 1)
		},
		onMeetingLeft: () => {
			setJoined(false)
			setIsAnyoneRecording(false)
			setRecordingParticipantName(null)
			setRecordingStopped(false)
			setStoppedElapsed(null)
			setLocalRecordingStartedAt(null)
			if (onLeave) onLeave()
		},
		onParticipantJoined: () => {
			setParticipantVersion(v => v + 1)
		},
		onParticipantLeft: () => {
			setParticipantVersion(v => v + 1)
		},
		onPresenterChanged: id => {
			setPresenterId(id ?? null)
		},
		onRecordingStateChanged: (data: { status: string }) => {
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

	const { publish: publishRecordingStatus } = usePubSub("LOCAL_RECORDING_STATUS", {
		onMessageReceived: (message: { message: string; senderName: string }) => {
			if (message.message.startsWith("RECORDING_STARTED")) {
				setRecordingStopped(false)
				setStoppedElapsed(null)
				setIsAnyoneRecording(true)
				setRecordingParticipantName(message.senderName)
				const parts = message.message.split(":")
				if (parts[1]) {
					const startTime = parseInt(parts[1], 10)
					if (!isNaN(startTime)) setLocalRecordingStartedAt(startTime)
				}
			} else if (message.message.startsWith("RECORDING_STOPPED")) {
				setIsAnyoneRecording(false)
				setLocalRecordingStartedAt(null)
				const elapsed = message.message.split(":").slice(1).join(":") || null
				setRecordingStopped(true)
				setStoppedElapsed(elapsed)
				setTimeout(() => {
					setRecordingStopped(false)
					setStoppedElapsed(null)
					setRecordingParticipantName(null)
				}, 5000)
			}
		},
	})

	const { localParticipant } = useMeeting()
	const localParticipantId = localParticipant?.id ?? null

	const participants = meeting?.participants as
		| Map<
				string,
				{
					displayName?: string
					webcamOn?: boolean
					local?: boolean
					screenShareOn?: boolean
					mode?: string
					quality?: string
				}
		  >
		| null
		| undefined

	const { participantIds, participantCount } = useMemo(() => {
		if (!participants || participants.size === 0) return { participantIds: [], participantCount: 0 }

		const filterHuman = (
			id: string,
			participant: { displayName?: string; mode?: string } | null | undefined
		) => {
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

		const normalizeName = (name: string | undefined) =>
			(name ?? "").trim().toLowerCase() || "unknown"

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

		for (const [id, participant] of participants.entries()) {
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
				(participantIsPresenting && !currentIsPresenting) ||
				(!participantIsPresenting && currentIsPresenting
					? false
					: !!participant?.webcamOn && !current?.participant?.webcamOn) ||
				(participant?.local &&
					!current?.participant?.local &&
					participant?.webcamOn === current?.participant?.webcamOn &&
					participantIsPresenting === currentIsPresenting)

			if (shouldReplace) uniqueByName.set(key, { id, participant })
		}

		const ids = Array.from(uniqueByName.values())
			.sort((a, b) => {
				const aPresenting = Boolean(a.participant?.screenShareOn)
				const bPresenting = Boolean(b.participant?.screenShareOn)
				if (aPresenting && !bPresenting) return -1
				if (!aPresenting && bPresenting) return 1
				if (a.participant?.local && !b.participant?.local) return -1
				if (!a.participant?.local && b.participant?.local) return 1
				return 0
			})
			.map(entry => entry.id)

		return { participantIds: ids, participantCount: ids.length }
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [participants, participantVersion])

	// ─── Recording consent helpers ───────────────────────────────

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
				const [requestId, participantId, , decision] = rest
				if (!requestId || !participantId || !decision) return
				setRecordingConsentRequest(current => {
					if (current?.id !== requestId) return current
					if (decision === "DECLINE") {
						setRecordingConsentDeclined(true)
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
			const meetingWithRecording = meeting as unknown as {
				startRecording?: () => Promise<void> | void
			}
			const recordingResult = meetingWithRecording.startRecording?.()
			if (recordingResult !== undefined && recordingResult instanceof Promise) {
				await recordingResult
			}
			setIsLocalRecording(true)
			setIsAnyoneRecording(true)
			setLocalRecordingStartedAt(startedAt)
			setRecordingParticipantName(session?.user?.name ?? "Someone")
			setRecordingStopped(false)
			setStoppedElapsed(null)
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
			if (stopResult !== undefined && stopResult instanceof Promise) await stopResult

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
					layout: { type: "GRID", priority: "SPEAKER", gridSize: 4, participants: ["*"] },
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
		if (isLocalRecording) {
			void stopLocalRecording()
			return
		}
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

	useEffect(() => {
		if (!recordingConsentRequest || !localParticipantId) return
		const requiredIds = recordingConsentRequest.requiredParticipantIds
		if (!requiredIds || requiredIds.length === 0) return
		const allAccepted = requiredIds.every(id => recordingConsentAcceptedIds.has(id))
		if (allAccepted) {
			const isInitiator =
				recordingConsentRequest.initiatorName === (session?.user?.name ?? "Someone")
			if (isInitiator) void startLocalRecording()
			setRecordingConsentOpen(false)
			resetRecordingConsentUi()
		}
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

	const handleUploadClick = useCallback(async () => {
		if (!meetingId?.trim()) {
			toast.error("Meeting not ready yet. Please try again.")
			return
		}
		if (isUploadBlockedByLock) {
			toast.error(MEETING_LOCK_API_MESSAGE)
			return
		}
		setIsPreparingUpload(true)
		try {
			const result = await ensureDoconchainToken()
			if (result.data?.ready) {
				setIsUploadDialogOpen(true)
				return
			}
			toast.error("DocOnChain is still preparing. Please try again in a moment.")
		} catch (error) {
			const msg =
				error instanceof Error ? error.message : "Failed to prepare DocOnChain. Please try again."
			toast.error(msg)
		} finally {
			setIsPreparingUpload(false)
		}
	}, [ensureDoconchainToken, isUploadBlockedByLock, meetingId])

	// ─── Loading screen ──────────────────────────────────────────

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

	// ─── Render ──────────────────────────────────────────────────

	return (
		<div
			ref={recordingContainerRef}
			className="from-background via-muted/20 to-background flex h-screen flex-col bg-linear-to-br"
		>
			{/* Header */}
			<PageHeader
				items={[{ label: "Sessions", href: "/sessions" }, { label: "Signing Session" }]}
			/>

			{/* <FileFlightAnimation
				trigger={flyTrigger}
				onComplete={() => setFlyTrigger(false)}
				originX={flyOrigin.x}
				originY={flyOrigin.y}
				targetX={flyTarget.x}
				targetY={flyTarget.y}
			/> */}

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
					isEnp={session?.user?.role === "ENP"}
					onUploadStart={(x, y) => {
						const target = docCardsRef.current?.getSidebarTarget()
						if (target) setFlyTarget(target)
						setFlyOrigin({ x, y })
						setFlyTrigger(true)
					}}
				/>
			)}

			{/* Plot Signature confirm dialog */}
			<Dialog
				open={!!plotConfirmDocumentId}
				onOpenChange={open => {
					if (!open && !isConfirmingPlot) setPlotConfirmDocumentId(null)
				}}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Confirm signature plotting</DialogTitle>
						<DialogDescription>
							Did you finish plotting signatures for{" "}
							<strong>{plotConfirmDocumentName ?? "this document"}</strong>?
							<br />
							Only confirm if you actually placed the required signature fields in DocOnChain.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:justify-end">
						<Button
							variant="outline"
							disabled={isConfirmingPlot}
							onClick={() => setPlotConfirmDocumentId(null)}
						>
							Not yet
						</Button>
						<Button disabled={isConfirmingPlot} onClick={() => void handleConfirmPlotDone()}>
							{isConfirmingPlot ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Marking…
								</>
							) : (
								"Yes, I plotted"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Main content — video area + right sidebar */}
			<div className="flex flex-1 overflow-hidden">
				{/* Video area */}
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
								<div className="grid h-full w-full auto-rows-[minmax(260px,1fr)] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 sm:gap-5">
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

					<div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
						<MeetingControls
							onUploadClick={handleUploadClick}
							isUploadDisabled={!meetingId?.trim() || isUploadBlockedByLock}
							isUploadLoading={isPreparingUpload || isEnsuringDoconchainToken}
							uploadDisabledReason={
								isUploadBlockedByLock
									? "Can't upload a file while document changes are locked"
									: undefined
							}
							onRecordingToggle={handleRecordingToggle}
							onLocalRecordingToggle={openConsentAndRequest}
							localRecordingSupported={localRecordingSupported}
							isRecording={isRecording}
							isRecordingStarting={recordingStatus === "RECORDING_STARTING"}
							isLocalRecording={isLocalRecording}
							localRecordingStartedAt={localRecordingStartedAt}
							participantCount={participantCount}
							onInviteClick={
								meetingDetails?.createdBy?.id === session?.user?.id
									? () => setIsInviteDialogOpen(true)
									: undefined
							}
						/>
					</div>
				</div>

				{/* Documents right sidebar */}
				{documents && documents.length > 0 && (
					<DocumentCards
						ref={docCardsRef}
						meetingId={meetingId}
						documents={documents}
						showDocuments={showDocuments}
						onToggleShowDocuments={() => setShowDocuments(!showDocuments)}
						isDocumentsFetching={isDocumentsFetching}
						isRefreshingSigningStatus={isRefreshingSigningStatus}
						documentSigningStatus={documentSigningStatus}
						meetingDetails={meetingDetails}
						notarizationDetails={notarizationDetails}
						signingDocumentId={signingDocumentId}
						isPlottingAction={isPlottingAction}
						downloadingProjectUuid={downloadingProjectUuid}
						preGeneratedPlotLinks={preGeneratedPlotLinks}
						preGeneratedSignLinks={preGeneratedSignLinks}
						userConfirmedPlottedDocumentIds={userConfirmedPlottedDocumentIds}
						docoChainTokenReady={docoChainTokenReady}
						docoChainTokenLoading={docoChainTokenLoading}
						onSignClick={handleSignClick}
						onSignersChange={handleSignersChange}
						onCreateProject={(documentId, mId) => {
							createDocoChainProjectMutation.mutate({ documentId, meetingId: mId })
						}}
						isCreatingProject={createDocoChainProjectMutation.isPending}
						onPreGeneratedLink={(documentId, link, projectUuid, kind, cleanPlotUrl) => {
							const setMap = kind === "plot" ? setPreGeneratedPlotLinks : setPreGeneratedSignLinks
							setMap(prev => {
								const next = new Map(prev)
								next.set(documentId, {
									link,
									projectUuid,
									storedAt: Date.now(),
									cleanPlotUrl: kind === "plot" ? cleanPlotUrl : undefined,
								})
								return next
							})
						}}
						onViewNotarizedDocument={handleViewNotarizedDocument}
						onRefresh={async () => {
							await refetchDocuments()
							await manualRefreshSigningStatuses()
						}}
						onToggleLock={isLocked => {
							if (meetingId) toggleLockMutation.mutate({ meetingId, isLocked })
						}}
						isTogglingLock={toggleLockMutation.isPending}
						onUpdateDocumentOrder={documentIds => {
							if (meetingId) updateDocumentOrder.mutate({ meetingId, documentIds })
						}}
					/>
				)}
			</div>

			{/* Recording Consent Dialog */}
			<Dialog
				open={recordingConsentOpen}
				onOpenChange={open => {
					if (!open && recordingConsentRequest && !recordingConsentDeclined) declineConsent()
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
							}}
						>
							Agree
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Invite to meeting (host only) */}
			{meetingId && (
				<MeetingInviteDialog
					open={isInviteDialogOpen}
					onOpenChange={setIsInviteDialogOpen}
					meetingId={meetingId}
					allowPublicLink={meetingDetails?.allowPublicLink ?? false}
					onSetAllowPublicLink={allow =>
						setAllowPublicLinkMutation.mutate({ meetingId, allow })
					}
					isSettingAllowPublicLink={setAllowPublicLinkMutation.isPending}
					onInviteByEmail={email =>
						inviteWitnessByEmailMutation.mutate(
							{ meetingId, email },
							{ onSuccess: () => void refetchMeetingDetails() }
						)
					}
					isInviting={inviteWitnessByEmailMutation.isPending}
					onSuccess={() => void refetchMeetingDetails()}
				/>
			)}
		</div>
	)
}
