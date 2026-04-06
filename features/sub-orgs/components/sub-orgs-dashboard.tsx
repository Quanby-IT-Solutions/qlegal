"use client"

import { useState } from "react"
import { Building01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { CopyIcon, EyeIcon, EyeOffIcon, Lock } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
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
import { Separator } from "@/core/components/ui/separator"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import { trpc } from "@/services/trpc/client"

import { AddMemberDialog } from "./add-member-dialog"
import { CreateSubOrgDialog } from "./create-sub-org-dialog"
import { TransferCreditsDialog } from "./transfer-credits-dialog"

export function SubOrgsDashboard() {
	const [createOpen, setCreateOpen] = useState(false)
	const utils = trpc.useUtils()
	const {
		data: subOrgs,
		isLoading,
		error,
		isError,
		refetch,
	} = trpc.subOrgs.list.useQuery(undefined, {})

	const handleMemberAdded = (subOrgId: string) => {
		void utils.subOrgs.members.invalidate({ subOrgId })
		void refetch()
	}

	return (
		<div className="min-h-screen w-full" suppressHydrationWarning>
			<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">Sub-Orgs</h1>
					<p className="text-sm text-gray-600 sm:text-base dark:text-gray-400">
						Create DocOnChain sub-organizations and add members later
					</p>
				</div>
				<CreateSubOrgDialog
					open={createOpen}
					onOpenChange={setCreateOpen}
					onSuccess={() => refetch()}
				/>
				<Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
					<HugeiconsIcon icon={Building01Icon} className="mr-2 size-4" />
					Create Sub-Org
				</Button>
			</div>

			<div className="px-4 sm:px-6">
				{isLoading ? (
					<p className="text-muted-foreground">Loading sub-organizations...</p>
				) : isError ? (
					<Card>
						<CardHeader>
							<CardTitle>Sub-Orgs not initialized</CardTitle>
							<CardDescription>
								{error.message ||
									"Sub-org storage is not ready yet. Ensure the DB has been updated."}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<p className="text-muted-foreground text-sm">
								Run <span className="font-mono">pnpm db:push</span> (or{" "}
								<span className="font-mono">pnpm db:migrate</span>) then refresh.
							</p>
							<Button onClick={() => refetch()} variant="outline">
								Retry
							</Button>
						</CardContent>
					</Card>
				) : !subOrgs?.length ? (
					<Card>
						<CardHeader>
							<CardTitle>No sub-organizations yet</CardTitle>
							<CardDescription>
								Create a sub-org in DocOnChain, then add members (parent-org users) to it.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button onClick={() => setCreateOpen(true)}>
								<HugeiconsIcon icon={Building01Icon} className="mr-2 size-4" />
								Create first sub-org
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{subOrgs.map(sub => (
							<Card key={sub.id} className="gap-0 overflow-hidden rounded-xl py-0 shadow-sm">
								<CardHeader className="bg-muted/30 space-y-2 border-b pt-4 pb-3">
									<div className="space-y-1">
										<CardTitle className="text-lg leading-snug font-bold">{sub.name}</CardTitle>
										<CardDescription className="font-mono text-[11px] leading-none">
											{sub.uuid}
										</CardDescription>
									</div>

									<div className="flex flex-wrap gap-2 pt-1">
										<TransferCreditsDialog
											subOrgId={sub.id}
											subOrgName={sub.name}
											onSuccess={() => refetch()}
										/>
										<AddMemberDialog
											subOrgId={sub.id}
											subOrgName={sub.name}
											onSuccess={() => handleMemberAdded(sub.id)}
										/>
										<UploadPhotoDialog subOrgUuid={sub.uuid} onSuccess={refetch} />
									</div>
								</CardHeader>

								<CardContent className="space-y-3 px-4 pt-4 pb-4 sm:px-6">
									<div className="space-y-0.5">
										<div className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground">Owner</span>
											<span className="max-w-[60%] truncate text-right font-semibold">
												{sub.address}
											</span>
										</div>
										<p className="text-muted-foreground text-[11px]">
											Type: {sub.subOrganizationTypeName ?? "Department"} · Created{" "}
											{sub.createdAt.toLocaleDateString()}
										</p>
									</div>

									<SubOrgCreditsCard subOrgId={sub.id} />

									<div className="space-y-1.5">
										<SubOrgMembersTable subOrgId={sub.id} />
									</div>

									<Separator />

									<div className="space-y-2.5">
										<p className="flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase">
											<Lock className="size-3.5" />
											Credentials
										</p>
										<SubOrgCredentialsFields subOrgId={sub.id} />
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

function maskSecret(value: string): string {
	if (!value) return ""
	if (value.length <= 8) return "••••••••"
	return `${value.slice(0, 4)}••••••••${value.slice(-4)}`
}

function SubOrgCredentialsFields({ subOrgId }: { subOrgId: string }) {
	const [revealKey, setRevealKey] = useState(false)
	const [revealSecret, setRevealSecret] = useState(false)
	const { data, isLoading, isError, error } = trpc.subOrgs.credentials.useQuery({ subOrgId })

	const clientKey = data?.clientKey ?? ""
	const clientSecret = data?.clientSecret ?? ""

	if (isLoading) {
		return <p className="text-muted-foreground text-sm">Loading credentials…</p>
	}

	if (isError) {
		return (
			<p className="text-destructive text-sm">{error.message ?? "Failed to load credentials."}</p>
		)
	}

	if (!clientKey || !clientSecret) {
		return (
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">
					DocOnChain didn’t return sub-org credentials for this sub-org.
				</p>
				<Badge variant="outline">Ask DocOnChain to enable client key/secret on this endpoint</Badge>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="text-sm font-medium">Client key</Label>
				<div className="flex items-center gap-2">
					<Input
						readOnly
						value={revealKey ? clientKey : maskSecret(clientKey)}
						className="bg-muted font-mono text-xs"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(clientKey)
								toast.success("Client key copied")
							} catch {
								toast.error("Copy failed")
							}
						}}
					>
						<CopyIcon className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={() => setRevealKey(k => !k)}
					>
						{revealKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				<Label className="text-sm font-medium">Client secret</Label>
				<div className="flex items-center gap-2">
					<Input
						readOnly
						value={revealSecret ? clientSecret : maskSecret(clientSecret)}
						className="bg-muted font-mono text-xs"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(clientSecret)
								toast.success("Client secret copied")
							} catch {
								toast.error("Copy failed")
							}
						}}
					>
						<CopyIcon className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={() => setRevealSecret(s => !s)}
					>
						{revealSecret ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
					</Button>
				</div>
			</div>
		</div>
	)
}

function SubOrgMembersTable({ subOrgId }: { subOrgId: string }) {
	const utils = trpc.useUtils()
	const { data, isLoading, isError, error } = trpc.subOrgs.members.useQuery({ subOrgId })
	const setTokenEmailMutation = trpc.subOrgs.setTokenEmail.useMutation({
		onSuccess: async () => {
			await utils.subOrgs.members.invalidate({ subOrgId })
			toast.success("Token email saved. Retrying members…")
		},
		onError: err => {
			toast.error(err.message || "Failed to save token email.")
		},
	})

	const [setTokenEmailOpen, setSetTokenEmailOpen] = useState(false)
	const [tokenEmail, setTokenEmail] = useState("")

	const ok = data?.ok === true
	const members = ok ? data.members : []
	const count = members.length
	const needsTokenEmail = data?.ok === false ? data.needsTokenEmail === true : false
	const message = data?.ok === false ? (data.message ?? "Unable to load members.") : null

	if (isLoading) {
		return (
			<>
				<p className="text-[11px] font-bold tracking-wide uppercase">Members</p>
				<p className="text-muted-foreground text-sm">Loading members…</p>
			</>
		)
	}

	if (isError) {
		return (
			<>
				<p className="text-[11px] font-bold tracking-wide uppercase">Members</p>
				<p className="text-destructive text-sm">{error.message ?? "Failed to load members."}</p>
			</>
		)
	}

	if (!ok) {
		return (
			<>
				<p className="text-[11px] font-bold tracking-wide uppercase">Members</p>
				<p className="text-destructive text-sm">{message}</p>
				{needsTokenEmail && (
					<div className="mt-2 flex flex-col gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setSetTokenEmailOpen(true)}
						>
							Set token email
						</Button>
						<Dialog open={setTokenEmailOpen} onOpenChange={setSetTokenEmailOpen}>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>Set token email</DialogTitle>
									<DialogDescription>
										Enter an email that is a member of this DocOnChain sub-org. We’ll use it to
										generate a sub-org scoped token to fetch members/credits reliably.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-2">
									<Label htmlFor={`token-email-${subOrgId}`}>Member email</Label>
									<Input
										id={`token-email-${subOrgId}`}
										value={tokenEmail}
										onChange={e => setTokenEmail(e.target.value)}
										placeholder="someone@company.com"
									/>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setSetTokenEmailOpen(false)}
										disabled={setTokenEmailMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										type="button"
										onClick={() => {
											setTokenEmailMutation.mutate({ subOrgId, tokenEmail })
										}}
										disabled={setTokenEmailMutation.isPending || !tokenEmail.trim()}
									>
										{setTokenEmailMutation.isPending ? "Saving…" : "Save"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				)}
			</>
		)
	}

	if (!count) {
		return (
			<>
				<p className="text-[11px] font-bold tracking-wide uppercase">Members</p>
				<p className="text-muted-foreground text-sm">No members yet.</p>
			</>
		)
	}

	return (
		<>
			<p className="text-[11px] font-bold tracking-wide uppercase">
				Members {count > 0 ? `(${count})` : ""}
			</p>
			<div className="border-border/60 max-h-44 overflow-x-auto overflow-y-auto rounded-md border">
				<Table className="min-w-full text-sm">
					<TableHeader>
						<TableRow className="bg-muted/60 hover:bg-muted/60">
							<TableHead className="whitespace-nowrap">Name</TableHead>
							<TableHead className="whitespace-nowrap">Email</TableHead>
							<TableHead className="whitespace-nowrap">Role</TableHead>
							<TableHead className="text-right whitespace-nowrap">Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.map(m => (
							<TableRow key={m.key} className="[&_td]:py-2">
								<TableCell
									className="max-w-30 truncate py-2 font-medium sm:max-w-none"
									title={m.name}
								>
									{m.name}
								</TableCell>
								<TableCell
									className="max-w-35 truncate py-2 font-mono text-[11px] sm:max-w-none"
									title={m.email}
								>
									{m.email}
								</TableCell>
								<TableCell className="py-2 whitespace-nowrap">{m.role}</TableCell>
								<TableCell className="py-2 text-right whitespace-nowrap">
									<Badge
										variant="secondary"
										className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
									>
										{m.status || "—"}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</>
	)
}

function SubOrgCreditsCard({ subOrgId }: { subOrgId: string }) {
	const { data, isLoading, isError } = trpc.subOrgs.credits.useQuery(
		{ subOrgId },
		{ staleTime: 30_000 }
	)

	if (isLoading) {
		return (
			<div className="bg-muted/30 rounded-lg px-4 py-3">
				<p className="text-sm font-medium">Credits</p>
				<p className="text-muted-foreground text-[11px]">Checking…</p>
			</div>
		)
	}

	if (isError || data?.credits === null || data?.credits === undefined) {
		return (
			<div className="bg-muted/30 rounded-lg px-4 py-3">
				<p className="text-sm font-medium">Credits</p>
				<p className="text-muted-foreground text-[11px]">Unavailable</p>
			</div>
		)
	}

	const used = data.usedCredits ?? 0
	const total = data.totalCredits ?? 0
	const remaining = data.credits ?? 0

	return (
		<div className="bg-muted/30 rounded-lg px-4 py-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div className="min-w-0">
					<p className="text-sm font-medium">Credits</p>
					<p className="mt-0.5 text-xl font-bold tabular-nums">{remaining}</p>
				</div>
				<div className="text-muted-foreground shrink-0 text-[11px] leading-5 sm:text-right">
					<p>used {used}</p>
					<p>total {total}</p>
				</div>
			</div>
		</div>
	)
}

interface UploadPhotoDialogProps {
	subOrgUuid: string
	onSuccess: () => void
}

function UploadPhotoDialog({ subOrgUuid, onSuccess }: UploadPhotoDialogProps) {
	const utils = trpc.useUtils()
	const [open, setOpen] = useState(false)
	const [photo, setPhoto] = useState<File | null>(null)
	const [isSaving, setIsSaving] = useState(false)

	const handleOpenChange = (next: boolean) => {
		if (!next) setPhoto(null)
		setOpen(next)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!photo) {
			toast.error("Choose an image to upload.")
			return
		}

		setIsSaving(true)
		try {
			const form = new FormData()
			form.set("photo", photo, photo.name)

			const res = await fetch(
				`/api/doconchain/organizations/sub/${encodeURIComponent(subOrgUuid)}`,
				{
					method: "PUT",
					body: form,
				}
			)
			const json = (await res.json().catch(() => null)) as null | { error?: string }
			if (!res.ok) {
				throw new Error(json?.error ?? `Failed to upload photo (${res.status}).`)
			}

			toast.success("Photo updated.")
			await Promise.all([utils.subOrgs.list.invalidate(), utils.subOrgs.credits.invalidate()])
			onSuccess()
			setOpen(false)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to upload photo.")
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button type="button" variant="outline" size="xs" className="border-dashed">
					Upload photo
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload sub-org photo</DialogTitle>
					<DialogDescription>
						Choose an image to use as the branding photo for this sub-org. It will appear on the
						card and in DocOnChain. Max 5MB.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="upload-suborg-photo">Image</Label>
						<Input
							id="upload-suborg-photo"
							type="file"
							accept="image/*"
							onChange={e => setPhoto(e.target.files?.[0] ?? null)}
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSaving}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving || !photo}>
							{isSaving ? "Uploading…" : "Upload"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
