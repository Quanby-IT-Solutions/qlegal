"use client"

import { trpc } from "@/services/trpc/client"

export function useMeetings() {
	const utils = trpc.useUtils()

	const create = trpc.meetings.create.useMutation({
		onSuccess: () => {
			void utils.meetings.getUserMeetings.invalidate()
		},
	})

	const getUserMeetings = trpc.meetings.getUserMeetings.useQuery

	const getById = (id: string) =>
		trpc.meetings.getById.useQuery(id, {
			enabled: !!id,
		})

	const getToken = (id: string) =>
		trpc.meetings.getToken.useQuery(id, {
			enabled: !!id,
		})

	const startMeeting = trpc.meetings.startMeeting.useMutation({
		onSuccess: () => {
			void utils.meetings.getUserMeetings.invalidate()
		},
	})

	const endMeeting = trpc.meetings.endMeeting.useMutation({
		onSuccess: () => {
			void utils.meetings.getUserMeetings.invalidate()
		},
	})

	const deleteMeeting = trpc.meetings.delete.useMutation({
		onSuccess: () => {
			void utils.meetings.getUserMeetings.invalidate()
		},
	})

	return {
		create,
		getUserMeetings,
		getById,
		getToken,
		startMeeting,
		endMeeting,
		deleteMeeting,
	}
}

