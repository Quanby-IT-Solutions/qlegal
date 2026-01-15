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
import { Separator } from "@/core/components/ui/separator"
import { Skeleton } from "@/core/components/ui/skeleton"
import { useGeolocation } from "@/core/hooks/use-geolocation"

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
	const { getById } = useMeetings()
	const { data: meeting, isLoading } = getById(id)
	const { verifyLocation } = useLocationVerification()

	const videoRef = useRef<HTMLVideoElement>(null)
	const [stream, setStream] = useState<MediaStream | null>(null)
	const [isCameraOn, setIsCameraOn] = useState(false)
	const [isMicOn, setIsMicOn] = useState(true)
	const [isTestingDevices, setIsTestingDevices] = useState(false)

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

	// Get user media
	useEffect(() => {
		if (!session) {
			router.push(`/auth/login?callbackUrl=/meetings/${id}/lobby`)
		}
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

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<div className="text-center">
					<Skeleton className="mx-auto mb-4 size-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
				</div>
			</div>
		)
	}

	if (!meeting) {
		return (
			<div className="flex h-screen items-center justify-center bg-background">
				<Card className="w-full max-w-md border-border/50 shadow-sm">
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
			<div className="flex h-screen items-center justify-center bg-background">
				<Card className="w-full max-w-md border-border/50 shadow-sm">
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

	const userRole = (session?.user?.role ?? "PRINCIPAL")

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

			<div className="flex min-h-screen flex-col bg-background">
				{/* Header */}
				<div className="border-b border-border/50 bg-card/80 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
					<div className="mx-auto w-full max-w-7xl">
						<div className="flex items-center gap-3">
							<div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
								<Video className="text-primary h-5 w-5" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="truncate text-lg font-semibold sm:text-xl">{meeting.title}</h1>
								<p className="text-muted-foreground text-xs sm:text-sm">Get ready to join your meeting</p>
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
							<Card className="relative flex-1 overflow-hidden border-border/50 shadow-sm lg:min-h-[500px]">
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
										<div className="flex size-full items-center justify-center bg-muted/30">
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
														<div className="bg-primary text-primary-foreground mx-auto mb-4 flex size-20 items-center justify-center rounded-full text-3xl font-semibold shadow-sm sm:mb-6 sm:size-24 sm:text-4xl md:size-32 md:text-5xl">
															{session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
														</div>
														<p className="text-lg font-semibold sm:text-xl md:text-2xl">{session?.user?.name}</p>
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
									<div className="bg-card/95 absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full border border-border/50 p-2 shadow-lg backdrop-blur-md sm:bottom-4 sm:gap-3">
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
									<CardTitle className="text-sm font-semibold sm:text-base">Location Verification</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-start gap-3">
										<div
											className={`mt-0.5 flex size-8 flex-shrink-0 items-center justify-center rounded-lg ${locationStatusDisplay.bgColor}`}
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
														{isGeoLoading ? "Getting your location..." : "Verifying with server..."}
													</p>
												)}
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Meeting Details */}
							<Card className="border-border/50 shadow-sm">
								<CardHeader className="pb-3 sm:pb-4">
									<CardTitle className="text-sm font-semibold sm:text-base">Meeting Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									{/* Host */}
									<div className="space-y-2">
										<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
											Host
										</p>
										<div className="flex items-center gap-3">
											<Avatar className="size-9 ring-2 ring-border sm:size-10">
												<AvatarImage src={meeting.createdBy.image ?? undefined} />
												<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold sm:text-sm">
													{meeting.createdBy.name?.charAt(0).toUpperCase() ?? "M"}
												</AvatarFallback>
											</Avatar>
											<p className="truncate text-sm font-semibold">{meeting.createdBy.name}</p>
										</div>
									</div>

									<Separator />

									{/* Status */}
									<div className="space-y-2">
										<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
											Status
										</p>
										<Badge
											variant="outline"
											className="border-emerald-500/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
										>
											<div className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
											Live Now
										</Badge>
									</div>

									<Separator />

									{/* Participants */}
									<div className="space-y-2">
										<p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
											Participants
										</p>
										<p className="text-sm font-semibold">
											{meeting.participants.length}{" "}
											{meeting.participants.length === 1 ? "person" : "people"}
										</p>
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
									className="h-10 w-full border-border/50 text-sm sm:text-base"
									onClick={() => router.push("/meetings")}
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
