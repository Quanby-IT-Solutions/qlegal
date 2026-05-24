"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ArrowLeft, Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"

import { startHostedLivenessWorkflow } from "@/features/liveness-validation/api/liveness.actions"

export function LivenessValidationCard({
	redirectUrl,
	meetingId,
	canGoBack = false,
}: {
	redirectUrl?: string
	meetingId?: string
	canGoBack?: boolean
}) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	const handleStartVerification = () => {
		startTransition(async () => {
			try {
				const result = await startHostedLivenessWorkflow(redirectUrl, meetingId)

				if (!result.success) {
					throw new Error(result.error ?? "Failed to start hosted workflow")
				}

				if (!result.data?.redirectUrl) {
					throw new Error("No redirect URL returned")
				}

				toast.success("Opening verification…")
				window.location.href = result.data.redirectUrl
			} catch (error) {
				console.error("Failed to start hosted workflow:", error)
				toast.error(error instanceof Error ? error.message : "Failed to start verification")
			}
		})
	}

	return (
		<Card className="w-full shadow-xl">
			<CardHeader className="space-y-4">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 flex size-12 items-center justify-center rounded-xl">
							<Camera className="text-primary size-6" />
						</div>
						<div>
							<CardTitle className="text-2xl">Face Verification</CardTitle>
							<CardDescription className="mt-1">Verify your identity to continue</CardDescription>
						</div>
					</div>
					{canGoBack && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/sessions")}
							className="text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="mr-2 size-4" />
							Back
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<FieldGroup className="bg-background/70 gap-4 rounded-md border p-4 sm:gap-5">
					<p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">
						Verification
					</p>
					<div className="grid gap-3">
						<Button
							type="button"
							variant="default"
							className="h-auto w-full cursor-pointer items-start justify-start gap-3 px-4 py-3 text-left whitespace-normal"
							size="lg"
							onClick={handleStartVerification}
							disabled={isPending}
						>
							<div className="bg-primary-foreground/15 border-primary-foreground/20 flex size-9 shrink-0 items-center justify-center rounded-md border sm:size-10">
								{isPending ? (
									<Loader2 className="size-5 animate-spin" />
								) : (
									<Camera className="size-5" />
								)}
							</div>
							<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
								<span className="text-sm leading-snug font-medium">Start verification</span>
								<span className="text-primary-foreground/80 text-xs leading-snug wrap-break-word">
									HyperVerge opens in a secure window—finish in this browser or scan the QR code on
									your phone.
								</span>
							</div>
						</Button>
					</div>
				</FieldGroup>
			</CardContent>
		</Card>
	)
}
