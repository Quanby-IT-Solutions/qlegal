"use client"

import { type Route } from "next"
import { Calendar, Plus, PlayCircle, StopCircle, Trash2, Users, Video, X, Search, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState } from "react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
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
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { useMeetings } from "@/features/meetings/api/meetings.hooks"
import { useMessages } from "@/features/messages/api/messages.hooks"
import { toast } from "sonner"

export default function MeetingsPage() {
	const router = useRouter()
	const { data: session } = useSession()
	const { getUserMeetings, create, startMeeting, endMeeting, deleteMeeting } = useMeetings()
	const { searchUsers } = useMessages()
	const { data: meetings, isLoading } = getUserMeetings()
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [userSearchQuery, setUserSearchQuery] = useState("")
	const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name: string | null; email: string | null; image: string | null }>>([])
	const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null)
	const [statusFilter, setStatusFilter] = useState<string>("ALL")
	
	const { data: searchResults } = searchUsers(userSearchQuery)

	// Filter meetings by status
	const filteredMeetings = meetings?.filter(meeting => {
		if (statusFilter === "ALL") return true
		return meeting.status === statusFilter
	})

	const handleCreate = async () => {
		if (!title.trim()) {return}

		try {
			const result = await create.mutateAsync({
				title: title.trim(),
				participantIds: selectedUsers.map(u => u.id),
			})

			if (result.success) {
				setIsDialogOpen(false)
				setTitle("")
				setSelectedUsers([])
				setUserSearchQuery("")
				toast.success("Meeting created successfully!")
				// Stay on meetings page - the list will auto-refresh
			}
		} catch {
			toast.error("Failed to create meeting")
		}
	}

	const handleAddUser = (user: { id: string; name: string | null; email: string | null; image: string | null }) => {
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
			toast.success("Meeting started successfully!")
		} catch {
			toast.error("Failed to start meeting")
		} finally {
			setLoadingMeetingId(null)
		}
	}

	const handleEndMeeting = async (id: string) => {
		if (!confirm("Are you sure you want to end this meeting?")) {return}

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
		if (!confirm("Are you sure you want to delete this meeting?")) {return}

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

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "SCHEDULED":
				return <Badge variant="secondary"><Calendar className="mr-1 size-3" /> Scheduled</Badge>
			case "ONGOING":
				return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700"><PlayCircle className="mr-1 size-3" /> Live</Badge>
			case "COMPLETED":
				return <Badge variant="outline">Completed</Badge>
			case "CANCELLED":
				return <Badge variant="outline" className="text-rose-600 border-rose-600">Cancelled</Badge>
			default:
				return null
		}
	}

	if (isLoading) {
		return (
			<>
				<SiteNavbar items={[{ label: "Meetings", url: "/meetings" as Route }]} />
				<div className="bg-muted/30 min-h-screen">
					<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
						<Skeleton className="mb-8 h-10 w-48" />
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-64" />
							))}
						</div>
					</div>
				</div>
			</>
		)
	}

	return (
		<>
			<SiteNavbar items={[{ label: "Meetings", url: "/meetings" as Route }]} />
			
			<div className="bg-muted/30 min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold tracking-tight">Video Meetings</h1>
								<p className="mt-2 text-muted-foreground">
									Create and join video meetings with participants for notarization sessions
								</p>
							</div>

							<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
						<DialogTrigger asChild>
							<Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
								<Plus className="mr-2 size-5" />
								New Meeting
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
							<DialogHeader className="space-y-3 pb-4">
								<div className="flex items-center gap-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
										<Video className="h-6 w-6 text-primary" />
									</div>
									<div className="flex-1">
										<DialogTitle className="text-2xl">Create New Meeting</DialogTitle>
										<DialogDescription className="text-base mt-1">
											Set up a video meeting and invite your team
										</DialogDescription>
									</div>
								</div>
							</DialogHeader>
							
							<div className="space-y-6 py-4">
								{/* Meeting Title */}
								<div className="space-y-3">
									<Label htmlFor="title" className="text-base font-semibold">
										Meeting Title <span className="text-destructive">*</span>
									</Label>
									<Input
										id="title"
										placeholder="e.g., Team Standup, Client Review, Project Kickoff"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										className="h-12 text-base"
									/>
								</div>

								{/* Invite Participants */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Label className="text-base font-semibold">
											Invite Participants
											<span className="ml-2 text-sm font-normal text-muted-foreground">(Optional)</span>
										</Label>
										{selectedUsers.length > 0 && (
											<Badge variant="secondary" className="font-semibold">
												<Users className="mr-1 size-3" />
												{selectedUsers.length} invited
											</Badge>
										)}
									</div>

									{/* Selected Users */}
									{selectedUsers.length > 0 && (
										<div className="rounded-lg border bg-muted/30 p-4">
											<p className="text-sm font-medium text-muted-foreground mb-3">Selected Participants</p>
											<div className="flex flex-wrap gap-2">
												{selectedUsers.map((user) => (
													<Badge 
														key={user.id} 
														variant="secondary" 
														className="gap-2 pr-2 py-1.5 text-sm hover:bg-secondary/80 transition-colors"
													>
														<Avatar className="size-5">
															<AvatarImage src={user.image ?? undefined} />
															<AvatarFallback className="bg-primary text-primary-foreground text-xs">
																{user.name?.split(" ").map((n) => n[0]).join("")}
															</AvatarFallback>
														</Avatar>
														<span className="font-medium">{user.name}</span>
														<button
															onClick={() => handleRemoveUser(user.id)}
															className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
															aria-label="Remove user"
														>
															<X className="size-3.5 text-muted-foreground hover:text-destructive" />
														</button>
													</Badge>
												))}
											</div>
										</div>
									)}

									{/* User Search */}
									<div className="space-y-3">
										<div className="relative">
											<Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
											<Input
												placeholder="Search by name or email..."
												value={userSearchQuery}
												onChange={(e) => setUserSearchQuery(e.target.value)}
												className="pl-11 h-12 text-base"
											/>
										</div>

										{/* Search Results */}
										{userSearchQuery.length > 0 && (
											<div className="rounded-lg border bg-card">
												<ScrollArea className="h-64">
													<div className="p-2">
														{searchResults && searchResults.length > 0 ? (
															<div className="space-y-1">
																{searchResults.map((user) => {
																	const isSelected = selectedUsers.some(u => u.id === user.id)
																	return (
																		<button
																			key={user.id}
																			onClick={() => handleAddUser(user)}
																			disabled={isSelected}
																			className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed group"
																		>
																			<Avatar className="size-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
																				<AvatarImage src={user.image ?? undefined} />
																				<AvatarFallback className="bg-primary text-primary-foreground font-semibold">
																					{user.name?.split(" ").map((n) => n[0]).join("")}
																				</AvatarFallback>
																			</Avatar>
																			<div className="flex-1 overflow-hidden">
																				<p className="font-semibold text-base">{user.name}</p>
																				<p className="truncate text-sm text-muted-foreground">{user.email}</p>
																			</div>
																			{isSelected && (
																				<Badge variant="secondary" className="bg-primary/10 text-primary">
																					Added
																				</Badge>
																			)}
																		</button>
																	)
																})}
															</div>
														) : (
															<div className="p-8 text-center">
																<Search className="mx-auto mb-3 size-12 text-muted-foreground/50" />
																<p className="text-sm font-medium text-muted-foreground">No users found</p>
																<p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
															</div>
														)}
													</div>
												</ScrollArea>
											</div>
										)}
									</div>
								</div>
							</div>

							<DialogFooter className="gap-2 pt-4 border-t">
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
											<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
					</div>

					{/* Filter & Stats */}
					{meetings && meetings.length > 0 && (
						<Card className="mb-8">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Video className="h-5 w-5" />
									Filter Meetings
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<Tabs value={statusFilter} onValueChange={setStatusFilter}>
										<TabsList className="grid w-full grid-cols-4">
											<TabsTrigger value="ALL">
												All ({meetings.length})
											</TabsTrigger>
											<TabsTrigger value="SCHEDULED">
												<Calendar className="mr-2 h-4 w-4" />
												Scheduled ({meetings.filter(m => m.status === "SCHEDULED").length})
											</TabsTrigger>
											<TabsTrigger value="ONGOING">
												<PlayCircle className="mr-2 h-4 w-4" />
												Live ({meetings.filter(m => m.status === "ONGOING").length})
											</TabsTrigger>
											<TabsTrigger value="COMPLETED">
												<StopCircle className="mr-2 h-4 w-4" />
												Completed ({meetings.filter(m => m.status === "COMPLETED").length})
											</TabsTrigger>
										</TabsList>
									</Tabs>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Results */}
					{meetings && meetings.length === 0 ? (
						<Card>
							<CardContent className="py-12 text-center">
								<Video className="mx-auto mb-4 size-16 text-muted-foreground" />
								<h3 className="text-xl font-semibold">No meetings yet</h3>
								<p className="mt-2 text-muted-foreground">
									Create your first meeting to get started with video conferences
								</p>
								<Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
									<Plus className="mr-2 size-4" />
									Create Meeting
								</Button>
							</CardContent>
						</Card>
					) : filteredMeetings && filteredMeetings.length === 0 ? (
						<Card>
							<CardContent className="py-12 text-center">
								<Search className="mx-auto mb-4 size-12 text-muted-foreground" />
								<h3 className="mb-2 text-lg font-medium">No meetings found</h3>
								<p className="text-muted-foreground mb-4">
									No meetings match the selected filter.
								</p>
								<Button
									onClick={() => setStatusFilter("ALL")}
									variant="outline"
								>
									Show All Meetings
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-semibold">
									{filteredMeetings?.length} Meeting{filteredMeetings?.length !== 1 ? "s" : ""} Found
								</h2>
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Clock className="h-4 w-4" />
									<span>Recent meetings first</span>
								</div>
							</div>

							{/* Meeting Cards */}
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{filteredMeetings?.map((meeting) => {
									const isHost = meeting.createdBy.id === session?.user?.id
									const canJoin = meeting.status === "ONGOING"
									const canStart = isHost && meeting.status === "SCHEDULED"
									const canEnd = isHost && meeting.status === "ONGOING"

									return (
										<Card key={meeting.id} className="transition-shadow hover:shadow-lg">
											<CardHeader>
												<div className="flex items-start justify-between gap-2">
													<div className="flex-1 min-w-0">
														<div className="flex items-start gap-3">
															<Avatar className="h-12 w-12">
																<AvatarImage src={meeting.createdBy.image ?? undefined} alt={meeting.createdBy.name ?? "User"} />
																<AvatarFallback className="bg-primary text-primary-foreground">
																	{meeting.createdBy.name?.split(" ").map(n => n[0]).join("") ?? "U"}
																</AvatarFallback>
															</Avatar>
															<div className="flex-1 min-w-0">
																<CardTitle className="text-lg line-clamp-2">{meeting.title}</CardTitle>
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
															className="flex-shrink-0 h-8 w-8 hover:bg-rose-50 dark:hover:bg-rose-950/20"
															onClick={(e) => {
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
												{/* Status Badge */}
												<div>{getStatusBadge(meeting.status)}</div>

												{/* Participants Count */}
												<div className="flex items-center gap-2 text-sm text-muted-foreground">
													<Users className="size-4" />
													<span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? "s" : ""}</span>
												</div>

												{/* Action Buttons */}
												<div className="space-y-2 pt-2">
													{canStart && (
														<Button
															className="w-full"
															variant="default"
															onClick={(e) => {
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
															className="w-full text-white flex items-center justify-center"
															style={{ backgroundColor: '#313638' }}
															onClick={(e) => {
																e.stopPropagation()
																router.push(`/meetings/${meeting.id}/lobby`)
															}}
														>
															<Video className="mr-2 size-4" />
															Join Meeting
														</Button>
													)}

													{canEnd && (
														<Button
															className="w-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center"
															onClick={(e) => {
																e.stopPropagation()
																void handleEndMeeting(meeting.id)
															}}
															disabled={loadingMeetingId === meeting.id}
														>
															<StopCircle className="mr-2 size-4" />
															{loadingMeetingId === meeting.id ? "Ending..." : "End Meeting"}
														</Button>
													)}

													{meeting.status === "COMPLETED" && (
														<Button className="w-full" variant="outline" disabled>
															Meeting Ended
														</Button>
													)}
												</div>
											</CardContent>
										</Card>
									)
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

