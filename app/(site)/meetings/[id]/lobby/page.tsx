"use client"

import { Camera, CameraOff, Clock, Mic, MicOff, Users, Video } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { use, useEffect, useRef, useState } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useMeetings } from "@/features/meetings/api/meetings.hooks"
import { toast } from "sonner"

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

	// Auto-start camera preview when lobby loads
	useEffect(() => {
		if (session && meeting?.status === "ONGOING" && !stream) {
			const timer = setTimeout(() => {
				void startPreview()
			}, 500) // Small delay to ensure component is mounted
			return () => clearTimeout(timer)
		}
	}, [session, meeting?.status, stream])

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
					playPromise.catch((err) => {
						// Silently handle if user hasn't interacted yet
						if (err.name !== 'NotAllowedError') {
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
		toast.success("Camera and microphone ready!")
		} catch (error) {
			console.error("Error accessing media devices:", error)
			const errorMessage = error instanceof Error ? error.message : "Unknown error"
			
			if (errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
				toast.error("Camera/microphone permission denied. Please allow access in your browser settings.")
			} else if (errorMessage.includes("NotFoundError")) {
				toast.error("No camera or microphone found. Please connect a device.")
			} else {
				toast.error("Failed to access camera/microphone. Please check your device settings.")
			}
			
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
			stream.getTracks().forEach((track) => track.stop())
		}
		router.push(`/meetings/${id}`)
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop())
			}
		}
	}, [stream])

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	if (!meeting) {
		return (
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-bold">Meeting not found</h2>
						<p className="mt-2 text-muted-foreground">The meeting you're looking for doesn't exist.</p>
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
			<div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
							<Clock className="size-8 text-yellow-600 dark:text-yellow-500" />
						</div>
						<h2 className="mb-2 text-2xl font-bold">{meeting.title}</h2>
						<p className="mb-6 text-muted-foreground">
							This meeting has not started yet. Please wait for the host to start the meeting.
						</p>
						<Button onClick={() => router.push("/meetings")}>
							Back to Meetings
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="flex h-screen flex-col bg-gradient-to-br from-background via-muted/30 to-background">
			{/* Header */}
			<div className="border-b bg-card/50 backdrop-blur-sm px-6 py-6">
				<div className="mx-auto max-w-7xl">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
							<Video className="h-6 w-6 text-primary" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">{meeting.title}</h1>
							<p className="text-sm text-muted-foreground">Get ready to join your meeting</p>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 gap-4 overflow-hidden p-4 md:p-6">
				<div className="mx-auto flex w-full max-w-7xl gap-4 md:gap-6 flex-col lg:flex-row">
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
									className="size-full object-cover rounded-lg scale-x-[-1]"
								/>
							) : (
									<div className="flex size-full items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
										<div className="text-center p-4">
											{isTestingDevices ? (
												<div>
													<div className="mx-auto mb-3 size-12 md:size-16 animate-spin rounded-full border-b-4 border-primary" />
													<p className="text-sm md:text-base text-muted-foreground font-medium">Starting camera...</p>
												</div>
											) : (
												<>
													<div className="mx-auto mb-4 md:mb-6 flex size-24 md:size-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-4xl md:text-5xl font-bold text-primary-foreground shadow-xl">
														{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
													</div>
													<p className="text-xl md:text-2xl font-bold">{session?.user?.name}</p>
													<p className="mt-2 text-sm md:text-base text-muted-foreground">Camera is off</p>
													{!stream && (
														<Button 
															className="mt-4 md:mt-6 shadow-md" 
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
								<div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 md:gap-3 rounded-full bg-card/95 p-2 shadow-xl backdrop-blur-md border">
									<Button
										variant={isMicOn ? "default" : "destructive"}
										size="icon"
										className="size-10 md:size-12 rounded-full shadow-md"
										onClick={toggleMic}
										disabled={!stream}
										title={isMicOn ? "Mute microphone" : "Unmute microphone"}
									>
										{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
									</Button>
									<Button
										variant={isCameraOn ? "default" : "destructive"}
										size="icon"
										className="size-10 md:size-12 rounded-full shadow-md"
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
					<div className="flex lg:w-80 xl:w-96 flex-col gap-3 md:gap-4">
						{/* Meeting Details */}
						<Card className="shadow-md">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
										<Video className="size-3.5 text-primary" />
									</div>
									Meeting Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
									<div className="min-w-0 flex-1">
										<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Host</p>
										<p className="font-semibold text-sm mt-0.5 truncate">{meeting.createdBy.name}</p>
									</div>
									<Avatar className="size-8 ring-2 ring-primary/20 flex-shrink-0 ml-2">
										<AvatarImage src={meeting.createdBy.image ?? undefined} />
										<AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
											{meeting.createdBy.name?.charAt(0).toUpperCase() ?? "?"}
										</AvatarFallback>
									</Avatar>
								</div>
								<div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2.5">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
										<div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Status</p>
										<p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">Live Now</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Participants List */}
						<Card className="flex-1 overflow-hidden shadow-md">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
										<Users className="size-3.5 text-primary" />
									</div>
									Participants
								</CardTitle>
								<CardDescription className="text-xs">
									{meeting.participants.length} {meeting.participants.length === 1 ? 'person' : 'people'}
								</CardDescription>
							</CardHeader>
							<CardContent className="overflow-y-auto max-h-48">
								<div className="space-y-1.5">
									{meeting.participants.map((participant) => (
										<div key={participant.id} className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/50 transition-colors">
											<Avatar className="size-8 ring-2 ring-transparent hover:ring-primary/20 transition-all flex-shrink-0">
												<AvatarImage src={participant.user.image ?? undefined} />
												<AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
													{participant.user.name?.charAt(0).toUpperCase() ?? "?"}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<p className="truncate font-semibold text-xs">
													{participant.user.name}
													{participant.userId === session?.user?.id && (
														<span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(You)</span>
													)}
												</p>
												<p className="truncate text-[10px] text-muted-foreground">{participant.user.email}</p>
											</div>
											{participant.userId === meeting.createdBy.id && (
												<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary flex-shrink-0">
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
								className="w-full h-11 text-sm shadow-md hover:shadow-lg transition-all" 
								onClick={handleJoinMeeting}
								disabled={!stream}
							>
								<Video className="mr-2 size-4" />
								Join Meeting Now
							</Button>
							<Button 
								variant="outline"
								className="w-full h-9 text-sm"
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

