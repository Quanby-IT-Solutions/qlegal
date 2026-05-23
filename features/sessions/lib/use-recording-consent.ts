"use client"

import { useCallback, useEffect, useState } from "react"
import { usePubSub } from "@videosdk.live/react-sdk"
import { toast } from "sonner"

import type { RecordingConsentRequest } from "@/features/sessions/lib/utils"

interface UseRecordingConsentParams {
	localParticipantId: string | null
	session: { user?: { name?: string | null } } | null | undefined
	participantIds: string[]
	startLocalRecording: () => Promise<void>
	stopLocalRecording: () => Promise<void>
	isLocalRecording: boolean
}

export function useRecordingConsent({
	localParticipantId,
	session,
	participantIds,
	startLocalRecording,
	stopLocalRecording,
	isLocalRecording,
}: UseRecordingConsentParams) {
	const [recordingConsentRequest, setRecordingConsentRequest] =
		useState<RecordingConsentRequest | null>(null)
	const [recordingConsentOpen, setRecordingConsentOpen] = useState(false)
	const [recordingConsentAcceptedIds, setRecordingConsentAcceptedIds] = useState<Set<string>>(
		() => new Set()
	)
	const [recordingConsentDeclined, setRecordingConsentDeclined] = useState(false)

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

	return {
		recordingConsentOpen,
		setRecordingConsentOpen,
		recordingConsentRequest,
		recordingConsentAcceptedIds,
		recordingConsentDeclined,
		openConsentAndRequest,
		acceptConsent,
		declineConsent,
		closeConsentAsInitiator,
	}
}
