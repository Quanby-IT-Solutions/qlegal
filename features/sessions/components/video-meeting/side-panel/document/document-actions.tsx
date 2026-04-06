"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	FileSignature,
	FileText,
	Users as UsersIcon,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import {
	AssignedSignerList,
	isSignerSigned,
	SignerList,
	type SignatureRequest,
	type Signer,
} from "./signer-list"
import { SignerManagementModal } from "./signer-management-modal"
import type { SignerParticipant } from "./signer-selector"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface DocumentActionsDocument {
	id: string
	name: string
	docoChainProjectId: string | null
	status?: string | null
}

interface DocumentActionsProps {
	document: DocumentActionsDocument
	onSignClick: (
		projectUuid: string | null,
		email: string,
		documentId: string,
		isPlotting?: boolean
	) => void
	onSignersChange?: (
		documentId: string,
		userIds: string[],
		roles: Record<string, "principal" | "witness">
	) => void
	signerRoles?: Record<string, "principal" | "witness">
	isSigningPending: boolean
	isPlottingAction?: boolean
	isLocked?: boolean
	isPreviousDocumentSigned?: boolean
	documentIndex?: number
	signers?: Signer[]
	signatureRequests?: Array<SignatureRequest & { id: string }>
	participants?: SignerParticipant[]
	signerUserIds?: string[]
	meetingId?: string
	onCreateProject?: (documentId: string, meetingId: string) => void
	isCreatingProject?: boolean
	/** Gate Create Project (ENP only). Signers do not need a token—server generates sign/plot links from their email. Default true when unused. */
	docoChainTokenReady?: boolean
	docoChainTokenLoading?: boolean
	onPreGeneratedLink?: (
		documentId: string,
		link: string,
		projectUuid: string,
		kind: "plot" | "sign",
		cleanPlotUrl?: string
	) => void
	plotLinkReady?: boolean
	userConfirmedPlottedDocumentIds?: Set<string>
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

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
	signatureRequests,
	participants,
	signerUserIds,
	signerRoles,
	meetingId,
	onCreateProject,
	isCreatingProject,
	docoChainTokenReady = true,
	docoChainTokenLoading = false,
	onPreGeneratedLink,
	plotLinkReady = true,
	userConfirmedPlottedDocumentIds,
}: DocumentActionsProps) {
	const { data: session } = useSession()

	// ─── Signer-status helpers ───────────────────────────────────

	const selectedSignerEmails = new Set<string>()
	if (signerUserIds && participants) {
		for (const userId of signerUserIds) {
			const participant = participants.find(p => p.userId === userId)
			if (participant?.user?.email) {
				selectedSignerEmails.add(participant.user.email.toLowerCase())
			}
		}
	}

	const filteredSigners =
		signers?.filter(signer => selectedSignerEmails.has(signer.email?.toLowerCase() ?? "")) ?? []

	const allSignersSigned =
		filteredSigners && filteredSigners.length > 0 && filteredSigners.every(isSignerSigned)

	const currentUserEmail = session?.user?.email ?? null
	const currentUserSigner = currentUserEmail
		? filteredSigners.find(s => s.email?.toLowerCase() === currentUserEmail.toLowerCase())
		: null
	const isUserAddedAsSigner = !!currentUserSigner

	const currentUserId = session?.user?.id ?? null
	const isSignerBySelection =
		currentUserId !== null && (signerUserIds?.includes(currentUserId) ?? false)
	const isCurrentUserSigner =
		currentUserId !== null && (signerUserIds?.includes(currentUserId) ?? false)
	const currentUserIndexInOrder = currentUserId ? (signerUserIds?.indexOf(currentUserId) ?? -1) : -1
	const currentUserIndex =
		currentUserIndexInOrder >= 0
			? currentUserIndexInOrder
			: currentUserId
				? (signerUserIds?.indexOf(currentUserId) ?? -1)
				: -1

	const externalHasUserSigned = currentUserSigner
		? isSignerSigned({ status: currentUserSigner.status, signedAt: currentUserSigner.signedAt })
		: false

	const statusBySignerId = useMemo(() => {
		const map = new Map<string, string>()
		for (const r of signatureRequests ?? []) {
			const key = (r?.signerId ?? "").trim()
			if (!key) continue
			map.set(key, String(r.status ?? "").toUpperCase())
		}
		return map
	}, [signatureRequests])

	const hasInternalSigningState = (signatureRequests?.length ?? 0) > 0
	const internalHasUserSigned =
		currentUserId !== null && currentUserId !== undefined
			? statusBySignerId.get(currentUserId) === "SIGNED"
			: false
	const internalAllSignersSigned =
		(signerUserIds?.length ?? 0) > 0 &&
		(signerUserIds ?? []).every(id => statusBySignerId.get(id) === "SIGNED")

	const internalPreviousSignersHaveSigned =
		currentUserIndex <= 0
			? true
			: (signerUserIds ?? [])
					.slice(0, currentUserIndex)
					.every(id => statusBySignerId.get(id) === "SIGNED")

	const isUsersTurnToSign =
		hasInternalSigningState &&
		isCurrentUserSigner &&
		!internalHasUserSigned &&
		!internalAllSignersSigned &&
		internalPreviousSignersHaveSigned

	const hasUserSigned = hasInternalSigningState ? internalHasUserSigned : externalHasUserSigned

	const signerStatus = (currentUserSigner?.status ?? "").toUpperCase()
	const isPendingOrNextGroup = signerStatus === "PENDING" || signerStatus === "NEXT GROUP"
	const isEnp = session?.user?.role === "ENP"
	const isPrincipal = session?.user?.role === "PRINCIPAL"

	const currentSignerIndex = filteredSigners.findIndex(s => !isSignerSigned(s))
	const currentSigner = currentSignerIndex >= 0 ? filteredSigners[currentSignerIndex] : null
	const isCurrentSigner = currentSigner?.email?.toLowerCase() === currentUserEmail?.toLowerCase()

	const enpHasConfirmedPlot =
		(userConfirmedPlottedDocumentIds?.has(document.id) ?? false) || document.status === "READY"
	const hasPlotted = isEnp
		? enpHasConfirmedPlot
		: isUserAddedAsSigner
			? !isPendingOrNextGroup && !hasUserSigned
			: false
	const isPlottingPhase = isEnp && !!document.docoChainProjectId && !enpHasConfirmedPlot
	const isPrincipalWaitingForEnpToPlot =
		isPrincipal &&
		(isSignerBySelection || isUserAddedAsSigner) &&
		currentUserIndexInOrder === 0 &&
		!enpHasConfirmedPlot

	const showPlotSignature =
		isEnp &&
		(signerUserIds?.length ?? 0) > 0 &&
		!!document.docoChainProjectId &&
		!hasUserSigned &&
		!allSignersSigned

	const showSignDocument =
		!!document.docoChainProjectId &&
		!hasUserSigned &&
		!(hasInternalSigningState ? internalAllSignersSigned : allSignersSigned) &&
		isCurrentUserSigner

	const previousSignersHaveSigned = useMemo(() => {
		if (currentUserIndex <= 0 || !signerUserIds || !participants || !filteredSigners) return true
		const previousUserIds = signerUserIds.slice(0, currentUserIndex)
		const previousSignerEmails = new Set<string>()
		for (const userId of previousUserIds) {
			const participant = participants.find(p => p.userId === userId)
			if (participant?.user?.email) {
				previousSignerEmails.add(participant.user.email.toLowerCase())
			}
		}
		const previousSigners = filteredSigners.filter(s =>
			previousSignerEmails.has(s.email?.toLowerCase() ?? "")
		)
		return (
			previousSigners.length === previousSignerEmails.size && previousSigners.every(isSignerSigned)
		)
	}, [currentUserIndex, signerUserIds, participants, filteredSigners])

	const isSigningDisabledByOrder = isLocked && !isPreviousDocumentSigned && (documentIndex ?? 0) > 0
	const isPlottingDisabledByOrder =
		isLocked && !isPreviousDocumentSigned && (documentIndex ?? 0) > 0
	const hasNoSignersSelected = !document.docoChainProjectId && (signerUserIds?.length ?? 0) === 0
	const hasSigners = (signerUserIds?.length ?? 0) > 0
	const userNotInSignerList = hasSigners && !isCurrentUserSigner
	const isSigningDisabledByPreviousSigners =
		showSignDocument &&
		currentUserIndex > 0 &&
		(hasInternalSigningState ? !internalPreviousSignersHaveSigned : true)

	// ─── Pre-gen plot link ───────────────────────────────────────

	const [plotPreGenGiveUp, setPlotPreGenGiveUp] = useState(false)
	const [plotPreGenRetryTrigger, setPlotPreGenRetryTrigger] = useState(0)
	const plotPreGenRetryCountRef = useRef(0)
	const preGenKeyRef = useRef<string | null>(null)

	const isPlotSignatureDisabled = [
		!!isSigningPending,
		isPlottingDisabledByOrder,
		hasPlotted,
		enpHasConfirmedPlot,
	].some(Boolean)

	const enpMustPlotFirst = isEnp && isPlottingPhase && !enpHasConfirmedPlot

	/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
	const isStartSigningDisabled =
		!!isSigningPending ||
		hasUserSigned ||
		(hasInternalSigningState ? internalAllSignersSigned : allSignersSigned) ||
		isSigningDisabledByOrder ||
		hasNoSignersSelected ||
		userNotInSignerList ||
		isPrincipalWaitingForEnpToPlot ||
		enpMustPlotFirst ||
		isSigningDisabledByPreviousSigners

	const showSigningMessage =
		!document.docoChainProjectId ||
		hasUserSigned ||
		(hasInternalSigningState ? internalAllSignersSigned : allSignersSigned) ||
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
		(userIds: string[], roles: Record<string, "principal" | "witness">) => {
			if (onSignersChange && meetingId) onSignersChange(document.id, userIds, roles)
		},
		[onSignersChange, meetingId, document.id]
	)

	const [isSignerModalOpen, setIsSignerModalOpen] = useState(false)
	const userEmail = session?.user?.email

	const isPlotButtonAvailableForPreGen =
		showPlotSignature &&
		!isPlottingDisabledByOrder &&
		!hasPlotted &&
		!isSigningPending &&
		!!document.docoChainProjectId &&
		!!userEmail

	const isSignButtonAvailableForPreGen =
		showSignDocument && !isStartSigningDisabled && !!document.docoChainProjectId && !!userEmail

	const isPlotSignatureWaiting = false

	const preGenerationInitiatedRef = useRef<string | null>(null)
	const hadPlotLinkRef = useRef(false)

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
			if (data?.link && document.docoChainProjectId && onPreGeneratedLink) {
				onPreGeneratedLink(
					document.id,
					data.link,
					data.projectUuid ?? document.docoChainProjectId,
					"plot",
					data.cleanPlotUrl
				)
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
			if (data?.link && document.docoChainProjectId && onPreGeneratedLink) {
				onPreGeneratedLink(
					document.id,
					data.link,
					data.projectUuid ?? document.docoChainProjectId,
					"sign"
				)
			}
			preGenerationInitiatedRef.current = null
		},
		onError: () => {
			preGenerationInitiatedRef.current = null
		},
	})

	useEffect(() => {
		// Plot links are extremely sensitive to token validity. We generate them on click to guarantee freshness.
		// Keeping background pre-generation off also avoids any chance of invalidating the click-generated token.
		const enablePlotPreGeneration = false
		if (!enablePlotPreGeneration) return

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
			documentId: document.id,
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
				documentId: document.id,
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

	const selectedSignersCount = signerUserIds?.length ?? 0
	const isCreateProjectDisabled = [!docoChainTokenReady, !!isCreatingProject].some(Boolean)

	const signingIndicator = hasUserSigned
		? {
				icon: CheckCircle2,
				text: "You already signed this document",
				className:
					"border border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200",
			}
		: isSigningDisabledByPreviousSigners
			? {
					icon: Clock,
					text: "Wait for the other users to sign",
					className:
						"border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200",
				}
			: isUsersTurnToSign
				? {
						icon: AlertCircle,
						text: "It's your turn to sign",
						className:
							"border border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200",
					}
				: null

	return (
		<div className="space-y-2">
			{signingIndicator && (
				<div
					className={cn(
						"flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold",
						signingIndicator.className
					)}
				>
					<signingIndicator.icon className="size-3" />
					<span>{signingIndicator.text}</span>
				</div>
			)}

			{(signerUserIds?.length ?? 0) > 0 && participants ? (
				<AssignedSignerList
					signerUserIds={signerUserIds ?? []}
					participants={participants ?? []}
					signatureRequests={signatureRequests}
				/>
			) : document.docoChainProjectId && filteredSigners && filteredSigners.length > 0 ? (
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
							signerRoles={signerRoles}
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
					window.open(`/api/documents/${document.id}`, "_blank")
				}}
			>
				<FileText className="mr-1.5 size-3.5" />
				View Document
			</Button>

			{isEnp && !document.docoChainProjectId && meetingId && onCreateProject && (
				<Button
					variant="default"
					size="sm"
					className="h-9 w-full text-xs shadow-sm"
					onClick={() => {
						if (meetingId) onCreateProject(document.id, meetingId)
					}}
					disabled={isCreateProjectDisabled}
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

			<div className="space-y-1.5">
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
						{enpHasConfirmedPlot ? (
							<>
								<FileSignature className="mr-1.5 size-3.5" />
								Plot Signature
							</>
						) : isSigningPending && isPlottingAction ? (
							<>
								<div className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
								Plotting...
							</>
						) : (
							<>
								<FileSignature className="mr-1.5 size-3.5" />
								Plot Signature
							</>
						)}
					</Button>
				)}

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

				{showSigningMessage && (
					<p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
						{!document.docoChainProjectId
							? isEnp
								? "Create the DocOnChain project when ready. You can add signers before or after."
								: "Waiting for the notary to create the DocOnChain project."
							: hasUserSigned
								? ""
								: allSignersSigned
									? "All signers have completed signing"
									: isPlottingDisabledByOrder
										? "Complete the previous document before plotting the next one"
										: isSigningDisabledByOrder
											? ""
											: hasNoSignersSelected
												? "Select at least one signer for this document"
												: userNotInSignerList
													? "You must be added as a signer to start signing"
													: isPrincipalWaitingForEnpToPlot
														? "Waiting for ENP to plot your signature"
														: ""}
					</p>
				)}
			</div>
		</div>
	)
})
