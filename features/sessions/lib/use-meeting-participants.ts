"use client"

import { useMemo, useState } from "react"
import { useMeeting } from "@videosdk.live/react-sdk"

interface UseMeetingParticipantsParams {
	onLeave?: () => void
}

export function useMeetingParticipants({ onLeave }: UseMeetingParticipantsParams) {
	const [joined, setJoined] = useState(false)
	const [presenterId, setPresenterId] = useState<string | null>(null)
	const [participantVersion, setParticipantVersion] = useState(0)

	const meeting = useMeeting({
		onMeetingJoined: () => {
			setJoined(true)
			setParticipantVersion(v => v + 1)
		},
		onMeetingLeft: () => {
			setJoined(false)
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
	})

	const localParticipantId = meeting?.localParticipant?.id ?? null

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

	return { joined, presenterId, participantIds, participantCount, localParticipantId }
}
