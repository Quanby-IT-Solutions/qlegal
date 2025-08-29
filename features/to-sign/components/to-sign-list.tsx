"use client"

import Link from "next/link"
import { useState } from "react"
import {
	Calendar,
	CheckCircle,
	Clock,
	Download,
	Eye,
	FileText,
	MessageSquare,
	PenTool,
	User,
	XCircle
} from "lucide-react"
import { useSession } from "next-auth/react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Progress } from "@/core/components/ui/progress"
import { Separator } from "@/core/components/ui/separator"

import { trpc } from "@/services/trpc/client"

import { DocumentMessageSheet } from "./document-message-sheet"
import { EnvelopeChatSheet } from "./envelope-chat-sheet"
// import { DocumentMessageSheet } from "./document-message-sheet"
// import { EnvelopeChatSheet } from "./envelope-chat-sheet"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"
import { SignDocumentDialog } from "./sign-document-dialog"

// Types for the envelope and document structure
interface EnvelopeUser {
	id: string
	name: string | null
	email: string | null
}

interface DocumentRecipient {
	id: string
	role: string
	status: string
	userId: string | null
	user: EnvelopeUser | null
}

interface EnvelopeDocument {
	id: string
	name: string
	url: string
	recipients: DocumentRecipient[]
}

interface EnvelopeData {
	id: string
	title: string
	description: string | null
	status: string
	createdAt: Date | string
	createdBy: EnvelopeUser | null
	documents: EnvelopeDocument[]
}

function getStatusColor(status: string) {
	switch (status.toLowerCase()) {
		case "completed":
			return "bg-green-100 text-green-800 border-green-200"
		case "published":
			return "bg-blue-100 text-blue-800 border-blue-200"
		case "draft":
			return "bg-gray-100 text-gray-800 border-gray-200"
		case "cancelled":
			return "bg-red-100 text-red-800 border-red-200"
		case "expired":
			return "bg-orange-100 text-orange-800 border-orange-200"
		default:
			return "bg-gray-100 text-gray-800 border-gray-200"
	}
}

function getStatusIcon(status: string) {
	switch (status.toLowerCase()) {
		case "completed":
			return <CheckCircle className="h-4 w-4" />
		case "published":
			return <FileText className="h-4 w-4" />
		case "draft":
			return <FileText className="h-4 w-4" />
		case "cancelled":
			return <XCircle className="h-4 w-4" />
		case "expired":
			return <Clock className="h-4 w-4" />
		default:
			return <FileText className="h-4 w-4" />
	}
}

function getSignatureProgressBar(doc: {
	recipients?: Array<{ status: string; role?: string }>
}) {
	if (!doc.recipients) return null
	const signersOnly = doc.recipients.filter((r) => r.role === "SIGNER")
	if (signersOnly.length === 0) return null

	const signedCount = signersOnly.filter((r) => r.status === "SIGNED").length
	const totalCount = signersOnly.length
	const percent =
		totalCount === 0 ? 0 : Math.round((signedCount / totalCount) * 100)
	return (
		<div className="flex min-w-[60px] max-w-[120px] items-center gap-2">
			<Progress value={percent} />
			<span
				className={`w-10 text-right text-xs font-medium ${percent === 100 ? "text-green-600" : "text-gray-600"}`}
			>
				{signedCount}/{totalCount}
			</span>
		</div>
	)
}

