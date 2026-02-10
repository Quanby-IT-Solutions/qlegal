"use client"

import { useMemo, useState } from "react"
import { format, isAfter, isSameDay, startOfDay } from "date-fns"
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

import { getAvatarUrl, getInitials } from "@/core/lib/utils"
import { trpc } from "@/services/trpc/client"

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

const MEETING_ID_FROM_LINK_REGEX = /\/meetings\/([a-zA-Z0-9_-]+)/

type Appointment = {
	id: string
	title?: string
	scheduledAt?: Date
	createdAt: Date
	createdBy?: { name?: string; image?: string | null }
}
export function ActiveNotarizationsSection() {
	// IMPORTANT: same ordering as Meetings page (server query orders by meetingParticipants.createdAt desc)
	const PAGE_SIZE = 10
	const [page, setPage] = useState(1)
	const offset = (page - 1) * PAGE_SIZE

	const { data, isLoading } = trpc.meetings.getUserMeetingsWithDocumentStats.useQuery(
		{ limit: PAGE_SIZE, offset },
		{ refetchInterval: 5_000 }
	)

	const meetings = data?.items ?? []
	const hasMore = data?.hasMore ?? false

	const [searchTerm, setSearchTerm] = useState("")
	const [statusFilter, setStatusFilter] = useState<string>("ALL")
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [detailsMeetingId, setDetailsMeetingId] = useState<string | null>(null)
	const today = startOfDay(new Date())

	const { data: pendingAppointments = [] } = trpc.appointments.getUpcomingAppointments.useQuery(
		undefined,
		{
			refetchInterval: 10_000,
		}
	)

	const { data: detailsData, isLoading: isDetailsLoading } =
		trpc.meetings.getMeetingNotarizationDetails.useQuery(
			{ meetingId: detailsMeetingId ?? "" },
			{ enabled: detailsOpen && !!detailsMeetingId }
		)

	const completedOrFullySignedMeetingIds = useMemo(() => {
		const set = new Set<string>()
		for (const m of meetings) {
			const done =
				m.status === "COMPLETED" ||
				(m.documentStats.total > 0 && m.documentStats.signed >= m.documentStats.total)
			if (done) set.add(m.id)
		}
		return set
	}, [meetings])

	const appointmentCards = useMemo(() => {
		return pendingAppointments
			.filter((appt: Appointment & { meetingLink?: string | null }) => {
				const link = appt.meetingLink
				if (!link || typeof link !== "string" || link.trim() === "") return true
				const match = MEETING_ID_FROM_LINK_REGEX.exec(link)
				const meetingId = match?.[1]
				if (!meetingId) return true
				return !completedOrFullySignedMeetingIds.has(meetingId)
			})
			.map((appt: Appointment) => ({
				id: `appt-${appt.id}`,
				title: appt.title ?? "Pending Notarization Session",
				createdAt: (appt.scheduledAt ?? appt.createdAt).toISOString(),
				status: "PENDING",
				badgeStatus: appt.scheduledAt ? "CONFIRMED" : "PENDING_SESSION",
				participants: [],
				documentStats: { total: 0, signed: 0, isComplete: true },
				createdBy: appt.createdBy ?? { name: "Unknown", image: null },
				isAppointment: true as const,
			}))
	}, [pendingAppointments, completedOrFullySignedMeetingIds])

	const upcomingOnlyMeetings = useMemo(() => {
		return meetings.filter(
			m =>
				m.status !== "COMPLETED" &&
				!(m.documentStats.total > 0 && m.documentStats.signed >= m.documentStats.total)
		)
	}, [meetings])

	const combinedMeetings = useMemo(() => {
		return [...appointmentCards, ...upcomingOnlyMeetings]
	}, [appointmentCards, upcomingOnlyMeetings])

	const filteredMeetings = useMemo(() => {
		const q = searchTerm.trim().toLowerCase()

		return combinedMeetings.filter(meeting => {
			const meetingDate = startOfDay(new Date(meeting.createdAt))

			// Include if today or in the future
			if (!(isAfter(meetingDate, today) || isSameDay(meetingDate, today))) return false

			if (
				q &&
				!meeting.title.toLowerCase().includes(q) &&
				!(meeting.createdBy.name ?? "").toLowerCase().includes(q)
			) {
				return false
			}

			return true
		})
	}, [combinedMeetings, searchTerm, today])

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-2xl font-semibold tracking-tight">Upcoming</h2>
				<p className="text-muted-foreground text-sm">
					Upcoming meetings scheduled with participants for notarization sessions.
				</p>
			</div>
			<h3 className="font-small pt-5 text-sm">
				{filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? "s" : ""} Found
			</h3>

			<Card>
				<CardContent>
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
								<CardContent className="relative">
									<div className="flex items-start justify-between gap-4">
										{/* LEFT SIDE */}
										<div className="min-w-0 flex-1 space-y-3">
											{/* Title + Status */}
											<div className="flex flex-wrap items-center gap-2">
												<h4 className="truncate text-base leading-tight font-semibold">
													{meeting.title}
												</h4>
												{"isAppointment" in meeting && meeting.isAppointment ? (
													<Badge variant="secondary">Pending Session</Badge>
												) : (
													getMeetingStatusBadge(meeting.status)
												)}
											</div>

											{/* Meta Row */}
											<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
												<div className="flex items-center gap-1">
													<Users className="size-3.5 shrink-0" />
													<span>
														{meeting.participants.length} participant
														{meeting.participants.length !== 1 ? "s" : ""}
													</span>
												</div>

												<div className="flex items-center gap-1">
													<FileText className="size-3.5 shrink-0" />
													<span>
														{totalDocuments} doc{totalDocuments !== 1 && "s"}
														{totalDocuments > 0 && (
															<span className="text-muted-foreground ml-1">
																• {signedDocuments} signed ({documentProgress}%)
															</span>
														)}
													</span>

													{!isComplete && (
														<span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-[11px]">
															<span className="inline-flex size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
															checking…
														</span>
													)}
												</div>

												<div className="flex items-center gap-1">
													<Calendar className="size-3.5 shrink-0" />
													<span>{scheduledLabel}</span>
												</div>

												<div className="flex items-center gap-1">
													<Clock className="size-3.5 shrink-0" />
													<span>{meeting.createdBy.name ?? "Unknown"}</span>
												</div>
											</div>

											{/* Host Row (Compact) */}
											<div className="flex items-center gap-2 pt-1">
												<Avatar className="size-7">
													<AvatarImage src={getAvatarUrl(meeting.createdBy?.image) ?? undefined} />
													<AvatarFallback>
														{(meeting.createdBy.name ?? "Unknown")
															.split(" ")
															.map((n: string) => n[0])
															.join("")
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<span className="text-xs font-medium">
													{meeting.createdBy.name ?? "Unknown"}
												</span>
												<span className="text-muted-foreground text-xs">• Host</span>
											</div>

											{/* Compact Progress */}
											{totalDocuments > 0 && (
												<div className="pt-2">
													<div className="text-muted-foreground mb-1 flex items-center justify-between text-[11px]">
														<span>Signing Progress</span>
														<span className="text-foreground font-medium">
															{signedDocuments}/{totalDocuments}
														</span>
													</div>
													<Progress value={documentProgress} className="h-1.5" />
												</div>
											)}
										</div>

										{/* RIGHT SIDE BUTTON */}
										<div className="shrink-0">
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													setDetailsMeetingId(meeting.id)
													setDetailsOpen(true)
												}}
												className="h-8 px-3 text-xs"
											>
												View
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						)
					})}
					<div className="flex items-center justify-between">
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
								<div className="text-muted-foreground flex items-center gap-2 text-sm">
									<Avatar className="size-6">
										<AvatarImage
											src={getAvatarUrl(detailsData.meeting.createdBy?.image) ?? undefined}
										/>
										<AvatarFallback>
											{getInitials(detailsData.meeting.createdBy?.name)}
										</AvatarFallback>
									</Avatar>
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
												const showFees =
													doc.isFullySigned &&
													doc.fees !== null &&
													doc.fees !== undefined &&
													typeof doc.fees === "number" &&
													!Number.isNaN(doc.fees)

												const docType: string = "type" in doc && typeof doc.type === "string" ? doc.type : ""
												const docName: string = "name" in doc && typeof doc.name === "string" ? doc.name : ""
												const isPdf =
													docType === "application/pdf" ||
													docName.toLowerCase().endsWith(".pdf")
												const isImage =
													docType.startsWith("image/") ||
													/\.(jpe?g|png|gif|webp)$/i.test(docName)

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

																	{showFees && (
																		<div className="text-muted-foreground mt-2 text-xs font-semibold">
																			Fees: {Number(doc.fees).toFixed(2)}
																		</div>
																	)}
																</div>

																<div className="flex shrink-0 items-center gap-2">
																	{getDocumentSigningBadge(doc.isFullySigned)}
																</div>
															</div>

															{"previewUrl" in doc && doc.previewUrl && (
																<div className="mt-3 rounded-md border bg-muted/30">
																	<div className="text-muted-foreground border-b px-2 py-1 text-xs font-medium">
																		Preview
																	</div>
																	<div className="relative min-h-[200px] w-full overflow-hidden">
																		{isPdf && (
																			<iframe
																				title={doc.name}
																				src={doc.previewUrl}
																				className="h-[280px] w-full border-0"
																			/>
																		)}
																		{isImage && (
																			// eslint-disable-next-line @next/next/no-img-element -- dynamic Supabase preview URL
																			<img
																				src={doc.previewUrl}
																				alt={docName}
																				className="max-h-[280px] w-full object-contain"
																			/>
																		)}
																		{!isPdf && !isImage && (
																			<iframe
																				title={doc.name}
																				src={doc.previewUrl}
																				className="h-[280px] w-full border-0"
																			/>
																		)}
																	</div>
																</div>
															)}
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
