"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
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

import { trpc } from "@/services/trpc/client"

interface AddMemberDialogProps {
	subOrgId: string
	subOrgName: string
	onSuccess?: () => void
}

export function AddMemberDialog({ subOrgId, subOrgName, onSuccess }: AddMemberDialogProps) {
	const [open, setOpen] = useState(false)
	const [email, setEmail] = useState("")

	const addMemberMutation = trpc.subOrgs.addMember.useMutation({
		onSuccess: () => {
			toast.success("Member added to sub-org")
			setEmail("")
			setOpen(false)
			onSuccess?.()
		},
		onError: e => {
			toast.error(e.message ?? "Failed to add member")
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!email.trim()) {
			toast.error("Email is required")
			return
		}
		addMemberMutation.mutate({ subOrgId, email: email.trim() })
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="secondary" size="sm">
					<Plus className="mr-2 size-4" />
					Add member
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add member to {subOrgName}</DialogTitle>
					<DialogDescription>
						User must already be a member of the parent organization. They will be moved into this
						sub-org.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="member-email">Email</Label>
						<Input
							id="member-email"
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="user@example.com"
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={addMemberMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={addMemberMutation.isPending}>
							{addMemberMutation.isPending ? "Adding…" : "Add"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
