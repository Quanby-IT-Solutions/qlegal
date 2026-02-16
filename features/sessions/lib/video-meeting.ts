export interface VideoMeetingClientProps {
	meetingId: string
	dbMeetingId?: string
	token: string
	participantName: string
	onLeave?: () => void
}

export interface MeetingControlsProps {
	onUploadClick?: () => void
	onRecordingToggle?: () => Promise<void> | void
	onLocalRecordingToggle?: () => Promise<void> | void
	localRecordingSupported?: boolean
	isRecording?: boolean
	isRecordingStarting?: boolean
	isLocalRecording?: boolean
	localRecordingStartedAt?: number | null
}

export interface ParticipantViewProps {
	participantId: string
}

export interface RecordingBannerProps {
	isLocalRecording: boolean
	localRecordingStartedAt: number | null
	isAnyoneRecording?: boolean
	recordingParticipantName?: string | null
	recordingStopped?: boolean
	stoppedElapsed?: string | null
}

export interface RecordingConsentRequest {
	id: string
	createdAt: number
	initiatorName: string
	requiredParticipantIds: string[]
}

export interface SignerManagementModalProps {
	participants: Array<{
		userId: string
		user: { id: string; name: string | null; email: string | null; role?: string | null } | null
	}>
	signerUserIds: string[]
	onSignersChange: (userIds: string[]) => void
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export interface SignerSelectorProps {
	participants: Array<{
		userId: string
		user: { id: string; name: string | null; email: string | null; role?: string | null } | null
	}>
	signerUserIds: string[]
	onSignersChange: (userIds: string[]) => void
}

export interface MeetingViewProps {
	onLeave?: () => void
	meetingId?: string
}
