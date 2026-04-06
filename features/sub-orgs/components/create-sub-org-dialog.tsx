"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { trpc } from "@/services/trpc/client"

interface CreateSubOrgDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

const SUB_ORG_TYPES = ["Department", "Branch", "Division", "Team"] as const

export function CreateSubOrgDialog({ open, onOpenChange, onSuccess }: CreateSubOrgDialogProps) {
	const [name, setName] = useState("")
	const [address, setAddress] = useState("")
	const [typeName, setTypeName] = useState<string>("Department")
	const [photo, setPhoto] = useState<File | null>(null)

	const createMutation = trpc.subOrgs.create.useMutation({
		onSuccess: async created => {
			try {
				// If a logo/photo was chosen, upload it immediately after creating the sub-org.
				if (photo && created?.uuid) {
					const form = new FormData()
					form.set("photo", photo, photo.name)
					const res = await fetch(
						`/api/doconchain/organizations/sub/${encodeURIComponent(created.uuid)}`,
						{
							method: "PUT",
							body: form,
						}
					)
					const json = (await res.json().catch(() => null)) as null | { error?: string }
					if (!res.ok) {
						throw new Error(json?.error ?? `Failed to upload photo (${res.status}).`)
					}
				}

				toast.success("Sub-organization created")
				setName("")
				setAddress("")
				setTypeName("Department")
				setPhoto(null)
				onOpenChange(false)
				onSuccess?.()
			} catch (err) {
				toast.error(
					err instanceof Error
						? err.message
						: "Sub-organization was created, but uploading the photo failed."
				)
				onSuccess?.()
			}
		},
		onError: e => {
			toast.error(e.message ?? "Failed to create sub-org")
		},
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!name.trim() || !address.trim()) {
			toast.error("Name and address are required")
			return
		}
		createMutation.mutate({
			name: name.trim(),
			address: address.trim(),
			subOrganizationTypeName: typeName || "Department",
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Sub-Organization</DialogTitle>
					<DialogDescription>
						Create a new DocOnChain sub-org under the parent organization. You can upload an
						optional logo and add members after creation.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="suborg-name">Name</Label>
						<Input
							id="suborg-name"
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="e.g. Legal Team Manila"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="suborg-address">Address</Label>
						<Input
							id="suborg-address"
							value={address}
							onChange={e => setAddress(e.target.value)}
							placeholder="Full address"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="suborg-photo">Logo (optional)</Label>
						<Input
							id="suborg-photo"
							type="file"
							accept="image/*"
							onChange={e => setPhoto(e.target.files?.[0] ?? null)}
						/>
					</div>
					<div className="grid gap-2">
						<Label>Type</Label>
						<Select value={typeName} onValueChange={setTypeName}>
							<SelectTrigger>
								<SelectValue placeholder="Department" />
							</SelectTrigger>
							<SelectContent>
								{SUB_ORG_TYPES.map(t => (
									<SelectItem key={t} value={t}>
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={createMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending ? "Creating…" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

