"use client"

import React, { useCallback, useMemo } from "react"
import { ArrowDown, ArrowUp, User, Users as UsersIcon } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import type { SignerSelectorProps } from "../../lib/video-meeting"


// Signer Selector - Select which meeting participants are signers for this document (before plotting)
export const SignerSelector = React.memo(function SignerSelector({
	participants,
	signerUserIds,
	onSignersChange,
}: SignerSelectorProps) {
	const { data: session } = useSession()
	const isEnp = session?.user?.role === "ENP"

	// Ensure signerUserIds is always an array
	const safeSignerUserIds = useMemo(
		() => (Array.isArray(signerUserIds) ? signerUserIds : []),
		[signerUserIds]
	)
	const selectedSet = useMemo(() => new Set(safeSignerUserIds), [safeSignerUserIds])

	const toggle = useCallback(
		(userId: string, checked: boolean) => {
			if (checked) {
				onSignersChange([...safeSignerUserIds, userId])
			} else {
				onSignersChange(safeSignerUserIds.filter(id => id !== userId))
			}
		},
		[onSignersChange, safeSignerUserIds]
	)

	const moveUp = useCallback(
		(index: number) => {
			if (index === 0) return
			const newOrder = [...safeSignerUserIds]
			const prev = newOrder[index - 1]
			const curr = newOrder[index]
			if (prev === undefined || curr === undefined) return
			newOrder[index - 1] = curr
			newOrder[index] = prev
			onSignersChange(newOrder)
		},
		[onSignersChange, safeSignerUserIds]
	)

	const moveDown = useCallback(
		(index: number) => {
			if (index === safeSignerUserIds.length - 1) return
			const newOrder = [...safeSignerUserIds]
			const curr = newOrder[index]
			const next = newOrder[index + 1]
			if (curr === undefined || next === undefined) return
			newOrder[index] = next
			newOrder[index + 1] = curr
			onSignersChange(newOrder)
		},
		[onSignersChange, safeSignerUserIds]
	)

	const selected = participants.filter(p => selectedSet.has(p.userId))
	const selectedCount = selected.length
	const totalCount = participants.length

	// Get selected signers in order - use safeSignerUserIds to ensure we have an array
	const orderedSelected = useMemo(() => {
		return safeSignerUserIds
			.map(userId => participants.find(p => p.userId === userId))
			.filter((p): p is NonNullable<typeof p> => p !== undefined)
	}, [safeSignerUserIds, participants])

	return (
		<div className="bg-muted/30 mb-3 space-y-1.5 rounded-lg border p-2.5">
			<div className="mb-2 flex items-center gap-1.5">
				<UsersIcon className="text-muted-foreground size-3.5" />
				<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
					Signers ({selectedCount}/{totalCount})
				</span>
			</div>
			<p className="text-muted-foreground mb-2 text-[10px]">
				Select who must sign this document. Only selected signers will be added when you start
				signing.
			</p>

			{/* Show selected signers in order with order numbers (for ENP to reorder) */}
			{orderedSelected.length > 0 && (
				<div className="mb-3 space-y-1">
					<p className="text-muted-foreground text-[10px] font-semibold">Signing Order:</p>
					{orderedSelected.map((p, index) => {
						const name = p.user?.name ?? "Unknown"
						const email = p.user?.email ?? ""
						return (
							<div
								key={p.userId}
								className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
							>
								<div className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
									{index + 1}
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<User className="text-muted-foreground size-3 shrink-0" />
										<span className="truncate font-medium">{name}</span>
									</div>
									<div className="text-muted-foreground truncate text-[10px]">{email}</div>
								</div>
								{isEnp && (
									<div className="flex shrink-0 flex-col gap-0.5">
										<Button
											variant="ghost"
											size="sm"
											className="h-4 w-4 p-0"
											onClick={() => moveUp(index)}
											disabled={index === 0}
											aria-label="Move up"
										>
											<ArrowUp className="size-3" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="h-4 w-4 p-0"
											onClick={() => moveDown(index)}
											disabled={index === orderedSelected.length - 1}
											aria-label="Move down"
										>
											<ArrowDown className="size-3" />
										</Button>
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}

			{/* Unselected participants with checkboxes (selected ones are shown in Signing Order above) */}
			{participants.filter(p => !selectedSet.has(p.userId)).length > 0 && (
				<div className="space-y-1.5">
					{participants
						.filter(p => !selectedSet.has(p.userId))
						.map(p => {
							const name = p.user?.name ?? "Unknown"
							const email = p.user?.email ?? ""
							return (
								<label
									key={p.userId}
									className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
								>
									<Checkbox
										checked={false}
										onCheckedChange={c => toggle(p.userId, c === true)}
										aria-label={`${name} (${email})`}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<User className="text-muted-foreground size-3 shrink-0" />
											<span className="truncate font-medium">{name}</span>
										</div>
										<div className="text-muted-foreground truncate text-[10px]">{email}</div>
									</div>
								</label>
							)
						})}
				</div>
			)}
		</div>
	)
})