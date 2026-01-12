"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { FileText, LayoutGrid, List, Search } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/core/components/ui/toggle-group"

import { trpc } from "@/services/trpc/client"

type ViewMode = "grid" | "list"

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes"
	const k = 1024
	const sizes = ["Bytes", "KB", "MB", "GB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case "PUBLISHED":
			return "default"
		case "PENDING_APPROVAL":
			return "secondary"
		case "IN_PROGRESS":
			return "default"
		case "PENDING":
			return "secondary"
		default:
			return "outline"
	}
}

function getStatusLabel(status: string): string {
	switch (status) {
		case "PUBLISHED":
			return "Published"
		case "PENDING_APPROVAL":
			return "Pending Approval"
		case "IN_PROGRESS":
			return "In Progress"
		case "PENDING":
			return "Pending"
		default:
			return status
	}
}

export function PendingDocumentsPage() {
	const [searchQuery, setSearchQuery] = useState("")
	const [viewMode, setViewMode] = useState<ViewMode>("grid")

	const {
		data: pendingDocuments,
		isPending,
		error,
	} = trpc.envelopeLite.getPendingDocuments.useQuery()

	// Filter and search documents
	const filteredDocuments = useMemo(() => {
		if (!pendingDocuments) {
			return []
		}

		return pendingDocuments.filter(doc => {
			// Search filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase()
				return (
					doc.name.toLowerCase().includes(query) ||
					doc.type.toLowerCase().includes(query) ||
					doc.envelope?.title.toLowerCase().includes(query) ||
					(doc.envelope?.description?.toLowerCase().includes(query) ?? false)
				)
			}

			return true
		})
	}, [pendingDocuments, searchQuery])

	if (error) {
		return (
			<div className="bg-muted dark:bg-background min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
					<Card>
						<CardHeader>
							<CardTitle>Error</CardTitle>
							<CardDescription>Failed to load pending documents</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">{error.message}</p>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className="bg-muted dark:bg-background min-h-screen">
			{/* Header */}
			<div className="bg-background border-b">
				<div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
					<div>
						<h1 className="text-foreground text-2xl font-medium">Pending Documents</h1>
						<p className="text-muted-foreground mt-1 text-sm">
							Documents waiting for signatures or approval
						</p>
					</div>

					{/* Controls */}
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-1 items-center gap-4">
							{/* Search */}
							<div className="relative max-w-sm flex-1">
								<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
								<Input
									placeholder="Search documents..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>

							{/* View Mode Toggle */}
							<ToggleGroup
								type="single"
								value={viewMode}
								onValueChange={value => value && setViewMode(value as ViewMode)}
							>
								<ToggleGroupItem value="grid" aria-label="Grid view">
									<LayoutGrid className="h-4 w-4" />
								</ToggleGroupItem>
								<ToggleGroupItem value="list" aria-label="List view">
									<List className="h-4 w-4" />
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{isPending ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader>
									<div className="bg-muted h-4 w-3/4 rounded" />
									<div className="bg-muted mt-2 h-3 w-1/2 rounded" />
								</CardHeader>
								<CardContent>
									<div className="bg-muted h-20 rounded" />
								</CardContent>
							</Card>
						))}
					</div>
				) : filteredDocuments.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-16">
							<FileText className="text-muted-foreground mb-4 h-12 w-12" />
							<h3 className="text-foreground mb-2 text-lg font-semibold">No pending documents</h3>
							<p className="text-muted-foreground max-w-md text-center text-sm">
								{searchQuery
									? "No documents match your search criteria."
									: "You don't have any documents waiting for signatures or approval."}
							</p>
							{searchQuery && (
								<Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
									Clear search
								</Button>
							)}
						</CardContent>
					</Card>
				) : viewMode === "grid" ? (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{filteredDocuments.map(doc => (
							<Card key={doc.id} className="transition-shadow hover:shadow-lg">
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="min-w-0 flex-1">
											<CardTitle className="truncate text-base">{doc.name}</CardTitle>
											<CardDescription className="mt-1">
												{doc.envelope?.title || "No envelope"}
											</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Status:</span>
										{doc.envelope?.status && (
											<Badge variant={getStatusBadgeVariant(doc.envelope.status)}>
												{getStatusLabel(doc.envelope.status)}
											</Badge>
										)}
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Size:</span>
										<span className="font-medium">{formatFileSize(doc.size)}</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Type:</span>
										<span className="font-medium">{doc.type}</span>
									</div>
									<div className="border-t pt-2">
										<Link href={`/envelope/${doc.envelopeId}`}>
											<Button variant="outline" className="w-full">
												View Envelope
											</Button>
										</Link>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="space-y-4">
						{filteredDocuments.map(doc => (
							<Card key={doc.id} className="transition-shadow hover:shadow-md">
								<CardContent className="p-6">
									<div className="flex items-center justify-between">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-3">
												<FileText className="text-muted-foreground h-5 w-5 shrink-0" />
												<div className="min-w-0 flex-1">
													<h3 className="text-foreground truncate font-medium">{doc.name}</h3>
													<p className="text-muted-foreground mt-1 text-sm">
														{doc.envelope?.title || "No envelope"}
													</p>
												</div>
											</div>
										</div>
										<div className="ml-4 flex items-center gap-4">
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Status</div>
												{doc.envelope?.status && (
													<Badge
														variant={getStatusBadgeVariant(doc.envelope.status)}
														className="mt-1"
													>
														{getStatusLabel(doc.envelope.status)}
													</Badge>
												)}
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Size</div>
												<div className="mt-1 font-medium">{formatFileSize(doc.size)}</div>
											</div>
											<div className="text-right text-sm">
												<div className="text-muted-foreground">Type</div>
												<div className="mt-1 font-medium">{doc.type}</div>
											</div>
											<Link href={`/envelope/${doc.envelopeId}`}>
												<Button variant="outline">View</Button>
											</Link>
										</div>
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
