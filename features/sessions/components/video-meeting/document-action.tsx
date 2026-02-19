"use client"

import { trpc } from "@/services/trpc/client";
import { UsersIcon, FileText, FileSignature } from "lucide-react";
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SignerList } from "./signer-list";
import { SignerManagementModal } from "./signer-management-modal";
import { Button } from "@/core/components/ui/button";


export const DocumentActions = React.memo(function DocumentActions({
  document,
  onSignClick,
  onSignersChange,
  isSigningPending,
  isPlottingAction = false,
  isLocked,
  isPreviousDocumentSigned,
  documentIndex,
  signers,
  participants,
  signerUserIds,
  meetingId,
  onCreateProject,
  isCreatingProject,
  docoChainTokenReady = true,
  docoChainTokenLoading = false,
  onPreGeneratedLink,
  plotLinkReady = true,
  userConfirmedPlottedDocumentIds,
}: {
  document: { id: string; name: string; docoChainProjectId: string | null }
  onSignClick: (
    projectUuid: string | null,
    email: string,
    documentId: string,
    isPlotting?: boolean
  ) => void
  onSignersChange?: (documentId: string, userIds: string[]) => void
  isSigningPending: boolean
  /** True when current pending action is Plot Signature (not Sign Document). */
  isPlottingAction?: boolean
  isLocked?: boolean
  isPreviousDocumentSigned?: boolean
  documentIndex?: number
  signers?: Array<{
    id: number
    email: string
    firstName: string
    lastName: string
    status: string
    signedAt: string | null
    sequence: number
    signerRole: string
  }>
  participants?: Array<{
    userId: string
    user: { id: string; name: string | null; email: string | null; role?: string | null } | null
  }>
  signerUserIds?: string[]
  meetingId?: string
  onCreateProject?: (documentId: string, meetingId: string) => void
  isCreatingProject?: boolean
  /** Gate Create Project until we have a fresh DocoChain token. Default true so button stays enabled when not used. */
  docoChainTokenReady?: boolean
  /** Show "Preparing…" on Create Project while token is loading. */
  docoChainTokenLoading?: boolean
  onPreGeneratedLink?: (
    documentId: string,
    link: string,
    projectUuid: string,
    kind: "plot" | "sign"
  ) => void
  /** When "Plot Signature", button stays loading until this is true (pre-generated link ready). */
  plotLinkReady?: boolean
  /** Document IDs for which user confirmed "Yes, I'm done" after closing plot popup – disable Plot for these. */
  userConfirmedPlottedDocumentIds?: Set<string>
}) {
  const { data: session } = useSession()

  // Helper function to check if a signer has signed (case-insensitive)
  const isSignerSigned = (signer: { status: string; signedAt: string | null }): boolean => {
    const statusUpper = signer.status?.toUpperCase() ?? ""
    const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
    const hasSignedAt =
      signer.signedAt !== null && signer.signedAt !== undefined && signer.signedAt !== ""
    return hasSignedStatus || hasSignedAt
  }

  // Filter signers to only show those selected in the database (signerUserIds)
  // Get participant emails for selected signers
  const selectedSignerEmails = new Set<string>()
  if (signerUserIds && participants) {
    for (const userId of signerUserIds) {
      const participant = participants.find(p => p.userId === userId)
      if (participant?.user?.email) {
        selectedSignerEmails.add(participant.user.email.toLowerCase())
      }
    }
  }

  // Filter signers to only include those in the selected list
  const filteredSigners =
    signers?.filter(signer => selectedSignerEmails.has(signer.email?.toLowerCase() ?? "")) ?? []

  // Check if all signers have signed
  const allSignersSigned =
    filteredSigners && filteredSigners.length > 0 && filteredSigners.every(isSignerSigned)

  // Determine button state based on current user's signer status
  const currentUserEmail = session?.user?.email ?? null
  const currentUserSigner = currentUserEmail
    ? filteredSigners.find(s => s.email?.toLowerCase() === currentUserEmail.toLowerCase())
    : null
  const isUserAddedAsSigner = !!currentUserSigner

  // Check if user has completed signing (status SIGNED/COMPLETED or signedAt is set)
  const hasUserSigned = currentUserSigner
    ? isSignerSigned({
        status: currentUserSigner.status,
        signedAt: currentUserSigner.signedAt,
      })
    : false

  // Check signer status to determine if they've plotted but not signed
  // Statuses: PENDING, NEXT GROUP (not plotted), or other statuses might indicate plotted
  const signerStatus = (currentUserSigner?.status ?? "").toUpperCase()
  const isPendingOrNextGroup = signerStatus === "PENDING" || signerStatus === "NEXT GROUP"
  const isEnp = session?.user?.role === "ENP"
  const isPrincipal = session?.user?.role === "PRINCIPAL"

  // Determine if signer is "Current" (it's their turn to sign)
  const currentUserId = session?.user?.id ?? null
  const currentSignerIndex = filteredSigners.findIndex(s => !isSignerSigned(s))
  const currentSigner = currentSignerIndex >= 0 ? filteredSigners[currentSignerIndex] : null
  const isCurrentSigner = currentSigner?.email?.toLowerCase() === currentUserEmail?.toLowerCase()
  const currentUserIndexInOrder = currentUserId ? (signerUserIds?.indexOf(currentUserId) ?? -1) : -1

  // Plotting vs signing phase (separate buttons, no shared logic)
  const hasPlotted = !isPendingOrNextGroup && !hasUserSigned
  const isPlottingPhase = isEnp && !!document.docoChainProjectId && !hasPlotted && !hasUserSigned
  // Only the first signer (index 0) waits for ENP to plot. Signers 2, 3, ... (e.g. witness) do not
  // see "Waiting for ENP to plot" — they see "Previous signer(s) must sign first" until it's their turn.
  const isPrincipalWaitingForEnpToPlot =
    isPrincipal &&
    isUserAddedAsSigner &&
    isPendingOrNextGroup &&
    currentUserIndexInOrder === 0

  // Both buttons visible when applicable. Disable by phase so the wrong link is never used.
  // Plot Signature: ENP only, project exists, not signed. Hide entirely after ENP confirms "Yes, I'm done".
  const showPlotSignature =
    isEnp &&
    !!document.docoChainProjectId &&
    !hasUserSigned &&
    !allSignersSigned &&
    !(userConfirmedPlottedDocumentIds?.has(document.id) ?? false)
  // Sign Document: project exists, not all signed, user not yet signed, user is signer or ENP. Uses Sign link only.
  const showSignDocument =
    !!document.docoChainProjectId &&
    !hasUserSigned &&
    !allSignersSigned &&
    (isEnp || isUserAddedAsSigner)

  // Check if previous signers (by signing order) have signed
  // signerUserIds array is ordered by signingOrder (index 0 = order 1, index 1 = order 2, etc.)
  // currentUserIndexInOrder was already calculated above in getButtonText logic
  const currentUserIndex =
    currentUserIndexInOrder >= 0
      ? currentUserIndexInOrder
      : currentUserId
        ? (signerUserIds?.indexOf(currentUserId) ?? -1)
        : -1
  const previousSignersHaveSigned = useMemo(() => {
    if (currentUserIndex <= 0 || !signerUserIds || !participants || !filteredSigners) return true

    // Get all signers before current user (by order)
    const previousUserIds = signerUserIds.slice(0, currentUserIndex)

    // Get emails of previous signers
    const previousSignerEmails = new Set<string>()
    for (const userId of previousUserIds) {
      const participant = participants.find(p => p.userId === userId)
      if (participant?.user?.email) {
        previousSignerEmails.add(participant.user.email.toLowerCase())
      }
    }

    // Check if all previous signers have signed
    const previousSigners = filteredSigners.filter(s =>
      previousSignerEmails.has(s.email?.toLowerCase() ?? "")
    )

    return (
      previousSigners.length === previousSignerEmails.size && previousSigners.every(isSignerSigned)
    )
  }, [currentUserIndex, signerUserIds, participants, filteredSigners, isSignerSigned])

  // Determine if Start Signing button should be disabled
  const isSigningDisabledByOrder = isLocked && !isPreviousDocumentSigned && (documentIndex ?? 0) > 0
  const hasNoSignersSelected = !document.docoChainProjectId && (signerUserIds?.length ?? 0) === 0
  const hasSigners = (signerUserIds?.length ?? 0) > 0
  const isCurrentUserSigner =
    currentUserId !== null && (signerUserIds?.includes(currentUserId) ?? false)
  const userNotInSignerList = hasSigners && !isCurrentUserSigner
  // "Previous signer must sign first" applies to Sign Document only (never to Plot Signature)
  const isSigningDisabledByPreviousSigners =
    showSignDocument && currentUserIndex > 0 && !previousSignersHaveSigned

  // Plot pre-gen retry / give-up: avoid stuck "Preparing..." when pre-gen fails or after close-without-plot + refresh
  const [plotPreGenGiveUp, setPlotPreGenGiveUp] = useState(false)
  const [plotPreGenRetryTrigger, setPlotPreGenRetryTrigger] = useState(0)
  const plotPreGenRetryCountRef = useRef(0)
  const preGenKeyRef = useRef<string | null>(null)

  // Disable Plot Signature: pending, (no link and we haven't given up pre-gen), already plotted, or user confirmed "Yes, I'm done".
  const isPlotSignatureDisabled =
    !!isSigningPending ||
    (!plotLinkReady && !plotPreGenGiveUp) ||
    hasPlotted ||
    (userConfirmedPlottedDocumentIds?.has(document.id) ?? false)

  // ENP in plotting phase = disable Sign Document. After "Yes, I'm done" it's signing time; don't disable for that.
  const enpMustPlotFirst =
    isEnp && isPlottingPhase && !(userConfirmedPlottedDocumentIds?.has(document.id) ?? false)

  // Disable Sign Document: order, no signers, not a signer, waiting for ENP, ENP must plot first, previous signers.
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing -- boolean OR chains, not nullish default */
  const isStartSigningDisabled =
    !!isSigningPending ||
    hasUserSigned ||
    allSignersSigned ||
    isSigningDisabledByOrder ||
    hasNoSignersSelected ||
    userNotInSignerList ||
    isPrincipalWaitingForEnpToPlot ||
    enpMustPlotFirst ||
    isSigningDisabledByPreviousSigners

  const showSigningMessage =
    !document.docoChainProjectId ||
    hasUserSigned ||
    allSignersSigned ||
    isSigningDisabledByOrder ||
    hasNoSignersSelected ||
    userNotInSignerList ||
    isPrincipalWaitingForEnpToPlot ||
    enpMustPlotFirst ||
    isSigningDisabledByPreviousSigners ||
    (showPlotSignature && isPlotSignatureDisabled) ||
    (showSignDocument && isStartSigningDisabled)
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  const handleSignersChange = useCallback(
    (userIds: string[]) => {
      if (onSignersChange && meetingId) onSignersChange(document.id, userIds)
    },
    [onSignersChange, meetingId, document.id]
  )

  const [isSignerModalOpen, setIsSignerModalOpen] = useState(false)
  const userEmail = session?.user?.email

  const isPlotButtonAvailableForPreGen =
    showPlotSignature &&
    !hasPlotted &&
    !isSigningPending &&
    !!document.docoChainProjectId &&
    !!userEmail
  const isSignButtonAvailableForPreGen =
    showSignDocument && !isStartSigningDisabled && !!document.docoChainProjectId && !!userEmail

  // "Preparing..." only while waiting for pre-gen, haven't given up, and not already plotted/confirmed
  const isPlotSignatureWaiting =
    showPlotSignature &&
    !hasPlotted &&
    !(userConfirmedPlottedDocumentIds?.has(document.id) ?? false) &&
    !plotLinkReady &&
    !plotPreGenGiveUp

  const preGenerationInitiatedRef = useRef<string | null>(null)
  const hadPlotLinkRef = useRef(false)

  // When link is consumed (user opened popup then closed without plotting), we delete it.
  // Clear ref and reset give-up/retries so we pre-gen again.
  useEffect(() => {
    const hasLink = plotLinkReady === true
    const hadLink = hadPlotLinkRef.current
    hadPlotLinkRef.current = hasLink
    if (hadLink && !hasLink) {
      preGenerationInitiatedRef.current = null
      plotPreGenRetryCountRef.current = 0
      preGenKeyRef.current = null
      setPlotPreGenGiveUp(false)
    }
  }, [plotLinkReady])

  const plotPreGenKey = `plot-${document.id}-${document.docoChainProjectId}`
  const preGeneratePlotLinkMutation = trpc.signatureRequests.initiateSigning.useMutation({
    onSuccess: data => {
      if (data.link && data.projectUuid && onPreGeneratedLink) {
        onPreGeneratedLink(document.id, data.link, data.projectUuid, "plot")
      }
      preGenerationInitiatedRef.current = null
      plotPreGenRetryCountRef.current = 0
      preGenKeyRef.current = null
      setPlotPreGenGiveUp(false)
    },
    onError: () => {
      preGenerationInitiatedRef.current = null
      plotPreGenRetryCountRef.current += 1
      if (plotPreGenRetryCountRef.current >= 3) {
        setPlotPreGenGiveUp(true)
        toast.info("You can still click Plot Signature – the link will be generated when you do.")
        return
      }
      setTimeout(() => setPlotPreGenRetryTrigger(r => r + 1), 2000)
    },
  })

  const preGenerateSignLinkMutation = trpc.signatureRequests.initiateSigning.useMutation({
    onSuccess: data => {
      if (data.link && data.projectUuid && onPreGeneratedLink) {
        onPreGeneratedLink(document.id, data.link, data.projectUuid, "sign")
      }
      preGenerationInitiatedRef.current = null
    },
    onError: () => {
      preGenerationInitiatedRef.current = null
    },
  })

  // Pre-generate Edit Draft Link when Plot button is shown. Retry on failure; give up after 3 attempts.
  useEffect(() => {
    const key = plotPreGenKey
    if (
      !isPlotButtonAvailableForPreGen ||
      !document.docoChainProjectId ||
      !userEmail ||
      plotPreGenGiveUp ||
      preGenerationInitiatedRef.current === key ||
      preGeneratePlotLinkMutation.isPending
    )
      return

    // Reset retries and give-up when key changes (e.g. different doc)
    if (preGenKeyRef.current !== key) {
      preGenKeyRef.current = key
      plotPreGenRetryCountRef.current = 0
      setPlotPreGenGiveUp(false)
    }

    const retries = plotPreGenRetryCountRef.current
    if (retries >= 3) {
      setPlotPreGenGiveUp(true)
      return
    }

    console.log(
      `🔵 Pre-generating Edit Draft Link for Plot Signature${retries > 0 ? ` (retry ${retries})` : ""}...`
    )
    preGenerationInitiatedRef.current = key
    preGeneratePlotLinkMutation.mutate({
      projectUuid: document.docoChainProjectId,
      email: userEmail,
      isPlotting: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPlotButtonAvailableForPreGen,
    document.docoChainProjectId,
    document.id,
    userEmail,
    plotLinkReady,
    plotPreGenGiveUp,
    plotPreGenRetryTrigger,
    plotPreGenKey,
  ])

  // Pre-generate Sign Link only when Start Signing button is shown (never for Plot Signature)
  useEffect(() => {
    const key = `sign-${document.id}-${document.docoChainProjectId}`
    if (
      isSignButtonAvailableForPreGen &&
      document.docoChainProjectId &&
      userEmail &&
      preGenerationInitiatedRef.current !== key &&
      !preGenerateSignLinkMutation.isPending
    ) {
      console.log("🔵 Pre-generating Sign Link for Start Signing...")
      preGenerationInitiatedRef.current = key
      preGenerateSignLinkMutation.mutate({
        projectUuid: document.docoChainProjectId,
        email: userEmail,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSignButtonAvailableForPreGen,
    document.docoChainProjectId,
    document.id,
    userEmail,
    plotLinkReady,
  ])

  // Show selected signers count
  const selectedSignersCount = signerUserIds?.length ?? 0

  return (
    <div className="space-y-2">
      {/* Before project exists: show signer button and count. After: show DocoChain signer list */}
      {document.docoChainProjectId && filteredSigners && filteredSigners.length > 0 ? (
        <SignerList signers={filteredSigners} />
      ) : (
        participants &&
        participants.length > 0 &&
        meetingId &&
        onSignersChange &&
        !isPrincipal && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-full text-xs shadow-sm"
              onClick={() => setIsSignerModalOpen(true)}
            >
              <UsersIcon className="mr-1.5 size-3.5" />
              {selectedSignersCount > 0 ? `Signers (${selectedSignersCount})` : "Add Signers"}
            </Button>
            <SignerManagementModal
              participants={participants}
              signerUserIds={signerUserIds ?? []}
              onSignersChange={handleSignersChange}
              isOpen={isSignerModalOpen}
              onOpenChange={setIsSignerModalOpen}
            />
          </>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-primary hover:text-primary-foreground h-9 w-full text-xs shadow-sm transition-all"
        onClick={() => {
          // Open document in new tab
          window.open(`/api/documents/${document.id}`, "_blank")
        }}
      >
        <FileText className="mr-1.5 size-3.5" />
        View Document
      </Button>

      {/* Show "Create Project" button if signers are set but project doesn't exist */}
      {!document.docoChainProjectId && hasSigners && meetingId && onCreateProject && (
        <Button
          variant="default"
          size="sm"
          className="h-9 w-full text-xs shadow-sm"
          onClick={() => {
            if (meetingId) {
              onCreateProject(document.id, meetingId)
            }
          }}
          disabled={!docoChainTokenReady || isCreatingProject}
        >
          {isCreatingProject ? (
            <>
              <div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating...
            </>
          ) : docoChainTokenLoading ? (
            <>
              <div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Preparing...
            </>
          ) : (
            <>
              <FileSignature className="mr-1.5 size-3.5" />
              Create Project
            </>
          )}
        </Button>
      )}

      {/* Plot Signature (ENP only, Edit Draft link) and Sign Document (Sign link) – both visible, disabled by phase */}
      <div className="space-y-1.5">
        {/* Plot Signature: ENP only, plotting phase. Always isPlotting=true → Edit Draft link only. */}
        {showPlotSignature && (
          <Button
            variant="default"
            size="sm"
            className="h-9 w-full text-xs shadow-sm"
            onClick={() => {
              const email = session?.user?.email
              if (email) {
                onSignClick(document.docoChainProjectId ?? null, email, document.id, true)
              } else {
                toast.error("User email not found. Please sign in again.")
              }
            }}
            disabled={isPlotSignatureDisabled}
          >
            {/* After "Yes, I'm done" always show "Plot Signature" (disabled), never Preparing/Plotting */}
            {(userConfirmedPlottedDocumentIds?.has(document.id) ?? false) ? (
              <>
                <FileSignature className="mr-1.5 size-3.5" />
                Plot Signature
              </>
            ) : isPlotSignatureWaiting || (isSigningPending && isPlottingAction) ? (
              <>
                <div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {isPlotSignatureWaiting ? "Preparing..." : "Plotting..."}
              </>
            ) : (
              <>
                <FileSignature className="mr-1.5 size-3.5" />
                Plot Signature
              </>
            )}
          </Button>
        )}
        {/* Sign Document: always isPlotting=false → Sign link only. Disabled when plotting phase. */}
        {showSignDocument && (
          <Button
            variant="default"
            size="sm"
            className="h-9 w-full text-xs shadow-sm"
            onClick={() => {
              const email = session?.user?.email
              if (email) {
                onSignClick(document.docoChainProjectId ?? null, email, document.id, false)
              } else {
                toast.error("User email not found. Please sign in again.")
              }
            }}
            disabled={isStartSigningDisabled}
          >
            {isSigningPending && !isPlottingAction ? (
              <>
                <div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Signing...
              </>
            ) : (
              <>
                <FileSignature className="mr-1.5 size-3.5" />
                Sign Document
              </>
            )}
          </Button>
        )}
        {/* Disabled-state message */}
        {showSigningMessage && (
          <p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
            {!document.docoChainProjectId
              ? "Add signer first after setting signers"
              : hasUserSigned
                ? "You have completed signing"
                : allSignersSigned
                  ? "All signers have completed signing"
                  : isSigningDisabledByOrder
                    ? "Previous document must be signed first"
                    : hasNoSignersSelected
                      ? "Select at least one signer for this document"
                      : userNotInSignerList
                        ? "You must be added as a signer to start signing"
                        : isPrincipalWaitingForEnpToPlot
                          ? "Waiting for ENP to plot your signature"
                          : isEnp &&
                              isPlottingPhase &&
                              showSignDocument &&
                              !(userConfirmedPlottedDocumentIds?.has(document.id) ?? false)
                            ? "Please plot your signature first"
                            : isSigningDisabledByPreviousSigners
                              ? "Previous signer(s) must sign first"
                              : ""}
          </p>
        )}
      </div>
    </div>
  )
})
