"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	InfoIcon,
	LoaderIcon,
	MailIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"
import type { Route } from "next"

export function VerifyRecoveryEmailForm({ token }: { token?: string }) {
	const [hasResent, setHasResent] = useState(false)

	const verify = trpc.onboarding.verifyRecoveryEmail.useMutation()
	const status = trpc.onboarding.getStatus.useQuery(undefined, {
		enabled: false,
	})
	const resend = trpc.onboarding.submitRecoveryEmail.useMutation({
		onSuccess: () => {
			setHasResent(true)
			toast.success("Verification email resent successfully.")
		},
		onError: (err) => toast.error(err.message),
	})

	useEffect(() => {
		if (token) {
			verify.mutate({ token })
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token])

	const handleResend = async () => {
		const result = await status.refetch()
		const recoveryEmail = result.data?.recoveryEmail
		if (recoveryEmail) {
			resend.mutate({ recoveryEmail })
		} else {
			toast.error("No pending recovery email found.")
		}
	}

	// ── No token ──────────────────────────────────────────────────────────
	if (!token) {
		return (
			<div className="flex flex-col items-center gap-3 py-4 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
					<AlertTriangleIcon className="size-6 text-destructive" />
				</div>
				<p className="text-sm font-medium">Invalid or missing token.</p>
				<p className="text-muted-foreground text-sm">
					Please use the link from your verification email.
				</p>
			</div>
		)
	}

	// ── Loading ───────────────────────────────────────────────────────────
	if (verify.isPending) {
		return (
			<div className="flex flex-col items-center gap-3 py-8">
				<LoaderIcon className="size-6 animate-spin text-muted-foreground" />
				<p className="text-muted-foreground text-sm">Verifying your recovery email…</p>
			</div>
		)
	}

	// ── Error ─────────────────────────────────────────────────────────────
	if (verify.error) {
		return (
			<div className="flex flex-col items-center gap-4 py-4 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
					<AlertTriangleIcon className="size-6 text-destructive" />
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium">Verification failed</p>
					<p className="text-muted-foreground text-sm">{verify.error.message}</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleResend}
					disabled={resend.isPending || hasResent}
				>
					<MailIcon className="mr-2 size-4" />
					{resend.isPending
						? "Sending…"
						: hasResent
							? "Email sent"
							: "Resend verification email"}
				</Button>
			</div>
		)
	}

	// ── Already verified ──────────────────────────────────────────────────
	if (verify.data?.alreadyVerified) {
		return (
			<div className="flex flex-col items-center gap-4 py-4 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-blue-500/10">
					<InfoIcon className="size-6 text-blue-500" />
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium">Already verified</p>
					<p className="text-muted-foreground text-sm">
						This recovery email has already been verified.
					</p>
				</div>
				<Link
					href="/settings"
					className={cn(buttonVariants({ size: "sm" }), "mt-1")}
				>
					Go to Settings
				</Link>
			</div>
		)
	}

	// ── Success ───────────────────────────────────────────────────────────
	if (verify.data) {
		const onboardingComplete = verify.data.onboardingComplete

		return (
			<div className="flex flex-col items-center gap-4 py-4 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
					<CheckCircle2Icon className="size-6 text-emerald-500" />
				</div>
				<div className="space-y-1">
					<p className="text-sm font-medium">Recovery email verified!</p>
					<p className="text-muted-foreground text-sm">
						Your recovery email has been successfully verified. You can use it to
						recover your account if you lose access to your primary email.
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Link
						href={(onboardingComplete ? "/settings" : "/onboarding") as Route}
						className={cn(buttonVariants({ size: "sm" }))}
					>
						{onboardingComplete ? "Go to Settings" : "Return to onboarding"}
					</Link>
					<Link
						href={(onboardingComplete ? "/onboarding" : "/settings") as Route}
						className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
					>
						{onboardingComplete ? "Return to onboarding" : "Go to Settings"}
					</Link>
				</div>
			</div>
		)
	}

	return null
}
