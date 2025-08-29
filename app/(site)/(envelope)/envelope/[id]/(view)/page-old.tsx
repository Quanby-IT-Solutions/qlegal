"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import {
	Activity,
	AlertCircle,
	ArrowLeft,
	Bell,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	Download,
	Edit,
	FileText,
	Folder,
	Info,
	Loader2,
	MoreVertical,
	Settings,
	Share2,
	Upload,
	Users
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from "@/core/components/ui/collapsible"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from "@/core/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/core/components/ui/dropdown-menu"

import { usePresignedUrl } from "@/services/supabase/presigned-url"
import { useUploadFile } from "@/services/supabase/upload"
import { trpc } from "@/services/trpc/client"

import { SimplePdfViewer } from "@/features/envelopes-lite/components/simple-pdf-viewer"
import type { Document } from "@/features/envelopes-lite/types/envelope"

// Mock envelope data
const mockEnvelope = {
	id: "1",
	title: "Contract Agreement - ABC Corp",
	status: "pending",
	createdAt: "2024-01-15",
	updatedAt: "2024-01-20",
	description:
		"This contract outlines the terms and conditions for the partnership agreement between ABC Corp and our company. All parties must review and sign the document before the deadline.",
	participants: [
		{
			id: "1",
			name: "John Smith",
			email: "john@example.com",
			avatar:
				"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
			role: "sender",
			status: "completed",
			signedAt: "2024-01-18"
		},
		{
			id: "2",
			name: "Sarah Johnson",
			email: "sarah@example.com",
			avatar:
				"https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
			role: "signer",
			status: "pending",
			signedAt: null
		},
		{
			id: "3",
			name: "Mike Wilson",
			email: "mike@example.com",
			avatar:
				"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
			role: "signer",
			status: "pending",
			signedAt: null
		}
	],
	documents: [
		{
			id: "file-1",
			name: "Contract_Agreement_v1.pdf",
			size: "2.4 MB",
			type: "pdf",
			uploadedAt: "2024-01-15",
			pages: 12,
			content: "...",
			tags: ["Contract", "Partnership", "Legal", "Enterprise"]
		}
	],
	activity: [
		{
			id: "1",
			type: "created",
			user: "John Smith",
			timestamp: "2024-01-15 10:30 AM",
			description: "Envelope created"
		}
	],
	lastActivity: "2 hours ago",
	deadline: "2024-01-25",
	tags: ["Contract", "Partnership", "Legal"]
}

const statusColors = {
	pending: "bg-amber-50 text-amber-700 border-amber-200",
	completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
	draft: "bg-slate-50 text-slate-700 border-slate-200"
}

const roleColors = {
	sender: "bg-blue-50 text-blue-700 border-blue-200",
	signer: "bg-purple-50 text-purple-700 border-purple-200",
	viewer: "bg-gray-50 text-gray-700 border-gray-200"
}

const participantStatusIcons = {
	completed: <CheckCircle className="h-4 w-4 text-green-600" />,
	pending: <Clock className="h-4 w-4 text-yellow-600" />,
	requested: <Clock className="h-4 w-4 text-blue-600" />,
	declined: <AlertCircle className="h-4 w-4 text-red-600" />
}

const activityIcons = {
	created: <FileText className="h-4 w-4 text-blue-600" />,
	uploaded: <Download className="h-4 w-4 text-green-600" />,
	sent: <Share2 className="h-4 w-4 text-purple-600" />,
	signed: <CheckCircle className="h-4 w-4 text-green-600" />
}

