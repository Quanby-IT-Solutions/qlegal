"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ExternalLink, FileText, Loader2, MessageSquareText } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

import { trpc } from "@/services/trpc/client"

import { VaultShareFileCommentsSheet } from "@/features/principal-vault/components/vault-share-file-comments-sheet"

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VaultShareEnpView({ token }: { token: string }) {
	const { data: session, status: sessionStatus } = useSession()
	const [commentsFor, setCommentsFor] = useState<{
		id: string
		displayPath: string
	} | null>(null)

	const query = trpc.principalVault.getFolderShareForEnp.useQuery(
		{ token },
		{
			enabled:
				sessionStatus === "authenticated" && session?.user?.role === "ENP" && token.length > 0,
			retry: false,
		}
	)

	const getSharedVaultFileReadUrl = trpc.principalVault.getSharedVaultFileReadUrl.useMutation()

	const openSharedFile = async (fileId: string) => {
		try {
			const { url } = await getSharedVaultFileReadUrl.mutateAsync({ token, fileId })
			window.open(url, "_blank", "noopener,noreferrer")
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Could not open file"
			toast.error(msg)
		}
	}

	if (sessionStatus === "loading") {
		return (
			<div className="flex flex-1 items-center justify-center p-12">
				<Loader2 className="text-muted-foreground size-8 animate-spin" />
			</div>
		)
	}

	if (sessionStatus === "unauthenticated") {
		return (
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Folder review", href: "#" }]} />
				<main className="flex-1 p-6">
					<Card className="mx-auto max-w-lg">
						<CardHeader>
							<CardTitle>Sign in required</CardTitle>
							<CardDescription>
								Sign in with the notary account this folder was shared with to view the files.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button asChild>
								<a href={`/auth/login?callbackUrl=${encodeURIComponent(`/vault-share/${token}`)}`}>
									Sign in
								</a>
							</Button>
						</CardContent>
					</Card>
				</main>
			</div>
		)
	}

	if (session?.user?.role !== "ENP") {
		return (
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Folder review", href: "#" }]} />
				<main className="flex-1 p-6">
					<Alert variant="destructive">
						<AlertTitle>Not available</AlertTitle>
						<AlertDescription>
							This review link is only for Electronic Notary Public (ENP) accounts.
						</AlertDescription>
					</Alert>
				</main>
			</div>
		)
	}

	if (!token) {
		return (
			<div className="flex flex-1 flex-col p-6">
				<Alert variant="destructive">
					<AlertTitle>Invalid link</AlertTitle>
					<AlertDescription>Missing share token.</AlertDescription>
				</Alert>
			</div>
		)
	}

	if (query.isPending) {
		return (
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Folder review", href: "#" }]} />
				<div className="flex flex-1 items-center justify-center p-12">
					<Loader2 className="text-muted-foreground size-8 animate-spin" />
				</div>
			</div>
		)
	}

	if (query.isError) {
		return (
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Folder review", href: "#" }]} />
				<main className="flex-1 p-6">
					<Alert variant="destructive">
						<AlertTitle>Cannot open share</AlertTitle>
						<AlertDescription>{query.error.message}</AlertDescription>
					</Alert>
				</main>
			</div>
		)
	}

	const data = query.data

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Folder review", href: "#" }]} />
			<main className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-4xl space-y-6">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{data.folderName}</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							Shared by <span className="text-foreground font-medium">{data.principalName}</span>
							{data.principalEmail ? (
								<>
									{" "}
									· <span className="font-mono text-xs">{data.principalEmail}</span>
								</>
							) : null}
						</p>
						<p className="text-muted-foreground mt-2 text-xs">
							Link expires {format(new Date(data.expiresAt), "MMM d, yyyy · h:mm a")} ·{" "}
							{data.files.length} file{data.files.length === 1 ? "" : "s"} (including subfolders)
						</p>
					</div>

					{data.note ? (
						<Alert>
							<AlertTitle>Note from client</AlertTitle>
							<AlertDescription className="whitespace-pre-wrap">{data.note}</AlertDescription>
						</Alert>
					) : null}

					<Alert>
						<AlertTitle>Pre-notarization review</AlertTitle>
						<AlertDescription>
							These files are for your review only. They are not yet part of a formal notarization
							workflow until you accept them through the usual process.
						</AlertDescription>
					</Alert>

					<Card>
						<CardHeader>
							<CardTitle>Files in this folder</CardTitle>
							<CardDescription>
								Open each document in a new tab, then leave notes in the side sheet when needed.
							</CardDescription>
						</CardHeader>
						<CardContent className="overflow-x-auto">
							{data.files.length === 0 ? (
								<p className="text-muted-foreground text-sm">This folder contains no files.</p>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Path</TableHead>
											<TableHead className="w-28">Size</TableHead>
											<TableHead className="w-36 text-right">Notes</TableHead>
											<TableHead className="w-24 text-right">Open</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{data.files.map(f => (
											<TableRow key={f.id}>
												<TableCell className="max-w-70">
													<div className="flex items-start gap-2">
														<FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" />
														<span className="text-sm font-medium wrap-break-word">
															{f.displayPath}
														</span>
													</div>
													<p className="text-muted-foreground mt-0.5 pl-6 font-mono text-xs">
														{f.mimeType}
													</p>
												</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{formatFileSize(f.size)}
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant={f.commentCount > 0 ? "secondary" : "ghost"}
														size="sm"
														type="button"
														className="gap-1.5"
														onClick={() => setCommentsFor({ id: f.id, displayPath: f.displayPath })}
													>
														<MessageSquareText className="size-3.5" />
														{f.commentCount > 0 ? f.commentCount : "Add"}
													</Button>
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														type="button"
														disabled={getSharedVaultFileReadUrl.isPending}
														onClick={() => void openSharedFile(f.id)}
													>
														<ExternalLink className="mr-1 size-3.5" />
														Open
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>

					{commentsFor ? (
						<VaultShareFileCommentsSheet
							token={token}
							fileId={commentsFor.id}
							displayPath={commentsFor.displayPath}
							open
							onOpenChange={open => {
								if (!open) setCommentsFor(null)
							}}
						/>
					) : null}
				</div>
			</main>
		</div>
	)
}
