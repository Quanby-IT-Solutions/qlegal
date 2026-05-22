"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Info, Loader2, XCircle } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Spotlight } from "@/core/components/ui/spotlight-new"
import { useKycBroadcast, type KycBroadcastMessage } from "@/core/hooks/use-kyc-broadcast"

import { syncKycStatusFromCallbackRequest } from "@/features/kyc/api/sync-kyc-callback-client"

export default function KycCallbackPage() {
	const searchParams = useSearchParams()
	const [showFallback, setShowFallback] = useState(false)
	const hasBroadcastRef = useRef(false)

	const status = searchParams.get("status")
	const transactionId = searchParams.get("transactionId")

	const broadcastType: KycBroadcastMessage["type"] = (() => {
		if (!status) {
			return "KYC_PENDING"
		}

		const normalized = status.trim().toLowerCase()
		if (normalized === "user_cancelled") {
			return "KYC_CANCELLED"
		}
		if (
			[
				"auto_approved",
				"approved",
				"success",
				"succeeded",
				"verified",
				"completed",
			].includes(normalized)
		)
			return "KYC_VERIFIED"
		if (
			["auto_declined", "rejected", "declined", "failed", "error"].includes(normalized)
		) {
			return "KYC_REJECTED"
		}

		return "KYC_PENDING"
	})()

	const statusHint = (() => {
		if (!status) {
			return null
		}

		const normalized = status.trim().toLowerCase()
		if (normalized === "user_cancelled") {
			return "You cancelled the verification flow."
		}

		if (
			[
				"auto_approved",
				"approved",
				"success",
				"succeeded",
				"verified",
				"completed",
			].includes(normalized)
		)
			return "Your verification was completed successfully."
		if (
			["auto_declined", "rejected", "declined", "failed", "error"].includes(normalized)
		) {
			return "Your verification could not be completed."
		}

		return null
	})()

	const statusAlertVariant = (() => {
		if (broadcastType === "KYC_VERIFIED") {
			return "success" as const
		}
		if (broadcastType === "KYC_REJECTED") {
			return "destructive" as const
		}
		if (broadcastType === "KYC_CANCELLED") {
			return "warning" as const
		}
		return "info" as const
	})()

	const statusAlertIcon = (() => {
		if (broadcastType === "KYC_VERIFIED") {
			return <CheckCircle2 className="size-4" />
		}
		if (broadcastType === "KYC_REJECTED") {
			return <XCircle className="size-4" />
		}
		if (broadcastType === "KYC_CANCELLED") {
			return <XCircle className="size-4" />
		}
		return <Info className="size-4" />
	})()

	const { broadcast } = useKycBroadcast()

	useEffect(() => {
		if (hasBroadcastRef.current) {
			return
		}

		hasBroadcastRef.current = true

		// Persist status from redirect (needed when Output API is unavailable e.g. fallback region)
		if (transactionId && status) {
			syncKycStatusFromCallbackRequest(transactionId, status).catch(() => {
				// Non-blocking; broadcast still notifies other tab
			})
		}

		broadcast({
			type: broadcastType,
			timestamp: Date.now(),
			transactionId: transactionId ?? undefined,
		})

		const closeTimer = setTimeout(() => {
			window.close()
			setTimeout(() => setShowFallback(true), 500)
		}, 2000)

		return () => clearTimeout(closeTimer)
	}, [broadcast, broadcastType, transactionId, status])

	return (
		<div className="relative min-h-screen w-full overflow-hidden">
			<div className="via-background absolute inset-0 bg-linear-to-br from-[rgb(91,26,128)]/5 to-[rgb(233,30,140)]/5" />

			<Spotlight
				gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(278, 100%, 65%, .08) 0, hsla(278, 100%, 60%, .02) 50%, hsla(278, 100%, 55%, 0) 80%)"
				gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(327, 100%, 65%, .05) 0, hsla(327, 100%, 60%, .015) 80%, transparent 100%)"
				gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(278, 100%, 65%, .04) 0, hsla(278, 100%, 55%, .01) 80%, transparent 100%)"
			/>

			<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]" />
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

			<div className="relative z-10 flex min-h-screen items-center justify-center p-4">
				<Card className="w-full max-w-md border shadow-lg">
					<CardHeader className="text-center">
						<div className="mb-3 flex justify-center">
							{showFallback ? (
								<CheckCircle2 className="size-9 text-foreground/80" />
							) : (
								<Loader2 className="size-9 animate-spin text-foreground/80" />
							)}
						</div>
						<CardTitle className="text-xl">
							{showFallback ? "Verification complete" : "Finishing verification"}
						</CardTitle>
						<CardDescription>
							{showFallback
								? "You can close this tab and return to onboarding."
								: "This window will close automatically."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{showFallback && statusHint ? (
							<Alert variant={statusAlertVariant} className="bg-background/60">
								{statusAlertIcon}
								<AlertTitle>Verification status</AlertTitle>
								<AlertDescription>{statusHint}</AlertDescription>
							</Alert>
						) : null}

						{showFallback ? (
							<div className="flex justify-center">
								<Button type="button" onClick={() => window.close()}>
									Close tab
								</Button>
							</div>
						) : null}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
