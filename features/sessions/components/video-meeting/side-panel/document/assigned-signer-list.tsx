"use client"

import React from "react"
import { AlertCircle, CheckCircle2, Clock, User, Users as UsersIcon } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { cn, getFullName } from "@/core/lib/utils"

export interface AssignedSignerListProps {
	signerUserIds: string[]
	participants: Array<{
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
	}>
	signatureRequests?: Array<{ signerId: string; status: string; signedAt: string | Date | null }>
}

/**
 * Shows the ordered list of assigned signers with their signing status.
 * Driven by internal DB signature-request records (not DocOnChain external signer status).
 */
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
						<CheckCircle2 className="mr-1 size-3" />
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
										<CheckCircle2 className="mr-1 size-3" />
										Signed
									</Badge>
								) : isCurrent ? (
									<Badge
										variant="secondary"
										className="border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200"
									>
										<AlertCircle className="mr-1 size-3" />
										Current
									</Badge>
								) : (
									<Badge variant="outline" className="text-[10px] font-semibold">
										<Clock className="mr-1 size-3" />
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
