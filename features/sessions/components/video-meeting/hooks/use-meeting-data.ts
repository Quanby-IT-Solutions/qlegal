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

	const createDocoChainProjectMutation = {
		mutate: (_input: { documentId: string; meetingId: string }) => {
			toast.error(
				"Project creation is temporarily unavailable while we rebuild the signing integration."
			)
		},
		isPending: false,
	}

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
				return true
			}
			toast.error("DocOnChain is still preparing. Please try again in a moment.")
			return false
		} catch (error) {
			const msg =
				error instanceof Error ? error.message : "Failed to prepare DocOnChain. Please try again."
			toast.error(msg)
			return false
		} finally {
			setIsPreparingUpload(false)
		}
	}, [ensureDoconchainToken, isUploadBlockedByLock, meetingId])

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
