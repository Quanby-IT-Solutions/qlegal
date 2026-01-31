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
	Wifi,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
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
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@/core/components/ui/input-group"
import { ScrollArea } from "@/core/components/ui/scroll-area"
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useGeolocation } from "@/core/hooks/use-geolocation"

import { checkUserLivenessStatus } from "@/features/liveness-validation/api/liveness.actions"
import { useLocationVerification } from "@/features/meetings/api/location-verification.hooks"
import { useMeetings } from "@/features/meetings/api/meetings.hooks"
import { LocationErrorDialog } from "@/features/meetings/components/location-error-dialog"
import { VpnDetectedDialog } from "@/features/meetings/components/vpn-detected-dialog"
import type { LocationVerificationResult } from "@/features/meetings/lib/location-verification"

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
			router.push(`/auth/login?callbackUrl=/meetings/${id}/lobby`)
			return
		}

		// Check liveness verification status for this specific meeting
		const checkLiveness = async () => {
			try {
				const result = await checkUserLivenessStatus(id)
				if (result.success && result.data && !result.data.isVerified) {
					// User hasn't completed liveness verification for this meeting, redirect to liveness page
					const redirectUrl = encodeURIComponent(`/meetings/${id}/lobby`)
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

	// Determine if join button should be enabled
	const canJoinMeeting = locationStatus === "verified"

	// Get location status display info
	const getLocationStatusDisplay = () => {
		switch (locationStatus) {
			case "checking":
				return {
					icon: <Loader2 className="size-3 animate-spin" />,
					text: "Verifying location...",
					color: "text-muted-foreground",
					bgColor: "bg-muted/50",
				}
			case "verified":
				return {
					icon: <CheckCircle className="size-3" />,
					text:
						verificationResult?.reason === "near_embassy"
							? `Verified at ${verificationResult.details?.nearbyEmbassy?.name ?? "embassy"}`
							: (verificationResult?.details?.formattedAddress ?? "Location verified"),
					color: "text-emerald-700 dark:text-emerald-400",
					bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
				}
			case "vpn_detected":
				return {
					icon: <MapPin className="size-3" />,
					text: "VPN detected",
					color: "text-red-700 dark:text-red-400",
					bgColor: "bg-red-50 dark:bg-red-950/20",
				}
			default:
				return {
					icon: <MapPin className="size-3" />,
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
				<div className="bg-background fixed inset-0 z-[9999]">
					<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-gradient-to-br px-4 py-10">
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
						<Button onClick={() => router.push("/meetings")}>Back to Meetings</Button>
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

			<div className="from-background via-muted/30 to-background flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-linear-to-br">
				{/* Header */}
				<header className="border-border/50 bg-card/80 sticky top-0 z-10 border-b backdrop-blur-sm">
					<div className="mx-auto w-full max-w-7xl px-3 py-2.5 sm:px-4 sm:py-3">
						<div className="flex items-center justify-between gap-2">
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-lg sm:size-8">
									<Video className="text-primary size-4 sm:size-4" />
								</div>
								<div className="min-w-0 flex-1">
									<h1 className="truncate text-sm font-semibold sm:text-base">
										{meeting.title}
									</h1>
									<p className="text-muted-foreground truncate text-[11px] sm:text-xs">
										Get ready to join your meeting
									</p>
								</div>
							</div>
							<Badge
								variant="default"
								className="bg-emerald-600 shrink-0 px-1.5 py-0.5 text-[9px] font-medium"
							>
								<span className="mr-1 size-1 animate-pulse rounded-full bg-white" />
								Live Now
							</Badge>
						</div>
					</div>
				</header>

				{/* Main Content */}
				<main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
					<div className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-3 pb-20 sm:p-4 md:pb-5 md:p-5">
						<div className="flex min-w-0 flex-col gap-4 md:flex-row md:gap-5">
							{/* Left: Camera Preview */}
							<div className="flex min-h-[160px] min-w-0 flex-1 flex-col sm:min-h-[200px] md:min-h-0">
								<Card className="border-border/50 relative flex-1 overflow-hidden shadow-sm md:min-h-[240px]">
									<CardContent className="relative size-full min-h-[160px] p-0 sm:min-h-[200px] md:min-h-[240px]">
										{isCameraOn && stream ? (
											<video
												ref={videoRef}
												autoPlay
												playsInline
												muted
												className="size-full scale-x-[-1] rounded-lg object-cover"
											/>
										) : (
											<div className="from-muted/40 via-muted/20 to-muted/40 flex size-full flex-col items-center justify-center bg-linear-to-br p-3">
												{isTestingDevices ? (
													<div className="flex flex-col items-center gap-1.5">
														<div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
														<div className="text-center">
															<p className="text-xs font-medium text-foreground">Starting camera & mic</p>
															<p className="text-muted-foreground mt-0.5 text-[11px]">
																Allow browser permissions when prompted
															</p>
														</div>
													</div>
												) : (
													<>
														<div className="from-primary to-primary/90 text-primary-foreground mb-2 flex size-12 items-center justify-center rounded-lg bg-linear-to-br text-lg font-bold shadow-md ring-2 ring-primary/20 sm:size-14 sm:text-xl">
															{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
														</div>
														<p className="text-center text-xs font-semibold sm:text-sm">
															{session?.user?.name}
														</p>
														<p className="text-muted-foreground mt-0.5 text-[11px]">
															Camera is off
														</p>
														{!stream && (
															<Button
																className="mt-3 gap-1.5 text-xs"
																onClick={() => void startPreview()}
																size="sm"
															>
																<Camera className="size-3.5" />
																Start Camera & Mic
															</Button>
														)}
													</>
												)}
											</div>
										)}

										{/* Control Overlay - larger touch targets on mobile */}
										<div className="bg-card/95 border-border/50 absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border p-2 shadow-md backdrop-blur-md sm:bottom-2.5 sm:gap-1.5 sm:p-1.5">
											<Button
												variant={isMicOn ? "default" : "destructive"}
												size="icon"
												className="size-10 min-h-10 min-w-10 shrink-0 rounded-full sm:size-7 md:size-8 sm:min-h-0 sm:min-w-0"
												onClick={toggleMic}
												disabled={!stream}
												title={isMicOn ? "Mute microphone" : "Unmute microphone"}
											>
												{isMicOn ? <Mic className="size-4 sm:size-3.5" /> : <MicOff className="size-4 sm:size-3.5" />}
											</Button>
											<Button
												variant={isCameraOn ? "default" : "destructive"}
												size="icon"
												className="size-10 min-h-10 min-w-10 shrink-0 rounded-full sm:size-7 md:size-8 sm:min-h-0 sm:min-w-0"
												onClick={toggleCamera}
												disabled={!stream}
												title={isCameraOn ? "Turn off camera" : "Turn on camera"}
											>
												{isCameraOn ? (
													<Camera className="size-4 sm:size-3.5" />
												) : (
													<CameraOff className="size-4 sm:size-3.5" />
												)}
											</Button>
										</div>
									</CardContent>
								</Card>
							</div>

							{/* Right: Meeting Info & Participants */}
							<div className="flex min-w-0 flex-col gap-3 md:w-[260px] md:shrink-0 lg:w-[280px] xl:w-[300px]">
								{/* Location Verification Status */}
								<Card className="border-border/50 overflow-hidden shadow-sm">
									<CardHeader className="pb-1.5 pt-2.5">
										<CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
											<MapPin className="text-muted-foreground size-3.5 shrink-0" />
											Location Verification
										</CardTitle>
									</CardHeader>
									<CardContent className="pb-2.5">
										<div className="flex items-start gap-2">
											<div
												className={`flex size-6 shrink-0 items-center justify-center rounded-md ${locationStatusDisplay.bgColor} ${locationStatusDisplay.color}`}
											>
												{locationStatusDisplay.icon}
											</div>
											<div className="min-w-0 flex-1 space-y-0">
												<p
													className={`break-words text-xs font-medium ${locationStatusDisplay.color}`}
												>
													{locationStatusDisplay.text}
												</p>
												{locationStatus === "checking" &&
													(isGeoLoading || verifyLocation.isPending) && (
														<p className="text-muted-foreground text-[10px]">
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
								<Card className="border-border/50 overflow-hidden shadow-sm">
									<CardHeader className="pb-1.5 pt-2.5">
										<CardTitle className="text-xs font-semibold">
											Meeting Details
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2.5">
										{/* Host */}
										<div className="flex items-center gap-2">
											<Avatar className="ring-border size-8 ring-2">
												<AvatarImage src={meeting.createdBy.image ?? undefined} />
												<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
													{meeting.createdBy.name?.charAt(0).toUpperCase() ?? "M"}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0 flex-1">
												<p className="text-muted-foreground text-[9px] font-medium uppercase tracking-wider">
													Host
												</p>
												<p className="truncate text-xs font-semibold">
													{meeting.createdBy.name}
												</p>
											</div>
										</div>

										<Separator />

										<Alert className="border-amber-200/80 py-2 dark:border-amber-800/50 dark:bg-amber-950/30">
											<Wifi className="size-3.5 text-amber-600 dark:text-amber-400" />
											<AlertTitle className="text-xs text-amber-800 dark:text-amber-200">
												Internet Requirement
											</AlertTitle>
											<AlertDescription className="text-[11px]">
												Minimum <span className="font-semibold text-amber-900 dark:text-amber-100">2 Mbps</span> required for video and recording.
											</AlertDescription>
										</Alert>
									</CardContent>
								</Card>

								{/* Participants List */}
								<Card className="border-border/50 flex min-h-0 flex-1 flex-col overflow-hidden shadow-sm">
									<CardHeader className="pb-1.5 pt-2.5">
										<CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
											<div className="bg-primary/10 flex size-5 shrink-0 items-center justify-center rounded-md">
												<Users className="text-primary size-3" />
											</div>
											Participants
										</CardTitle>
										<CardDescription className="text-[10px]">
											{meeting.participants.length}{" "}
											{meeting.participants.length === 1 ? "person" : "people"}
										</CardDescription>
									</CardHeader>
									<CardContent className="flex min-h-0 flex-1 flex-col gap-2 pb-2.5">
										{/* Invite Witness (host only) */}
										{isHost && (
											<InputGroup className="h-7 w-full">
												<InputGroupInput
													value={witnessEmail}
													onChange={e => setWitnessEmail(e.target.value)}
													placeholder="Witness email"
													className="h-7 text-xs"
													autoComplete="email"
													inputMode="email"
												/>
												<InputGroupAddon align="inline-end">
													<InputGroupButton
														type="button"
														size="xs"
														disabled={
															inviteWitnessByEmail.isPending ||
															witnessEmail.trim().length === 0
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
																		toast.error(
																			err.message || "Failed to invite witness"
																		)
																	},
																}
															)
														}}
													>
														{inviteWitnessByEmail.isPending ? (
															<Loader2 className="size-3 animate-spin" />
														) : (
															<>Invite</>
														)}
													</InputGroupButton>
												</InputGroupAddon>
											</InputGroup>
										)}

										{/* Pending invites (host only) */}
										{isHost && (meeting.pendingInvites?.length ?? 0) > 0 && (
											<>
												<Separator />
												<div className="space-y-1">
													<p className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">
														Pending ({meeting.pendingInvites.length})
													</p>
													<div className="space-y-1">
														{meeting.pendingInvites.map(invite => (
															<div
																key={invite.id}
																className="bg-muted/30 flex items-center gap-1.5 rounded-md border p-1.5"
															>
																<Avatar className="size-5 shrink-0">
																	<AvatarImage src={invite.user.image ?? undefined} />
																	<AvatarFallback className="bg-primary text-primary-foreground text-[8px] font-semibold">
																		{invite.user.name?.charAt(0).toUpperCase() ?? "?"}
																	</AvatarFallback>
																</Avatar>
																<div className="min-w-0 flex-1">
																	<p className="truncate text-[11px] font-semibold">
																		{invite.user.name}
																	</p>
																	<p className="text-muted-foreground truncate text-[9px]">
																		{invite.user.email}
																	</p>
																</div>
																<Badge
																	variant="outline"
																	className="shrink-0 border-amber-300 bg-amber-50 px-1 py-0 text-[8px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
																>
																	Pending
																</Badge>
															</div>
														))}
													</div>
												</div>
											</>
										)}

										<Separator />

										<ScrollArea className="h-[120px] min-h-0 sm:h-[140px] md:h-[160px]">
											<div className="space-y-0.5 pr-3">
												{meeting.participants.map(participant => (
													<div
														key={participant.id}
														className="hover:bg-muted/50 flex items-center gap-1.5 rounded-md p-1.5 transition-colors"
													>
														<Avatar className="ring-border size-6 shrink-0 ring-2">
															<AvatarImage src={participant.user.image ?? undefined} />
															<AvatarFallback className="bg-primary text-primary-foreground text-[9px] font-semibold">
																{participant.user.name?.charAt(0).toUpperCase() ?? "?"}
															</AvatarFallback>
														</Avatar>
														<div className="min-w-0 flex-1">
															<div className="flex items-center gap-1">
																<p className="truncate text-xs font-medium">
																	{participant.user.name}
																</p>
																{participant.userId === session?.user?.id && (
																	<Badge
																		variant="secondary"
																		className="shrink-0 px-1 py-0 text-[8px] font-normal"
																	>
																		You
																	</Badge>
																)}
															</div>
															<p className="text-muted-foreground truncate text-[10px]">
																{participant.user.email}
															</p>
														</div>
														{participant.userId === meeting.createdBy.id && (
															<Badge
																variant="default"
																className="shrink-0 px-1 py-0 text-[8px] font-medium"
															>
																Host
															</Badge>
														)}
													</div>
												))}
											</div>
										</ScrollArea>
									</CardContent>
								</Card>

								{/* Action Buttons - sticky on mobile so Join is always reachable when scrolling */}
								<div className="sticky bottom-0 flex flex-col gap-1.5 border-t border-border/50 bg-background/95 py-2 backdrop-blur-sm md:border-t-0 md:bg-transparent md:py-0 md:backdrop-blur-none md:pt-2">
									<Button
										className="h-10 min-h-10 w-full gap-1.5 text-sm font-medium sm:min-h-0 md:h-9"
										onClick={handleJoinMeeting}
										disabled={!canJoinMeeting}
										size="sm"
									>
										{locationStatus === "checking" ? (
											<>
												<Loader2 className="size-3.5 animate-spin" />
												Verifying Location...
											</>
										) : (
											<>
												<Video className="size-3.5" />
												Join Meeting Now
											</>
										)}
									</Button>
									<Button
										variant="outline"
										className="h-9 min-h-9 w-full border-border/50 text-xs sm:min-h-0 md:h-8"
										size="sm"
										onClick={() => router.push("/meetings")}
									>
										Cancel
									</Button>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
		</>
	)
}
