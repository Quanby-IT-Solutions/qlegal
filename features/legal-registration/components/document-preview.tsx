"use client"

import React, { useState } from "react"
import { AlertCircle, Download, ExternalLink, Eye, FileText, Loader2 } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

interface Document {
	id: string
	name: string
	url: string
	type: string
	uploadedAt?: Date
}

interface LegalApplicationWithDocuments {
	id: string
	applicant: {
		name: string | null
		email: string | null
	}
	status: string
	obcCertificationUrl: string
	ibpCertificationUrl: string
	passportPhotoUrl: string
	paymentProofUrl: string
	enfProviderCertificationUrl: string
	submittedAt: Date | null
}

interface DocumentPreviewProps {
	application: LegalApplicationWithDocuments | null
	onViewDocument?: (document: Document) => void
}

const FilePreview: React.FC<{
	file: {
		url: string
		name: string
		type: string
	}
}> = ({ file }) => {
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)

	const handleLoad = () => setIsLoading(false)
	const handleError = () => {
		setIsLoading(false)
		setHasError(true)
	}

	const downloadFile = () => {
		window.open(file.url, "_blank")
	}

	// PDF Preview
	if (file.type === "application/pdf" || file.url.toLowerCase().includes(".pdf")) {
		return (
			<div className="relative h-full min-h-[800px] w-full">
				{isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				)}
				{hasError ? (
					<div className="flex h-full items-center justify-center">
						<div className="text-center">
							<AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
							<p className="text-sm text-gray-500">Unable to preview PDF</p>
							<Button variant="outline" size="sm" className="mt-2" onClick={downloadFile}>
								<Download className="mr-2 h-4 w-4" />
								Download to View
							</Button>
						</div>
					</div>
				) : (
					<iframe
						src={`${file.url}#toolbar=0&navpanes=0&scrollbar=1&zoom=page-fit`}
						className="h-full w-full rounded border-0"
						style={{
							minHeight: "800px",
							height: "100%",
						}}
						onLoad={handleLoad}
						onError={handleError}
						title={file.name}
					/>
				)}
			</div>
		)
	}

	// Image Preview
	const imageRegex = /\.(jpg|jpeg|png|gif|webp)$/i
	if (file.type.startsWith("image/") || imageRegex.exec(file.url)) {
		return (
			<div className="relative h-full min-h-[600px] w-full">
				{isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				)}
				{hasError ? (
					<div className="flex h-full items-center justify-center">
						<div className="text-center">
							<AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
							<p className="text-sm text-gray-500">Unable to load image</p>
						</div>
					</div>
				) : (
					<div className="flex h-full w-full items-center justify-center rounded bg-gray-50 p-4">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={file.url}
							alt={file.name}
							className="max-h-full max-w-full rounded object-contain shadow-sm"
							onLoad={handleLoad}
							onError={handleError}
						/>
					</div>
				)}
			</div>
		)
	}

	// Unsupported file type
	return (
		<div className="flex h-full min-h-[400px] items-center justify-center">
			<div className="text-center">
				<FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
				<p className="mb-2 text-gray-500">Preview not available for this file type</p>
				<Badge variant="secondary" className="mb-4">
					{file.type || "Unknown"}
				</Badge>
				<Button variant="outline" size="sm" onClick={downloadFile}>
					<Download className="mr-2 h-4 w-4" />
					Download File
				</Button>
			</div>
		</div>
	)
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
	application,
	onViewDocument,
}) => {
	const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
	const [previewDialog, setPreviewDialog] = useState(false)

	// Convert application URLs to document objects
	const documents: Document[] = React.useMemo(() => {
		if (!application) return []

		const docs: Document[] = []

		if (application.obcCertificationUrl) {
			docs.push({
				id: "obc-cert",
				name: "OBC Good Moral Character Certification",
				url: application.obcCertificationUrl,
				type: "application/pdf",
			})
		}

		if (application.ibpCertificationUrl) {
			docs.push({
				id: "ibp-cert",
				name: "IBP Good Moral Character Certification",
				url: application.ibpCertificationUrl,
				type: "application/pdf",
			})
		}

		if (application.passportPhotoUrl) {
			docs.push({
				id: "passport-photo",
				name: "Passport-size Colored Photograph",
				url: application.passportPhotoUrl,
				type: "image/jpeg",
			})
		}

		if (application.paymentProofUrl) {
			docs.push({
				id: "payment-proof",
				name: "Proof of Payment",
				url: application.paymentProofUrl,
				type: "application/pdf",
			})
		}

		if (application.enfProviderCertificationUrl) {
			docs.push({
				id: "enf-cert",
				name: "ENF Provider Certification",
				url: application.enfProviderCertificationUrl,
				type: "application/pdf",
			})
		}

		return docs
	}, [application])

	const handleViewDocument = (document: Document) => {
		setSelectedDocument(document)
		setPreviewDialog(true)
		onViewDocument?.(document)
	}

	const handleDownload = (document: Document) => {
		window.open(document.url, "_blank")
	}

	if (!application) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<FileText className="h-5 w-5" />
						<span>Application Documents</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[300px] items-center justify-center">
						<div className="text-center">
							<FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
							<p className="text-gray-500">No application selected</p>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<FileText className="h-5 w-5" />
						<span>Application Documents</span>
					</CardTitle>
					<div className="text-sm text-gray-600">
						{application.applicant.name} - {documents.length} document(s)
					</div>
				</CardHeader>
				<CardContent>
					{documents.length === 0 ? (
						<div className="flex h-[300px] items-center justify-center">
							<div className="text-center">
								<FileText className="mx-auto mb-4 h-16 w-16 text-gray-300" />
								<p className="text-gray-500">No documents uploaded yet</p>
							</div>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Document Type</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{documents.map(document => (
									<TableRow key={document.id}>
										<TableCell>
											<div className="flex items-center space-x-2">
												<FileText className="h-4 w-4 text-gray-400" />
												<span className="font-medium">{document.name}</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="bg-green-50 text-green-700">
												Uploaded
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex space-x-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleViewDocument(document)}
												>
													<Eye className="mr-1 h-4 w-4" />
													Preview
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleDownload(document)}
												>
													<ExternalLink className="mr-1 h-4 w-4" />
													Open
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Document Preview Dialog */}
			<Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
				<DialogContent className="flex h-[95vh] max-w-6xl flex-col">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle>{selectedDocument?.name}</DialogTitle>
						<DialogDescription>Document preview for {application.applicant.name}</DialogDescription>
					</DialogHeader>
					<div className="mt-4 min-h-0 flex-1">
						{selectedDocument && (
							<div className="h-full w-full">
								<FilePreview
									file={{
										url: selectedDocument.url,
										name: selectedDocument.name,
										type: selectedDocument.type,
									}}
								/>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}
