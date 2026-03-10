"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useMeeting } from "@videosdk.live/react-sdk"
import { useSession } from "next-auth/react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { SidebarInset } from "@/core/components/ui/sidebar"

import { useDocumentSigning } from "../../lib/use-document-signing"
import { useMeetingData } from "../../lib/use-meeting-data"
import { useMeetingParticipants } from "../../lib/use-meeting-participants"
import { useRecording } from "../../lib/use-recording"
import { useRecordingConsent } from "../../lib/use-recording-consent"
import { MeetingDocumentUpload } from "../meeting-document-upload"
import { PlotConfirmDialog } from "./dialogs/plot-confirm-dialog"
import { RecordingConsentDialog } from "./dialogs/recording-consent-dialog"
import { MeetingControls } from "./meeting-controls"
import { MeetingInviteDialog } from "./meeting-invite-dialog"
import { MeetingParticipantGrid } from "./meeting-participant-grid"
import { RecordingBanner } from "./recording-banner"
import { DocumentCards, type DocumentCardsHandle } from "./side-panel/document/document-cards"
import { MeetingSidePanelControls } from "./side-panel/meeting-side-panel-controls"

export function MeetingView({ onLeave, meetingId }: { onLeave?: () => void; meetingId?: string }) {
	const { data: session } = useSession()

	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
	const [sidePanel, setSidePanel] = useState<"documents" | "chat" | null>(null)
	const showDocuments = sidePanel === "documents"

	const recordingContainerRef = useRef<HTMLDivElement>(null)
	const docCardsRef = useRef<DocumentCardsHandle>(null)

	const { joined, presenterId, participantIds, participantCount, localParticipantId } =
		useMeetingParticipants({ onLeave })
	const meeting = useMeeting()

	const recording = useRecording({ meeting, session, onLeave })
	const meetingData = useMeetingData({ meetingId, session })
	const documentSigning = useDocumentSigning({
		meetingId,
		documents: meetingData.documents,
		showDocuments,
		refetchDocuments: meetingData.refetchDocuments,
	})
	const recordingConsent = useRecordingConsent({
		localParticipantId,
		session,
		participantIds,
		startLocalRecording: recording.startLocalRecording,
		stopLocalRecording: recording.stopLocalRecording,
		isLocalRecording: recording.isLocalRecording,
	})

	const handleUploadClick = useCallback(async () => {
		const ready = await meetingData.handleUploadClick()
		if (ready) setIsUploadDialogOpen(true)
	}, [meetingData])

	const isConsentInitiator =
		recordingConsent.recordingConsentRequest?.initiatorName === (session?.user?.name ?? "Someone")

	const plotDialogOpen = Boolean(documentSigning.plotConfirmDocumentId)
	const plotDialogDocumentName = useMemo(() => {
		return documentSigning.plotConfirmDocumentName ?? null
	}, [documentSigning.plotConfirmDocumentName])

	if (!joined) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<div className="text-center">
					<div className="border-primary mx-auto mb-4 size-12 animate-spin rounded-full border-b-4" />
					<p className="text-muted-foreground font-medium">Joining meeting...</p>
				</div>
			</div>
		)
	}

	return (
		<div
			ref={recordingContainerRef}
			className="from-background via-muted/20 to-background flex h-screen flex-col bg-linear-to-br"
		>
			{meetingId && (
				<MeetingDocumentUpload
					meetingId={meetingId}
					isOpen={isUploadDialogOpen}
					onClose={() => setIsUploadDialogOpen(false)}
					onSuccess={() => {
						void meetingData.refetchDocuments()
						setSidePanel("documents")
					}}
					isEnp={session?.user?.role === "ENP"}
				/>
			)}

			<PlotConfirmDialog
				open={plotDialogOpen}
				onOpenChange={open => {
					if (!open && !documentSigning.isConfirmingPlot) {
						documentSigning.setPlotConfirmDocumentId(null)
					}
				}}
				documentName={plotDialogDocumentName}
				isConfirming={documentSigning.isConfirmingPlot}
				onConfirm={() => {
					void documentSigning.handleConfirmPlotDone()
				}}
			/>

			<SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<PageHeader
					items={[{ label: "Sessions", href: "/sessions" }, { label: "Signing Session" }]}
				/>
				<div className="relative flex min-h-0 flex-1 overflow-hidden">
					<div className="flex flex-1 flex-col overflow-hidden">
						<div className="flex-1 overflow-hidden px-3 pt-3 pb-1.5 md:px-4 md:pt-4 md:pb-2 lg:px-6 lg:pt-6 lg:pb-3">
							<RecordingBanner
								isLocalRecording={recording.isLocalRecording}
								localRecordingStartedAt={recording.localRecordingStartedAt}
								isAnyoneRecording={recording.isAnyoneRecording}
								recordingParticipantName={recording.recordingParticipantName}
								recordingStopped={recording.recordingStopped}
								stoppedElapsed={recording.stoppedElapsed}
							/>
							<MeetingParticipantGrid participantIds={participantIds} presenterId={presenterId} />
						</div>
					</div>

					<DocumentCards
						ref={docCardsRef}
						meetingId={meetingId}
						documents={meetingData.documents ?? []}
						sidePanel={sidePanel}
						onPanelOpenChange={open => setSidePanel(open ? (sidePanel ?? "documents") : null)}
						isDocumentsFetching={meetingData.isDocumentsFetching}
						isRefreshingSigningStatus={documentSigning.isRefreshingSigningStatus}
						documentSigningStatus={documentSigning.documentSigningStatus}
						meetingDetails={meetingData.meetingDetails}
						notarizationDetails={meetingData.notarizationDetails}
						signingDocumentId={documentSigning.signingDocumentId}
						isPlottingAction={documentSigning.isPlottingAction}
						downloadingProjectUuid={documentSigning.downloadingProjectUuid}
						preGeneratedPlotLinks={documentSigning.preGeneratedPlotLinks}
						preGeneratedSignLinks={documentSigning.preGeneratedSignLinks}
						userConfirmedPlottedDocumentIds={documentSigning.userConfirmedPlottedDocumentIds}
						docoChainTokenReady={meetingData.docoChainTokenReady}
						docoChainTokenLoading={meetingData.docoChainTokenLoading}
						onSignClick={documentSigning.handleSignClick}
						onSignersChange={meetingData.handleSignersChange}
						onCreateProject={(documentId, mId) => {
							meetingData.createDocoChainProjectMutation.mutate({
								documentId,
								meetingId: mId,
							})
						}}
						isCreatingProject={meetingData.createDocoChainProjectMutation.isPending}
						onPreGeneratedLink={documentSigning.onPreGeneratedLink}
						onViewNotarizedDocument={documentSigning.handleViewNotarizedDocument}
						onRefresh={async () => {
							await meetingData.refetchDocuments()
							await documentSigning.manualRefreshSigningStatuses()
						}}
						onToggleLock={isLocked => {
							if (meetingId) meetingData.toggleLockMutation.mutate({ meetingId, isLocked })
						}}
						isTogglingLock={meetingData.toggleLockMutation.isPending}
						onUpdateDocumentOrder={documentIds => {
							if (meetingId) meetingData.updateDocumentOrder.mutate({ meetingId, documentIds })
						}}
					/>
				</div>
				<div className="bg-background/90 relative flex flex-col items-center gap-2 px-4 py-3 backdrop-blur-sm lg:flex-row lg:justify-center lg:gap-4">
					<MeetingControls
						onUploadClick={handleUploadClick}
						isUploadDisabled={!meetingId?.trim() || meetingData.isUploadBlockedByLock}
						isUploadLoading={meetingData.isPreparingUpload || meetingData.isEnsuringDoconchainToken}
						uploadDisabledReason={
							meetingData.isUploadBlockedByLock
								? "Can't upload a file while document uploads are locked"
								: undefined
						}
						onRecordingToggle={recording.handleRecordingToggle}
						onLocalRecordingToggle={recordingConsent.openConsentAndRequest}
						localRecordingSupported={recording.localRecordingSupported}
						isRecording={recording.isRecording}
						isRecordingStarting={recording.recordingStatus === "RECORDING_STARTING"}
						isLocalRecording={recording.isLocalRecording}
						localRecordingStartedAt={recording.localRecordingStartedAt}
						participantCount={participantCount}
						canInvitePeople={meetingData.meetingDetails?.createdBy?.id === session?.user?.id}
						onInvitePeopleClick={() => setIsInviteDialogOpen(true)}
					/>
					<MeetingSidePanelControls sidePanel={sidePanel} onSidePanelChange={setSidePanel} />
				</div>
			</SidebarInset>

			<RecordingConsentDialog
				open={recordingConsent.recordingConsentOpen}
				onOpenChange={open => {
					if (
						!open &&
						recordingConsent.recordingConsentRequest &&
						!recordingConsent.recordingConsentDeclined
					) {
						recordingConsent.declineConsent()
					}
					recordingConsent.setRecordingConsentOpen(open)
				}}
				consentRequest={recordingConsent.recordingConsentRequest}
				acceptedIds={recordingConsent.recordingConsentAcceptedIds}
				declined={recordingConsent.recordingConsentDeclined}
				localParticipantId={localParticipantId}
				currentUserName={session?.user?.name ?? "Someone"}
				isInitiator={isConsentInitiator}
				onAccept={recordingConsent.acceptConsent}
				onDecline={recordingConsent.declineConsent}
				onCancel={recordingConsent.closeConsentAsInitiator}
			/>

			{meetingId && (
				<MeetingInviteDialog
					open={isInviteDialogOpen}
					onOpenChange={setIsInviteDialogOpen}
					meetingId={meetingId}
					allowPublicLink={meetingData.meetingDetails?.allowPublicLink ?? false}
					onSetAllowPublicLink={allow =>
						meetingData.setAllowPublicLinkMutation.mutate({ meetingId, allow })
					}
					isSettingAllowPublicLink={meetingData.setAllowPublicLinkMutation.isPending}
					onInviteByEmail={email =>
						meetingData.inviteWitnessByEmailMutation.mutate(
							{ meetingId, email },
							{ onSuccess: () => void meetingData.refetchMeetingDetails() }
						)
					}
					isInviting={meetingData.inviteWitnessByEmailMutation.isPending}
					onSuccess={() => void meetingData.refetchMeetingDetails()}
				/>
			)}
		</div>
	)
}
