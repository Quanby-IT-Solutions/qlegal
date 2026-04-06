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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { cn, getFullName } from "@/core/lib/utils"

import type { SignerParticipant } from "./signer-selector"

export type SignerRole = "principal" | "witness"

interface SignerManagementModalProps {
	participants: SignerParticipant[]
	signerUserIds: string[]
	signerRoles?: Record<string, SignerRole>
	onSignersChange: (userIds: string[], roles: Record<string, SignerRole>) => void
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

export const SignerManagementModal = React.memo(function SignerManagementModal({
	participants,
	signerUserIds,
	signerRoles: initialSignerRoles,
	onSignersChange,
	isOpen,
	onOpenChange,
}: SignerManagementModalProps) {
	const { data: session } = useSession()
	const isEnp = session?.user?.role === "ENP"

	const [step, setStep] = useState<"select" | "roles" | "order">("select")
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
	const [signerRoles, setSignerRoles] = useState<Record<string, SignerRole>>({})

	useEffect(() => {
		if (isOpen) {
			setSelectedUserIds(Array.isArray(signerUserIds) ? [...signerUserIds] : [])
			setSignerRoles(
				typeof initialSignerRoles === "object" && initialSignerRoles !== null
					? { ...initialSignerRoles }
					: {}
			)
			setStep("select")
		}
	}, [isOpen, signerUserIds, initialSignerRoles])

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

	const handleNextFromSelect = useCallback(() => {
		if (selectedUserIds.length === 0) {
			toast.error("Please select at least one signer")
			return
		}

		// Require at least one non-ENP signer; ENP signs only as notary
		const nonEnpSelected = selectedUserIds.filter(id => {
			const p = participants.find(x => x.userId === id)
			return p?.user?.role !== "ENP"
		})

		if (nonEnpSelected.length === 0) {
			toast.error("Please select at least one principal or witness (non-ENP)")
			return
		}

		// Default: non-ENP signers → principal; keep existing roles when re-opening
		setSignerRoles(prev => {
			const next = { ...prev }
			for (const id of nonEnpSelected) {
				next[id] ??= "principal"
			}
			return next
		})
		setStep("roles")
	}, [selectedUserIds, participants])

	const orderedSelected = useMemo(() => {
		return selectedUserIds
			.map(userId => participants.find(p => p.userId === userId))
			.filter((p): p is NonNullable<typeof p> => p !== undefined)
	}, [selectedUserIds, participants])

	const handleNextFromRoles = useCallback(() => {
		setStep("order")
	}, [])

	const handleBack = useCallback(() => {
		setStep(prev => (prev === "order" ? "roles" : "select"))
	}, [])

	const handleSave = useCallback(() => {
		const roles: Record<string, SignerRole> = {}
		// All selected participants (including ENP) are signers.
		const finalSelected = orderedSelected
		const finalUserIds = finalSelected.map(p => p.userId)

		for (const p of finalSelected) {
			const id = p.userId
			const isEnpSigner = p.user?.role === "ENP"
			// ENP is a signer but has no principal/witness role in the UI.
			// Persist as "principal" internally so schema constraints are satisfied,
			// but we never label ENP as principal or witness in the UI.
			if (isEnpSigner) {
				roles[id] = "principal"
			} else {
				roles[id] = signerRoles[id] ?? "principal"
			}
		}

		onSignersChange(finalUserIds, roles)
		onOpenChange(false)
		toast.success(`Saved ${finalUserIds.length} signer(s)`)
	}, [onSignersChange, onOpenChange, orderedSelected, signerRoles])

	const handleCancel = useCallback(() => {
		setSelectedUserIds(Array.isArray(signerUserIds) ? [...signerUserIds] : [])
		setStep("select")
		onOpenChange(false)
	}, [onOpenChange, signerUserIds])

	const setRoleForUser = useCallback((userId: string, role: SignerRole) => {
		setSignerRoles(prev => ({ ...prev, [userId]: role }))
	}, [])

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UsersIcon className="text-primary size-5" />
						{step === "select"
							? "Select Signers"
							: step === "roles"
								? "Assign Roles"
								: "Set Signing Order"}
					</DialogTitle>
					<DialogDescription>
						{step === "select"
							? "Choose which participants must sign this document"
							: step === "roles"
								? "Assign Principal or Witness for each signer (ENP is notary)"
								: "Arrange the order in which signers will sign"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{step === "select" && (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Selected: {selectedUserIds.length} of {participants.length}
							</p>
							<div className="max-h-100 space-y-1.5 overflow-y-auto">
								{participants.map(p => {
									const checked = selectedSet.has(p.userId)
									const email = (p.user?.email ?? "").trim()
									const name = getFullName(p.user) || email || "Unknown"
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
					)}
					{step === "roles" && (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Assign Principal or Witness. ENP signs as notary and is not listed here.
							</p>
							<div className="max-h-100 space-y-1.5 overflow-y-auto">
								{orderedSelected
									.filter(p => p.user?.role !== "ENP")
									.map(p => {
										const email = (p.user?.email ?? "").trim()
										const name = getFullName(p.user) || email || "Unknown"
										const role = signerRoles[p.userId] ?? "principal"
										return (
											<div
												key={p.userId}
												className="bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5">
														<User className="text-muted-foreground size-4 shrink-0" />
														<span className="truncate font-medium">{name}</span>
													</div>
													<div className="text-muted-foreground truncate text-xs">{email}</div>
												</div>
												<Select
													value={role}
													onValueChange={(v: SignerRole) => setRoleForUser(p.userId, v)}
												>
													<SelectTrigger className="h-8 w-30 shrink-0">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="principal">Principal</SelectItem>
														<SelectItem value="witness">Witness</SelectItem>
													</SelectContent>
												</Select>
											</div>
										)
									})}
							</div>
						</div>
					)}
					{step === "order" && (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								Use arrows to reorder signers (first signs first)
							</p>
							<div className="max-h-100 space-y-1.5 overflow-y-auto">
								{orderedSelected.map((p, index) => {
									const email = (p.user?.email ?? "").trim()
									const name = getFullName(p.user) || email || "Unknown"
									const isEnpSigner = p.user?.role === "ENP"
									const role = isEnpSigner ? "notary" : (signerRoles[p.userId] ?? "principal")
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
													<span className="text-muted-foreground shrink-0 text-xs capitalize">
														({role})
													</span>
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
					{step === "select" && (
						<>
							<Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
								Cancel
							</Button>
							<Button onClick={handleNextFromSelect} className="w-full sm:w-auto">
								Next
								<ArrowRight className="ml-2 size-4" />
							</Button>
						</>
					)}
					{step === "roles" && (
						<>
							<Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
								<ArrowLeft className="mr-2 size-4" />
								Back
							</Button>
							<Button onClick={handleNextFromRoles} className="w-full sm:w-auto">
								Next
								<ArrowRight className="ml-2 size-4" />
							</Button>
						</>
					)}
					{step === "order" && (
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
