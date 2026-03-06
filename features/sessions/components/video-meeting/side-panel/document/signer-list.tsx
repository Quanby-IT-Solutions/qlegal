"use client"

import React from "react"
import { AlertCircle, CheckCircle2, Clock, User, Users as UsersIcon } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { cn, getFullName } from "@/core/lib/utils"

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Signer {
	id: number
	email: string
	firstName: string
	lastName: string
	status: string
	signedAt: string | null
	sequence: number
	signerRole: string
}

export interface SignatureRequest {
	id?: string
	signerId: string
	status: string
	signedAt: string | Date | null
}

export interface ParticipantRef {
	userId: string
	user: {
		id: string
		firstName?: string | null
		middleName?: string | null
		lastName?: string | null
		/** Back-compat for older session payloads */
		name?: string | null
		email: string | null
	} | null
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function isSignerSigned(signer: { status: string; signedAt: string | null }): boolean {
	const statusUpper = signer.status?.toUpperCase() ?? ""
	const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
	const hasSignedAt =
		signer.signedAt !== null && signer.signedAt !== undefined && signer.signedAt !== ""
	return hasSignedStatus || hasSignedAt
}

// ─────────────────────────────────────────────────────────────
// SignerList — shows DocOnChain signers + status
// ─────────────────────────────────────────────────────────────

interface SignerListProps {
	signers: Signer[]
}

export const SignerList = React.memo(function SignerList({ signers }: SignerListProps) {
	if (!signers || signers.length === 0) return null

	const sortedSigners = [...signers].sort((a, b) => a.sequence - b.sequence)
	const currentSignerIndex = sortedSigners.findIndex(s => !isSignerSigned(s))
	const signedCount = sortedSigners.filter(isSignerSigned).length

	return (
		<div className="bg-muted/30 mb-3 space-y-1.5 rounded-lg border p-2.5">
			<div className="mb-2 flex items-center gap-1.5">
				<UsersIcon className="text-muted-foreground size-3.5" />
				<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
					Signers ({signedCount}/{sortedSigners.length})
				</span>
			</div>
			<div className="space-y-1">
				{sortedSigners.map((signer, index) => {
					const isSigned = isSignerSigned(signer)
					const isCurrent = index === currentSignerIndex
					const isWaiting = index > currentSignerIndex && currentSignerIndex !== -1

					return (
						<div
							key={signer.id}
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
								isSigned &&
									"border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
								isCurrent &&
									"border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
								isWaiting && "bg-muted/50 opacity-60"
							)}
						>
							<div
								className={cn(
									"flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
									isSigned
										? "bg-green-600 text-white"
										: isCurrent
											? "bg-blue-600 text-white"
											: "bg-muted text-muted-foreground"
								)}
							>
								{signer.sequence}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<User className="text-muted-foreground size-3 shrink-0" />
									<span className="truncate font-medium">
										{signer.firstName} {signer.lastName}
									</span>
								</div>
								<div className="text-muted-foreground truncate text-[10px]">{signer.email}</div>
							</div>
							<div className="shrink-0">
								{isSigned ? (
									<div className="flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 dark:bg-green-900/40">
										<CheckCircle2 className="size-3 text-green-600 dark:text-green-400" />
										<span className="text-[10px] font-semibold text-green-700 dark:text-green-400">
											Signed
										</span>
									</div>
								) : isCurrent ? (
									<div className="flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 dark:bg-blue-900/40">
										<AlertCircle className="size-3 text-blue-600 dark:text-blue-400" />
										<span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
											Current
										</span>
									</div>
								) : (
									<div className="flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">
										<Clock className="size-3 text-gray-500 dark:text-gray-400" />
										<span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
											Waiting
										</span>
									</div>
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
})

// ─────────────────────────────────────────────────────────────
// AssignedSignerList — shows DB-assigned signers in order
// ─────────────────────────────────────────────────────────────

interface AssignedSignerListProps {
	signerUserIds: string[]
	participants: ParticipantRef[]
	signatureRequests?: SignatureRequest[]
}

export const AssignedSignerList = React.memo(function AssignedSignerList({
	signerUserIds,
	participants,
	signatureRequests,
}: AssignedSignerListProps) {
	if (!signerUserIds || signerUserIds.length === 0) return null

	const participantById = new Map(participants.map(p => [p.userId, p]))
	const statusBySignerId = new Map<string, string>()
	for (const r of signatureRequests ?? []) {
		const id = (r?.signerId ?? "").trim()
		if (!id) continue
		statusBySignerId.set(id, String(r.status ?? "").toUpperCase())
	}

	const isSigned = (userId: string) => statusBySignerId.get(userId) === "SIGNED"
	const signedCount = signerUserIds.filter(isSigned).length
	const currentIndex = signerUserIds.findIndex(id => !isSigned(id))
	const allSigned = signedCount === signerUserIds.length && signerUserIds.length > 0

	return (
		<div className="bg-muted/30 mb-3 space-y-1.5 rounded-lg border p-2.5">
			<div className="mb-2 flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<UsersIcon className="text-muted-foreground size-3.5" />
					<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
						Signers ({signedCount}/{signerUserIds.length})
					</span>
				</div>
				{allSigned && (
					<Badge
						variant="secondary"
						className="border border-green-200 bg-green-50 text-[10px] font-semibold text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
					>
						<CheckCircle2 />
						Completed
					</Badge>
				)}
			</div>

			<div className="space-y-1">
				{signerUserIds.map((userId, idx) => {
					const p = participantById.get(userId)
					const email = (p?.user?.email ?? "").trim()
					const name = (getFullName(p?.user) || email || "Unknown").trim()
					const signed = isSigned(userId)
					const isCurrent = !allSigned && currentIndex === idx
					const waiting = !signed && !isCurrent

					return (
						<div
							key={userId}
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
								signed &&
									"border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
								isCurrent &&
									"border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
								waiting && "bg-muted/50 opacity-70"
							)}
						>
							<div
								className={cn(
									"flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
									signed
										? "bg-green-600 text-white"
										: isCurrent
											? "bg-blue-600 text-white"
											: "bg-muted text-muted-foreground"
								)}
							>
								{idx + 1}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<User className="text-muted-foreground size-3 shrink-0" />
									<span className="truncate font-medium">{name}</span>
								</div>
								{email ? (
									<div className="text-muted-foreground truncate text-[10px]">{email}</div>
								) : null}
							</div>
							<div className="shrink-0">
								{signed ? (
									<Badge
										variant="secondary"
										className="border border-green-200 bg-green-50 text-[10px] font-semibold text-green-800 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
									>
										<CheckCircle2 />
										Signed
									</Badge>
								) : isCurrent ? (
									<Badge
										variant="secondary"
										className="border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200"
									>
										<AlertCircle />
										Current
									</Badge>
								) : (
									<Badge variant="outline" className="text-[10px] font-semibold">
										<Clock />
										Waiting
									</Badge>
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
})
