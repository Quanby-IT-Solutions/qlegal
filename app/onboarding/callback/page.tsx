"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

/**
 * KYC Callback Page
 * This page is shown after HyperVerge KYC completion and automatically closes the tab/window
 * HyperVerge appends ?status=<application-status> to the redirect URL
 */
export default function KycCallbackPage() {
	const searchParams = useSearchParams()

	useEffect(() => {
		const status = searchParams.get("status")

		// Log the status received from HyperVerge
		console.log("✅ KYC flow completed with status:", status)

		// Close this window/tab after KYC completion
		// Add small delay to ensure webhook has time to process
		setTimeout(() => {
			window.close()

			// If window.close() doesn't work (some browsers block it), show a message
			setTimeout(() => {
				const canClose = window.opener !== null || window.history.length <= 1
				if (!canClose) {
					document.body.innerHTML = `
						<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
							<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px;">✓ Verification Complete!</h1>
							<p style="color: #666; margin-bottom: 8px;">Status: ${status ?? "processing"}</p>
							<p style="color: #666; margin-bottom: 24px;">You can close this tab and return to the main page.</p>
							<button 
								onclick="window.close()" 
								style="padding: 12px 24px; background: #000; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
							>
								Close Tab
							</button>
						</div>
					`
				}
			}, 500)
		}, 2000) // 2 second delay to allow webhook processing
	}, [searchParams])

	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-600" />
			<h1 className="mb-2 text-2xl font-bold">Verification Complete</h1>
			<p className="text-muted-foreground">Processing status...</p>
			<p className="text-muted-foreground mt-2 text-sm">This window will close automatically</p>
		</div>
	)
}
