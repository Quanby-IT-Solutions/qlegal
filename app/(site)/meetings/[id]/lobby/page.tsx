"use client"

import { Camera, CameraOff, Mic, MicOff, Users, Video } from "lucide-react"
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
			videoRef.current.srcObject = stream
			videoRef.current.play().catch((err) => {
				console.error("Error playing video:", err)
			})
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
			
			// Small delay to ensure state updates
			setTimeout(() => {
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream
					videoRef.current.play().catch((err) => {
						console.error("Error playing video:", err)
						toast.error("Failed to play video stream")
					})
				}
			}, 100)
			
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
			<div className="flex h-screen items-center justify-center bg-gray-950">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	if (!meeting) {
		return (
			<div className="flex h-screen items-center justify-center bg-gray-950">
				<div className="text-center text-white">
					<h2 className="text-2xl font-bold">Meeting not found</h2>
					<Button className="mt-4" onClick={() => router.push("/meetings")}>
						Back to Meetings
					</Button>
				</div>
			</div>
		)
	}

	if (meeting.status !== "ONGOING") {
		return (
			<div className="flex h-screen items-center justify-center bg-gray-950">
				<Card className="w-full max-w-md">
					<CardContent className="p-8 text-center">
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
		<div className="flex h-screen flex-col bg-gray-950 text-white">
			{/* Header */}
			<div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
				<h1 className="text-xl font-bold">{meeting.title}</h1>
				<p className="text-sm text-gray-400">Ready to join?</p>
			</div>

			{/* Main Content */}
			<div className="flex flex-1 gap-6 overflow-hidden p-6">
				{/* Left: Camera Preview */}
				<div className="flex flex-1 flex-col gap-4">
					<Card className="relative flex-1 overflow-hidden border-2 border-gray-700 bg-gray-900">
						<CardContent className="relative size-full p-0">
							{isCameraOn && stream ? (
								<video
									ref={videoRef}
									autoPlay
									playsInline
									muted
									className="size-full object-contain bg-gray-950"
								/>
							) : (
								<div className="flex size-full items-center justify-center bg-gray-950">
									<div className="text-center">
										{isTestingDevices ? (
											<div>
												<div className="mx-auto mb-4 size-16 animate-spin rounded-full border-b-2 border-primary" />
												<p className="text-gray-400">Starting camera...</p>
											</div>
										) : (
											<>
												<div className="mx-auto mb-4 flex size-32 items-center justify-center rounded-full bg-primary text-5xl font-bold text-primary-foreground">
													{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
												</div>
												<p className="text-xl font-semibold">{session?.user?.name}</p>
												<p className="mt-2 text-sm text-gray-400">Camera is off</p>
												{!stream && (
													<Button 
														className="mt-4" 
														onClick={() => void startPreview()}
														size="lg"
													>
														<Camera className="mr-2 size-5" />
														Start Camera
													</Button>
												)}
											</>
										)}
									</div>
								</div>
							)}

							{/* Control Overlay */}
							<div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-3 rounded-lg bg-black/50 p-2 backdrop-blur-sm">
								<Button
									variant={isMicOn ? "default" : "destructive"}
									size="lg"
									className="size-12 rounded-full"
									onClick={toggleMic}
									disabled={!stream}
									title={isMicOn ? "Mute microphone" : "Unmute microphone"}
								>
									{isMicOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
								</Button>
								<Button
									variant={isCameraOn ? "default" : "destructive"}
									size="lg"
									className="size-12 rounded-full"
									onClick={toggleCamera}
									disabled={!stream}
									title={isCameraOn ? "Turn off camera" : "Turn on camera"}
								>
									{isCameraOn ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right: Meeting Info & Participants */}
				<div className="flex w-96 flex-col gap-4">
					{/* Meeting Details */}
					<Card className="border-gray-800 bg-gray-900">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Video className="size-5" />
								Meeting Details
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="text-sm text-gray-400">Host</p>
								<p className="font-medium">{meeting.createdBy.name}</p>
							</div>
							<div>
								<p className="text-sm text-gray-400">Status</p>
								<div className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-400">
									<div className="size-2 rounded-full bg-green-400" />
									Live
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Participants List */}
					<Card className="flex-1 overflow-hidden border-gray-800 bg-gray-900">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="size-5" />
								Participants ({meeting.participants.length})
							</CardTitle>
							<CardDescription>Who will be in this meeting</CardDescription>
						</CardHeader>
						<CardContent className="overflow-y-auto">
							<div className="space-y-3">
								{meeting.participants.map((participant) => (
									<div key={participant.id} className="flex items-center gap-3">
										<Avatar className="size-10">
											<AvatarImage src={participant.user.image ?? undefined} />
											<AvatarFallback className="bg-primary text-primary-foreground">
												{participant.user.name?.charAt(0).toUpperCase() ?? "?"}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<p className="truncate font-medium">
												{participant.user.name}
												{participant.userId === session?.user?.id && (
													<span className="ml-2 text-xs text-gray-400">(You)</span>
												)}
											</p>
											<p className="truncate text-xs text-gray-400">{participant.user.email}</p>
										</div>
										{participant.userId === meeting.createdBy.id && (
											<span className="rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">
												Host
											</span>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Join Button */}
					<Button size="lg" className="w-full" onClick={handleJoinMeeting}>
						<Video className="mr-2 size-5" />
						Join Meeting Now
					</Button>
					<Button variant="outline" onClick={() => router.push("/meetings")}>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	)
}

