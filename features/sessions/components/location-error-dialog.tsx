"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, Globe, MapPin, MapPinOff, Navigation } from "lucide-react"

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
	onRetry?: () => void
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
		vpn_detected: {
			icon: AlertCircle,
			iconColor: "text-red-600 dark:text-red-500",
			iconBgColor: "bg-red-100 dark:bg-red-900/20",
			title: "VPN Detected",
			description: "VPN or proxy connections are not allowed during notarization sessions.",
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
	onRetry,
}: LocationErrorDialogProps) {
	const router = useRouter()
	const config = getErrorConfig(errorReason, userRole)
	const Icon = config.icon

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
					<DialogDescription className="text-center">{config.description}</DialogDescription>
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
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-col">
					{config.showRetry && onRetry && (
						<Button onClick={onRetry} className="w-full">
							Try Again
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
