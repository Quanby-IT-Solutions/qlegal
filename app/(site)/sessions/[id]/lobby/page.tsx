"use client"

import { useRouter } from "next/navigation"
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	Camera,
	CameraOff,
	CheckCircle,
	Clock,
	Loader2,
	MapPin,
	Mic,
	MicOff,
	Users,
	Video,
} from "lucide-react"
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
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useGeolocation } from "@/core/hooks/use-geolocation"

import { checkUserLivenessStatus } from "@/features/liveness-validation/api/liveness.actions"
import { useLocationVerification } from "@/features/sessions/api/location-verification.hooks"
import { useMeetings } from "@/features/sessions/api/meetings.hooks"
import { LocationErrorDialog } from "@/features/sessions/components/location-error-dialog"
import { VpnDetectedDialog } from "@/features/sessions/components/vpn-detected-dialog"
import type { LocationVerificationResult } from "@/features/sessions/lib/location-verification"

type LocationStatus =
	| "checking"
	| "verified"
	| "vpn_detected"
	| "error"
	| "permission_denied"
	| "unavailable"
	| "timeout"

export default function MeetingLobbyPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { data: session } = useSession()
	const { getById, inviteWitnessByEmail } = useMeetings()
	const { data: meeting, isLoading, refetch: refetchMeeting } = getById(id)
	const { verifyLocation } = useLocationVerification()

	const videoRef = useRef<HTMLVideoElement>(null)
	const [stream, setStream] = useState<MediaStream | null>(null)
	const [isCameraOn, setIsCameraOn] = useState(false)
	const [isMicOn, setIsMicOn] = useState(true)
	const [isTestingDevices, setIsTestingDevices] = useState(false)

	const [witnessEmail, setWitnessEmail] = useState("")

	// Liveness verification state
	const [isCheckingLiveness, setIsCheckingLiveness] = useState(true)

	// Location verification state
	const [locationStatus, setLocationStatus] = useState<LocationStatus>("checking")
	const [verificationResult, setVerificationResult] = useState<LocationVerificationResult | null>(
		null
	)
	const [vpnInfo, setVpnInfo] = useState<{
		isp?: string
		org?: string
		country?: string
	} | null>(null)
	const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false)

	// Geolocation options - high accuracy for better results
	const geolocationOptions = useMemo(
		() => ({
			enableHighAccuracy: true,
			timeout: 30000,
			maximumAge: 0,
		}),
		[]
	)

	const { position, error: geoError, isLoading: isGeoLoading } = useGeolocation(geolocationOptions)

	// Handle geolocation errors
	useEffect(() => {
		if (geoError && !hasAttemptedVerification) {
			// Map geolocation error codes to our status
			if (geoError.code === 1) {
				// PERMISSION_DENIED
				setLocationStatus("permission_denied")
			} else if (geoError.code === 2) {
				// POSITION_UNAVAILABLE
				setLocationStatus("unavailable")
			} else if (geoError.code === 3) {
				// TIMEOUT
				setLocationStatus("timeout")
			} else {
				setLocationStatus("error")
			}
			setHasAttemptedVerification(true)
		}
	}, [geoError, hasAttemptedVerification])

	// Verify location when position is available
	useEffect(() => {
		if (position && !hasAttemptedVerification && meeting) {
			setHasAttemptedVerification(true)

			verifyLocation.mutate(
				{
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					meetingId: id,
				},
				{
					onSuccess: (
						result: LocationVerificationResult & {
							vpnDetails?: { isp?: string; org?: string; country?: string } | null
						}
					) => {
						if (result.reason === "vpn_detected") {
							setLocationStatus("vpn_detected")
							// Extract VPN info from the result if available
							if (result.vpnDetails) {
								setVpnInfo({
									isp: result.vpnDetails.isp,
									org: result.vpnDetails.org,
									country: result.vpnDetails.country,
								})
							}
						} else if (result.allowed) {
							setLocationStatus("verified")
						} else {
							setLocationStatus("error")
						}
						setVerificationResult(result)
					},
					onError: () => {
						setLocationStatus("error")
					},
				}
			)
		}
	}, [position, hasAttemptedVerification, meeting, id, verifyLocation])

	// Retry location verification
	const retryVerification = useCallback(() => {
		setHasAttemptedVerification(false)
		setLocationStatus("checking")
		setVerificationResult(null)
		// Force re-request geolocation by reloading the page
		// This is necessary because the geolocation hook caches the result
		window.location.reload()
	}, [])

	// Check liveness verification and redirect if needed - runs IMMEDIATELY
	useEffect(() => {
		if (!session) {
			router.push(`/auth/login?callbackUrl=/sessions/${id}/lobby`)
			return
		}

		// Check liveness verification status for this specific meeting
		const checkLiveness = async () => {
			try {
				const result = await checkUserLivenessStatus(id)
				if (result.success && result.data && !result.data.isVerified) {
					// User hasn't completed liveness verification for this meeting, redirect to liveness page
					const redirectUrl = encodeURIComponent(`/sessions/${id}/lobby`)
					router.push(`/liveness?redirect=${redirectUrl}&meetingId=${id}`)
				} else {
					// Liveness check passed, show lobby
					setIsCheckingLiveness(false)
				}
			} catch (error) {
				console.error("Liveness check failed:", error)
				// On error, allow access but log it
				setIsCheckingLiveness(false)
			}
		}

		void checkLiveness()
	}, [session, router, id])

	// Update video element when stream changes
	useEffect(() => {
		if (stream && videoRef.current && isCameraOn) {
			const videoElement = videoRef.current
			if (videoElement.srcObject !== stream) {
				videoElement.srcObject = stream
				const playPromise = videoElement.play()
				if (playPromise !== undefined) {
					playPromise.catch(err => {
						if ((err as { name: string }).name !== "NotAllowedError") {
							console.error("Error playing video:", err)
						}
					})
				}
			}
		}
	}, [stream, isCameraOn])

	const startPreview = async () => {
		if (stream) {
			return
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
		} catch {
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
		if (stream) {
			stream.getTracks().forEach(track => track.stop())
		}
		router.push(`/sessions/${id}`)
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach(track => track.stop())
			}
		}
	}, [stream])

	// Determine if join button should be enabled
	const canJoinMeeting = locationStatus === "verified"

	// Get location status display info
	const getLocationStatusDisplay = () => {
		switch (locationStatus) {
			case "checking":
				return {
					icon: <Loader2 className="size-4 animate-spin" />,
					text: "Verifying location...",
					color: "text-muted-foreground",
					bgColor: "bg-muted/50",
				}
			case "verified":
				return {
					icon: <CheckCircle className="size-4" />,
					text:
						verificationResult?.reason === "near_embassy"
							? `Verified at ${verificationResult.details?.nearbyEmbassy?.name ?? "embassy"}`
							: (verificationResult?.details?.formattedAddress ?? "Location verified"),
					color: "text-emerald-700 dark:text-emerald-400",
					bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
				}
			case "vpn_detected":
				return {
					icon: <MapPin className="size-4" />,
					text: "VPN detected",
					color: "text-red-700 dark:text-red-400",
					bgColor: "bg-red-50 dark:bg-red-950/20",
				}
			default:
				return {
					icon: <MapPin className="size-4" />,
					text: "Location verification required",
					color: "text-orange-700 dark:text-orange-400",
					bgColor: "bg-orange-50 dark:bg-orange-950/20",
				}
		}
	}

	const locationStatusDisplay = getLocationStatusDisplay()

	// Show loading skeleton while checking liveness or loading meeting
	if (isLoading || isCheckingLiveness) {
		return (
			<>
				{/* Fixed overlay that covers EVERYTHING including sidebar */}
				<div className="bg-background fixed inset-0 z-9999">
					<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br px-4 py-10">
						<div className="w-full max-w-2xl space-y-6">
							{/* Logo Skeleton */}
							<div className="flex justify-center">
								<Skeleton className="size-16 rounded-full" />
							</div>

							{/* Card Skeleton */}
							<Card className="w-full shadow-xl">
								<CardHeader className="space-y-4">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<Skeleton className="size-12 rounded-xl" />
											<div className="space-y-2">
												<Skeleton className="h-7 w-48" />
												<Skeleton className="h-4 w-64" />
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Option 1 Skeleton */}
									<div className="rounded-xl border-2 p-6">
										<div className="mb-4 flex items-start gap-4">
											<Skeleton className="size-10 shrink-0 rounded-lg" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-5 w-32" />
												<Skeleton className="h-4 w-full" />
											</div>
										</div>
										<Skeleton className="h-11 w-full rounded-md" />
									</div>

									{/* Option 2 Skeleton */}
									<div className="rounded-xl border-2 p-6">
										<div className="mb-4 flex items-start gap-4">
											<Skeleton className="size-10 shrink-0 rounded-lg" />
											<div className="flex-1 space-y-2">
												<Skeleton className="h-5 w-40" />
												<Skeleton className="h-4 w-full" />
											</div>
										</div>
										<Skeleton className="h-11 w-full rounded-md" />
									</div>
								</CardContent>
							</Card>

							{/* Footer Skeleton */}
							<div className="space-y-3 text-center">
								<Skeleton className="mx-auto h-8 w-48 rounded-full" />
								<Skeleton className="mx-auto h-4 w-64" />
							</div>
						</div>
					</div>
				</div>
			</>
		)
	}

	if (!meeting) {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<h2 className="text-2xl font-semibold">Meeting not found</h2>
						<p className="text-muted-foreground mt-2">
							The meeting you&apos;re looking for doesn&apos;t exist.
						</p>
						<Button className="mt-6" onClick={() => router.push("/sessions")}>
							Back to Sessions
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (meeting.status !== "ONGOING") {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
							<Clock className="size-8 text-yellow-600 dark:text-yellow-500" />
						</div>
						<h2 className="mb-2 text-2xl font-semibold">{meeting.title}</h2>
						<p className="text-muted-foreground mb-6">
							This meeting has not started yet. Please wait for the host to start the meeting.
						</p>
						<Button onClick={() => router.push("/sessions")}>Back to Sessions</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const userRole = session?.user?.role ?? "PRINCIPAL"
	const isHost = meeting.createdBy.id === session?.user?.id

	return (
		<>
			{/* VPN Detected Dialog */}
			<VpnDetectedDialog open={locationStatus === "vpn_detected"} ipInfo={vpnInfo} />

			{/* Location Error Dialog */}
			{(locationStatus === "error" ||
				locationStatus === "permission_denied" ||
				locationStatus === "unavailable" ||
				locationStatus === "timeout") && (
				<LocationErrorDialog
					open={true}
					errorReason={
						locationStatus === "error"
							? (verificationResult?.reason ?? "location_unknown")
							: locationStatus
					}
					userRole={userRole}
					details={verificationResult?.details}
					onRetry={retryVerification}
				/>
			)}

			<div className="from-background via-muted/30 to-background flex h-screen flex-col bg-linear-to-br">
				{/* Header */}
				<div className="border-border/50 bg-card/80 border-b px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
					<div className="mx-auto w-full max-w-7xl">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
								<Video className="text-primary h-5 w-5" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="truncate text-lg font-semibold sm:text-xl">{meeting.title}</h1>
								<p className="text-muted-foreground text-xs sm:text-sm">
									Get ready to join your meeting
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex flex-1 overflow-y-auto">
					<div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
						<div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
							{/* Left: Camera Preview */}
							<div className="flex flex-1 flex-col lg:min-h-0">
								<Card className="border-border/50 relative flex-1 overflow-hidden shadow-sm lg:min-h-[500px]">
									<CardContent className="relative size-full min-h-[400px] p-0 sm:min-h-[500px]">
										{isCameraOn && stream ? (
											<video
												ref={videoRef}
												autoPlay
												playsInline
												muted
												className="size-full scale-x-[-1] rounded-lg object-cover"
											/>
										) : (
											<div className="from-muted/30 to-muted/10 flex size-full items-center justify-center bg-linear-to-br">
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
															<div className="from-primary to-primary/80 text-primary-foreground mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-linear-to-br text-4xl font-bold shadow-xl md:mb-6 md:size-32 md:text-5xl">
																{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
															</div>
															<p className="text-lg font-semibold sm:text-xl md:text-2xl">
																{session?.user?.name}
															</p>
															<p className="text-muted-foreground mt-2 text-xs sm:text-sm md:text-base">
																Camera is off
															</p>
															{!stream && (
																<Button
																	className="mt-4 text-sm shadow-sm sm:mt-6 sm:text-base"
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
										<div className="bg-card/95 border-border/50 absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border p-2 shadow-lg backdrop-blur-md sm:bottom-4 sm:gap-3">
											<Button
												variant={isMicOn ? "default" : "destructive"}
												size="icon"
												className="size-9 rounded-full shadow-sm sm:size-10 md:size-12"
												onClick={toggleMic}
												disabled={!stream}
												title={isMicOn ? "Mute microphone" : "Unmute microphone"}
											>
												{isMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
											</Button>
											<Button
												variant={isCameraOn ? "default" : "destructive"}
												size="icon"
												className="size-9 rounded-full shadow-sm sm:size-10 md:size-12"
												onClick={toggleCamera}
												disabled={!stream}
												title={isCameraOn ? "Turn off camera" : "Turn on camera"}
											>
												{isCameraOn ? (
													<Camera className="size-4" />
												) : (
													<CameraOff className="size-4" />
												)}
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Right: Meeting Info & Participants */}
							<div className="flex flex-col gap-4 lg:w-80 lg:shrink-0 xl:w-96">
								{/* Location Verification Status */}
								<Card className="border-border/50 shadow-sm">
									<CardHeader className="pb-3 sm:pb-4">
										<CardTitle className="text-sm font-semibold sm:text-base">
											Location Verification
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex items-start gap-3">
											<div
												className={`flex size-6 shrink-0 items-center justify-center ${locationStatusDisplay.color}`}
											>
												<div className={locationStatusDisplay.color}>
													{locationStatusDisplay.icon}
												</div>
											</div>
											<div className="min-w-0 flex-1 space-y-1">
												<p className={`text-sm font-medium ${locationStatusDisplay.color}`}>
													{locationStatusDisplay.text}
												</p>
												{locationStatus === "checking" &&
													(isGeoLoading || verifyLocation.isPending) && (
														<p className="text-muted-foreground text-xs">
															{isGeoLoading
																? "Getting your location..."
																: "Verifying with server..."}
														</p>
													)}
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Meeting Details */}
								<Card className="border-border/50 shadow-sm">
									<CardHeader className="pb-3 sm:pb-4">
										<CardTitle className="text-sm font-semibold sm:text-base">
											Meeting Details
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4">
										{/* Host */}
										<div className="space-y-2">
											<p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
												Host
											</p>
											<div className="flex items-center gap-3">
												<Avatar className="ring-border size-9 ring-2 sm:size-10">
													<AvatarImage src={meeting.createdBy.image ?? undefined} />
													<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold sm:text-sm">
														{meeting.createdBy.name?.charAt(0).toUpperCase() ?? "M"}
													</AvatarFallback>
												</Avatar>
												<p className="truncate text-sm font-semibold">{meeting.createdBy.name}</p>
											</div>
											<Avatar className="ring-primary/20 ml-2 size-8 shrink-0 ring-2">
												<AvatarImage src={meeting.createdBy.image ?? undefined} />
												<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
													{meeting.createdBy.name?.charAt(0).toUpperCase() ?? "?"}
												</AvatarFallback>
											</Avatar>
										</div>
										<div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/20">
											<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
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
									<CardContent className="space-y-3">
										{/* Invite Witness (host only) */}
										{isHost && (
											<div className="flex items-center gap-2">
												<Input
													value={witnessEmail}
													onChange={e => setWitnessEmail(e.target.value)}
													placeholder="Witness email (e.g. witness@email.com)"
													className="h-9 text-xs"
													autoComplete="email"
													inputMode="email"
												/>
												<Button
													type="button"
													size="sm"
													className="h-9"
													disabled={
														inviteWitnessByEmail.isPending || witnessEmail.trim().length === 0
													}
													onClick={() => {
														const email = witnessEmail.trim().toLowerCase()
														if (!email) return

														inviteWitnessByEmail.mutate(
															{ meetingId: id, email },
															{
																onSuccess: result => {
																	if (result.created) {
																		toast.success("Invite sent")
																		setWitnessEmail("")
																	} else {
																		toast.message(
																			result.status === "PENDING"
																				? "Invite already sent"
																				: "That user is already in this meeting"
																		)
																	}
																	void refetchMeeting()
																},
																onError: err => {
																	toast.error(err.message || "Failed to invite witness")
																},
															}
														)
													}}
												>
													{inviteWitnessByEmail.isPending ? "Inviting..." : "Invite"}
												</Button>
											</div>
										)}

										{/* Pending invites (host only) */}
										{isHost && (meeting.pendingInvites?.length ?? 0) > 0 && (
											<div className="bg-muted/20 rounded-lg border p-2">
												<p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wide uppercase">
													Pending invites ({meeting.pendingInvites.length})
												</p>
												<div className="space-y-1.5">
													{meeting.pendingInvites.map(invite => (
														<div
															key={invite.id}
															className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
														>
															<Avatar className="size-7 shrink-0">
																<AvatarImage src={invite.user.image ?? undefined} />
																<AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
																	{invite.user.name?.charAt(0).toUpperCase() ?? "?"}
																</AvatarFallback>
															</Avatar>
															<div className="min-w-0 flex-1">
																<p className="truncate text-xs font-semibold">{invite.user.name}</p>
																<p className="text-muted-foreground truncate text-[10px]">
																	{invite.user.email}
																</p>
															</div>
															<span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
																Pending
															</span>
														</div>
													))}
												</div>
											</div>
										)}

										<div className="max-h-48 overflow-y-auto">
											<div className="space-y-1.5">
												{meeting.participants.map(participant => (
													<div
														key={participant.id}
														className="hover:bg-muted/50 flex items-center gap-2.5 rounded-lg p-2 transition-colors"
													>
														<Avatar className="hover:ring-primary/20 size-8 shrink-0 ring-2 ring-transparent transition-all">
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
															<span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
																Host
															</span>
														)}
													</div>
												))}
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Action Buttons */}
								<div className="space-y-2.5 pt-2">
									<Button
										className="h-11 w-full text-sm font-medium shadow-sm transition-all hover:shadow-md sm:text-base"
										onClick={handleJoinMeeting}
										disabled={!canJoinMeeting}
										size="lg"
									>
										{locationStatus === "checking" ? (
											<>
												<Loader2 className="mr-2 size-4 animate-spin" />
												Verifying Location...
											</>
										) : (
											<>
												<Video className="mr-2 size-4" />
												Join Meeting Now
											</>
										)}
									</Button>
									<Button
										variant="outline"
										className="border-border/50 h-10 w-full text-sm sm:text-base"
										onClick={() => router.push("/sessions")}
									>
										Cancel
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
