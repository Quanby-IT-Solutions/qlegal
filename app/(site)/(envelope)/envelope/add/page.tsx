"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
	AlertCircle,
	ArrowLeft,
	Calendar,
	CheckCircle,
	Clock,
	Download,
	Eye,
	FileText,
	Share2
} from "lucide-react"

import {
	Avatar,
	AvatarFallback,
	AvatarImage
} from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardHeader } from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

// Mock document data
const mockDocument = {
	id: "doc-123",
	title: "Contract Agreement - ABC Corp",
	status: "pending",
	createdAt: "2024-01-15",
	updatedAt: "2024-01-20",
	participants: [
		{
			id: "1",
			name: "John Smith",
			email: "john@example.com",
			avatar: "/placeholder-logo.png",
			role: "sender",
			status: "completed"
		},
		{
			id: "2",
			name: "Sarah Johnson",
			email: "sarah@example.com",
			avatar: "/placeholder-logo.png",
			role: "signer",
			status: "pending"
		},
		{
			id: "3",
			name: "Mike Wilson",
			email: "mike@example.com",
			avatar: "/placeholder-logo.png",
			role: "signer",
			status: "pending"
		}
	],
	documents: [
		{
			id: "file-1",
			name: "Contract_Agreement_v1.pdf",
			size: "2.4 MB",
			type: "pdf",
			uploadedAt: "2024-01-15"
		},
		{
			id: "file-2",
			name: "Terms_and_Conditions.pdf",
			size: "1.8 MB",
			type: "pdf",
			uploadedAt: "2024-01-15"
		}
	],
	lastActivity: "2 hours ago",
	description:
		"This contract outlines the terms and conditions for the partnership agreement between ABC Corp and our company. All parties must review and sign the document before the deadline."
}

const statusColors = {
	pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
	completed: "bg-green-100 text-green-800 border-green-200",
	draft: "bg-gray-100 text-gray-800 border-gray-200"
}

const participantStatusIcons = {
	completed: <CheckCircle className="h-4 w-4 text-green-600" />,
	pending: <Clock className="h-4 w-4 text-yellow-600" />,
	declined: <AlertCircle className="h-4 w-4 text-red-600" />
}

export default function DocumentPage({
	params
}: {
	params: Promise<{ envelopeId: string; documentId: string }>
}) {
	const [mounted, setMounted] = useState(false)
	const [routeParams, setRouteParams] = useState<{
		envelopeId: string
		documentId: string
	} | null>(null)

	useEffect(() => {
		setMounted(true)
		void params.then(setRouteParams)
	}, [params])

	if (!mounted) {
		return (
			<div className="min-h-screen bg-gray-50">
				<div className="animate-pulse">
					<div className="border-b border-gray-200 bg-white px-6 py-4">
						<div className="mb-2 h-6 w-1/3 rounded bg-gray-200"></div>
						<div className="h-4 w-1/4 rounded bg-gray-200"></div>
					</div>
					<div className="p-6">
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							<div className="lg:col-span-2">
								<div className="rounded-lg border border-gray-200 bg-white p-6">
									<div className="mb-4 h-8 rounded bg-gray-200"></div>
									<div className="mb-2 h-4 rounded bg-gray-200"></div>
									<div className="mb-2 h-4 rounded bg-gray-200"></div>
									<div className="mb-6 h-4 rounded bg-gray-200"></div>
									<div className="h-64 rounded bg-gray-200"></div>
								</div>
							</div>
							<div className="space-y-4">
								<div className="rounded-lg border border-gray-200 bg-white p-4">
									<div className="mb-2 h-4 rounded bg-gray-200"></div>
									<div className="mb-2 h-4 rounded bg-gray-200"></div>
									<div className="h-4 rounded bg-gray-200"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="border-b border-gray-200 bg-white px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link href="/envelopes">
							<Button variant="ghost" size="sm">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Envelopes
							</Button>
						</Link>
						<Separator orientation="vertical" className="h-6" />
						<div>
							<h1 className="text-xl font-semibold text-gray-900">
								{mockDocument.title}
							</h1>
							<p className="text-sm text-gray-500">
								Document ID: {routeParams?.documentId ?? "Loading..."}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm">
							<Share2 className="mr-2 h-4 w-4" />
							Share
						</Button>
						<Button variant="outline" size="sm">
							<Download className="mr-2 h-4 w-4" />
							Download
						</Button>
						<Badge
							className={
								statusColors[mockDocument.status as keyof typeof statusColors]
							}
						>
							{mockDocument.status.charAt(0).toUpperCase() +
								mockDocument.status.slice(1)}
						</Badge>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="p-6">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					{/* Main Document Area */}
					<div className="space-y-6 lg:col-span-2">
						{/* Document Preview */}
						<Card>
							<CardHeader>
								<div className="flex items-center justify-between">
									<h2 className="text-lg font-semibold">Document Preview</h2>
									<div className="flex items-center gap-2 text-sm text-gray-500">
										<Calendar className="h-4 w-4" />
										Last updated: {mockDocument.lastActivity}
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-12 text-center">
									<FileText className="mx-auto mb-4 h-16 w-16 text-gray-400" />
									<h3 className="mb-2 text-lg font-medium text-gray-900">
										Document Preview
									</h3>
									<p className="mb-4 text-gray-500">
										{mockDocument.description}
									</p>
									<Button>
										<Eye className="mr-2 h-4 w-4" />
										View Full Document
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Document Files */}
						<Card>
							<CardHeader>
								<h2 className="text-lg font-semibold">Document Files</h2>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{mockDocument.documents.map((doc) => (
										<div
											key={doc.id}
											className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
										>
											<div className="flex items-center gap-3">
												<FileText className="h-8 w-8 text-red-500" />
												<div>
													<h4 className="font-medium text-gray-900">
														{doc.name}
													</h4>
													<p className="text-sm text-gray-500">
														{doc.size} • {doc.uploadedAt}
													</p>
												</div>
											</div>
											<Button variant="outline" size="sm">
												<Download className="mr-2 h-4 w-4" />
												Download
											</Button>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Participants */}
						<Card>
							<CardHeader>
								<h2 className="text-lg font-semibold">Participants</h2>
								<p className="text-sm text-gray-500">
									{mockDocument.participants.length} people involved
								</p>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{mockDocument.participants.map((participant) => (
										<div
											key={participant.id}
											className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
										>
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<AvatarImage src={participant.avatar} />
													<AvatarFallback className="text-xs">
														{participant.name
															.split(" ")
															.map((n) => n[0])
															.join("")}
													</AvatarFallback>
												</Avatar>
												<div>
													<h4 className="font-medium text-gray-900">
														{participant.name}
													</h4>
													<p className="text-sm text-gray-500">
														{participant.role}
													</p>
												</div>
											</div>
											{
												participantStatusIcons[
													participant.status as keyof typeof participantStatusIcons
												]
											}
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Document Info */}
						<Card>
							<CardHeader>
								<h2 className="text-lg font-semibold">Document Info</h2>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Created</span>
										<span className="text-sm font-medium">
											{mockDocument.createdAt}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Last Modified</span>
										<span className="text-sm font-medium">
											{mockDocument.updatedAt}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Status</span>
										<Badge
											className={`text-xs ${statusColors[mockDocument.status as keyof typeof statusColors]}`}
										>
											{mockDocument.status.charAt(0).toUpperCase() +
												mockDocument.status.slice(1)}
										</Badge>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-500">Files</span>
										<span className="text-sm font-medium">
											{mockDocument.documents.length}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
