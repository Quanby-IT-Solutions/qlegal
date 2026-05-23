"use client"

import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	ExternalLink,
	FileText,
	Folder,
	Info,
	Loader2,
	MessageSquareText,
	MoreVertical,
	Pencil,
	Plus,
	Search as SearchIcon,
	Share2,
	Trash2,
	Upload,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { PageHeader, type PageHeaderItem } from "@/core/components/navbar/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import { useUploadFile } from "@/services/supabase/upload"
import { trpc } from "@/services/trpc/client"

import { PrincipalVaultFileFeedbackSheet } from "@/features/principal-vault/components/principal-vault-file-feedback-sheet"
import { ShareVaultFolderDialog } from "@/features/principal-vault/components/share-vault-folder-dialog"

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PrincipalVaultExplorer() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const { data: session } = useSession()
	const canShareWithNotary = session?.user?.role === "PRINCIPAL" || session?.user?.role === "ENP"
	const folderParam = searchParams.get("folder")
	const parentId = folderParam && folderParam.length > 0 ? folderParam : null

	const utils = trpc.useUtils()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [newFolderOpen, setNewFolderOpen] = useState(false)
	const [newFolderName, setNewFolderName] = useState("")
	const [renameTarget, setRenameTarget] = useState<
		{ kind: "folder"; id: string; name: string } | { kind: "file"; id: string; name: string } | null
	>(null)
	const [renameValue, setRenameValue] = useState("")
	const [uploading, setUploading] = useState(false)
	const [shareFolder, setShareFolder] = useState<{ id: string; name: string } | null>(null)
	const [feedbackFile, setFeedbackFile] = useState<{ id: string; name: string } | null>(null)
	const [vaultSearch, setVaultSearch] = useState("")

	const listQuery = trpc.principalVault.list.useQuery({ parentId }, { retry: false })

	const createFolder = trpc.principalVault.createFolder.useMutation({
		onSuccess: async () => {
			toast.success("Folder created")
			setNewFolderOpen(false)
			setNewFolderName("")
			await utils.principalVault.list.invalidate({ parentId })
		},
		onError: err => toast.error(err.message),
	})

	const renameFolder = trpc.principalVault.renameFolder.useMutation({
		onSuccess: async () => {
			toast.success("Folder renamed")
			setRenameTarget(null)
			await utils.principalVault.list.invalidate({ parentId })
		},
		onError: err => toast.error(err.message),
	})

	const renameFile = trpc.principalVault.renameFile.useMutation({
		onSuccess: async () => {
			toast.success("File renamed")
			setRenameTarget(null)
			await utils.principalVault.list.invalidate({ parentId })
		},
		onError: err => toast.error(err.message),
	})

	const deleteFolder = trpc.principalVault.deleteFolder.useMutation({
		onSuccess: async () => {
			toast.success("Folder deleted")
			await utils.principalVault.list.invalidate({ parentId })
		},
		onError: err => toast.error(err.message),
	})

	const deleteFile = trpc.principalVault.deleteFile.useMutation({
		onSuccess: async () => {
			toast.success("File removed")
			await utils.principalVault.list.invalidate({ parentId })
		},
		onError: err => toast.error(err.message),
	})

	const prepareUpload = trpc.principalVault.prepareUpload.useMutation()
	const completeUpload = trpc.principalVault.completeUpload.useMutation()
	const uploadToSignedUrl = useUploadFile()
	const getMyVaultFileReadUrl = trpc.principalVault.getMyVaultFileReadUrl.useMutation()

	useEffect(() => {
		setVaultSearch("")
	}, [parentId])

	useEffect(() => {
		const err = listQuery.error
		const code =
			err && typeof err === "object" && "data" in err
				? (err as { data?: { code?: string } }).data?.code
				: undefined
		if (code === "NOT_FOUND") {
			toast.error("That folder does not exist or you cannot access it.")
			router.replace("/my-files")
		}
	}, [listQuery.error, router])

	const goToFolder = useCallback(
		(id: string | null) => {
			if (id === null) {
				router.push("/my-files")
			} else {
				router.push(`/my-files?folder=${encodeURIComponent(id)}`)
			}
		},
		[router]
	)

	const openVaultFile = useCallback(
		async (fileId: string) => {
			try {
				const { url } = await getMyVaultFileReadUrl.mutateAsync({ fileId })
				window.open(url, "_blank", "noopener,noreferrer")
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Could not open file"
				toast.error(msg)
			}
		},
		[getMyVaultFileReadUrl]
	)

	const uploadFiles = useCallback(
		async (files: File[]) => {
			if (files.length === 0) return
			setUploading(true)
			try {
				for (const file of files) {
					const { signedUrl, path } = await prepareUpload.mutateAsync({
						folderId: parentId,
						fileName: file.name,
						fileType: file.type || "application/octet-stream",
						fileSize: file.size,
					})
					await uploadToSignedUrl.mutateAsync({
						signedUrl,
						file,
						contentType: file.type || "application/octet-stream",
					})
					await completeUpload.mutateAsync({
						folderId: parentId,
						storagePath: path,
						fileName: file.name,
						fileType: file.type || "application/octet-stream",
						fileSize: file.size,
					})
				}
				toast.success(files.length === 1 ? "File uploaded" : `${files.length} files uploaded`)
				await utils.principalVault.list.invalidate({ parentId })
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Upload failed"
				toast.error(msg)
			} finally {
				setUploading(false)
			}
		},
		[parentId, prepareUpload, completeUpload, uploadToSignedUrl, utils.principalVault.list]
	)

	const onDrop = useCallback(
		(accepted: File[]) => {
			void uploadFiles(accepted)
		},
		[uploadFiles]
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		noClick: true,
		disabled: uploading || listQuery.isPending,
	})

	const pageHeaderBreadcrumbItems = useMemo((): PageHeaderItem[] => {
		const ancestors = listQuery.data?.ancestors ?? []
		if (!parentId) {
			return [{ label: "My files" }]
		}
		if (listQuery.isPending && !listQuery.data) {
			return [{ label: "My files", href: "/my-files" }, { label: "…" }]
		}
		const items: PageHeaderItem[] = [{ label: "My files", href: "/my-files" }]
		for (let i = 0; i < ancestors.length; i++) {
			const a = ancestors[i]!
			const isLast = i === ancestors.length - 1
			if (isLast) {
				items.push({ label: a.name })
			} else {
				items.push({
					label: a.name,
					href: `/my-files?folder=${encodeURIComponent(a.id)}` as Route,
				})
			}
		}
		return items
	}, [parentId, listQuery.data, listQuery.data?.ancestors, listQuery.isPending])

	const filteredFolders = useMemo(() => {
		const folders = listQuery.data?.folders ?? []
		const q = vaultSearch.trim().toLowerCase()
		if (!q) return folders
		return folders.filter(f => f.name.toLowerCase().includes(q))
	}, [listQuery.data?.folders, vaultSearch])

	const filteredFiles = useMemo(() => {
		const files = listQuery.data?.files ?? []
		const q = vaultSearch.trim().toLowerCase()
		if (!q) return files
		return files.filter(f => f.name.toLowerCase().includes(q))
	}, [listQuery.data?.files, vaultSearch])

	const currentFolderLabel =
		parentId && listQuery.data?.ancestors?.length
			? listQuery.data.ancestors[listQuery.data.ancestors.length - 1]?.name
			: null

	const openRename = useCallback(
		(target: { kind: "folder" | "file"; id: string; name: string }) => {
			setRenameTarget(target)
			setRenameValue(target.name)
		},
		[]
	)

	const submitRename = useCallback(() => {
		if (!renameTarget || !renameValue.trim()) return
		if (renameTarget.kind === "folder") {
			renameFolder.mutate({ id: renameTarget.id, name: renameValue.trim() })
		} else {
			renameFile.mutate({ id: renameTarget.id, name: renameValue.trim() })
		}
	}, [renameTarget, renameValue, renameFolder, renameFile])

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={pageHeaderBreadcrumbItems} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-6xl space-y-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-bold tracking-tight">
								{currentFolderLabel ?? "My files"}
							</h1>
							<p className="text-muted-foreground mt-1 max-w-2xl text-sm">
								Organize drafts and supporting documents before you meet with a notary. This area
								works like a simple drive: folders and uploads stay private to your account.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{canShareWithNotary && parentId && currentFolderLabel ? (
								<Button
									variant="outline"
									type="button"
									onClick={() => setShareFolder({ id: parentId, name: currentFolderLabel })}
								>
									<Share2 className="mr-2 size-4" />
									Share this folder
								</Button>
							) : null}
							<Button variant="outline" onClick={() => setNewFolderOpen(true)} type="button">
								<Plus className="mr-2 size-4" />
								New folder
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								className="sr-only"
								multiple
								disabled={uploading || listQuery.isPending}
								onChange={e => {
									const list = e.target.files ? Array.from(e.target.files) : []
									e.target.value = ""
									void uploadFiles(list)
								}}
							/>
							<Button
								type="button"
								disabled={uploading || listQuery.isPending}
								onClick={() => fileInputRef.current?.click()}
							>
								{uploading ? (
									<>
										<Loader2 className="mr-2 size-4 animate-spin" />
										Uploading…
									</>
								) : (
									<>
										<Upload className="mr-2 size-4" />
										Upload
									</>
								)}
							</Button>
						</div>
					</div>

					<Alert>
						<Info className="size-4" />
						<AlertTitle>Not reviewed for notarization</AlertTitle>
						<AlertDescription>
							Files you store here have not been checked by an Electronic Notary Public (ENP) for
							readiness to notarize. You can share an entire folder (including subfolders) with an
							ENP by email or a copy-paste link so they can review contents before a session.
						</AlertDescription>
					</Alert>

					<div className="max-w-xl">
						<label className="sr-only" htmlFor="vault-folder-search">
							Search folders and files in this location
						</label>
						<div className="relative">
							<SearchIcon
								className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
								aria-hidden
							/>
							<Input
								id="vault-folder-search"
								type="search"
								placeholder="Search folders and files in this folder…"
								value={vaultSearch}
								onChange={e => setVaultSearch(e.target.value)}
								className="pl-9"
								autoComplete="off"
							/>
						</div>
					</div>

					<div
						{...getRootProps()}
						className={cn(
							"rounded-xl border border-dashed transition-colors",
							isDragActive && "border-primary bg-primary/5"
						)}
					>
						<input {...getInputProps()} />
						<Card className="border-0 shadow-none">
							<CardContent className="p-4 md:p-6">
								{listQuery.isPending ? (
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{Array.from({ length: 6 }).map((_, i) => (
											<Skeleton key={i} className="h-[4.75rem] w-full rounded-xl" />
										))}
									</div>
								) : listQuery.isError ? (
									<p className="text-destructive py-10 text-center text-sm">
										{listQuery.error.message ?? "Could not load your files."}
									</p>
								) : isDragActive ? (
									<p className="text-muted-foreground py-12 text-center text-sm">
										Drop files to upload to this folder
									</p>
								) : (
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{filteredFolders.map(f => (
											<div
												key={f.id}
												className="group bg-card border-border/80 hover:border-border dark:bg-card/90 relative flex items-stretch overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md dark:border-white/10 dark:shadow-black/25 dark:hover:border-white/[0.14] dark:hover:shadow-lg"
											>
												<button
													type="button"
													onClick={() => goToFolder(f.id)}
													className="hover:bg-muted/50 dark:hover:bg-muted/20 focus-visible:ring-ring focus-visible:ring-offset-background flex min-w-0 flex-1 items-center gap-4 rounded-l-xl p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
												>
													<div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/15 dark:bg-amber-500/[0.14] dark:ring-amber-400/20">
														<Folder
															className="size-5 text-amber-600 dark:text-amber-400"
															strokeWidth={2}
															aria-hidden
														/>
													</div>
													<div className="min-w-0 flex-1 py-0.5">
														<p className="text-foreground truncate text-[15px] leading-snug font-semibold tracking-tight">
															{f.name}
														</p>
														<p className="text-muted-foreground mt-1 text-[10px] font-medium tracking-widest uppercase">
															Folder
														</p>
													</div>
												</button>
												<div className="border-border/60 flex shrink-0 items-center border-l pr-1 pl-0.5 dark:border-white/10">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="text-muted-foreground hover:bg-muted/80 dark:hover:bg-muted/40 size-9 shrink-0 opacity-70 transition-opacity group-hover:opacity-90 hover:opacity-100"
															>
																<MoreVertical className="size-4" />
																<span className="sr-only">Folder actions</span>
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{canShareWithNotary ? (
																<DropdownMenuItem
																	onClick={() => setShareFolder({ id: f.id, name: f.name })}
																>
																	<Share2 className="size-4 shrink-0" aria-hidden />
																	Share with notary
																</DropdownMenuItem>
															) : null}
															<DropdownMenuItem
																onClick={() =>
																	openRename({ kind: "folder", id: f.id, name: f.name })
																}
															>
																<Pencil className="size-4 shrink-0" aria-hidden />
																Rename
															</DropdownMenuItem>
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={() => deleteFolder.mutate({ id: f.id })}
															>
																<Trash2 className="size-4 shrink-0" aria-hidden />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}

										{filteredFiles.map(file => (
											<div
												key={file.id}
												className="bg-card flex items-stretch gap-1 rounded-lg border"
											>
												<div className="flex min-w-0 flex-1 items-start gap-3 p-4">
													<FileText className="text-muted-foreground mt-0.5 size-8 shrink-0" />
													<div className="min-w-0 flex-1">
														<p className="truncate font-medium">{file.name}</p>
														<p className="text-muted-foreground text-xs">
															{formatFileSize(file.size)} · {file.mimeType}
														</p>
													</div>
												</div>
												<div className="flex shrink-0 items-start gap-1 pt-2 pr-2">
													{canShareWithNotary ? (
														<Button
															variant="outline"
															size="icon"
															type="button"
															className="size-8 shrink-0"
															title="Notary feedback"
															onClick={() => setFeedbackFile({ id: file.id, name: file.name })}
														>
															<MessageSquareText className="size-4" />
														</Button>
													) : null}
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="icon" className="size-8 shrink-0">
																<MoreVertical className="size-4" />
																<span className="sr-only">File actions</span>
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{canShareWithNotary ? (
																<DropdownMenuItem
																	onClick={() => setFeedbackFile({ id: file.id, name: file.name })}
																>
																	<MessageSquareText className="size-4 shrink-0" aria-hidden />
																	Notary feedback
																</DropdownMenuItem>
															) : null}
															<DropdownMenuItem
																disabled={getMyVaultFileReadUrl.isPending}
																onClick={() => void openVaultFile(file.id)}
															>
																<ExternalLink className="size-4 shrink-0" aria-hidden />
																Open
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() =>
																	openRename({ kind: "file", id: file.id, name: file.name })
																}
															>
																<Pencil className="size-4 shrink-0" aria-hidden />
																Rename
															</DropdownMenuItem>
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={() => deleteFile.mutate({ id: file.id })}
															>
																<Trash2 className="size-4 shrink-0" aria-hidden />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}

										{listQuery.data &&
											listQuery.data.folders.length === 0 &&
											listQuery.data.files.length === 0 && (
												<div className="text-muted-foreground col-span-full py-10 text-center text-sm">
													<p className="mb-2">This folder is empty.</p>
													<p>Upload files or create a folder to get started.</p>
												</div>
											)}
										{listQuery.data &&
											(listQuery.data.folders.length > 0 || listQuery.data.files.length > 0) &&
											filteredFolders.length === 0 &&
											filteredFiles.length === 0 && (
												<div className="text-muted-foreground col-span-full py-10 text-center text-sm">
													<p className="mb-1">No folders or files match your search.</p>
													<p className="text-xs">Try a different term or clear the search box.</p>
												</div>
											)}
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</div>
			</main>

			<Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>New folder</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="vault-folder-name">Name</Label>
						<Input
							id="vault-folder-name"
							value={newFolderName}
							onChange={e => setNewFolderName(e.target.value)}
							placeholder="e.g. Deed drafts"
							onKeyDown={e => {
								if (e.key === "Enter") {
									e.preventDefault()
									if (newFolderName.trim()) {
										createFolder.mutate({ parentId, name: newFolderName.trim() })
									}
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" type="button" onClick={() => setNewFolderOpen(false)}>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!newFolderName.trim() || createFolder.isPending}
							onClick={() => createFolder.mutate({ parentId, name: newFolderName.trim() })}
						>
							{createFolder.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={!!renameTarget}
				onOpenChange={open => {
					if (!open) setRenameTarget(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<Label htmlFor="vault-rename">Name</Label>
						<Input
							id="vault-rename"
							value={renameValue}
							onChange={e => setRenameValue(e.target.value)}
							onKeyDown={e => {
								if (e.key === "Enter") {
									e.preventDefault()
									submitRename()
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" type="button" onClick={() => setRenameTarget(null)}>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={!renameValue.trim() || renameFolder.isPending || renameFile.isPending}
							onClick={() => submitRename()}
						>
							{renameFolder.isPending || renameFile.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Save"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{shareFolder ? (
				<ShareVaultFolderDialog
					open
					onOpenChange={open => {
						if (!open) setShareFolder(null)
					}}
					folderId={shareFolder.id}
					folderName={shareFolder.name}
				/>
			) : null}

			{feedbackFile ? (
				<PrincipalVaultFileFeedbackSheet
					open
					fileId={feedbackFile.id}
					fileName={feedbackFile.name}
					onOpenChange={open => {
						if (!open) setFeedbackFile(null)
					}}
				/>
			) : null}
		</div>
	)
}
