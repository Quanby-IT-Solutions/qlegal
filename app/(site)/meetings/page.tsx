"use client"

import { Calendar, Plus, PlayCircle, StopCircle, Trash2, Users, Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useState } from "react"

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
import { Skeleton } from "@/core/components/ui/skeleton"
import { useMeetings } from "@/features/meetings/api/meetings.hooks"
import { toast } from "sonner"

export default function MeetingsPage() {
	const router = useRouter()
	const { data: session } = useSession()
	const { getUserMeetings, create, startMeeting, endMeeting, deleteMeeting } = useMeetings()
	const { data: meetings, isLoading } = getUserMeetings()
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [title, setTitle] = useState("")
	const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null)

	const handleCreate = async () => {
		if (!title.trim()) {return}

		try {
			const result = await create.mutateAsync({
				title: title.trim(),
			})

			if (result.success) {
				setIsDialogOpen(false)
				setTitle("")
				router.push(`/meetings/${result.meeting.id}`)
			}
		} catch {
			toast.error("Failed to create meeting")
		}
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
				return <Badge variant="default" className="bg-green-500"><PlayCircle className="mr-1 size-3" /> Live</Badge>
			case "COMPLETED":
				return <Badge variant="outline">Completed</Badge>
			case "CANCELLED":
				return <Badge variant="destructive">Cancelled</Badge>
			default:
				return null
		}
	}

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-6xl px-4 py-8">
				<Skeleton className="mb-8 h-10 w-48" />
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-48" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="container mx-auto max-w-6xl px-4 py-8">
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Video Meetings</h1>
					<p className="mt-2 text-muted-foreground">
						Create and join Discord-style video meetings
					</p>
				</div>

				<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
					<DialogTrigger asChild>
						<Button size="lg">
							<Plus className="mr-2 size-5" />
							New Meeting
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Meeting</DialogTitle>
							<DialogDescription>
								Create a new video meeting and start collaborating
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor="title">Meeting Title</Label>
								<Input
									id="title"
									placeholder="Team Standup"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											void handleCreate()
										}
									}}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button
								onClick={() => void handleCreate()}
								disabled={!title.trim() || create.isPending}
							>
								{create.isPending ? "Creating..." : "Create Meeting"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			{meetings && meetings.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Video className="mx-auto mb-4 size-16 text-muted-foreground" />
						<h3 className="text-xl font-semibold">No meetings yet</h3>
						<p className="mt-2 text-muted-foreground">
							Create your first meeting to get started
						</p>
						<Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
							<Plus className="mr-2 size-4" />
							Create Meeting
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{meetings?.map((meeting) => {
						const isHost = meeting.createdBy.id === session?.user?.id
						const canJoin = meeting.status === "ONGOING"
						const canStart = isHost && meeting.status === "SCHEDULED"
						const canEnd = isHost && meeting.status === "ONGOING"

						return (
							<Card key={meeting.id} className="group transition-all hover:shadow-md">
								<CardHeader>
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 min-w-0">
											<CardTitle className="line-clamp-2">{meeting.title}</CardTitle>
											<CardDescription className="mt-1">
												Created by {meeting.createdBy.name}
											</CardDescription>
										</div>
										{isHost && (
											<Button
												variant="ghost"
												size="sm"
												className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
												onClick={(e) => {
													e.stopPropagation()
													void handleDelete(meeting.id)
												}}
											>
												<Trash2 className="size-4 text-destructive" />
											</Button>
										)}
									</div>
									<div className="mt-2">{getStatusBadge(meeting.status)}</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Users className="size-4" />
										<span>{meeting.participants.length} participants</span>
									</div>

									{/* Action Buttons */}
									<div className="space-y-2">
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
												className="w-full"
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
												className="w-full"
												variant="destructive"
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
			)}
		</div>
	)
}

