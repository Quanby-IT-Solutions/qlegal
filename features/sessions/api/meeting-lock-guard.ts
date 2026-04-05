import { TRPCError } from "@trpc/server"

import { MEETING_LOCK_API_MESSAGE } from "@/features/sessions/lib/meeting-lock-contract"

export type MeetingLockState = { isDocumentOrderLocked: boolean }

export const DOCUMENT_LOCK_GUARDED_MUTATIONS = [
	"uploadDocument",
] as const

export function assertMeetingUnlockedForDocumentMutations(meeting: MeetingLockState): void {
	if (!meeting.isDocumentOrderLocked) return
	throw new TRPCError({
		code: "FORBIDDEN",
		message: MEETING_LOCK_API_MESSAGE,
	})
}
