"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import {
	AlertCircle,
	ChevronDown,
	Globe,
	Loader2,
	MapPin,
	MapPinOff,
	Navigation,
	Server,
} from "lucide-react"

import { env } from "@/env"
import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

import {
	formatDistance,
	getLocationRequirementMessage,
	type LocationVerificationResult,
} from "@/features/sessions/lib/location-verification"

type ErrorReason =
	| LocationVerificationResult["reason"]
	| "permission_denied"
	| "unavailable"
	| "timeout"

interface LocationErrorDialogProps {
	open: boolean
	errorReason: ErrorReason
	userRole: "ENP" | "PRINCIPAL" | "ENA" | "ADMIN"
	details?: LocationVerificationResult["details"]
	debugInfo?: {
		errorCode?: string
		errorMessage?: string
		userMessage?: string
		suggestedAction?: string
		timestamp?: string
		accuracyMeters?: number
		apiStatusCode?: string
		requestId?: string
	}
	onRetry?: () => void
	isRetrying?: boolean
}

function getErrorConfig(errorReason: ErrorReason, userRole: "ENP" | "PRINCIPAL" | "ENA" | "ADMIN") {
	const configs: Record<
		ErrorReason,
		{
			icon: typeof MapPinOff
			iconColor: string
			iconBgColor: string
			title: string
			description: string
			showRetry: boolean
		}
	> = {
		outside_philippines: {
			icon: Globe,
			iconColor: "text-orange-600 dark:text-orange-500",
			iconBgColor: "bg-orange-100 dark:bg-orange-900/20",
			title: "Location Outside Allowed Area",
			description:
				userRole === "ENP"
					? "As a notary (ENP), you must be physically located within the Philippines to conduct notarization sessions."
					: "You must be located within the Philippines or at a Philippine embassy, consulate, or honorary consul office to join this meeting.",
			showRetry: true,
		},
		enp_at_embassy_abroad: {
			icon: MapPin,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "Embassy Location Not Allowed for Notaries",
			description:
				"As a notary (ENP), you cannot conduct notarization sessions from a Philippine embassy abroad. You must be physically present within the Philippines.",
			showRetry: true,
		},
		location_unknown: {
			icon: MapPinOff,
			iconColor: "text-gray-600 dark:text-gray-400",
			iconBgColor: "bg-gray-100 dark:bg-gray-800",
			title: "Unable to Verify Location",
			description:
				"We could not determine your location. Please ensure location services are enabled and try again.",
			showRetry: true,
		},
		gps_accuracy_low: {
			icon: Navigation,
			iconColor: "text-yellow-600 dark:text-yellow-500",
			iconBgColor: "bg-yellow-100 dark:bg-yellow-900/20",
			title: "GPS Accuracy Too Low",
			description:
				"Your GPS signal is not accurate enough yet. Move outdoors, wait for a stronger signal, then try again.",
			showRetry: true,
		},
		google_maps_api_error: {
			icon: Server,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "Location Service Error",
			description:
				"The location verification service returned an API error. Please retry, or contact support if this continues.",
			showRetry: true,
		},
		server_error: {
			icon: Server,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "Server Error",
			description:
				"We could not complete location verification because of a server issue. Please try again.",
			showRetry: true,
		},
		vpn_detected: {
			icon: AlertCircle,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "VPN Detected",
			description: "VPN or proxy connections are not allowed during notarization sessions.",
			showRetry: false,
		},
		vpn_check_unavailable: {
			icon: AlertCircle,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "VPN Check Unavailable",
			description:
				"VPN validation is temporarily unavailable due to server configuration. Meeting entry is blocked.",
			showRetry: false,
		},
		geolocation_error: {
			icon: Navigation,
			iconColor: "text-yellow-600 dark:text-yellow-500",
			iconBgColor: "bg-yellow-100 dark:bg-yellow-900/20",
			title: "Geolocation Error",
			description:
				"There was an error obtaining your location. Please check your device settings and try again.",
			showRetry: true,
		},
		permission_denied: {
			icon: MapPinOff,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "Location Permission Denied",
			description:
				"Location access is required for this meeting. Please enable location permissions in your browser settings and try again.",
			showRetry: true,
		},
		unavailable: {
			icon: Navigation,
			iconColor: "text-yellow-600 dark:text-yellow-500",
			iconBgColor: "bg-yellow-100 dark:bg-yellow-900/20",
			title: "Location Unavailable",
			description:
				"Your device could not determine your location. Please ensure GPS is enabled and you have a clear signal.",
			showRetry: true,
		},
		timeout: {
			icon: Navigation,
			iconColor: "text-yellow-600 dark:text-yellow-500",
			iconBgColor: "bg-yellow-100 dark:bg-yellow-900/20",
			title: "Location Request Timed Out",
			description:
				"The location request took too long. Please check your connection and try again.",
			showRetry: true,
		},
		in_philippines: {
			icon: MapPin,
			iconColor: "text-green-600 dark:text-green-500",
			iconBgColor: "bg-green-100 dark:bg-green-900/20",
			title: "Location Verified",
			description: "Your location has been verified.",
			showRetry: false,
		},
		near_embassy: {
			icon: MapPin,
			iconColor: "text-green-600 dark:text-green-500",
			iconBgColor: "bg-green-100 dark:bg-green-900/20",
			title: "Location Verified",
			description: "Your location at a Philippine embassy has been verified.",
			showRetry: false,
		},
	}

	return configs[errorReason] ?? configs.location_unknown
}