export function ToSignList() {
	const { data: session, status } = useSession()

	const { data: pendingData, isLoading: pendingLoading } =
		trpc.toSign.listEnvelopesToSign.useQuery(
			{
				status: "PENDING",
				userId: session?.user?.id ?? ""
			},
			{
				enabled: !!session?.user?.id,
				staleTime: 1000 * 60 // 1 minute
			}
		)

	const { data: signedData, isLoading: signedLoading } =
		trpc.toSign.listEnvelopesToSign.useQuery(
			{
				status: "SIGNED",
				userId: session?.user?.id ?? ""
			},
			{
				enabled: !!session?.user?.id,
				staleTime: 1000 * 60 // 1 minute
			}
		)

	const [signDialogOpen, setSignDialogOpen] = useState(false)
	const [selectedDocument, setSelectedDocument] = useState<{
		id: string
		name: string
		url: string
		envelopeId: string
	} | null>(null)

	const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false)
	const [selectedEnvelope, setSelectedEnvelope] = useState<EnvelopeData | null>(
		null
	)

	const pendingEnvelopes = pendingData?.envelopes ?? []
	const signedEnvelopes = signedData?.envelopes ?? []
	const isLoading = pendingLoading || signedLoading || status === "loading"

	const handleSignDocument = (
		document: {
			id: string
			name: string
			url?: string
			fileUrl?: string | null
		},
		envelopeId: string
	) => {
		setSelectedDocument({
			id: document.id,
			name: document.name,
			url: document.url ?? document.fileUrl ?? "", // Handle different URL field names
			envelopeId: envelopeId
		})
		setSignDialogOpen(true)
	}

	const handleSignSuccess = () => {
		// The dialog will close automatically after success
		setSignDialogOpen(false)
		setSelectedDocument(null)
	}

	const handleScheduleMeeting = (envelope: EnvelopeData) => {
		setSelectedEnvelope(envelope)
		setScheduleMeetingOpen(true)
	}

	const handleScheduleMeetingSuccess = () => {
		setScheduleMeetingOpen(false)
		setSelectedEnvelope(null)
	}

	const renderEnvelopeCard = (
		envelope: EnvelopeData,
		showSignButton = true
	) => (
		<Card key={envelope.id} className="border">
			<CardContent className="pt-4">
				<div className="space-y-4">
					{/* Envelope Header */}
					<div className="flex items-start justify-between">
						<div>
							<h3 className="text-lg font-semibold">{envelope.title}</h3>
							<p className="text-sm text-gray-600">
								From: {envelope.createdBy?.name ?? envelope.createdBy?.email}
							</p>
							<p className="text-sm text-gray-600">
								Created: {new Date(envelope.createdAt).toLocaleDateString()}
							</p>
							{envelope.description && (
								<p className="mt-1 text-sm text-gray-600">
									&ldquo;{envelope.description}&rdquo;
								</p>
							)}
						</div>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => handleScheduleMeeting(envelope)}
							>
								<Calendar className="mr-1 h-4 w-4" />
								Schedule Meeting
							</Button>
							<EnvelopeChatSheet
								envelopeId={envelope.id}
								envelopeTitle={envelope.title}
								participants={[
									...(envelope.createdBy
										? [
												{
													id: envelope.createdBy.id,
													name: envelope.createdBy.name ?? null,
													email: envelope.createdBy.email ?? null,
													image: null,
													role: "Creator"
												}
											]
										: []),
									...envelope.documents.flatMap((doc) =>
										doc.recipients.map((recipient) => ({
											id: recipient.user?.id ?? recipient.id,
											name: recipient.user?.name ?? null,
											email: recipient.user?.email ?? null,
											image: null,
											role: recipient.role
										}))
									)
								].filter(
									(participant, index, array) =>
										// Remove duplicates based on id
										array.findIndex((p) => p.id === participant.id) === index
								)}
								trigger={
									<Button size="sm" variant="ghost">
										<MessageSquare className="h-4 w-4" />
									</Button>
								}
							/>
							<Badge className={`${getStatusColor(envelope.status)} border`}>
								{getStatusIcon(envelope.status)}
								<span className="ml-1 capitalize">{envelope.status}</span>
							</Badge>
						</div>
					</div>

					<Separator />

					{/* Documents */}
					{envelope.documents && envelope.documents.length > 0 && (
						<div>
							<h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
								<FileText className="h-4 w-4" />
								Documents ({envelope.documents.length})
							</h4>
							<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
								{envelope.documents.map((doc) => (
									<div
										key={doc.id}
										className="flex items-center justify-between rounded bg-gray-50 p-2"
									>
										<div className="flex items-center gap-2">
											<FileText className="h-4 w-4 text-gray-500" />
											<span className="text-sm">{doc.name}</span>
											{getSignatureProgressBar(doc)}
										</div>
										<div className="flex gap-1">
											<Button size="sm" variant="ghost" asChild>
												<Link href={`/dashboard/documents/${doc.id}`}>
													<Eye className="h-3 w-3" />
												</Link>
											</Button>
											<DocumentMessageSheet
												documentId={doc.id}
												documentName={doc.name}
												envelopeId={envelope.id}
												envelopeTitle={envelope.title}
												trigger={
													<Button size="sm" variant="ghost">
														<MessageSquare className="h-3 w-3" />
													</Button>
												}
											/>
											<Button size="sm" variant="ghost">
												<Download className="h-3 w-3" />
											</Button>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* My Signing Status - Document Level */}
					{envelope.documents?.some(
						(doc) => doc.recipients && doc.recipients.length > 0
					) && (
						<div>
							<h4 className="mb-2 flex items-center gap-2 text-sm font-medium">
								<User className="h-4 w-4" />
								Your Signing Status
							</h4>
							<div className="space-y-3">
								{envelope.documents.map(
									(doc) =>
										doc.recipients &&
										doc.recipients.length > 0 && (
											<div
												key={doc.id}
												className="rounded-lg border bg-gray-50 p-3"
											>
												<div className="mb-2 flex items-center gap-2">
													<FileText className="h-4 w-4 text-gray-500" />
													<span className="text-sm font-medium">
														{doc.name}
													</span>
												</div>
												<div className="space-y-2">
													{doc.recipients
														.filter(
															(recipient) =>
																recipient.role === "SIGNER" &&
																(recipient.userId === session?.user?.id ||
																	recipient.user?.email ===
																		session?.user?.email)
														)
														.map((recipient) => (
															<div
																key={recipient.id}
																className="flex items-center justify-between rounded-lg bg-white p-2"
															>
																<div>
																	<div className="text-sm font-medium">
																		{recipient.user?.name ?? "Unknown User"}
																	</div>
																	<div className="text-xs text-gray-600">
																		{recipient.user?.email ?? "No email"}
																	</div>
																	<div className="mt-1 flex items-center gap-2">
																		<Badge
																			variant="outline"
																			className="text-xs"
																		>
																			{recipient.role}
																		</Badge>
																		<Badge
																			variant="outline"
																			className={`text-xs ${
																				recipient.status === "SIGNED"
																					? "border-green-500 bg-green-50 text-green-700"
																					: recipient.status === "PENDING"
																						? "border-yellow-500 bg-yellow-50 text-yellow-700"
																						: "border-gray-500 text-gray-700"
																			}`}
																		>
																			{recipient.status === "SIGNED" && (
																				<CheckCircle className="mr-1 h-3 w-3" />
																			)}
																			{recipient.status}
																		</Badge>
																	</div>
																</div>
																<div className="flex items-center gap-2">
																	{showSignButton &&
																		recipient.status === "PENDING" &&
																		recipient.role === "SIGNER" &&
																		envelope.status === "PUBLISHED" &&
																		(recipient.userId === session?.user?.id ||
																			recipient.user?.email ===
																				session?.user?.email) && (
																			<Button
																				size="sm"
																				className="bg-green-600 hover:bg-green-700"
																				onClick={() =>
																					handleSignDocument(doc, envelope.id)
																				}
																			>
																				<PenTool className="mr-1 h-4 w-4" />
																				Sign Document
																			</Button>
																		)}
																	{!showSignButton &&
																		recipient.status === "SIGNED" && (
																			<div className="flex items-center gap-1 text-green-600">
																				<CheckCircle className="h-4 w-4" />
																				<span className="text-sm font-medium">
																					Signed
																				</span>
																			</div>
																		)}
																</div>
															</div>
														))}
												</div>
											</div>
										)
								)}
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<PenTool className="h-5 w-5" />
						Loading Documents...
					</CardTitle>
				</CardHeader>
			</Card>
		)
	}

	return (
		<>
			<div className="space-y-6" suppressHydrationWarning>
				{/* Documents to Sign Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<PenTool className="h-5 w-5" />
							Documents to Sign ({pendingEnvelopes.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{pendingEnvelopes.map((envelope) =>
								renderEnvelopeCard(envelope, true)
							)}

							{pendingEnvelopes.length === 0 && (
								<div className="py-12 text-center">
									<PenTool className="mx-auto mb-4 h-12 w-12 text-gray-400" />
									<h3 className="mb-2 text-lg font-medium text-gray-900">
										No documents to sign
									</h3>
									<p className="mb-4 text-gray-600">
										You don&apos;t have any documents assigned for signing at
										the moment.
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Signed Documents Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CheckCircle className="h-5 w-5 text-green-600" />
							Signed Documents ({signedEnvelopes.length})
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{signedEnvelopes.map((envelope) =>
								renderEnvelopeCard(envelope, false)
							)}

							{signedEnvelopes.length === 0 && (
								<div className="py-8 text-center">
									<CheckCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
									<h3 className="mb-2 text-lg font-medium text-gray-900">
										No signed documents
									</h3>
									<p className="text-gray-600">
										Documents you have signed will appear here.
									</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<SignDocumentDialog
				document={selectedDocument}
				open={signDialogOpen}
				onOpenChange={setSignDialogOpen}
				onSuccess={handleSignSuccess}
			/>

			<ScheduleMeetingDialog
				envelope={selectedEnvelope}
				open={scheduleMeetingOpen}
				onOpenChange={setScheduleMeetingOpen}
				onSuccess={handleScheduleMeetingSuccess}
			/>
		</>
	)
}
