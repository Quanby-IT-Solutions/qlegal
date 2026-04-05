"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useDropzone } from "react-dropzone"
import {
	ChevronRight,
	FileText,
	Folder,
	Home,
	Info,
	Loader2,
	MessageSquareText,
	MoreVertical,
	Plus,
	Share2,
	Trash2,
	Upload,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"
import { useUploadFile } from "@/services/supabase/upload"

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
	const canShareWithNotary =
		session?.user?.role === "PRINCIPAL" || session?.user?.role === "ENP"
	const folderParam = searchParams.get("folder")
	const parentId = folderParam && folderParam.length > 0 ? folderParam : null

	const utils = trpc.useUtils()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [newFolderOpen, setNewFolderOpen] = useState(false)
	const [newFolderName, setNewFolderName] = useState("")
	const [renameTarget, setRenameTarget] = useState<
		| { kind: "folder"; id: string; name: string }
		| { kind: "file"; id: string; name: string }
		| null
	>(null)
	const [renameValue, setRenameValue] = useState("")
	const [uploading, setUploading] = useState(false)
	const [shareFolder, setShareFolder] = useState<{ id: string; name: string } | null>(null)
	const [feedbackFile, setFeedbackFile] = useState<{ id: string; name: string } | null>(null)

	const listQuery = trpc.principalVault.list.useQuery(
		{ parentId },
		{ retry: false }
	)

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
		[
			parentId,
			prepareUpload,
			completeUpload,
			uploadToSignedUrl,
			utils.principalVault.list,
		]
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

	const breadcrumbItems = useMemo(() => {
		const ancestors = listQuery.data?.ancestors ?? []
		const items: Array<{ label: string; folderId: string | null }> = [
			{ label: "My files", folderId: null },
		]
		for (const a of ancestors) {
			items.push({ label: a.name, folderId: a.id })
		}
		return items
	}, [listQuery.data?.ancestors])

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
			<PageHeader items={[{ label: "My files", href: "/my-files" }]} />

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-6xl space-y-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h1 className="text-3xl font-bold tracking-tight">My files</h1>
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
									onClick={() =>
										setShareFolder({ id: parentId, name: currentFolderLabel })
									}
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
							readiness to notarize. 							You can share an entire folder (including subfolders) with an
							ENP by email or a copy-paste link so they can review contents before a session.
						</AlertDescription>
					</Alert>

					<nav aria-label="Folder path" className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
						{breadcrumbItems.map((item, i) => (
							<span key={item.folderId ?? "root"} className="flex items-center gap-1">
								{i > 0 && <ChevronRight className="size-3.5 shrink-0 opacity-60" />}
								<button
									type="button"
									className={cn(
										"hover:text-foreground inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors",
										i === breadcrumbItems.length - 1 && "text-foreground font-medium"
									)}
									onClick={() => goToFolder(item.folderId)}
								>
									{i === 0 ? <Home className="size-3.5" /> : null}
									{item.label}
								</button>
							</span>
						))}
					</nav>

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
											<Skeleton key={i} className="h-24 w-full rounded-lg" />
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
										{listQuery.data?.folders.map(f => (
											<div
												key={f.id}
												className="bg-card flex items-stretch gap-1 rounded-lg border transition-colors"
											>
												<button
													type="button"
													onClick={() => goToFolder(f.id)}
													className="hover:bg-muted/60 flex min-w-0 flex-1 items-start gap-3 rounded-l-md p-4 text-left"
												>
													<Folder className="text-amber-600 dark:text-amber-500 mt-0.5 size-8 shrink-0" />
													<div className="min-w-0 flex-1">
														<p className="truncate font-medium">{f.name}</p>
														<p className="text-muted-foreground text-xs">Folder</p>
													</div>
												</button>
												<div className="flex shrink-0 items-start pt-2 pr-2">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant="ghost" size="icon" className="size-8 shrink-0">
																<MoreVertical className="size-4" />
																<span className="sr-only">Folder actions</span>
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{canShareWithNotary ? (
																<DropdownMenuItem
																	onClick={() => setShareFolder({ id: f.id, name: f.name })}
																>
																	<Share2 className="mr-2 size-4" />
																	Share with notary
																</DropdownMenuItem>
															) : null}
															<DropdownMenuItem
																onClick={() => openRename({ kind: "folder", id: f.id, name: f.name })}
															>
																Rename
															</DropdownMenuItem>
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={() => deleteFolder.mutate({ id: f.id })}
															>
																<Trash2 className="mr-2 size-4" />
																Delete
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}

										{listQuery.data?.files.map(file => (
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
																	<MessageSquareText className="mr-2 size-4" />
																	Notary feedback
																</DropdownMenuItem>
															) : null}
															<DropdownMenuItem
																disabled={getMyVaultFileReadUrl.isPending}
																onClick={() => void openVaultFile(file.id)}
															>
																Open
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => openRename({ kind: "file", id: file.id, name: file.name })}
															>
																Rename
															</DropdownMenuItem>
															<DropdownMenuItem
																className="text-destructive focus:text-destructive"
																onClick={() => deleteFile.mutate({ id: file.id })}
															>
																<Trash2 className="mr-2 size-4" />
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
							onClick={() =>
								createFolder.mutate({ parentId, name: newFolderName.trim() })
							}
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
							disabled={
								!renameValue.trim() ||
								renameFolder.isPending ||
								renameFile.isPending
							}
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
