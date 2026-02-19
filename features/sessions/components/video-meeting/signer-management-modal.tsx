"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, User, Users as UsersIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { cn } from "@/core/lib/utils"

import type { SignerParticipant } from "./signer-selector"

interface SignerManagementModalProps {
	participants: SignerParticipant[]
	signerUserIds: string[]
	onSignersChange: (userIds: string[]) => void
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export const SignerManagementModal = React.memo(function SignerManagementModal({
	participants,
	signerUserIds,
	onSignersChange,
	isOpen,
	onOpenChange,
}: SignerManagementModalProps) {
	const { data: session } = useSession()
	const isEnp = session?.user?.role === "ENP"

	const [step, setStep] = useState<"select" | "order">("select")
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

	useEffect(() => {
		if (isOpen) {
			setSelectedUserIds(Array.isArray(signerUserIds) ? [...signerUserIds] : [])
			setStep("select")
		}
	}, [isOpen, signerUserIds])

	const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds])

	const toggle = useCallback((userId: string, checked: boolean) => {
		if (checked) {
			setSelectedUserIds(prev => [...prev, userId])
		} else {
			setSelectedUserIds(prev => prev.filter(id => id !== userId))
		}
	}, [])

	const moveUp = useCallback(
		(index: number) => {
			if (index === 0) return
			const newOrder = [...selectedUserIds]
			const prev = newOrder[index - 1]
			const curr = newOrder[index]
			if (prev === undefined || curr === undefined) return
			newOrder[index - 1] = curr
			newOrder[index] = prev
			setSelectedUserIds(newOrder)
		},
		[selectedUserIds]
	)

	const moveDown = useCallback(
		(index: number) => {
			if (index === selectedUserIds.length - 1) return
			const newOrder = [...selectedUserIds]
			const curr = newOrder[index]
			const next = newOrder[index + 1]
			if (curr === undefined || next === undefined) return
			newOrder[index] = next
			newOrder[index + 1] = curr
			setSelectedUserIds(newOrder)
		},
		[selectedUserIds]
	)

	const handleNext = useCallback(() => {
		if (selectedUserIds.length === 0) {
			toast.error("Please select at least one signer")
			return
		}
		setStep("order")
	}, [selectedUserIds.length])

	const handleBack = useCallback(() => {
		setStep("select")
	}, [])

	const handleSave = useCallback(() => {
		onSignersChange(selectedUserIds)
		onOpenChange(false)
		toast.success(`Saved ${selectedUserIds.length} signer(s)`)
	}, [onSignersChange, onOpenChange, selectedUserIds])

	const handleCancel = useCallback(() => {
		setSelectedUserIds(Array.isArray(signerUserIds) ? [...signerUserIds] : [])
		setStep("select")
		onOpenChange(false)
	}, [onOpenChange, signerUserIds])

	const orderedSelected = useMemo(() => {
		return selectedUserIds
			.map(userId => participants.find(p => p.userId === userId))
			.filter((p): p is NonNullable<typeof p> => p !== undefined)
	}, [selectedUserIds, participants])

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UsersIcon className="text-primary size-5" />
						{step === "select" ? "Select Signers" : "Set Signing Order"}
					</DialogTitle>
					<DialogDescription>
						{step === "select"
							? "Choose which participants must sign this document"
							: "Arrange the order in which signers will sign (ENP only)"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{step === "select" ? (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Selected: {selectedUserIds.length} of {participants.length}
							</p>
							<div className="max-h-[400px] space-y-1.5 overflow-y-auto">
								{participants.map(p => {
									const checked = selectedSet.has(p.userId)
									const name = p.user?.name ?? "Unknown"
									const email = p.user?.email ?? ""
									return (
										<label
											key={p.userId}
											className={cn(
												"hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
												checked && "bg-muted/50"
											)}
										>
											<Checkbox
												checked={checked}
												onCheckedChange={c => toggle(p.userId, c === true)}
												aria-label={`${name} (${email})`}
											/>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-1.5">
													<User className="text-muted-foreground size-4 shrink-0" />
													<span className="truncate font-medium">{name}</span>
												</div>
												<div className="text-muted-foreground truncate text-xs">{email}</div>
											</div>
										</label>
									)
								})}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Drag or use arrows to reorder signers (ENP only)
							</p>
							<div className="max-h-[400px] space-y-1.5 overflow-y-auto">
								{orderedSelected.map((p, index) => {
									const name = p.user?.name ?? "Unknown"
									const email = p.user?.email ?? ""
									return (
										<div
											key={p.userId}
											className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
										>
											<div className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
												{index + 1}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-1.5">
													<User className="text-muted-foreground size-4 shrink-0" />
													<span className="truncate font-medium">{name}</span>
												</div>
												<div className="text-muted-foreground truncate text-xs">{email}</div>
											</div>
											{isEnp && (
												<div className="flex shrink-0 flex-col gap-0.5">
													<Button
														variant="ghost"
														size="sm"
														className="h-5 w-5 p-0"
														onClick={() => moveUp(index)}
														disabled={index === 0}
														aria-label="Move up"
													>
														<ArrowUp className="size-3" />
													</Button>
													<Button
														variant="ghost"
														size="sm"
														className="h-5 w-5 p-0"
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
						</div>
					)}
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					{step === "select" ? (
						<>
							<Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
								Cancel
							</Button>
							<Button onClick={handleNext} className="w-full sm:w-auto">
								Next
								<ArrowRight className="ml-2 size-4" />
							</Button>
						</>
					) : (
						<>
							<Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
								<ArrowLeft className="mr-2 size-4" />
								Back
							</Button>
							<Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
								Cancel
							</Button>
							<Button onClick={handleSave} className="w-full sm:w-auto">
								Save
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
})
