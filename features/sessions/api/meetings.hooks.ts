"use client"

import { trpc } from "@/services/trpc/client"

export function useMeetings() {
	const utils = trpc.useUtils()

	const create = trpc.meetings.create.useMutation({
		onSuccess: () => {
			void utils.meetings.getUserMeetings.invalidate()
			void utils.meetings.getUserMeetingsWithDocumentStats.invalidate()
		},
	})

	const getUserMeetings = () =>
		trpc.meetings.getUserMeetings.useQuery(undefined, {
			refetchInterval: 3000, // Poll every 3 seconds for real-time updates
		})

	const getById = (id: string) =>
		trpc.meetings.getById.useQuery(id, {
			enabled: !!id && !!id.trim(),
			retry: false,
		})

	const getToken = (id: string) =>
		trpc.meetings.getToken.useQuery(id, {
			enabled: !!id && !!id.trim(),
			retry: false,
		})

	const startMeeting = trpc.meetings.startMeeting.useMutation({
		onSuccess: () => {
			void utils.meetings.getUserMeetings.invalidate()
			void utils.meetings.getUserMeetingsWithDocumentStats.invalidate()
			// Also invalidate signing sessions so dashboard updates when meeting goes ONGOING
			void utils.dashboard.getSigningSessions.invalidate()
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
			void utils.meetings.getUserMeetingsWithDocumentStats.invalidate()
		},
	})

	const uploadDocument = trpc.meetings.uploadDocument.useMutation({
		onSuccess: () => {
			void utils.meetings.getMeetingDocuments.invalidate()
		},
	})

	const getMeetingDocuments = (meetingId: string) =>
		trpc.meetings.getMeetingDocuments.useQuery(meetingId, {
			enabled: !!meetingId,
		})

	const inviteWitnessByEmail = trpc.meetings.inviteWitnessByEmail.useMutation({
		onSuccess: async (_data, variables) => {
			// Update both the meeting list + the specific meeting view
			await utils.meetings.getUserMeetings.invalidate()
			await utils.meetings.getById.invalidate(variables.meetingId)
		},
	})

	const respondToInvite = trpc.meetings.respondToInvite.useMutation({
		onSuccess: async (_data, variables) => {
			await utils.meetings.getUserMeetings.invalidate()
			await utils.meetings.getById.invalidate(variables.meetingId)
			await utils.dashboard.getRecentMeetings.invalidate()
			await utils.dashboard.getMeetingInvites.invalidate()
		},
	})

	const setAllowPublicLink = trpc.meetings.setAllowPublicLink.useMutation({
		onSuccess: async (_data, variables) => {
			await utils.meetings.getById.invalidate(variables.meetingId)
		},
	})

	const joinMeetingByLink = trpc.meetings.joinMeetingByLink.useMutation()

	return {
		create,
		getUserMeetings,
		getById,
		getToken,
		startMeeting,
		endMeeting,
		deleteMeeting,
		uploadDocument,
		getMeetingDocuments,
		inviteWitnessByEmail,
		respondToInvite,
		setAllowPublicLink,
		joinMeetingByLink,
	}
}