export function LocationErrorDialog({
	open,
	errorReason,
	userRole,
	details,
	debugInfo,
	onRetry,
	isRetrying = false,
}: LocationErrorDialogProps) {
	const router = useRouter()
	const config = getErrorConfig(errorReason, userRole)
	const Icon = config.icon
	const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
	const isDebugMode = env.NEXT_PUBLIC_LOCATION_VERIFICATION_DEBUG === "true"
	const shouldShowTechnicalDetails = showTechnicalDetails || isDebugMode
	const isAccuracyLowState = errorReason === "gps_accuracy_low" && debugInfo?.accuracyMeters !== undefined

	const technicalDetailsText = useMemo(() => {
		const lines = [
			debugInfo?.errorCode ? `Error code: ${debugInfo.errorCode}` : null,
			debugInfo?.errorMessage ? `Error message: ${debugInfo.errorMessage}` : null,
			debugInfo?.apiStatusCode ? `API status: ${debugInfo.apiStatusCode}` : null,
			debugInfo?.accuracyMeters !== undefined
				? `GPS accuracy: ${debugInfo.accuracyMeters.toFixed(1)}m`
				: null,
			debugInfo?.requestId ? `Request ID: ${debugInfo.requestId}` : null,
			debugInfo?.timestamp ? `Timestamp: ${debugInfo.timestamp}` : null,
		].filter(Boolean)

		return lines.join("\n")
	}, [debugInfo])

	const handleGoBack = () => {
		router.push("/sessions")
	}

	return (
		<Dialog open={open}>
			<DialogContent
				className="sm:max-w-md"
				showCloseButton={false}
				onPointerDownOutside={e => e.preventDefault()}
				onEscapeKeyDown={e => e.preventDefault()}
			>
				<DialogHeader className="text-center sm:text-center">
					<div
						className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${config.iconBgColor}`}
					>
						<Icon className={`size-8 ${config.iconColor}`} />
					</div>
					<DialogTitle className="text-xl">{config.title}</DialogTitle>
					<DialogDescription className="text-center">
						{debugInfo?.userMessage ?? config.description}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Show embassy info if user is near one but role doesn't allow it */}
					{errorReason === "enp_at_embassy_abroad" && details?.nearbyEmbassy && (
						<div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Detected Location
							</p>
							<p className="font-medium text-orange-800 dark:text-orange-200">
								{details.nearbyEmbassy.name}
							</p>
							<p className="text-sm text-orange-700 dark:text-orange-300">
								{details.nearbyEmbassy.city}, {details.nearbyEmbassy.country}
							</p>
							{details.distanceToEmbassyKm !== undefined && (
								<p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
									{formatDistance(details.distanceToEmbassyKm)} from embassy
								</p>
							)}
						</div>
					)}

					{/* Show requirements based on role */}
					<div className="bg-muted/50 rounded-lg p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="text-muted-foreground mt-0.5 size-5 shrink-0" />
							<div className="space-y-1">
								<p className="text-sm font-medium">Location Requirements</p>
								<p className="text-muted-foreground text-sm">
									{getLocationRequirementMessage(userRole)}
								</p>
							</div>
						</div>
					</div>

					{/* Permission denied specific instructions */}
					{errorReason === "permission_denied" && (
						<div className="text-muted-foreground space-y-2 text-sm">
							<p className="font-medium">How to enable location access:</p>
							<ol className="ml-4 list-decimal space-y-1">
								<li>Click the lock/info icon in your browser's address bar</li>
								<li>Find "Location" in the permissions list</li>
								<li>Change the setting to "Allow"</li>
								<li>Refresh the page and try again</li>
							</ol>
						</div>
					)}

					{/* Accuracy-specific details */}
					{isAccuracyLowState && (
						<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
							<p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
								GPS accuracy: {debugInfo.accuracyMeters.toFixed(1)}m
							</p>
						</div>
					)}

					{debugInfo && (
						<div className="rounded-lg border border-border/60">
							<button
								type="button"
								className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
								onClick={() => setShowTechnicalDetails(previous => !previous)}
							>
								<span>Technical Details</span>
								<ChevronDown
									className={`size-4 transition-transform ${shouldShowTechnicalDetails ? "rotate-180" : ""}`}
								/>
							</button>
							{shouldShowTechnicalDetails && (
								<div className="space-y-3 border-t border-border/60 px-4 py-3">
									<div className="text-muted-foreground space-y-1 text-xs">
										{debugInfo.errorCode && <p>Error code: {debugInfo.errorCode}</p>}
										{debugInfo.errorMessage && <p>Error: {debugInfo.errorMessage}</p>}
										{debugInfo.apiStatusCode && <p>API status: {debugInfo.apiStatusCode}</p>}
										{debugInfo.accuracyMeters !== undefined && (
											<p>GPS accuracy: {debugInfo.accuracyMeters.toFixed(1)}m</p>
										)}
										{debugInfo.requestId && <p>Request ID: {debugInfo.requestId}</p>}
										{debugInfo.timestamp && <p>Timestamp: {debugInfo.timestamp}</p>}
										{debugInfo.suggestedAction && (
											<p>Suggested action: {debugInfo.suggestedAction}</p>
										)}
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={async () => {
											if (!technicalDetailsText) return
											await navigator.clipboard.writeText(technicalDetailsText)
										}}
									>
										Copy details
									</Button>
								</div>
							)}
						</div>
					)}
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-col">
					{config.showRetry && onRetry && (
						<Button onClick={onRetry} className="w-full" disabled={isRetrying}>
							{isRetrying ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Retrying...
								</>
							) : (
								"Try Again"
							)}
						</Button>
					)}
					<Button
						variant={config.showRetry && onRetry ? "outline" : "default"}
						onClick={handleGoBack}
						className="w-full"
					>
						Go Back to Meetings
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
