"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import {
	extractDoconchainLink,
	openCenteredPopup,
	PRE_GENERATED_LINK_MAX_AGE_MS,
	sanitizeDoconchainPayloadForLog,
	SEALED_DOCUMENT_SETTLE_DELAY_MS,
	STALE_LINK_CHECK_INTERVAL_MS,
	type PreGeneratedLinkEntry,
} from "@/features/sessions/lib/utils"

interface UseDocumentSigningParams {
	meetingId?: string
	documents:
		| Array<{
				id: string
				name: string
		  }>
		| undefined
	showDocuments: boolean
	refetchDocuments: () => Promise<unknown>
}

export function useDocumentSigning({
	meetingId,
	documents,
	showDocuments,
	refetchDocuments,
}: UseDocumentSigningParams) {
	const [signingDocumentId, setSigningDocumentId] = useState<string | null>(null)
	const [isPlottingAction, setIsPlottingAction] = useState(false)
	const [plotConfirmDocumentId, setPlotConfirmDocumentId] = useState<string | null>(null)
	const [isConfirmingPlot, setIsConfirmingPlot] = useState(false)
	const [userConfirmedPlottedDocumentIds, setUserConfirmedPlottedDocumentIds] = useState<
		Set<string>
	>(new Set())
	const [preGeneratedPlotLinks, setPreGeneratedPlotLinks] = useState<Map<string, PreGeneratedLinkEntry>>(
		new Map()
	)
	const [preGeneratedSignLinks, setPreGeneratedSignLinks] = useState<Map<string, PreGeneratedLinkEntry>>(
		new Map()
	)
	const [downloadingProjectUuid, setDownloadingProjectUuid] = useState<string | null>(null)
	const [documentSigningStatus] = useState<
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

	const isPlottingActionRef = useRef(false)
	const plotPopupDocumentIdRef = useRef<string | null>(null)
	const openingPlatformToastIdRef = useRef<string | number | null>(null)
	const utils = trpc.useUtils()

	const [signingStatusPollingPausedUntil, setSigningStatusPollingPausedUntil] = useState<number | null>(
		null
	)
	const [isRefreshingSigningStatus, setIsRefreshingSigningStatus] = useState(false)
	const hasShownSigningStatusAuthErrorRef = useRef(false)
	const hasShownSigningStatusFetchErrorRef = useRef(false)

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

	const performSigningStatusRefresh = useCallback(async (_force = false) => {
		setIsRefreshingSigningStatus(false)
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

	const markDocumentPlottedMutation = trpc.meetings.markDocumentPlotted.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
			void refetchDocuments()
		},
		onError: error => {
			toast.error(error.message ?? "Failed to mark document as plotted")
		},
	})

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
			// request identifier retained for parity with existing telemetry flow
			const requestId = `${kind}-click-${documentId}-${nowMs.toString(36)}-${Math.random()
				.toString(16)
				.slice(2, 8)}`
			void requestId

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

			const popupWindowName =
				kind === "plot" ? `doconchain-plot-${documentId}` : `doconchain-sign-${documentId}`
			let eagerPopup: Window | null = null
			if (typeof window !== "undefined") {
				const ua = window.navigator?.userAgent ?? ""
				const isIOS =
					/iP(hone|od|ad)/i.test(ua) ||
					(typeof navigator !== "undefined" &&
						navigator.platform === "MacIntel" &&
						(navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints &&
						(navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1)
				if (isIOS && kind === "plot") {
					try {
						eagerPopup = openCenteredPopup("about:blank", popupWindowName, "signing")
					} catch {
						eagerPopup = null
					}
				}
			}

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
					const popup =
						eagerPopup && !eagerPopup.closed
							? eagerPopup
							: openCenteredPopup(link, `doconchain-plot-${documentId}`, "signing")
					plotPopupDocumentIdRef.current = documentId
					if (!popup) {
						toast.info("If nothing opened, allow pop-ups for this site and try again.")
						return
					}
					if (popup === eagerPopup) {
						try {
							popup.location.href = link
						} catch {
							// no-op
						}
					}
					const interval = window.setInterval(() => {
						if (popup.closed) {
							window.clearInterval(interval)
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
					const popup =
						eagerPopup && !eagerPopup.closed
							? eagerPopup
							: openCenteredPopup(link, `doconchain-sign-${documentId}`, "signing")
					if (!popup) {
						window.open(link, "_blank", "noopener,noreferrer")
						return
					}
					if (popup === eagerPopup) {
						try {
							popup.location.href = link
						} catch {
							// no-op
						}
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
			preGeneratedSignLinks,
			refetchDocuments,
			markSignedForCurrentUser,
		]
	)

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

	const plotConfirmDocumentName = useMemo(() => {
		if (!plotConfirmDocumentId) return null
		const doc = (documents ?? []).find(d => d.id === plotConfirmDocumentId)
		return doc?.name ?? null
	}, [documents, plotConfirmDocumentId])

	const onPreGeneratedLink = useCallback(
		(
			documentId: string,
			link: string,
			projectUuid: string,
			kind: "plot" | "sign",
			cleanPlotUrl?: string
		) => {
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
		},
		[]
	)

	return {
		signingDocumentId,
		isPlottingAction,
		plotConfirmDocumentId,
		plotConfirmDocumentName,
		isConfirmingPlot,
		userConfirmedPlottedDocumentIds,
		preGeneratedPlotLinks,
		preGeneratedSignLinks,
		downloadingProjectUuid,
		documentSigningStatus,
		isRefreshingSigningStatus,
		handleSignClick,
		handleConfirmPlotDone,
		handleViewNotarizedDocument,
		onPreGeneratedLink,
		setPlotConfirmDocumentId,
		manualRefreshSigningStatuses,
	}
}