export default function EnvelopeViewPage({
	params
}: {
	params: Promise<{ envelopeId: string }>
}) {
	const [mounted, setMounted] = useState(false)
	const [envelopeId, setEnvelopeId] = useState("")
	const [pendingFiles, setPendingFiles] = useState<File[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const { status, data: session } = useSession()
	const [previewOpen, setPreviewOpen] = useState(false)
	const [previewDoc, setPreviewDoc] = useState<{
		id: string
		name: string
		path: string
	} | null>(null)
	const [openDisclosures, setOpenDisclosures] = useState<Set<string>>(new Set())

	// Query for document viewing
	const {
		data: documentForViewing,
		isLoading: isDocumentLoading,
		error: documentError
	} = trpc.envelopeLite.getDocumentForViewing.useQuery(
		{
			documentId: previewDoc?.id ?? "",
			envelopeId: envelopeId
		},
		{
			enabled: !!previewDoc?.id && !!envelopeId && envelopeId.length > 0,
			retry: 2,
			retryDelay: 1000
		}
	)

	useEffect(() => {
		setMounted(true)
		void params.then(({ envelopeId }) => {
			setEnvelopeId(envelopeId)
		})
	}, [params])

	const { data: myEnvelopes, refetch: refetchEnvelopes } =
		trpc.envelopeLite.getMyEnvelopes.useQuery(undefined, {
			enabled: status === "authenticated",
			refetchOnWindowFocus: false,
			retry: false
		})

	const { data: envelopeById } = trpc.envelopeLite.getEnvelopeById.useQuery(
		{ envelopeId },
		{ enabled: status === "authenticated" && envelopeId.length > 0 }
	)

	const resolvedTitle = useMemo(() => {
		return (
			envelopeById?.title ??
			myEnvelopes?.find((e) => e.id === envelopeId)?.title ??
			""
		)
	}, [envelopeById?.title, myEnvelopes, envelopeId])

	const { data: documents, refetch: refetchDocuments } =
		trpc.envelopeLite.getEnvelopeDocuments.useQuery(
			{ envelopeId },
			{ enabled: status === "authenticated" && envelopeId.length > 0 }
		)

	// Query for pending recipient requests
	const pendingRequests =
		trpc.envelopeLite.getPendingRecipientRequests.useQuery(
			{ envelopeId },
			{ enabled: status === "authenticated" && envelopeId.length > 0 }
		)

	const createDocuments = trpc.envelopeLite.createDocuments.useMutation({
		onSuccess: async () => {
			await Promise.all([refetchDocuments(), refetchEnvelopes()])
			setPendingFiles([])
			toast.success("Documents uploaded successfully!")
		},
		onError: (error) => {
			console.error("Document creation error:", error)
			toast.error("Failed to upload documents. Please try again.")
		}
	})

	// Accept/decline recipient request mutations
	const acceptRequest = trpc.envelopeLite.acceptRecipientRequest.useMutation({
		onSuccess: async () => {
			await Promise.all([
				refetchEnvelopes(),
				refetchDocuments(),
				pendingRequests.refetch()
			])
			toast.success("Request accepted successfully!")
		},
		onError: (error) => {
			console.error("Accept request error:", error)
			if (error.message.includes("Recipient not found")) {
				toast.error("Request already processed!")
			} else {
				toast.error("Failed to accept request. Please try again.")
			}
		}
	})

	const declineRequest = trpc.envelopeLite.declineRecipientRequest.useMutation({
		onSuccess: async () => {
			await Promise.all([
				refetchEnvelopes(),
				refetchDocuments(),
				pendingRequests.refetch()
			])
			toast.success("Request declined successfully!")
		},
		onError: (error) => {
			console.error("Decline request error:", error)
			toast.error("Failed to decline request. Please try again.")
		}
	})

	// Publish envelope mutation
	const publishEnvelope = trpc.envelopeLite.publishEnvelope.useMutation({
		onSuccess: async () => {
			await Promise.all([refetchEnvelopes(), refetchDocuments()])
			toast.success("Envelope published successfully!")
		},
		onError: (error) => {
			console.error("Publish envelope error:", error)
			toast.error("Failed to publish envelope. Please try again.")
		}
	})

	// Optimistic updates for immediate UI feedback
	const [optimisticUpdates, setOptimisticUpdates] = useState<
		Record<string, string>
	>({})

	const handleAcceptRequest = (recipientId: string) => {
		// Optimistically update the UI
		setOptimisticUpdates((prev) => ({ ...prev, [recipientId]: "APPROVED" }))
		acceptRequest.mutate({ recipientId })
	}

	const handleDeclineRequest = (recipientId: string) => {
		// Optimistically update the UI
		setOptimisticUpdates((prev) => ({ ...prev, [recipientId]: "REJECTED" }))
		declineRequest.mutate({ recipientId })
	}

	// Add upload hooks
	const presignedUrl = usePresignedUrl()
	const uploadFile = useUploadFile()

	const addFiles = (filesList: FileList | null) => {
		if (!filesList || filesList.length === 0) return
		const newFiles = Array.from(filesList)
		setPendingFiles((prev) => [...prev, ...newFiles])
	}

	const handleUpload = async () => {
		if (pendingFiles.length === 0) return

		setIsUploading(true)
		try {
			toast.info(`Uploading ${pendingFiles.length} file(s) to storage...`)

			// Upload each file to Supabase storage first
			const uploadedFiles = []

			for (const file of pendingFiles) {
				// Generate presigned URL for upload
				const presign = await presignedUrl.mutateAsync({
					file,
					bucket: "envelopes",
					folderPath: `${envelopeId}/unsigned`,
					upsert: false
				})

				// Upload the file to Supabase
				await uploadFile.mutateAsync({
					signedUrl: presign.signedUrl,
					file
				})

				uploadedFiles.push({
					name: file.name,
					type: file.type,
					size: file.size,
					path: presign.path // Use the actual path from Supabase
				})
			}

			toast.success("Files uploaded successfully! Creating document records...")

			// Create document records with the correct paths
			createDocuments.mutate({ envelopeId, files: uploadedFiles })
		} catch (error) {
			console.error("Upload error:", error)
			toast.error("Failed to upload files. Please try again.")
		} finally {
			setIsUploading(false)
		}
	}

	const openPreview = (doc: { id: string; name: string; path: string }) => {
		setPreviewDoc(doc)
		setPreviewOpen(true)
	}

	const toggleDisclosure = (documentId: string) => {
		setOpenDisclosures((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(documentId)) {
				newSet.delete(documentId)
			} else {
				newSet.add(documentId)
			}
			return newSet
		})
	}

	if (!mounted) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="animate-pulse">
					<div className="border-b border-gray-200 bg-white px-6 py-4">
						<div className="h-6 w-1/3 rounded bg-gray-200"></div>
					</div>
					<div className="p-6">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							<div className="space-y-6 lg:col-span-2">
								<div className="rounded-lg border border-gray-200 bg-white p-6">
									<div className="mb-4 h-4 rounded bg-gray-200"></div>
									<div className="h-32 rounded bg-gray-200"></div>
								</div>
							</div>
							<div className="space-y-6">
								<div className="rounded-lg border border-gray-200 bg-white p-6">
									<div className="mb-4 h-4 rounded bg-gray-200"></div>
									<div className="space-y-2">
										<div className="h-3 rounded bg-gray-200"></div>
										<div className="h-3 rounded bg-gray-200"></div>
										<div className="h-3 rounded bg-gray-200"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<>
			<SiteNavbar
				items={[
					{ label: "Envelopes", url: "/envelopes" },
					{ label: resolvedTitle, url: `/envelope/${envelopeId}` }
				]}
			/>
			<div className="min-h-screen bg-gray-50">
				{/* Header */}
				<div className="border-b border-gray-200 bg-white px-6 py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-6">
							<Link
								href="/envelopes"
								className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
							>
								<ArrowLeft className="h-4 w-4" />
								Back to Envelopes
							</Link>
							<div className="h-8 w-px bg-gray-200"></div>
							<div>
								<div className="mb-1 flex items-center gap-3">
									<div className="rounded-lg bg-blue-100 p-2">
										<Folder className="h-5 w-5 text-blue-600" />
									</div>
									<h1 className="text-2xl font-bold text-gray-900">
										{resolvedTitle || (
											<span className="inline-block h-6 w-40 animate-pulse rounded bg-gray-200 align-middle" />
										)}
									</h1>
								</div>
								<p className="text-sm text-gray-500">
									Envelope ID: {envelopeId}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
									<Share2 className="h-4 w-4" />
									Share
								</button>
								<button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
									<Download className="h-4 w-4" />
									Download All
								</button>
								<span
									className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[(myEnvelopes?.find((e) => e.id === envelopeId)?.status?.toLowerCase?.() as keyof typeof statusColors) || (mockEnvelope.status as keyof typeof statusColors)]}`}
								>
									{(
										myEnvelopes?.find((e) => e.id === envelopeId)?.status ??
										mockEnvelope.status
									)
										.toString()
										.charAt(0)
										.toUpperCase() +
										(
											myEnvelopes?.find((e) => e.id === envelopeId)?.status ??
											mockEnvelope.status
										)
											.toString()
											.slice(1)}
								</span>
							</div>
						</div>
					</div>

					{/* Content */}
					<div className="p-6">
						<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
							{/* Main Content Area */}
							<div className="space-y-8 lg:col-span-2">
								{/* Upload Documents - Independent Card */}
								<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
									<div className="border-b border-gray-100 px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="rounded-lg bg-blue-50 p-2">
												<FileText className="h-5 w-5 text-blue-600" />
											</div>
											<div>
												<h2 className="text-xl font-semibold text-gray-900">
													Upload Documents
												</h2>
												<p className="text-sm text-gray-500">
													Select multiple PDF files to upload
												</p>
											</div>
										</div>
										<div className="p-6">
											<div
												className={`rounded-lg border-2 border-dashed bg-gray-50 p-8 text-center ${isDragging ? "border-blue-400 bg-blue-50/50" : "border-gray-300"}`}
												onDragOver={(e) => {
													e.preventDefault()
													setIsDragging(true)
												}}
												onDragLeave={() => setIsDragging(false)}
												onDrop={(e) => {
													e.preventDefault()
													setIsDragging(false)
													addFiles(e.dataTransfer.files)
												}}
											>
												<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white">
													<Upload className="h-6 w-6 text-gray-500" />
												</div>
												<p className="font-medium text-gray-900">
													Choose File or Drag and Drop
												</p>
												<p className="mt-1 text-sm text-gray-500">
													PDF up to 10MB
												</p>
												<div className="mt-5">
													<label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
														<Upload className="h-4 w-4" />
														Choose Files
														<input
															type="file"
															accept="application/pdf"
															className="hidden"
															multiple
															onChange={(e) => addFiles(e.target.files)}
														/>
													</label>
												</div>
											</div>

											{pendingFiles.length > 0 && (
												<div className="mt-4">
													<div className="mb-2 flex items-center justify-between">
														<p className="text-sm text-gray-600">
															{pendingFiles.length} file(s) selected
														</p>
														<button
															onClick={handleUpload}
															disabled={
																createDocuments.isPending || isUploading
															}
															className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
														>
															{isUploading || createDocuments.isPending
																? "Uploading..."
																: `Upload ${pendingFiles.length} File(s)`}
														</button>
													</div>
													<ul className="space-y-1 text-sm text-gray-700">
														{pendingFiles.map((f) => (
															<li key={`${f.name}-${f.size}`}>
																{f.name} • {(f.size / 1024 / 1024).toFixed(2)}{" "}
																MB
															</li>
														))}
													</ul>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Documents - Listing Card */}
								<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
									<div className="border-b border-gray-100 px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="rounded-lg bg-gray-50 p-2">
												<FileText className="h-5 w-5 text-gray-700" />
											</div>
											<div>
												<h2 className="text-xl font-semibold text-gray-900">
													Documents
												</h2>
												<p className="text-sm text-gray-500">
													{documents?.length ?? 0} document(s)
												</p>
											</div>
										</div>
										<div className="p-6">
											{documents && documents.length > 0 ? (
												<div className="grid grid-cols-1 gap-3">
													{documents.map((doc) => {
														// Check if this document has pending requests
														const docPendingRequests =
															pendingRequests.data?.filter(
																(request) => request.documentId === doc.id
															)
														const hasPendingRequests = docPendingRequests
															? docPendingRequests.length > 0
															: false
														const isOpen = openDisclosures.has(doc.id)

														return (
															<Collapsible
																key={doc.id}
																open={isOpen}
																onOpenChange={() => toggleDisclosure(doc.id)}
																className={`rounded-lg border bg-white ${
																	(doc as Document).status === "SIGNED"
																		? "border-green-300 bg-green-50/30 shadow-md"
																		: hasPendingRequests
																			? "border-orange-300 bg-orange-50/30 shadow-md"
																			: ""
																}`}
															>
																{/* Document Header - Always visible */}
																<div className="flex items-center justify-between p-3">
																	<div className="flex items-center gap-3">
																		<div
																			className={`rounded p-2 ${
																				(doc as Document).status === "SIGNED"
																					? "bg-green-100"
																					: hasPendingRequests
																						? "bg-orange-100"
																						: "bg-gray-50"
																			}`}
																		>
																			<FileText
																				className={`h-4 w-4 ${
																					(doc as Document).status === "SIGNED"
																						? "text-green-600"
																						: hasPendingRequests
																							? "text-orange-600"
																							: "text-gray-600"
																				}`}
																			/>
																		</div>
																		<div>
																			<div className="flex items-center gap-2">
																				<p className="text-sm font-medium text-gray-900">
																					{doc.name}
																				</p>
																				{hasPendingRequests && (
																					<span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
																						<Clock className="mr-1 h-3 w-3" />
																						Pending Request (
																						{docPendingRequests?.length ?? 0})
																					</span>
																				)}
																				{(doc as Document).status ===
																					"SIGNED" && (
																					<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
																						<CheckCircle className="mr-1 h-3 w-3" />
																						Signed
																					</span>
																				)}
																			</div>
																			<p className="text-xs text-gray-500">
																				{(doc.size / 1024 / 1024).toFixed(2)} MB
																				• {doc.type} •{" "}
																				{format(
																					new Date(doc.createdAt),
																					"PP p"
																				)}
																			</p>
																		</div>
																	</div>
																	<div className="flex items-center gap-2">
																		{/* Recipient Avatars - Only show approved recipients */}
																		{(
																			doc as typeof doc & {
																				recipients: Array<{
																					id: string
																					name: string
																					email: string
																					user: {
																						id: string
																						name: string
																						email: string
																						image: string | null
																					} | null
																				}>
																			}
																		).recipients?.length > 0 && (
																			<div className="flex items-center gap-1">
																				{(
																					doc as typeof doc & {
																						recipients: Array<{
																							id: string
																							name: string
																							email: string
																							user: {
																								id: string
																								name: string
																								email: string
																								image: string | null
																							} | null
																						}>
																					}
																				).recipients
																					.filter((r) => {
																						// Only show recipients who are approved or have optimistic approval
																						const recipient =
																							envelopeById?.recipient?.find(
																								(rec) => rec.id === r.id
																							) ??
																							myEnvelopes
																								?.find(
																									(e) => e.id === envelopeId
																								)
																								?.recipient?.find(
																									(rec) => rec.id === r.id
																								)
																						return (
																							recipient?.status ===
																								"APPROVED" ||
																							optimisticUpdates[r.id] ===
																								"APPROVED"
																						)
																					})
																					.map((r) => (
																						<Avatar
																							key={r.id}
																							className="h-6 w-6 border"
																						>
																							<AvatarImage
																								src={r.user?.image ?? undefined}
																							/>
																							<AvatarFallback className="text-[10px]">
																								{(r.user?.name ?? r.name ?? "?")
																									.split(" ")
																									.map((n: string) => n[0])
																									.join("")}
																							</AvatarFallback>
																						</Avatar>
																					))}
																			</div>
																		)}

																		{/* Disclosure Trigger for documents with pending requests */}
																		{hasPendingRequests && (
																			<CollapsibleTrigger asChild>
																				<Button
																					variant="ghost"
																					size="sm"
																					className="p-1 text-gray-400 transition-colors hover:text-orange-600"
																				>
																					{isOpen ? (
																						<ChevronDown className="h-4 w-4" />
																					) : (
																						<ChevronRight className="h-4 w-4" />
																					)}
																				</Button>
																			</CollapsibleTrigger>
																		)}

																		{/* Actions dropdown */}
																		<DropdownMenu>
																			<DropdownMenuTrigger asChild>
																				<Button
																					variant="outline"
																					size="sm"
																					className="h-8 px-2"
																				>
																					<MoreVertical className="h-4 w-4" />
																				</Button>
																			</DropdownMenuTrigger>
																			<DropdownMenuContent align="end">
																				<DropdownMenuItem>
																					Sign Document
																				</DropdownMenuItem>
																				{/* Only show Update Positioning for envelope creator */}
																				{(envelopeById?.userId ===
																					session?.user?.id ||
																					myEnvelopes?.find(
																						(e) => e.id === envelopeId
																					)?.userId === session?.user?.id) && (
																					<DropdownMenuItem asChild>
																						<Link
																							href={`/envelope/${envelopeId}/document/${doc.id}/update-prepositioning`}
																						>
																							Update Positioning
																						</Link>
																					</DropdownMenuItem>
																				)}
																				<DropdownMenuItem
																					onClick={() => {
																						const origin =
																							typeof window !== "undefined"
																								? window.location.origin
																								: ""
																						const link = `${origin}/envelope/invite?token=${encodeURIComponent(doc.id)}`
																						void navigator.clipboard.writeText(
																							link
																						)
																					}}
																				>
																					Copy Invite Link
																				</DropdownMenuItem>
																				<DropdownMenuItem
																					onClick={() =>
																						openPreview({
																							id: doc.id,
																							name: doc.name,
																							path: doc.path
																						})
																					}
																				>
																					View Document
																				</DropdownMenuItem>
																			</DropdownMenuContent>
																		</DropdownMenu>
																	</div>
																</div>

																{/* Disclosure Content - Pending Requests */}
																{hasPendingRequests && (
																	<CollapsibleContent className="border-t border-orange-200 bg-orange-50/30">
																		<div className="p-3">
																			<h4 className="mb-3 text-sm font-medium text-orange-800">
																				Pending Requests
																			</h4>
																			<div className="space-y-2">
																				{docPendingRequests?.map((request) => (
																					<div
																						key={request.id}
																						className="flex items-center justify-between rounded-lg border border-orange-200 bg-white p-3"
																					>
																						<div className="flex flex-col">
																							<span className="text-sm font-medium text-gray-900">
																								{(
																									request.user as {
																										name: string | null
																										email: string | null
																									} | null
																								)?.name ?? "Unknown User"}
																							</span>
																							<span className="text-xs text-gray-600">
																								{request.placeholderId}
																							</span>
																						</div>
																						<div className="flex items-center gap-2">
																							<Button
																								size="sm"
																								variant="outline"
																								className="h-7 border-green-200 px-3 text-xs text-green-600 hover:bg-green-50"
																								onClick={() =>
																									handleAcceptRequest(
																										request.id
																									)
																								}
																								disabled={
																									acceptRequest.isPending ||
																									declineRequest.isPending
																								}
																							>
																								✓ Accept
																							</Button>
																							<Button
																								size="sm"
																								variant="outline"
																								className="h-7 border-red-200 px-3 text-xs text-red-600 hover:bg-red-50"
																								onClick={() =>
																									handleDeclineRequest(
																										request.id
																									)
																								}
																								disabled={
																									acceptRequest.isPending ||
																									declineRequest.isPending
																								}
																							>
																								✗ Decline
																							</Button>
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	</CollapsibleContent>
																)}
															</Collapsible>
														)
													})}
												</div>
											) : (
												<p className="text-sm text-gray-500">
													No documents uploaded yet.
												</p>
											)}
										</div>
									</div>
								</div>

								{/* Activity */}
								<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
									<div className="border-b border-gray-100 px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="rounded-lg bg-purple-50 p-2">
												<Activity className="h-5 w-5 text-purple-600" />
											</div>
											<div>
												<h2 className="text-xl font-semibold text-gray-900">
													Activity
												</h2>
												<p className="text-sm text-gray-500">
													Recent actions and updates
												</p>
											</div>
										</div>
										<div className="p-6">
											<div className="space-y-4">
												{mockEnvelope.activity.map((item) => (
													<div
														key={item.id}
														className="flex items-start gap-4 rounded-lg p-4 transition-colors hover:bg-gray-50"
													>
														<div className="mt-1 flex-shrink-0">
															<div className="rounded-lg bg-gray-100 p-2">
																{
																	activityIcons[
																		item.type as keyof typeof activityIcons
																	]
																}
															</div>
														</div>
														<div className="min-w-0 flex-1">
															<p className="text-sm font-medium text-gray-900">
																{item.description}
															</p>
															<p className="mt-1 text-xs text-gray-500">
																{item.user} • {item.timestamp}
															</p>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Sidebar */}
							<div className="space-y-8">
								{/* Participants */}
								<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
									<div className="border-b border-gray-100 px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="rounded-lg bg-green-50 p-2">
												<Users className="h-5 w-5 text-green-600" />
											</div>
											<div>
												<h2 className="text-xl font-semibold text-gray-900">
													Participants
												</h2>
												<p className="text-sm text-gray-500">
													{(
														envelopeById?.recipient ??
														myEnvelopes?.find((e) => e.id === envelopeId)
															?.recipient ??
														[]
													).filter(
														(recipient) =>
															!(
																recipient.status === "PENDING" &&
																recipient.email?.includes("placeholder.com")
															)
													).length + 1}{" "}
													people involved
												</p>
											</div>
										</div>
									</div>
									<div className="p-6">
										<div className="space-y-4">
											{/* Show envelope creator first */}
											{(envelopeById?.createdBy ??
												myEnvelopes?.find((e) => e.id === envelopeId)
													?.createdBy) && (
												<div className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50">
													<div className="flex items-center gap-3">
														<Avatar className="h-10 w-10 shadow-sm ring-2 ring-white">
															<AvatarImage
																src={
																	(
																		envelopeById?.createdBy ??
																		myEnvelopes?.find(
																			(e) => e.id === envelopeId
																		)?.createdBy
																	)?.image ?? ""
																}
															/>
															<AvatarFallback className="text-sm font-medium">
																{(
																	(
																		envelopeById?.createdBy ??
																		myEnvelopes?.find(
																			(e) => e.id === envelopeId
																		)?.createdBy
																	)?.name ?? "Unknown"
																)
																	.split(" ")
																	.map((n) => n[0])
																	.join("")}
															</AvatarFallback>
														</Avatar>
														<div>
															<h4 className="font-semibold text-gray-900">
																{(
																	envelopeById?.createdBy ??
																	myEnvelopes?.find((e) => e.id === envelopeId)
																		?.createdBy
																)?.name ?? "Unknown"}
															</h4>
															<div className="mt-1 flex items-center gap-2">
																<span
																	className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors.sender}`}
																>
																	creator
																</span>
																{participantStatusIcons.completed}
															</div>
															<p className="mt-1 text-xs text-gray-500">
																{
																	(
																		envelopeById?.createdBy ??
																		myEnvelopes?.find(
																			(e) => e.id === envelopeId
																		)?.createdBy
																	)?.email
																}
															</p>
														</div>
													</div>
												</div>
											)}

											{/* Show recipients */}
											{(
												envelopeById?.recipient ??
												myEnvelopes?.find((e) => e.id === envelopeId)
													?.recipient ??
												[]
											)
												.filter(
													(recipient) =>
														!(
															recipient.status === "PENDING" &&
															recipient.email?.includes("placeholder.com")
														)
												)
												.filter(
													(recipient, index, self) =>
														// Remove duplicates based on user ID
														index ===
														self.findIndex((r) => r.userId === recipient.userId)
												)
												.map((recipient) => (
													<div
														key={recipient.id}
														className="flex items-center justify-between rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
													>
														<div className="flex items-center gap-3">
															<Avatar className="h-10 w-10 shadow-sm ring-2 ring-white">
																<AvatarImage
																	src={recipient.user?.image ?? ""}
																/>
																<AvatarFallback className="text-sm font-medium">
																	{(recipient.user?.name ?? "Unknown")
																		.split(" ")
																		.map((n) => n[0])
																		.join("")}
																</AvatarFallback>
															</Avatar>
															<div>
																<h4 className="font-semibold text-gray-900">
																	{recipient.user?.name ?? "Unknown User"}
																</h4>
																<div className="mt-1 flex items-center gap-2">
																	<span
																		className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[recipient.role?.toLowerCase() as keyof typeof roleColors] ?? roleColors.signer}`}
																	>
																		{recipient.role?.toLowerCase() ??
																			"participant"}
																	</span>
																	{participantStatusIcons[
																		recipient.status?.toLowerCase() as keyof typeof participantStatusIcons
																	] ?? participantStatusIcons.pending}
																</div>
																<p className="mt-1 text-xs text-gray-500">
																	{recipient.user?.email}
																</p>
															</div>
														</div>
														{/* Only show status badges, no accept/decline buttons in sidebar */}
														{recipient.status === "REQUESTED" &&
															!optimisticUpdates[recipient.id] && (
																<span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">
																	Requested
																</span>
															)}
														{(recipient.status === "APPROVED" ||
															optimisticUpdates[recipient.id] ===
																"APPROVED") && (
															<span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-600">
																Approved
															</span>
														)}
														{(recipient.status === "REJECTED" ||
															optimisticUpdates[recipient.id] ===
																"REJECTED") && (
															<span className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
																Declined
															</span>
														)}
													</div>
												))}

											{/* Show message if no participants */}
											{(
												envelopeById?.recipient ??
												myEnvelopes?.find((e) => e.id === envelopeId)
													?.recipient ??
												[]
											).filter(
												(recipient) =>
													!(
														recipient.status === "PENDING" &&
														recipient.email?.includes("placeholder.com")
													)
											).length === 0 && (
												<div className="py-8 text-center">
													<Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
													<p className="text-sm text-gray-500">
														No participants have been invited yet.
													</p>
													<p className="mt-1 text-xs text-gray-400">
														Share the invite link to get started.
													</p>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Envelope Info */}
								<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
									<div className="border-b border-gray-100 px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="rounded-lg bg-blue-50 p-2">
												<Info className="h-5 w-5 text-blue-600" />
											</div>
											<div>
												<h2 className="text-xl font-semibold text-gray-900">
													Envelope Info
												</h2>
												<p className="text-sm text-gray-500">
													Key details and metadata
												</p>
											</div>
										</div>
									</div>
									<div className="p-6">
										<div className="space-y-4">
											<div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
												<div className="flex items-center gap-2">
													<Calendar className="h-4 w-4 text-gray-400" />
													<span className="text-sm text-gray-600">Created</span>
												</div>
												<span className="text-sm font-medium">
													{mockEnvelope.createdAt}
												</span>
											</div>
											<div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
												<div className="flex items-center gap-2">
													<Clock className="h-4 w-4 text-gray-400" />
													<span className="text-sm text-gray-600">
														Last Modified
													</span>
												</div>
												<span className="text-sm font-medium">
													{mockEnvelope.updatedAt}
												</span>
											</div>
											<div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
												<div className="flex items-center gap-2">
													<CheckCircle className="h-4 w-4 text-gray-400" />
													<span className="text-sm text-gray-600">Status</span>
												</div>
												<span
													className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[mockEnvelope.status as keyof typeof statusColors]}`}
												>
													{mockEnvelope.status.charAt(0).toUpperCase() +
														mockEnvelope.status.slice(1)}
												</span>
											</div>
											<div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
												<div className="flex items-center gap-2">
													<FileText className="h-4 w-4 text-gray-400" />
													<span className="text-sm text-gray-600">
														Documents
													</span>
												</div>
												<span className="text-sm font-medium">
													{documents?.length ?? 0}
												</span>
											</div>
											<div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
												<div className="flex items-center gap-2">
													<Bell className="h-4 w-4 text-gray-400" />
													<span className="text-sm text-gray-600">
														Deadline
													</span>
												</div>
												<span className="text-sm font-medium">
													{mockEnvelope.deadline}
												</span>
											</div>
										</div>
									</div>
								</div>

								{/* Quick Actions */}
								<div className="rounded-xl border border-gray-200 bg-white shadow-sm">
									<div className="border-b border-gray-100 px-6 py-5">
										<div className="flex items-center gap-3">
											<div className="rounded-lg bg-purple-50 p-2">
												<Settings className="h-5 w-5 text-purple-600" />
											</div>
											<div>
												<h2 className="text-xl font-semibold text-gray-900">
													Quick Actions
												</h2>
												<p className="text-sm text-gray-500">
													Common tasks and operations
												</p>
											</div>
										</div>
									</div>
									<div className="p-6">
										<div className="space-y-3">
											{/* Only show Publish button for envelope creator and if envelope is in DRAFT status */}
											{(envelopeById?.userId === session?.user?.id ||
												myEnvelopes?.find((e) => e.id === envelopeId)
													?.userId === session?.user?.id) &&
												(myEnvelopes?.find((e) => e.id === envelopeId)
													?.status === "DRAFT" ||
													envelopeById?.status === "DRAFT") && (
													<button
														onClick={() =>
															publishEnvelope.mutate({ envelopeId })
														}
														disabled={publishEnvelope.isPending}
														className="inline-flex w-full items-center gap-3 rounded-lg border border-blue-600 bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
													>
														<CheckCircle className="h-4 w-4" />
														{publishEnvelope.isPending
															? "Publishing..."
															: "Publish Envelope"}
													</button>
												)}
											<button className="inline-flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
												<Share2 className="h-4 w-4" />
												Share Envelope
											</button>
											<button className="inline-flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
												<Download className="h-4 w-4" />
												Download All Files
											</button>
											<button className="inline-flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
												<Edit className="h-4 w-4" />
												Edit Envelope
											</button>
											<button className="inline-flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
												<Copy className="h-4 w-4" />
												Duplicate
											</button>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Preview dialog */}
						<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
							<DialogContent className="flex h-[95vh] max-w-6xl flex-col">
								<DialogHeader className="flex-shrink-0">
									<DialogTitle>{previewDoc?.name ?? "Document"}</DialogTitle>
									<DialogDescription>Document preview</DialogDescription>
								</DialogHeader>
								<div className="mt-4 min-h-0 flex-1">
									{!previewDoc ? (
										<div className="flex h-full w-full items-center justify-center rounded bg-gray-50 p-4 text-sm text-gray-500">
											No document selected.
										</div>
									) : isDocumentLoading ? (
										<div className="flex h-full w-full items-center justify-center">
											<div className="flex justify-center text-center">
												<Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
												<p className="mt-2 text-sm text-gray-600">
													Loading document...
												</p>
											</div>
										</div>
									) : documentError ? (
										<div className="flex h-full w-full items-center justify-center rounded bg-red-50 p-4">
											<div className="text-center">
												<div className="mx-auto mb-2 h-12 w-12 rounded-full bg-red-100 p-3">
													<AlertCircle className="h-6 w-6 text-red-600" />
												</div>
												<p className="mb-2 text-sm font-medium text-red-800">
													Failed to load document
												</p>
												<p className="mb-4 text-xs text-red-600">
													{documentError.message}
												</p>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setPreviewOpen(false)}
												>
													Close
												</Button>
											</div>
										</div>
									) : (
										<SimplePdfViewer
											fileUrl={documentForViewing?.url ?? ""}
											documentName={previewDoc.name}
										/>
									)}
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</div>
		</>
	)
}
