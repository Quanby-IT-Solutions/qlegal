"use client"

import { useRouter } from "next/navigation"
import { use, useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Clock, Mic, MicOff, Users, Video } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { useMeetings } from "@/features/meetings/api/meetings.hooks"

export default function MeetingLobbyPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { data: session } = useSession()
	const { getById } = useMeetings()
	const { data: meeting, isLoading } = getById(id)

	const videoRef = useRef<HTMLVideoElement>(null)
	const [stream, setStream] = useState<MediaStream | null>(null)
	const [isCameraOn, setIsCameraOn] = useState(false)
	const [isMicOn, setIsMicOn] = useState(true)
	const [isTestingDevices, setIsTestingDevices] = useState(false)

	// Get user media
	useEffect(() => {
		if (!session) {
			router.push(`/auth/login?callbackUrl=/meetings/${id}/lobby`)
		}
	}, [session, router, id])

	// Don't auto-start - let users choose

	// Update video element when stream changes
	useEffect(() => {
		if (stream && videoRef.current && isCameraOn) {
			const videoElement = videoRef.current
			// Only set srcObject if it's different to avoid interrupting playback
			if (videoElement.srcObject !== stream) {
				videoElement.srcObject = stream
				// Use a promise to handle play() properly
				const playPromise = videoElement.play()
				if (playPromise !== undefined) {
					playPromise.catch(err => {
						// Silently handle if user hasn't interacted yet
						if (err.name !== "NotAllowedError") {
							console.error("Error playing video:", err)
						}
					})
				}
			}
		}
	}, [stream, isCameraOn])

	const startPreview = async () => {
		if (stream) {
			return // Already have a stream
		}

		setIsTestingDevices(true)
		try {
			// Try to get both video and audio, but don't block if it fails
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: true,
			})
			setStream(mediaStream)
			setIsCameraOn(true)
			setIsMicOn(true)
		} catch (error) {
			// Silently fail - user can still join without camera/mic
			console.log("Media devices not available, user can still join")
			setIsCameraOn(false)
			setIsMicOn(false)
		} finally {
			setIsTestingDevices(false)
		}
	}

	const toggleCamera = () => {
		if (stream) {
			const videoTrack = stream.getVideoTracks()[0]
			if (videoTrack) {
				videoTrack.enabled = !videoTrack.enabled
				setIsCameraOn(videoTrack.enabled)
			}
		}
	}

	const toggleMic = () => {
		if (stream) {
			const audioTrack = stream.getAudioTracks()[0]
			if (audioTrack) {
				audioTrack.enabled = !audioTrack.enabled
				setIsMicOn(audioTrack.enabled)
			}
		}
	}

	const handleJoinMeeting = () => {
		// Stop preview stream before joining
		if (stream) {
			stream.getTracks().forEach(track => track.stop())
		}
		router.push(`/meetings/${id}`)
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop())
			}
		}
	}, [stream])

	if (isLoading) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-gradient-to-br">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	if (!meeting) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-gradient-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-bold">Meeting not found</h2>
						<p className="text-muted-foreground mt-2">
							The meeting you're looking for doesn't exist.
						</p>
						<Button className="mt-6" onClick={() => router.push("/meetings")}>
							Back to Meetings
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (meeting.status !== "ONGOING") {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-gradient-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
							<Clock className="size-8 text-yellow-600 dark:text-yellow-500" />
						</div>
						<h2 className="mb-2 text-2xl font-bold">{meeting.title}</h2>
						<p className="text-muted-foreground mb-6">
							This meeting has not started yet. Please wait for the host to start the meeting.
						</p>
						<Button onClick={() => router.push("/meetings")}>Back to Meetings</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="from-background via-muted/30 to-background flex h-screen flex-col bg-gradient-to-br">
			{/* Header */}
			<div className="bg-card/50 border-b px-6 py-6 backdrop-blur-sm">
				<div className="mx-auto max-w-7xl">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
							<Video className="text-primary h-6 w-6" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">{meeting.title}</h1>
							<p className="text-muted-foreground text-sm">Get ready to join your meeting</p>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 gap-4 overflow-hidden p-4 md:p-6">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-6 lg:flex-row">
					{/* Left: Camera Preview */}
					<div className="flex flex-1 flex-col">
						<Card className="relative flex-1 overflow-hidden shadow-lg">
							<CardContent className="relative size-full p-0">
								{isCameraOn && stream ? (
									<video
										ref={videoRef}
										autoPlay
										playsInline
										muted
										className="size-full scale-x-[-1] rounded-lg object-cover"
									/>
								) : (
									<div className="from-muted/30 to-muted/10 flex size-full items-center justify-center bg-gradient-to-br">
										<div className="p-4 text-center">
											{isTestingDevices ? (
												<div>
													<div className="border-primary mx-auto mb-3 size-12 animate-spin rounded-full border-b-4 md:size-16" />
													<p className="text-muted-foreground text-sm font-medium md:text-base">
														Starting camera...
													</p>
												</div>
											) : (
												<>
													<div className="from-primary to-primary/80 text-primary-foreground mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-gradient-to-br text-4xl font-bold shadow-xl md:mb-6 md:size-32 md:text-5xl">
														{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
													</div>
													<p className="text-xl font-bold md:text-2xl">{session?.user?.name}</p>
													<p className="text-muted-foreground mt-2 text-sm md:text-base">
														Camera is off
													</p>
													{!stream && (
														<Button
															className="mt-4 shadow-md md:mt-6"
															onClick={() => void startPreview()}
															size="default"
														>
															<Camera className="mr-2 size-4" />
															Start Camera & Mic
														</Button>
													)}
												</>
											)}
										</div>
									</div>
								)}

								{/* Control Overlay */}
								<div className="bg-card/95 absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border p-2 shadow-xl backdrop-blur-md md:gap-3">
									<Button
										variant={isMicOn ? "default" : "destructive"}
										size="icon"
										className="size-10 rounded-full shadow-md md:size-12"
										onClick={toggleMic}
										disabled={!stream}
										title={isMicOn ? "Mute microphone" : "Unmute microphone"}
									>
										{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
									</Button>
									<Button
										variant={isCameraOn ? "default" : "destructive"}
										size="icon"
										className="size-10 rounded-full shadow-md md:size-12"
										onClick={toggleCamera}
										disabled={!stream}
										title={isCameraOn ? "Turn off camera" : "Turn on camera"}
									>
										{isCameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Right: Meeting Info & Participants */}
					<div className="flex flex-col gap-3 md:gap-4 lg:w-80 xl:w-96">
						{/* Meeting Details */}
						<Card className="shadow-md">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
										<Video className="text-primary size-3.5" />
									</div>
									Meeting Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="bg-muted/50 flex items-center justify-between rounded-lg p-2.5">
									<div className="min-w-0 flex-1">
										<p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
											Host
										</p>
										<p className="mt-0.5 truncate text-sm font-semibold">
											{meeting.createdBy.name}
										</p>
									</div>
									<Avatar className="ring-primary/20 ml-2 size-8 flex-shrink-0 ring-2">
										<AvatarImage src={meeting.createdBy.image ?? undefined} />
										<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
											{meeting.createdBy.name?.charAt(0).toUpperCase() ?? "?"}
										</AvatarFallback>
									</Avatar>
								</div>
								<div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/20">
									<div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
										<div className="size-2 animate-pulse rounded-full bg-emerald-500" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
											Status
										</p>
										<p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
											Live Now
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Participants List */}
						<Card className="flex-1 overflow-hidden shadow-md">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-lg">
										<Users className="text-primary size-3.5" />
									</div>
									Participants
								</CardTitle>
								<CardDescription className="text-xs">
									{meeting.participants.length}{" "}
									{meeting.participants.length === 1 ? "person" : "people"}
								</CardDescription>
							</CardHeader>
							<CardContent className="max-h-48 overflow-y-auto">
								<div className="space-y-1.5">
									{meeting.participants.map(participant => (
										<div
											key={participant.id}
											className="hover:bg-muted/50 flex items-center gap-2.5 rounded-lg p-2 transition-colors"
										>
											<Avatar className="hover:ring-primary/20 size-8 flex-shrink-0 ring-2 ring-transparent transition-all">
												<AvatarImage src={participant.user.image ?? undefined} />
												<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
													{participant.user.name?.charAt(0).toUpperCase() ?? "?"}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="truncate text-xs font-semibold">
													{participant.user.name}
													{participant.userId === session?.user?.id && (
														<span className="text-muted-foreground ml-1.5 text-[10px] font-normal">
															(You)
														</span>
													)}
												</p>
												<p className="text-muted-foreground truncate text-[10px]">
													{participant.user.email}
												</p>
											</div>
											{participant.userId === meeting.createdBy.id && (
												<span className="bg-primary/10 text-primary flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
													Host
												</span>
											)}
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* Action Buttons */}
						<div className="space-y-2">
							<Button
								className="h-11 w-full text-sm shadow-md transition-all hover:shadow-lg"
								onClick={handleJoinMeeting}
							>
								<Video className="mr-2 size-4" />
								Join Meeting Now
							</Button>
							<Button
								variant="outline"
								className="h-9 w-full text-sm"
								onClick={() => router.push("/meetings")}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
