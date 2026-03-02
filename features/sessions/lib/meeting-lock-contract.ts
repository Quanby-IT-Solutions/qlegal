export const MEETING_LOCK_CONTRACT_VERSION = "2026-02-27"

export const MEETING_LOCK_API_MESSAGE =
	"Document changes are locked for this meeting. Unlock to upload documents, reorder documents, or edit signers."

export const MEETING_LOCK_BADGE_LABEL = "Locked"

export const MEETING_LOCK_HELPER_TEXT =
	"Locked: upload, reorder, signer edits, and project creation are blocked. Signing can continue in the current order."

export const MEETING_LOCK_ACTIONS = {
	reorder: { blockedWhileLocked: true },
	uploadAdd: { blockedWhileLocked: true },
	signerChanges: { blockedWhileLocked: true },
	projectCreation: { blockedWhileLocked: true },
	signingProgression: { blockedWhileLocked: false },
} as const

export function isMeetingLockActionBlocked(
	action: keyof typeof MEETING_LOCK_ACTIONS,
	isLocked: boolean
): boolean {
	if (!isLocked) return false
	return MEETING_LOCK_ACTIONS[action].blockedWhileLocked
}

export function getMeetingLockToggleLabel(isLocked: boolean): string {
	return isLocked ? "Unlock document changes" : "Lock document changes"
}

export function getDocumentReorderTitle(isLocked: boolean): string {
	return isLocked ? "Document changes are locked" : "Drag to reorder"
}

export function getSignerEditLockedMessage(): string {
	return "Unlock document changes to edit signers"
}

export function getProjectCreationLockedMessage(): string {
	return "Unlock document changes to create a project"
}
