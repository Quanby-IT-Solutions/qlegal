"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { trpc } from "@/services/trpc/client"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

interface TransferCreditsDialogProps {
	subOrgId: string
	subOrgName: string
	onSuccess?: () => void
}

export function TransferCreditsDialog({
	subOrgId,
	subOrgName,
	onSuccess,
}: TransferCreditsDialogProps) {
	const [open, setOpen] = useState(false)
	const [credits, setCredits] = useState("")
	const utils = trpc.useUtils()

	const transferMutation = trpc.subOrgs.transferCredits.useMutation({
		onSuccess: async data => {
			toast.success(
				`Transferred ${data.transferredCredits} credit${data.transferredCredits === 1 ? "" : "s"} to ${subOrgName}.${ 
					data.remainingCredits !== null ? ` Parent org has ${data.remainingCredits} credits left.` : ""}`
			)
			setCredits("")
			setOpen(false)
			await utils.subOrgs.credits.invalidate()
			onSuccess?.()
		},
		onError: e => {
			toast.error(e.message ?? "Failed to transfer credits")
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		const num = Number.parseInt(credits.trim(), 10)
		if (Number.isNaN(num) || num < 1) {
			toast.error("Enter a valid number of credits (at least 1)")
			return
		}
		transferMutation.mutate({ subOrgId, credits: num })
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<Send className="mr-2 size-4" />
					Transfer credits
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Transfer credits to {subOrgName}</DialogTitle>
					<DialogDescription>
						Move credits from the parent organization to this sub-org so members (ENPs) can sign.
						Only parent org can transfer; insufficient credits will result in an error.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="transfer-credits">Credits to transfer</Label>
						<Input
							id="transfer-credits"
							type="number"
							min={1}
							value={credits}
							onChange={e => setCredits(e.target.value)}
							placeholder="e.g. 20"
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={transferMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={transferMutation.isPending}>
							{transferMutation.isPending ? "Transferring…" : "Transfer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
