"use client"

import { useMemo, useState } from "react"
import { format } from "date-fns"
import { Calendar, Clock, FileText, PlayCircle, Users, Video } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Progress } from "@/core/components/ui/progress"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc } from "@/services/trpc/client"
import { isAfter, startOfDay } from "date-fns"

function getMeetingStatusBadge(status: string) {
	switch (status) {
		case "SCHEDULED":
			return (
				<Badge variant="secondary">
					<Calendar className="mr-1 size-3" /> Scheduled
				</Badge>
			)
		case "ONGOING":
			return (
				<Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
					<PlayCircle className="mr-1 size-3" /> Live
				</Badge>
			)
		case "COMPLETED":
			return <Badge variant="outline">Completed</Badge>
		case "CANCELLED":
			return (
				<Badge variant="outline" className="border-rose-600 text-rose-600">
					Cancelled
				</Badge>
			)
		default:
			return null
	}
}

function getDocumentSigningBadge(isFullySigned: boolean) {
	if (isFullySigned) {
		return (
			<Badge variant="outline" className="border-emerald-600 text-emerald-700">
				Signed
			</Badge>
		)
	}

	return <Badge variant="secondary">Pending</Badge>
}

export function ActiveNotarizationsSection() {
	// IMPORTANT: same ordering as Meetings page (server query orders by meetingParticipants.createdAt desc)
	const PAGE_SIZE = 10
	const [page, setPage] = useState(1)
	const offset = (page - 1) * PAGE_SIZE

	const { data, isLoading } = trpc.meetings.getUserMeetingsWithDocumentStats.useQuery(
		{ limit: PAGE_SIZE, offset },
		{
			refetchInterval: 10_000, // Refetch every 10 seconds for better real-time updates
		}
	)
	const meetings = data?.items ?? []
	const hasMore = data?.hasMore ?? false

	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("ALL")
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [detailsMeetingId, setDetailsMeetingId] = useState<string | null>(null)

	const { data: detailsData, isLoading: isDetailsLoading } =
		trpc.meetings.getMeetingNotarizationDetails.useQuery(
			{ meetingId: detailsMeetingId ?? "" },
			{ enabled: detailsOpen && !!detailsMeetingId }
		)

	const today = startOfDay(new Date())

	const filteredMeetings = useMemo(() => {
		const q = searchTerm.trim().toLowerCase()
	  
		return meetings.filter(meeting => {
		  const meetingDate = startOfDay(new Date(meeting.createdAt)) // normalize to start of day
	  
		  // Only include meetings after today (strictly future dates)
		  if (!isAfter(meetingDate, today)) return false
	  
		  // Apply search filter only
		  if (q && !meeting.title.toLowerCase().includes(q) && !(meeting.createdBy.name ?? "").toLowerCase().includes(q)) {
			return false
		  }
	  
		  return true
		})
	  }, [meetings, searchTerm])

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">Upcoming</h2>
				<p className="text-muted-foreground text-sm">
				Upcoming meetings scheduled with participants for notarization sessions.
				</p>
			</div>

			<Card>
				<CardContent className="pt-6">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input
							placeholder="Search meetings..."
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger>
								<SelectValue placeholder="All Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Status</SelectItem>
								<SelectItem value="SCHEDULED">Scheduled</SelectItem>
								<SelectItem value="ONGOING">Live</SelectItem>
								<SelectItem value="COMPLETED">Completed</SelectItem>
								<SelectItem value="CANCELLED">Cancelled</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{isLoading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<Skeleton className="h-32 w-full" />
							</CardContent>
						</Card>
					))}
				</div>
			) : filteredMeetings.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Video className="text-muted-foreground mx-auto mb-4 size-12" />
						<h3 className="mb-2 text-lg font-medium">No meetings found</h3>
						<p className="text-muted-foreground mb-4">
							{searchTerm || statusFilter !== "ALL"
								? "Try adjusting your search criteria or filters."
								: "You don't have any meetings yet."}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-medium">
							{filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? "s" : ""} Found
						</h3>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={page <= 1 || isLoading}
							>
								Prev
							</Button>
							<div className="text-muted-foreground text-sm">Page {page}</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage(p => p + 1)}
								disabled={!hasMore || isLoading}
							>
								Next
							</Button>
						</div>
					</div>

					{filteredMeetings.map(meeting => {
						const scheduledLabel = meeting.createdAt
							? format(new Date(meeting.createdAt), "PPp")
							: "Not scheduled"

						const totalDocuments = meeting.documentStats.total
						const signedDocuments = meeting.documentStats.signed
						const documentProgress =
							totalDocuments > 0 ? Math.round((signedDocuments / totalDocuments) * 100) : 0
						const isComplete = meeting.documentStats.isComplete !== false

						return (
							<Card key={meeting.id} className="transition-shadow hover:shadow-md">
								<CardContent className="p-6">
									<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
										<div className="min-w-0 flex-1">
											<div className="mb-2 flex flex-wrap items-center gap-3">
												<h4 className="text-lg font-medium">{meeting.title}</h4>
												{getMeetingStatusBadge(meeting.status)}
											</div>

											<div className="text-muted-foreground mb-3 flex flex-wrap items-center gap-4 text-sm">
												<div className="flex items-center gap-1">
													<Users className="size-4 shrink-0" />
													<span>
														{meeting.participants.length} participant
														{meeting.participants.length !== 1 ? "s" : ""}
													</span>
												</div>

												<div className="flex items-center gap-1">
													<FileText className="size-4 shrink-0" />
													<span>
														{totalDocuments} document{totalDocuments !== 1 ? "s" : ""}
														{totalDocuments > 0 && (
															<span className="text-muted-foreground ml-1">
																• {signedDocuments} signed ({documentProgress}%)
															</span>
														)}
													</span>
													{!isComplete && (
														<span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-xs">
															<span className="inline-flex size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
															checking…
														</span>
													)}
												</div>

												<div className="flex items-center gap-1">
													<Calendar className="size-4 shrink-0" />
													<span>Scheduled {scheduledLabel}</span>
												</div>

												<div className="flex items-center gap-1">
													<Clock className="size-4 shrink-0" />
													<span>Created by {meeting.createdBy.name ?? "Unknown"}</span>
												</div>
											</div>

											<div className="flex items-center gap-2">
												<Avatar className="size-8">
													<AvatarImage src={meeting.createdBy.image ?? undefined} />
													<AvatarFallback>
														{(meeting.createdBy.name ?? "Unknown")
															.split(" ")
															.map(n => n[0])
															.join("")
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className="text-sm">
													<p className="font-medium">{meeting.createdBy.name ?? "Unknown"}</p>
													<p className="text-muted-foreground">Host</p>
												</div>
											</div>

											{totalDocuments > 0 && (
												<div className="mt-4">
													<div className="mb-2 flex items-center justify-between text-sm">
														<span className="font-medium">Document Signing Progress</span>
														<span className="font-semibold">
															{signedDocuments}/{totalDocuments} ({documentProgress}%)
														</span>
													</div>
													<Progress value={documentProgress} className="h-2" />
												</div>
											)}
										</div>

										<div className="shrink-0">
											<Button
												variant="outline"
												onClick={() => {
													setDetailsMeetingId(meeting.id)
													setDetailsOpen(true)
												}}
											>
												View details
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>
			)}

			<Dialog
				open={detailsOpen}
				onOpenChange={open => {
					setDetailsOpen(open)
					if (!open) setDetailsMeetingId(null)
				}}
			>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Notarization details</DialogTitle>
						<DialogDescription>Documents and signing status for this meeting.</DialogDescription>
					</DialogHeader>

					{isDetailsLoading ? (
						<div className="space-y-3">
							<Skeleton className="h-6 w-2/3" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-24 w-full" />
						</div>
					) : !detailsData ? (
						<div className="text-muted-foreground text-sm">No details available.</div>
					) : (
						<div className="space-y-4">
							<div className="space-y-1">
								<div className="flex flex-wrap items-center gap-3">
									<h4 className="text-lg font-semibold">{detailsData.meeting.title}</h4>
									{getMeetingStatusBadge(detailsData.meeting.status)}
								</div>
								<div className="text-muted-foreground text-sm">
									Created by {detailsData.meeting.createdBy?.name ?? "Unknown"}
								</div>
							</div>

							{detailsData.documentStats.total > 0 && (
								<div>
									<div className="mb-2 flex items-center justify-between text-sm">
										<span className="font-medium">Overall document progress</span>
										<span className="font-semibold">
											{detailsData.documentStats.signed}/{detailsData.documentStats.total} (
											{Math.round(
												(detailsData.documentStats.signed / detailsData.documentStats.total) * 100
											)}
											%)
										</span>
									</div>
									<Progress
										value={Math.round(
											(detailsData.documentStats.signed / detailsData.documentStats.total) * 100
										)}
										className="h-2"
									/>
								</div>
							)}

							<div className="space-y-2">
								<div className="text-sm font-semibold">Documents</div>
								{detailsData.documents.length === 0 ? (
									<div className="text-muted-foreground text-sm">No documents uploaded.</div>
								) : (
									<ScrollArea className="h-[420px] pr-3">
										<div className="space-y-3">
											{detailsData.documents.map(doc => {
												const signerTotal = doc.signerSummary.total
												const signerSigned = doc.signerSummary.signed

												return (
													<Card key={doc.id}>
														<CardContent className="p-4">
															<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
																<div className="min-w-0 flex-1">
																	<div className="flex items-center gap-2">
																		<FileText className="text-muted-foreground size-4 shrink-0" />
																		<div className="min-w-0">
																			<div className="truncate text-sm font-semibold">
																				{doc.name}
																			</div>
																			<div className="text-muted-foreground text-xs">
																				Status: {doc.status}
																			</div>
																		</div>
																	</div>

																	{signerTotal > 0 && (
																		<div className="mt-3">
																			<div className="mb-2 flex items-center justify-between text-xs">
																				<span className="text-muted-foreground">Signers</span>
																				<span className="font-semibold">
																					{signerSigned}/{signerTotal}
																				</span>
																			</div>
																			<Progress
																				value={Math.round((signerSigned / signerTotal) * 100)}
																				className="h-2"
																			/>
																		</div>
																	)}
																</div>

																<div className="flex shrink-0 items-center gap-2">
																	{getDocumentSigningBadge(doc.isFullySigned)}
																</div>
															</div>
														</CardContent>
													</Card>
												)
											})}
										</div>
									</ScrollArea>
								)}
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
