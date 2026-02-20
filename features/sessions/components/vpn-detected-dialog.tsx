"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, ShieldAlert } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"

interface VpnDetectedDialogProps {
	open: boolean
	ipInfo?: {
		isp?: string
		org?: string
		country?: string
	} | null
}

export function VpnDetectedDialog({ open, ipInfo }: VpnDetectedDialogProps) {
	const router = useRouter()

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
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
						<ShieldAlert className="size-8 text-red-600 dark:text-red-500" />
					</div>
					<DialogTitle className="text-xl">VPN/Proxy Detected</DialogTitle>
					<DialogDescription className="text-center">
						For legal compliance and security purposes, VPN or proxy connections are not allowed
						during notarization sessions.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-500" />
							<div className="space-y-1">
								<p className="text-sm font-medium text-red-800 dark:text-red-200">
									Why is this required?
								</p>
								<p className="text-sm text-red-700 dark:text-red-300">
									Philippine notarization laws require verification of your actual physical
									location. VPN and proxy services mask your real location, which prevents proper
									verification.
								</p>
							</div>
						</div>
					</div>

					{ipInfo && (ipInfo.isp ?? ipInfo.org) && (
						<div className="bg-muted/50 rounded-lg p-3">
							<p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
								Detected Network
							</p>
							<p className="text-sm font-medium">{ipInfo.org ?? ipInfo.isp}</p>
							{ipInfo.country && <p className="text-muted-foreground text-xs">{ipInfo.country}</p>}
						</div>
					)}

					<div className="text-muted-foreground space-y-2 text-sm">
						<p className="font-medium">To join this meeting, please:</p>
						<ol className="ml-4 list-decimal space-y-1">
							<li>Disconnect from your VPN or proxy service</li>
							<li>Disable any browser extensions that route traffic through proxies</li>
							<li>Return to this page and try again</li>
						</ol>
					</div>
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-col">
					<Button onClick={handleGoBack} className="w-full">
						Go Back to Sessions
					</Button>
					<p className="text-muted-foreground text-center text-xs">
						If you believe this is an error, please contact support.
					</p>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
