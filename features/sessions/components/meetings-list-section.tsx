"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { format, isSameDay } from "date-fns"
import {
	Calendar,
	Clock,
	FileText,
	Film,
	Grid3x3,
	LayoutList,
	Loader2,
	PlayCircle,
	Plus,
	Search,
	StopCircle,
	Trash2,
	Users,
	Video,
	X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
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

import { useMeetings } from "@/features/sessions/api/meetings.hooks"
import { MeetingRecordingsModal } from "@/features/sessions/components/meeting-recordings-modal"
import { useMessages } from "@/features/messages/api/messages.hooks"

function MeetingDocumentSummary({
	total,
	signed,
	isComplete,
}: {
	total: number
	signed: number
	isComplete?: boolean
}) {
	if (total === 0) {
		return (
			<div className="text-muted-foreground flex items-center gap-1 text-sm">
				<FileText className="size-4 shrink-0" />
				<span>No documents</span>
			</div>
		)
	}

	const documentProgress = Math.round((signed / total) * 100)

	return (
		<div className="flex items-center gap-1 text-sm">
			<FileText className="size-4 shrink-0" />
			<span>
				{total} document{total !== 1 ? "s" : ""}
				<span className="text-muted-foreground ml-1">
					• {signed} signed ({documentProgress}%)
				</span>
			</span>
			{isComplete === false && (
				<span className="text-muted-foreground ml-1 inline-flex items-center gap-1">
					<Loader2 className="size-3 animate-spin" />
					checking…
				</span>
			)}
		</div>
	)
}

export function MeetingsListSection() {
	const router = useRouter()
	const { data: session } = useSession()
	const { create, startMeeting, endMeeting, deleteMeeting } = useMeetings()
	const PAGE_SIZE = 10
	const [page, setPage] = useState(1)
	const offset = (page - 1) * PAGE_SIZE

	const utils = trpc.useUtils()
	const { data, isLoading } = trpc.meetings.getUserMeetingsWithDocumentStats.useQuery(
		{ limit: PAGE_SIZE, offset },
		{
			refetchInterval: 10_000, // Refetch every 10 seconds for better real-time updates
		}
	)
	const meetings = data?.items ?? []
	const hasMore = data?.hasMore ?? false
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [userSearchQuery, setUserSearchQuery] = useState("")
	const [selectedUsers, setSelectedUsers] = useState<
		Array<{ id: string; name: string | null; email: string | null; image: string | null }>
	>([])
	const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null)
	const [joiningMeetingId, setJoiningMeetingId] = useState<string | null>(null)
	const [statusFilter, setStatusFilter] = useState<string>("ALL")
	const [searchTerm, setSearchTerm] = useState("")
	const [viewMode, setViewMode] = useState<"list" | "grid">("list")
	const [recordingsModalOpen, setRecordingsModalOpen] = useState(false)
	const [recordingsModalMeeting, setRecordingsModalMeeting] = useState<{
		id: string
		title: string
	} | null>(null)

	const { searchUsers } = useMessages()
	const { data: searchResults } = searchUsers(userSearchQuery)

	const today = new Date()

	const filteredMeetings = meetings.filter(meeting => {
		const meetingDate = new Date(meeting.createdAt)
		const isToday = isSameDay(meetingDate, today)

		const matchesSearch =
			meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			meeting.createdBy.name?.toLowerCase().includes(searchTerm.toLowerCase())

		const matchesStatus = statusFilter === "ALL" || meeting.status === statusFilter

		// ✅ NEW: hide completed meetings
		const notCompleted = meeting.status !== "COMPLETED" && meeting.status !== "CANCELLED"

		return isToday && matchesSearch && matchesStatus && notCompleted
	})

	const handleCreate = async () => {
		if (!title.trim()) return
		try {
			const result = await create.mutateAsync({
				title: title.trim(),
				participantIds: selectedUsers.map(u => u.id),
			})
			if (result.success) {
				// Immediately refetch to show the new meeting
				await utils.meetings.getUserMeetingsWithDocumentStats.refetch()
				setIsDialogOpen(false)
				setTitle("")
				setSelectedUsers([])
				setUserSearchQuery("")
				toast.success("Meeting created successfully!")
			}
		} catch {
			toast.error("Failed to create meeting")
		}
	}

	const handleAddUser = (user: {
		id: string
		name: string | null
		email: string | null
		image: string | null
	}) => {
		if (!selectedUsers.find(u => u.id === user.id)) {
			setSelectedUsers([...selectedUsers, user])
			setUserSearchQuery("")
		}
	}

	const handleRemoveUser = (userId: string) => {
		setSelectedUsers(selectedUsers.filter(u => u.id !== userId))
	}

	const handleStartMeeting = async (id: string) => {
		setLoadingMeetingId(id)
		try {
			await startMeeting.mutateAsync(id)
			// Immediately refetch to update the UI with "Join Meeting" button
			await utils.meetings.getUserMeetingsWithDocumentStats.refetch()
			toast.success("Meeting started successfully!")
		} catch {
			toast.error("Failed to start meeting")
		} finally {
			setLoadingMeetingId(null)
		}
	}

	const handleEndMeeting = async (id: string) => {
		if (!confirm("Are you sure you want to end this meeting?")) return
		setLoadingMeetingId(id)
		try {
			await endMeeting.mutateAsync(id)
			toast.success("Meeting ended")
		} catch {
			toast.error("Failed to end meeting")
		} finally {
			setLoadingMeetingId(null)
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this meeting?")) return
		setLoadingMeetingId(id)
		try {
			await deleteMeeting.mutateAsync(id)
			toast.success("Meeting deleted")
		} catch {
			toast.error("Failed to delete meeting")
		} finally {
			setLoadingMeetingId(null)
		}
	}

	type MeetingWithStats = {
		id: string
		title: string
		status: string
		createdBy: {
			id: string
			name: string | null
			image: string | null
		}
		participants: { user?: { id: string } }[]
		createdAt?: string
		documentStats?: {
			total?: number
			signed?: number
			isComplete?: boolean
		}
	}

	const getStatusBadge = (status: string) => {
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<h2 className="text-2xl font-semibold tracking-tight">Ongoing</h2>
					<p className="text-muted-foreground text-sm">
						Ongoing meetings with participants for notarization sessions
					</p>
				</div>
				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
						<DialogHeader className="space-y-3 pb-4">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 flex size-12 items-center justify-center rounded-xl">
									<Video className="text-primary size-6" />
								</div>
								<div className="flex-1">
									<DialogTitle className="text-2xl">Create New Meeting</DialogTitle>
									<DialogDescription className="mt-1 text-base">
										Set up a video meeting and invite your team
									</DialogDescription>
								</div>
							</div>
						</DialogHeader>

						<div className="space-y-6 py-4">
							<div className="space-y-3">
								<Label htmlFor="meeting-title" className="text-base font-semibold">
									Meeting Title <span className="text-destructive">*</span>
								</Label>
								<Input
									id="meeting-title"
									placeholder="e.g., Team Standup, Client Review, Project Kickoff"
									value={title}
									onChange={e => setTitle(e.target.value)}
									className="h-12 text-base"
								/>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label className="text-base font-semibold">
										Invite Participants
										<span className="text-muted-foreground ml-2 text-sm font-normal">
											(Optional)
										</span>
									</Label>
									{selectedUsers.length > 0 && (
										<Badge variant="secondary" className="font-semibold">
											<Users className="mr-1 size-3" />
											{selectedUsers.length} invited
										</Badge>
									)}
								</div>

								{selectedUsers.length > 0 && (
									<div className="bg-muted/30 rounded-lg border p-4">
										<p className="text-muted-foreground mb-3 text-sm font-medium">
											Selected Participants
										</p>
										<div className="flex flex-wrap gap-2">
											{selectedUsers.map(user => (
												<Badge
													key={user.id}
													variant="secondary"
													className="hover:bg-secondary/80 gap-2 py-1.5 pr-2 text-sm transition-colors"
												>
													<Avatar className="size-5">
														<AvatarImage src={getAvatarUrl(user.image) ?? undefined} />
														<AvatarFallback className="bg-primary text-primary-foreground text-xs">
															{getInitials(user.name)}
														</AvatarFallback>
													</Avatar>
													<span className="font-medium">{user.name}</span>
													<button
														onClick={() => handleRemoveUser(user.id)}
														className="hover:bg-destructive/20 ml-1 rounded-full p-0.5 transition-colors"
														aria-label="Remove user"
													>
														<X className="text-muted-foreground hover:text-destructive size-3.5" />
													</button>
												</Badge>
											))}
										</div>
									</div>
								)}

								<div className="space-y-3">
									<div className="relative">
										<Search className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2" />
										<Input
											placeholder="Search by name or email..."
											value={userSearchQuery}
											onChange={e => setUserSearchQuery(e.target.value)}
											className="h-12 pl-11 text-base"
										/>
									</div>

									{userSearchQuery.length > 0 && (
										<div className="bg-card rounded-lg border">
											<ScrollArea className="h-64">
												<div className="p-2">
													{searchResults && searchResults.length > 0 ? (
														<div className="space-y-1">
															{searchResults.map((user: (typeof selectedUsers)[number]) => {
																const isSelected = selectedUsers.some(u => u.id === user.id)
																return (
																	<button
																		key={user.id}
																		onClick={() => handleAddUser(user)}
																		disabled={isSelected}
																		className="hover:bg-accent group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60"
																	>
																		<Avatar className="group-hover:ring-primary/20 size-12 ring-2 ring-transparent transition-all">
																			<AvatarImage src={getAvatarUrl(user.image) ?? undefined} />
																			<AvatarFallback className="bg-primary text-primary-foreground font-semibold">
																				{getInitials(user.name)}
																			</AvatarFallback>
																		</Avatar>
																		<div className="flex-1 overflow-hidden">
																			<p className="text-base font-semibold">{user.name}</p>
																			<p className="text-muted-foreground truncate text-sm">
																				{user.email}
																			</p>
																		</div>
																		{isSelected && (
																			<Badge
																				variant="secondary"
																				className="bg-primary/10 text-primary"
																			>
																				Added
																			</Badge>
																		)}
																	</button>
																)
															})}
														</div>
													) : (
														<div className="p-8 text-center">
															<Search className="text-muted-foreground/50 mx-auto mb-3 size-12" />
															<p className="text-muted-foreground text-sm font-medium">
																No users found
															</p>
															<p className="text-muted-foreground mt-1 text-xs">
																Try a different search term
															</p>
														</div>
													)}
												</div>
											</ScrollArea>
										</div>
									)}
								</div>
							</div>
						</div>
						<DialogFooter className="gap-2 border-t pt-4">
							<Button
								variant="outline"
								onClick={() => {
									setIsDialogOpen(false)
									setTitle("")
									setSelectedUsers([])
									setUserSearchQuery("")
								}}
								className="h-11"
							>
								Cancel
							</Button>
							<Button
								onClick={() => void handleCreate()}
								disabled={!title.trim() || create.isPending}
								className="h-11 px-6 shadow-lg"
							>
								{create.isPending ? (
									<>
										<div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Creating...
									</>
								) : (
									<>
										<Video className="mr-2 size-4" />
										Create Meeting
									</>
								)}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="flex items-center justify-between pt-4">
				<h3 className="font-small text-sm">
					{isLoading ? (
						<Skeleton className="h-6 w-48" />
					) : (
						<>
							{filteredMeetings.length} Meeting{filteredMeetings.length !== 1 ? "s" : ""} Found
						</>
					)}
				</h3>
				<div className="flex items-center gap-2">
					<Button
						variant={viewMode === "list" ? "default" : "outline"}
						size="sm"
						onClick={() => setViewMode("list")}
						className="gap-2"
					>
						<LayoutList className="size-4" />
						List
					</Button>
					<Button
						variant={viewMode === "grid" ? "default" : "outline"}
						size="sm"
						onClick={() => setViewMode("grid")}
						className="gap-2"
					>
						<Grid3x3 className="size-4" />
						Grid
					</Button>
				</div>
			</div>

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
				viewMode === "list" ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<Card key={i}>
								<CardContent className="p-6">
									<Skeleton className="h-32 w-full" />
								</CardContent>
							</Card>
						))}
					</div>
				) : (
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map(i => (
							<Skeleton key={i} className="h-64" />
						))}
					</div>
				)
			) : meetings.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Video className="text-muted-foreground mx-auto mb-4 size-16" />
						<h3 className="text-xl font-semibold">No meetings yet</h3>
						<p className="text-muted-foreground mt-2">
							Create your first meeting to get started with video conferences
						</p>
						<Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
							<Plus className="mr-2 size-4" />
							Create Meeting
						</Button>
					</CardContent>
				</Card>
			) : filteredMeetings.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Video className="text-muted-foreground mx-auto mb-4 size-12" />
						<h3 className="mb-2 text-lg font-medium">No meetings found</h3>
						<p className="text-muted-foreground mb-4">
							{searchTerm || statusFilter !== "ALL"
								? "Try adjusting your search criteria or filters."
								: "You don't have any meetings at the moment."}
						</p>
						<Button onClick={() => setIsDialogOpen(true)} variant="outline">
							Create New Meeting
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{viewMode === "list" ? (
						<div className="space-y-4">
							{filteredMeetings.map(meeting => {
								const isHost = meeting.createdBy.id === session?.user?.id
								const isParticipant = meeting.participants.some(
									p => p.user?.id === session?.user?.id
								)
								const canJoin = meeting.status === "ONGOING"
								const canStart = (isHost || isParticipant) && meeting.status === "SCHEDULED"
								const canEnd = isHost && meeting.status === "ONGOING"
								const scheduledLabel = meeting.createdAt
									? format(new Date(meeting.createdAt), "PPp")
									: "Not scheduled"

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
														{getStatusBadge(meeting.status)}
													</div>

													{/* Meta Info Row */}
													<div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
														<div className="flex items-center gap-1">
															<Users className="size-3.5 shrink-0" />
															<span>
																{meeting.participants.length} participant
																{meeting.participants.length !== 1 ? "s" : ""}
															</span>
														</div>

														<MeetingDocumentSummary
															total={meeting.documentStats?.total ?? 0}
															signed={meeting.documentStats?.signed ?? 0}
															isComplete={meeting.documentStats?.isComplete}
														/>

														<div className="flex items-center gap-1">
															<Calendar className="size-3.5 shrink-0" />
															<span>{scheduledLabel}</span>
														</div>

														<div className="flex items-center gap-1">
															<Clock className="size-3.5 shrink-0" />
															<span>{meeting.createdBy.name}</span>
														</div>
													</div>

													{/* Host Compact */}
													<div className="flex items-center gap-2 pt-1">
														<Avatar className="size-7">
															<AvatarImage
																src={getAvatarUrl(meeting.createdBy?.image) ?? undefined}
																alt={meeting.createdBy?.name ?? "User"}
															/>
															<AvatarFallback>
																{getInitials(meeting.createdBy?.name) || "U"}
															</AvatarFallback>
														</Avatar>
														<span className="text-xs font-medium">{meeting.createdBy.name}</span>
														<span className="text-muted-foreground text-xs">• Host</span>
													</div>
												</div>

												{/* RIGHT SIDE ACTIONS */}
												<div className="flex shrink-0 flex-col items-end gap-2">
													{/* Meeting Controls */}
													<div className="flex flex-wrap justify-end gap-2">
														{canStart &&
															(session?.user?.role === "PRINCIPAL" ? (
																<Button size="sm" disabled className="h-8 text-xs opacity-70">
																	<PlayCircle className="size-3.5" />
																	Wait
																</Button>
															) : (
																<Button
																	size="sm"
																	onClick={e => {
																		e.stopPropagation()
																		void handleStartMeeting(meeting.id)
																	}}
																	disabled={loadingMeetingId === meeting.id}
																	className="h-8 gap-1 text-xs"
																>
																	<PlayCircle className="size-3.5" />
																	{loadingMeetingId === meeting.id ? "Starting..." : "Start"}
																</Button>
															))}

														{canJoin && (
															<Button
																size="sm"
																className="h-8 gap-1 text-xs text-black"
																style={{ backgroundColor: "#33ff00" }}
																onClick={e => {
																	e.stopPropagation()
																	setJoiningMeetingId(meeting.id)
																	router.push(`/sessions/${meeting.id}/lobby`)
																}}
																disabled={joiningMeetingId === meeting.id}
															>
																{joiningMeetingId === meeting.id ? (
																	<>
																		<Loader2 className="size-3.5 animate-spin" />
																		Joining
																	</>
																) : (
																	<>
																		<Video className="size-3.5" />
																		Join
																	</>
																)}
															</Button>
														)}

														{canEnd && (
															<Button
																size="sm"
																className="h-8 gap-1 bg-rose-500 text-xs text-white hover:bg-rose-600"
																onClick={e => {
																	e.stopPropagation()
																	void handleEndMeeting(meeting.id)
																}}
																disabled={loadingMeetingId === meeting.id}
															>
																<StopCircle className="size-3.5" />
																{loadingMeetingId === meeting.id
																	? "Ending session..."
																	: "End Session"}
															</Button>
														)}

														{meeting.status === "COMPLETED" && (
															<Button size="sm" variant="outline" disabled className="h-8 text-xs">
																Ended
															</Button>
														)}

														{isHost && (
															<Button
																variant="outline"
																size="icon"
																className="size-8"
																onClick={e => {
																	e.stopPropagation()
																	void handleDelete(meeting.id)
																}}
															>
																<Trash2 className="size-3.5" />
															</Button>
														)}
													</div>

													{/* Video Records Button */}
													<Button
														variant="ghost"
														size="sm"
														className="h-8 gap-1 text-xs"
														onClick={e => {
															e.stopPropagation()
															setRecordingsModalMeeting({
																id: meeting.id,
																title: meeting.title,
															})
															setRecordingsModalOpen(true)
														}}
													>
														<Film className="size-3.5" />
														Records
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								)
							})}
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
					) : (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{filteredMeetings.map(meeting => {
								const isHost = meeting.createdBy.id === session?.user?.id
								const isParticipant = meeting.participants.some(
									p => p.user?.id === session?.user?.id
								)
								const canJoin = meeting.status === "ONGOING"
								const canStart = (isHost || isParticipant) && meeting.status === "SCHEDULED"
								const canEnd = isHost && meeting.status === "ONGOING"
								const scheduledLabel = meeting.createdAt
									? format(new Date(meeting.createdAt), "PPP • h:mm a")
									: "Not scheduled"

								return (
									<Card key={meeting.id} className="transition-shadow hover:shadow-lg">
										<CardHeader>
											<div className="flex items-start justify-between gap-2">
												<div className="min-w-0 flex-1">
													<div className="flex items-start gap-3">
														<Avatar className="size-12">
															<AvatarImage
																src={getAvatarUrl(meeting.createdBy?.image) ?? undefined}
																alt={meeting.createdBy?.name ?? "User"}
															/>
															<AvatarFallback className="bg-primary text-primary-foreground">
																{getInitials(meeting.createdBy?.name) || "U"}
															</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1">
															<CardTitle className="line-clamp-2 text-lg">
																{meeting.title}
															</CardTitle>
															<CardDescription className="mt-1">
																by {meeting.createdBy.name}
															</CardDescription>
														</div>
													</div>
												</div>
												{isHost && (
													<Button
														variant="ghost"
														size="icon"
														className="size-8 shrink-0 hover:bg-rose-50 dark:hover:bg-rose-950/20"
														onClick={e => {
															e.stopPropagation()
															void handleDelete(meeting.id)
														}}
													>
														<Trash2 className="size-4 text-rose-500 hover:text-rose-600" />
													</Button>
												)}
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											<div>{getStatusBadge(meeting.status)}</div>
											<div className="text-muted-foreground flex items-center gap-2 text-sm">
												<Users className="size-4" />
												<span>
													{meeting.participants.length} participant
													{meeting.participants.length !== 1 ? "s" : ""}
												</span>
											</div>
											<MeetingDocumentSummary
												total={meeting.documentStats?.total ?? 0}
												signed={meeting.documentStats?.signed ?? 0}
												isComplete={meeting.documentStats?.isComplete}
											/>
											<div className="text-muted-foreground flex items-center gap-2 text-sm">
												<Calendar className="size-4" />
												<span>Scheduled for {scheduledLabel}</span>
											</div>

											<div className="space-y-2 pt-2">
												{canStart && (
													<Button
														className="w-full"
														variant="default"
														onClick={e => {
															e.stopPropagation()
															void handleStartMeeting(meeting.id)
														}}
														disabled={loadingMeetingId === meeting.id}
													>
														<PlayCircle className="mr-2 size-4" />
														{loadingMeetingId === meeting.id ? "Starting..." : "Start Meeting"}
													</Button>
												)}

												{canJoin && (
													<Button
														className="flex w-full items-center justify-center text-white"
														style={{ backgroundColor: "#313638" }}
														onClick={e => {
															e.stopPropagation()
															setJoiningMeetingId(meeting.id)
															router.push(`/sessions/${meeting.id}/lobby`)
														}}
														disabled={joiningMeetingId === meeting.id}
													>
														{joiningMeetingId === meeting.id ? (
															<>
																<Loader2 className="mr-2 size-4 animate-spin" />
																Joining...
															</>
														) : (
															<>
																<Video className="mr-2 size-4" />
																Join Meeting
															</>
														)}
													</Button>
												)}

												{canEnd && (
													<Button
														className="flex w-full items-center justify-center bg-rose-500 text-white hover:bg-rose-600"
														onClick={e => {
															e.stopPropagation()
															void handleEndMeeting(meeting.id)
														}}
														disabled={loadingMeetingId === meeting.id}
													>
														<StopCircle className="mr-2 size-4" />
														{loadingMeetingId === meeting.id ? "Ending session..." : "End Session"}
													</Button>
												)}

												{meeting.status === "COMPLETED" && (
													<Button className="w-full" variant="outline" disabled>
														Meeting Ended
													</Button>
												)}

												<Button
													className="w-full"
													variant="outline"
													onClick={e => {
														e.stopPropagation()
														setRecordingsModalMeeting({
															id: meeting.id,
															title: meeting.title,
														})
														setRecordingsModalOpen(true)
													}}
												>
													<Film className="mr-2 size-4" />
													Video Records
												</Button>
											</div>
										</CardContent>
									</Card>
								)
							})}
						</div>
					)}
				</div>
			)}

			<MeetingRecordingsModal
				open={recordingsModalOpen}
				onOpenChange={open => {
					setRecordingsModalOpen(open)
					if (!open) setRecordingsModalMeeting(null)
				}}
				meeting={recordingsModalMeeting}
			/>
		</div>
	)
}
