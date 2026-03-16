"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useKycBroadcast } from "@/core/hooks/use-kyc-broadcast"

import { getKycWebSdkSession, syncKycStatusFromCallback } from "@/features/kyc/api/kyc.actions"

const HYPERVERGE_WEB_SDK_VERSION = "10.0.0"
const SDK_SCRIPT_URL = `https://hv-web-sdk-cdn.hyperverge.co/hyperverge-web-sdk@${HYPERVERGE_WEB_SDK_VERSION}/src/sdk.min.js`

interface HyperKycConfigInstance {
	supportDarkMode?: (v: boolean) => void
	setInputs?: (inputs: Record<string, unknown>) => void
}

declare global {
	interface Window {
		HyperKYCModule?: {
			launch: (
				config: HyperKycConfigInstance,
				callback: (result: { status: string }) => void
			) => Promise<void>
		}
		HyperKycConfig?: new (authToken: string, showLandingPage?: boolean) => HyperKycConfigInstance
	}
}

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) {
			resolve()
			return
		}
		const script = document.createElement("script")
		script.src = src
		script.async = true
		script.onload = () => resolve()
		script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
		document.head.appendChild(script)
	})
}

interface HyperVergeWebSdkLauncherProps {
	/** When true, fetches session and launches SDK on mount */
	autoLaunch?: boolean
	/** Called after SDK closes (success or cancel) */
	onComplete?: () => void
	/** Redirect URL after successful verification (e.g. /dashboard). If set, window.location.href is used. */
	redirectOnSuccess?: string
}

export function HyperVergeWebSdkLauncher({
	autoLaunch = true,
	onComplete,
	redirectOnSuccess = "/dashboard",
}: HyperVergeWebSdkLauncherProps) {
	const [status, setStatus] = useState<"idle" | "loading" | "launching" | "done">("idle")
	const [error, setError] = useState<string | null>(null)
	const hasLaunchedRef = useRef(false)
	const { broadcast } = useKycBroadcast()

	const handleSdkCallback = useCallback(
		async (result: { status: string }, transactionId: string) => {
			const s = (result?.status ?? "").trim().toLowerCase()
			await syncKycStatusFromCallback(transactionId, s)

			if (s === "auto_approved") {
				broadcast({
					type: "KYC_VERIFIED",
					timestamp: Date.now(),
					transactionId,
				})
				toast.success("Verification approved! Redirecting...")
				if (redirectOnSuccess) {
					window.location.href = redirectOnSuccess
				}
			} else if (s === "auto_declined") {
				broadcast({
					type: "KYC_REJECTED",
					timestamp: Date.now(),
					transactionId,
				})
				toast.error("Verification was declined. Please try again or contact support.")
			} else if (s === "needs_review") {
				toast.message("Verification is under review. We'll notify you once complete.")
			} else if (s === "user_cancelled") {
				broadcast({
					type: "KYC_CANCELLED",
					timestamp: Date.now(),
					transactionId,
				})
				toast.message("Verification cancelled.")
			} else if (s === "error") {
				toast.error("Something went wrong. Please try again.")
			}

			setStatus("done")
			onComplete?.()
		},
		[broadcast, redirectOnSuccess, onComplete]
	)

	const launch = useCallback(async () => {
		if (hasLaunchedRef.current) return
		hasLaunchedRef.current = true
		setStatus("loading")
		setError(null)

		try {
			await loadScript(SDK_SCRIPT_URL)
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to load verification"
			setError(msg)
			toast.error(msg)
			setStatus("done")
			onComplete?.()
			return
		}

		const sessionResult = await getKycWebSdkSession()
		if (!sessionResult.success || !sessionResult.data) {
			const msg = sessionResult.error ?? "Failed to start verification"
			setError(msg)
			toast.error(msg)
			setStatus("done")
			onComplete?.()
			return
		}

		const { authToken, transactionId } = sessionResult.data
		const HyperKycConfig = window.HyperKycConfig
		const HyperKYCModule = window.HyperKYCModule

		if (!HyperKycConfig || !HyperKYCModule) {
			const msg = "Verification SDK not available. Please refresh and try again."
			setError(msg)
			toast.error(msg)
			setStatus("done")
			onComplete?.()
			return
		}

		setStatus("launching")
		const config = new HyperKycConfig(authToken, false)
		if (typeof config.supportDarkMode === "function") {
			config.supportDarkMode(true)
		}

		await HyperKYCModule.launch(config, (result: { status: string }) => {
			void handleSdkCallback(result, transactionId)
		})
	}, [handleSdkCallback, onComplete])

	useEffect(() => {
		if (autoLaunch && status === "idle") {
			void launch()
		}
	}, [autoLaunch, status, launch])

	if (error) {
		return (
			<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
				{error}
			</div>
		)
	}

	if (status === "loading" || status === "launching") {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-8">
				<Loader2 className="size-10 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">
					{status === "loading" ? "Starting verification..." : "Verification window opening..."}
				</p>
			</div>
		)
	}

	return null
}
