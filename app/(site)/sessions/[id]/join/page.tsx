"use client"

import { useRouter } from "next/navigation"
import { use, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { EnpLmsRequiredDialog } from "@/core/components/enp-lms-required-dialog"
import { KycRequiredDialog } from "@/core/components/kyc-required-dialog"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { isEnpCommissionInactiveForRestrictedOps } from "@/core/lib/enp-lms-guard"
import { isLawyerBookingBlockedForKyc } from "@/core/lib/kyc-restriction-guards"

import { trpc } from "@/services/trpc/client"

export default function SessionJoinPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { data: session, status } = useSession()
	const sessionKyc =
		typeof session?.user?.kycStatus === "string" ? session.user.kycStatus : undefined
	const kycJoinBlocked = isLawyerBookingBlockedForKyc(session?.user?.role, sessionKyc)
	const enpCommissionJoinBlocked = isEnpCommissionInactiveForRestrictedOps(
		session?.user?.role,
		typeof session?.user?.status === "string" ? session.user.status : undefined
	)
	const joinByLink = trpc.meetings.joinMeetingByLink.useMutation({
		onError: err => {
			toast.error(err.message ?? "Could not join session")
		},
	})
	const joinMeetingByLink = joinByLink.mutateAsync

	useEffect(() => {
		if (status === "unauthenticated") {
			const callbackUrl = encodeURIComponent(`/sessions/${id}`)
			router.replace(`/auth/login?callbackUrl=${callbackUrl}`)
			return
		}
		if (status !== "authenticated" || !session?.user?.id) return
		if (kycJoinBlocked) return
		if (enpCommissionJoinBlocked) return

		void (async () => {
			try {
				await joinMeetingByLink({ meetingId: id })
				const redirectUrl = encodeURIComponent(`/sessions/${id}`)
				router.replace(`/liveness?redirect=${redirectUrl}&meetingId=${id}`)
			} catch {
				// Error already surfaced via onError
			}
		})()
	}, [
		id,
		status,
		session?.user?.id,
		router,
		kycJoinBlocked,
		enpCommissionJoinBlocked,
		joinMeetingByLink,
	])

	if (status === "loading" || status === "unauthenticated") {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br px-4">
				<Card className="w-full max-w-sm">
					<CardContent className="flex flex-col items-center gap-4 py-8">
						<Loader2 className="text-muted-foreground size-10 animate-spin" />
						<p className="text-muted-foreground text-sm">
							{status === "unauthenticated" ? "Redirecting to sign in…" : "Loading…"}
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (status === "authenticated" && kycJoinBlocked) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
				<KycRequiredDialog
					open
					onOpenChange={open => {
						if (!open) router.push("/sessions")
					}}
					returnToPath="/sessions"
					description="Complete identity verification before joining a session. You can finish verification from here."
				/>
			</div>
		)
	}

	if (status === "authenticated" && enpCommissionJoinBlocked) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br p-4">
				<EnpLmsRequiredDialog
					open
					onOpenChange={open => {
						if (!open) router.push("/sessions")
					}}
				/>
			</div>
		)
	}

	if (joinByLink.isPending) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br px-4">
				<Card className="w-full max-w-sm">
					<CardContent className="flex flex-col items-center gap-4 py-8">
						<Loader2 className="text-muted-foreground size-10 animate-spin" />
						<p className="text-muted-foreground text-sm">Joining session…</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (joinByLink.isError) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br px-4">
				<Card className="w-full max-w-sm">
					<CardContent className="flex flex-col gap-4 py-8">
						<p className="text-destructive text-center text-sm">
							{joinByLink.error?.message ?? "Could not join this session."}
						</p>
						<Button variant="outline" className="w-full" onClick={() => router.push("/sessions")}>
							Back to Sessions
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br px-4">
			<Card className="w-full max-w-sm">
				<CardContent className="flex flex-col items-center gap-4 py-8">
					<Loader2 className="text-muted-foreground size-10 animate-spin" />
					<p className="text-muted-foreground text-sm">Redirecting to verification…</p>
				</CardContent>
			</Card>
		</div>
	)
}
