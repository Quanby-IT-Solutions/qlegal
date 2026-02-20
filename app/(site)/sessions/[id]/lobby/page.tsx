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
	UserPlus,
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
					color: "text-emerald-600 dark:text-emerald-500",
					bgColor: "bg-emerald-50/80 dark:bg-emerald-950/30",
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

	// Only block lobby for ended/cancelled meetings; CONFIRMED/SCHEDULED/ONGOING can use the lobby (waiting room)
	const status = meeting.status ?? "CONFIRMED"
	if (status === "COMPLETED" || status === "CANCELLED") {
		return (
			<div className="from-background via-muted/30 to-background flex h-screen items-center justify-center bg-linear-to-br">
				<Card className="w-full max-w-md shadow-xl">
					<CardContent className="p-8 text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
							<Clock className="size-8 text-muted-foreground" />
						</div>
						<h2 className="mb-2 text-2xl font-semibold">{meeting.title}</h2>
						<p className="text-muted-foreground mb-6">
							This meeting has ended.
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

			<div className="flex h-screen flex-col bg-background">
				{/* Header — title only top left */}
				<header className="border-b border-border bg-background px-4 py-3 sm:px-6">
					<div className="mx-auto max-w-6xl">
						<h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
							{meeting.title}
						</h1>
					</div>
				</header>

				{/* Main — left: video + controls + location/status cards; right: participants */}
				<main className="flex min-h-0 flex-1 overflow-auto">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 lg:flex-row lg:gap-6">
						{/* Left column: ~2/3 — video card, then button row, then two info cards */}
						<div className="flex min-w-0 flex-1 flex-col gap-4 lg:min-w-0">
							{/* Video preview card — large rounded card */}
							<Card className="overflow-hidden rounded-lg border border-border bg-card">
								<CardContent className="relative flex aspect-video min-h-[240px] w-full p-0 sm:min-h-[320px]">
									{isCameraOn && stream ? (
										<video
											ref={videoRef}
											autoPlay
											playsInline
											muted
											className="size-full scale-x-[-1] object-cover"
										/>
									) : (
										<div className="flex size-full flex-col items-center justify-center gap-2 bg-muted/30 p-4">
											{isTestingDevices ? (
												<>
													<div className="size-10 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground/60" />
													<span className="text-muted-foreground text-sm">Starting camera…</span>
												</>
											) : (
												<>
													<Avatar className="size-20 border border-border bg-muted sm:size-24">
														<AvatarImage src={session?.user?.image ?? undefined} />
														<AvatarFallback className="text-muted-foreground text-2xl font-medium">
															{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
														</AvatarFallback>
													</Avatar>
													<p className="text-muted-foreground text-sm">Camera is off</p>
													<Button
														variant="outline"
														size="sm"
														className="mt-2"
														onClick={() => void startPreview()}
														disabled={isTestingDevices}
													>
														<Camera className="mr-2 size-4" />
														Turn on devices
													</Button>
												</>
											)}
										</div>
									)}
								</CardContent>
							</Card>

							{/* Control row: Camera | Mic | Join | Cancel — toggles only when preview is on */}
							<div className="flex flex-wrap items-center gap-2">
								<Button
									variant={isCameraOn ? "secondary" : "outline"}
									size="default"
									className="rounded-lg"
									onClick={toggleCamera}
									disabled={!stream || isTestingDevices}
									title={isCameraOn ? "Turn off camera" : "Turn on camera"}
								>
									{isCameraOn ? (
										<Camera className="mr-2 size-4" />
									) : (
										<CameraOff className="mr-2 size-4" />
									)}
									{isCameraOn ? "Camera on" : "Camera off"}
								</Button>
								<Button
									variant={isMicOn ? "secondary" : "destructive"}
									size="default"
									className="rounded-lg"
									onClick={toggleMic}
									disabled={!stream || isTestingDevices}
									title={isMicOn ? "Mute microphone" : "Unmute microphone"}
								>
									{isMicOn ? <Mic className="mr-2 size-4" /> : <MicOff className="mr-2 size-4" />}
									{isMicOn ? "Mic on" : "Mic off"}
								</Button>
								<Button
									size="default"
									className="rounded-lg"
									onClick={handleJoinMeeting}
									disabled={!canJoinMeeting}
								>
									{locationStatus === "checking" ? (
										<>
											<Loader2 className="mr-2 size-4 animate-spin" />
											Verifying…
										</>
									) : (
										<>
											<Video className="mr-2 size-4" />
											Join meeting
										</>
									)}
								</Button>
								<Button
									variant="outline"
									size="default"
									className="rounded-lg"
									onClick={() => router.push("/sessions")}
								>
									Cancel
								</Button>
							</div>

							{/* Two cards side by side: Location, Status */}
							<div className="grid gap-4 sm:grid-cols-2">
								<Card className="rounded-lg border border-border">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2 text-sm font-medium">
											<MapPin className="text-muted-foreground size-4" />
											Location
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-0">
										<div className={`flex items-start gap-2 ${locationStatusDisplay.color}`}>
											{locationStatusDisplay.icon}
											<div className="min-w-0 flex-1 space-y-0.5">
												<p className="text-sm">{locationStatusDisplay.text}</p>
												{locationStatus === "checking" &&
													(isGeoLoading || verifyLocation.isPending) && (
														<p className="text-muted-foreground text-xs">
															{isGeoLoading ? "Getting location…" : "Verifying…"}
														</p>
													)}
											</div>
										</div>
									</CardContent>
								</Card>
								<Card className="rounded-lg border border-border">
									<CardHeader className="pb-2">
										<CardTitle className="flex items-center gap-2 text-sm font-medium">
											<Clock className="text-muted-foreground size-4" />
											Status
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex items-center gap-2">
											<span className="size-2 shrink-0 rounded-full bg-emerald-500" />
											<span className="text-sm font-medium">Live</span>
										</div>
									</CardContent>
								</Card>
							</div>
						</div>

						{/* Right column: Participants card only */}
						<aside className="flex w-full flex-col lg:w-80 lg:shrink-0">
							<Card className="flex min-h-0 flex-1 flex-col rounded-lg border border-border">
								<CardHeader className="pb-3">
									<CardTitle className="flex items-center gap-2 text-base font-medium">
										<Users className="text-muted-foreground size-4" />
										Participants ({meeting.participants.length})
									</CardTitle>
								</CardHeader>
								<CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0 pt-0">
									<div className="min-h-0 flex-1 overflow-y-auto">
										{meeting.participants.map((participant, i) => (
											<div
												key={participant.id}
												className={
													i > 0
														? "border-t border-border"
														: ""
												}
											>
												<div className="flex items-center gap-3 px-4 py-3">
													<Avatar className="size-10 shrink-0 border border-border">
														<AvatarImage src={participant.user.image ?? undefined} />
														<AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
															{participant.user.name?.charAt(0).toUpperCase() ?? "?"}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<p className="truncate text-sm font-medium">
																{participant.user.name}
																{participant.userId === session?.user?.id && (
																	<span className="text-muted-foreground font-normal"> (you)</span>
																)}
															</p>
															{participant.userId === meeting.createdBy.id && (
																<span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
																	Host
																</span>
															)}
														</div>
														<p className="text-muted-foreground truncate text-xs">
															{participant.user.email}
														</p>
													</div>
												</div>
											</div>
										))}
									</div>
									{isHost && (
										<>
											{((meeting.pendingInvites?.length ?? 0) > 0 && (
												<div className="border-t border-border px-4 py-2">
													<p className="text-muted-foreground mb-1.5 text-xs font-medium">
														Pending ({meeting.pendingInvites.length})
													</p>
													{meeting.pendingInvites.map(invite => (
														<div key={invite.id} className="flex items-center gap-2 py-1">
															<Avatar className="size-6">
																<AvatarImage src={invite.user.image ?? undefined} />
																<AvatarFallback className="text-[10px]">
																	{invite.user.name?.charAt(0).toUpperCase() ?? "?"}
																</AvatarFallback>
															</Avatar>
															<span className="text-muted-foreground truncate text-xs">
																{invite.user.email}
															</span>
														</div>
													))}
												</div>
											))}
											<div className="border-t border-border p-3">
												<Input
													value={witnessEmail}
													onChange={e => setWitnessEmail(e.target.value)}
													placeholder="Witness email"
													title="Add witness by email"
													className="mb-2 h-9 text-sm"
													autoComplete="email"
													inputMode="email"
												/>
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="h-9 w-full rounded-lg"
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
																				: "Already in meeting"
																		)
																	}
																	void refetchMeeting()
																},
																onError: err => {
																	toast.error(err.message ?? "Failed to invite")
																},
															}
														)
													}}
												>
													<UserPlus className="mr-2 size-4" />
													Add witness by email
												</Button>
											</div>
										</>
									)}
								</CardContent>
							</Card>
						</aside>
					</div>
				</main>
			</div>
		</>
	)
}
