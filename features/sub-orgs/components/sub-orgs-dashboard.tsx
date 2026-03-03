"use client"

import { useState } from "react"
import { Building01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/components/ui/collapsible"
import { Input } from "@/core/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { cn } from "@/core/lib/utils"
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
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
						Sub-Orgs
					</h1>
					<p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">
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
					<div className="space-y-4">
						{subOrgs.map(sub => (
							<Card key={sub.id}>
								<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
									<div>
										<CardTitle className="text-lg">{sub.name}</CardTitle>
										<CardDescription className="mt-1 font-mono text-xs">
											{sub.uuid}
										</CardDescription>
									</div>
									<div className="flex flex-wrap items-center gap-2">
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
									</div>
								</CardHeader>
								<CardContent>
									<p className="text-muted-foreground text-sm">{sub.address}</p>
									<p className="text-muted-foreground mt-1 text-xs">
										Type: {sub.subOrganizationTypeName ?? "Department"} · Created{" "}
										{sub.createdAt.toLocaleDateString()}
									</p>
									<SubOrgMembersDisclosure subOrgId={sub.id} />
									<SubOrgCredentialsDisclosure subOrgId={sub.id} />
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

function CopyButton({ value, label }: { value: string; label: string }) {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(value)
					toast.success(`${label} copied`)
				} catch {
					toast.error("Copy failed")
				}
			}}
			disabled={!value}
		>
			<CopyIcon className="mr-2 size-4" />
			Copy
		</Button>
	)
}

function SubOrgCredentialsDisclosure({ subOrgId }: { subOrgId: string }) {
	const [open, setOpen] = useState(false)
	const [reveal, setReveal] = useState(false)
	const { data, isLoading, isError, error } = trpc.subOrgs.credentials.useQuery(
		{ subOrgId },
		{ enabled: open }
	)

	const clientKey = data?.clientKey ?? ""
	const clientSecret = data?.clientSecret ?? ""

	return (
		<Collapsible open={open} onOpenChange={next => (setOpen(next), next ? setReveal(false) : null)} className="mt-2">
			<CollapsibleTrigger asChild>
				<Button variant="ghost" size="sm" className="flex w-full items-center justify-between px-0">
					<span className="text-sm font-medium">Credentials</span>
					<ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="pt-3">
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading credentials…</p>
				) : isError ? (
					<p className="text-sm text-red-600 dark:text-red-400">
						{error.message ?? "Failed to load credentials."}
					</p>
				) : !clientKey || !clientSecret ? (
					<div className="space-y-2">
						<p className="text-muted-foreground text-sm">
							DocOnChain didn’t return sub-org credentials for this sub-org.
						</p>
						<Badge variant="outline">Ask DocOnChain to enable client key/secret on this endpoint</Badge>
					</div>
				) : (
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm font-medium">Client key</p>
								<CopyButton value={clientKey} label="Client key" />
							</div>
							<Input readOnly value={reveal ? clientKey : maskSecret(clientKey)} className="font-mono text-xs" />
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm font-medium">Client secret</p>
								<CopyButton value={clientSecret} label="Client secret" />
							</div>
							<Input
								readOnly
								value={reveal ? clientSecret : maskSecret(clientSecret)}
								className="font-mono text-xs"
							/>
						</div>
						<div className="sm:col-span-2 flex items-center justify-end">
							<Button type="button" variant="outline" size="sm" onClick={() => setReveal(r => !r)}>
								{reveal ? <EyeOffIcon className="mr-2 size-4" /> : <EyeIcon className="mr-2 size-4" />}
								{reveal ? "Hide" : "Reveal"}
							</Button>
						</div>
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}

function SubOrgMembersDisclosure({ subOrgId }: { subOrgId: string }) {
	const [open, setOpen] = useState(false)
	const { data, isLoading, isError, error } = trpc.subOrgs.members.useQuery(
		{ subOrgId },
		{ enabled: open && !!subOrgId }
	)

	const count = data?.length ?? 0

	return (
		<Collapsible open={open} onOpenChange={setOpen} className="mt-4">
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="flex w-full items-center justify-between px-0"
				>
					<span className="text-sm font-medium">
						Members{open ? "" : count ? ` (${count})` : ""}
					</span>
					<ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="pt-3">
				{isLoading ? (
					<p className="text-muted-foreground text-sm">Loading members…</p>
				) : isError ? (
					<p className="text-sm text-red-600 dark:text-red-400">
						{error.message ?? "Failed to load members."}
					</p>
				) : !count ? (
					<p className="text-muted-foreground text-sm">No members yet.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.map(m => (
								<TableRow key={m.key}>
									<TableCell className="font-medium">{m.name}</TableCell>
									<TableCell className="font-mono text-xs">{m.email}</TableCell>
									<TableCell>{m.role}</TableCell>
									<TableCell className="text-muted-foreground">{m.status || "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}
