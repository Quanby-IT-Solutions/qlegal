"use client"

import React from "react"
import { AlertCircle, CheckCircle2, Clock, User, Users as UsersIcon } from "lucide-react"

import { cn } from "@/core/lib/utils"

export interface SignerListProps {
	signers: Array<{
		id: number
		email: string
		firstName: string
		lastName: string
		status: string
		signedAt: string | null
		sequence: number
		signerRole: string
	}>
}

// Signer List Component - Shows all signers and their status
// Memoized to prevent re-renders when unrelated state changes
export const SignerList = React.memo(function SignerList({ signers }: SignerListProps) {
	if (!signers || signers.length === 0) {
		return null
	}

	// Sort signers by sequence
	const sortedSigners = [...signers].sort((a, b) => a.sequence - b.sequence)

	// Helper function to check if a signer has signed (case-insensitive and checks both status and signedAt)
	const isSignerSigned = (signer: { status: string; signedAt: string | null }): boolean => {
		const statusUpper = signer.status?.toUpperCase() ?? ""
		const hasSignedStatus = statusUpper === "SIGNED" || statusUpper === "COMPLETED"
		const hasSignedAt =
			signer.signedAt !== null && signer.signedAt !== undefined && signer.signedAt !== ""
		return hasSignedStatus || hasSignedAt
	}

	// Find the current signer (first one who hasn't signed yet)
	const currentSignerIndex = sortedSigners.findIndex(s => !isSignerSigned(s))

	// Count signed signers
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