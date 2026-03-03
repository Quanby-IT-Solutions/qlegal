export const MEETING_LOCK_CONTRACT_VERSION = "2026-03-02"

export const MEETING_LOCK_API_MESSAGE =
	"Document uploads are locked for this meeting. Unlock to add documents."

export const MEETING_LOCK_BADGE_LABEL = "Locked"

export const MEETING_LOCK_ACTIONS = {
	reorder: { blockedWhileLocked: false },
	uploadAdd: { blockedWhileLocked: true },
	signerChanges: { blockedWhileLocked: false },
	projectCreation: { blockedWhileLocked: false },
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
	return isLocked ? "Unlock document uploads" : "Lock document uploads"
}

export function getDocumentReorderTitle(): string {
	return "Drag to reorder"
}

export function getSignerEditLockedMessage(): string {
	return "Signer edits remain available while uploads are locked"
}

export function getProjectCreationLockedMessage(): string {
	return "Project creation remains available while uploads are locked"
}
