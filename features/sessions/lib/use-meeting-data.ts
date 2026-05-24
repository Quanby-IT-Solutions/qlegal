"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"

import {
	isMeetingLockActionBlocked,
	MEETING_LOCK_API_MESSAGE,
} from "@/features/sessions/lib/meeting-lock-contract"

interface UseMeetingDataParams {
	meetingId?: string
	session: { user?: { id?: string; role?: string | null } } | null | undefined
}

export function useMeetingData({ meetingId }: UseMeetingDataParams) {
	const [isPreparingUpload, setIsPreparingUpload] = useState(false)
	const debugLogsEnabled = process.env.NODE_ENV !== "production"

	const {
		data: documents,
		refetch: refetchDocuments,
		isFetching: isDocumentsFetching,
	} = trpc.meetings.getMeetingDocuments.useQuery(meetingId ?? "", {
		enabled: !!meetingId,
		refetchInterval: 10000,
		staleTime: 5000,
	})

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

	const { refetch: ensureDoconchainToken, isFetching: isEnsuringDoconchainToken } =
		trpc.meetings.ensureDocoChainToken.useQuery(
			{ meetingId: meetingId ?? "" },
			{ enabled: false, retry: false }
		)

	const utils = trpc.useUtils()

	const toggleLockMutation = trpc.meetings.toggleDocumentOrderLock.useMutation({
		onSuccess: () => {
			void refetchMeetingDetails()
			toast.success(
				meetingDetails?.isDocumentOrderLocked
					? "Document uploads unlocked"
					: "Document uploads locked"
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
		onSuccess: result => {
			void refetchMeetingDetails()
			if (result.created) toast.success("Invite sent")
			else toast.message(result.status === "PENDING" ? "Invite already sent" : "Already in meeting")
		},
		onError: error => toast.error(error.message ?? "Failed to invite"),
	})

	const setDocumentSignersMutation = trpc.meetings.setDocumentSigners.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
		},
		onError: error => {
			toast.error(
				error.message === MEETING_LOCK_API_MESSAGE
					? MEETING_LOCK_API_MESSAGE
					: "Failed to update signers"
			)
		},
	})

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
			toast.error(
				errorMessage === MEETING_LOCK_API_MESSAGE ? MEETING_LOCK_API_MESSAGE : errorMessage
			)
		},
	})

	const createDocoChainProjectMutation = trpc.meetings.createDocoChainProject.useMutation({
		onSuccess: () => {
			toast.success("DocOnChain project created")
			void utils.meetings.getMeetingDocuments.invalidate(meetingId ?? "")
		},
		onError: error => {
			toast.error(error.message ?? "Failed to create DocOnChain project")
		},
	})

	const handleSignersChange = useCallback(
		(documentId: string, userIds: string[], roles: Record<string, "principal" | "witness">) => {
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

	const isDocumentChangesLocked = meetingDetails?.isDocumentOrderLocked ?? false
	const isUploadBlockedByLock = isMeetingLockActionBlocked("uploadAdd", isDocumentChangesLocked)

	const docoChainTokenReady = true
	const docoChainTokenLoading = false

	const handleUploadClick = useCallback(async () => {
		const startMs = performance.now()
		if (debugLogsEnabled) {
			console.log("[sessions][upload] click", {
				meetingId: meetingId ?? null,
				isUploadBlockedByLock,
				isDocumentChangesLocked,
			})
		}
		if (!meetingId?.trim()) {
			toast.error("Meeting not ready yet. Please try again.")
			if (debugLogsEnabled) {
				console.log("[sessions][upload] blocked: meetingId not ready", {
					meetingId: meetingId ?? null,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}
		if (isUploadBlockedByLock) {
			toast.error(MEETING_LOCK_API_MESSAGE)
			if (debugLogsEnabled) {
				console.log("[sessions][upload] blocked: meeting locked", {
					meetingId,
					totalMs: Math.round(performance.now() - startMs),
				})
			}
			return
		}
		// IMPORTANT: Do not block opening the upload dialog on DocOnChain prep.
		// Uploading to QSign should remain responsive; DocOnChain can be prepared in the background.
		void (async () => {
			setIsPreparingUpload(true)
			const ensureStartMs = performance.now()
			if (debugLogsEnabled) {
				console.log("[sessions][upload] ensureDocoChainToken start (background)", { meetingId })
			}
			try {
				const result = await ensureDoconchainToken()
				if (debugLogsEnabled) {
					console.log("[sessions][upload] ensureDocoChainToken end (background)", {
						meetingId,
						ready: result.data?.ready ?? null,
						ensureMs: Math.round(performance.now() - ensureStartMs),
					})
				}
				if (result.data?.ready) return
				toast.error(
					"DocOnChain is still preparing. You can upload now, and retry project creation later."
				)
			} catch (error) {
				const msg =
					error instanceof Error
						? error.message
						: "Failed to prepare DocOnChain. You can upload now, and retry project creation later."
				if (debugLogsEnabled) {
					console.log("[sessions][upload] ensureDocoChainToken error (background)", {
						meetingId: meetingId ?? null,
						message: msg,
						ensureMs: Math.round(performance.now() - ensureStartMs),
					})
				}
			} finally {
				setIsPreparingUpload(false)
				if (debugLogsEnabled) {
					console.log("[sessions][upload] ensureDocoChainToken done (background)", {
						meetingId: meetingId ?? null,
						ensureMs: Math.round(performance.now() - ensureStartMs),
						totalMs: Math.round(performance.now() - startMs),
					})
				}
			}
		})()

		if (debugLogsEnabled) {
			console.log("[sessions][upload] open dialog immediately", {
				meetingId,
				totalMs: Math.round(performance.now() - startMs),
			})
		}
		return true
	}, [
		debugLogsEnabled,
		ensureDoconchainToken,
		isDocumentChangesLocked,
		isUploadBlockedByLock,
		meetingId,
	])

	return {
		documents,
		refetchDocuments,
		isDocumentsFetching,
		meetingDetails,
		refetchMeetingDetails,
		notarizationDetails,
		isDocumentChangesLocked,
		isUploadBlockedByLock,
		docoChainTokenReady,
		docoChainTokenLoading,
		isPreparingUpload,
		ensureDoconchainToken,
		isEnsuringDoconchainToken,
		handleUploadClick,
		handleSignersChange,
		toggleLockMutation,
		setAllowPublicLinkMutation,
		inviteWitnessByEmailMutation,
		updateDocumentOrder,
		createDocoChainProjectMutation,
	}
}
