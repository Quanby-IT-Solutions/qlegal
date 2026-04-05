"use client"

import React, { useCallback, useMemo } from "react"
import { ArrowDown, ArrowUp, User, Users as UsersIcon } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { cn, getFullName } from "@/core/lib/utils"

export interface SignerParticipant {
	userId: string
	user: {
		id: string
		firstName?: string | null
		middleName?: string | null
		lastName?: string | null
		/** Back-compat for older session payloads */
		name?: string | null
		email: string | null
		role?: string | null
	} | null
}

interface SignerSelectorProps {
	participants: SignerParticipant[]
	signerUserIds: string[]
	onSignersChange: (userIds: string[]) => void
}

export const SignerSelector = React.memo(function SignerSelector({
	participants,
	signerUserIds,
	onSignersChange,
}: SignerSelectorProps) {
	const { data: session } = useSession()
	const isEnp = session?.user?.role === "ENP"

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

	const selectedCount = safeSignerUserIds.filter(id => selectedSet.has(id)).length
	const totalCount = participants.length

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

			{orderedSelected.length > 0 && (
				<div className="mb-3 space-y-1">
					<p className="text-muted-foreground text-[10px] font-semibold">Signing Order:</p>
					{orderedSelected.map((p, index) => {
						const email = (p.user?.email ?? "").trim()
						const name = getFullName(p.user) || email || "Unknown"
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

			{participants.filter(p => !selectedSet.has(p.userId)).length > 0 && (
				<div className="space-y-1.5">
					{participants
						.filter(p => !selectedSet.has(p.userId))
						.map(p => {
							const email = (p.user?.email ?? "").trim()
							const name = getFullName(p.user) || email || "Unknown"
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
