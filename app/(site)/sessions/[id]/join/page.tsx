"use client"

import { useRouter } from "next/navigation"
import { use, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { trpc } from "@/services/trpc/client"

export default function SessionJoinPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const { data: session, status } = useSession()
	const joinByLink = trpc.meetings.joinMeetingByLink.useMutation({
		onError: err => {
			toast.error(err.message ?? "Could not join session")
		},
	})

	useEffect(() => {
		if (status === "unauthenticated") {
			const callbackUrl = encodeURIComponent(`/sessions/${id}/join`)
			router.replace(`/auth/login?callbackUrl=${callbackUrl}`)
			return
		}
		if (status !== "authenticated" || !session?.user?.id) return

		void (async () => {
			try {
				await joinByLink.mutateAsync({ meetingId: id })
				const lobbyUrl = `/sessions/${id}/lobby`
				const redirectUrl = encodeURIComponent(lobbyUrl)
				router.replace(`/liveness?redirect=${redirectUrl}&meetingId=${id}`)
			} catch {
				// Error already surfaced via onError
			}
		})()
	}, [id, status, session?.user?.id, router])

	if (status === "loading" || status === "unauthenticated" || joinByLink.isPending) {
		return (
			<div className="from-background via-muted/20 to-background flex min-h-screen items-center justify-center bg-linear-to-br px-4">
				<Card className="w-full max-w-sm">
					<CardContent className="flex flex-col items-center gap-4 py-8">
						<Loader2 className="size-10 animate-spin text-muted-foreground" />
						<p className="text-muted-foreground text-sm">
							{status === "unauthenticated"
								? "Redirecting to sign in…"
								: "Joining session…"}
						</p>
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
						<p className="text-center text-sm text-destructive">
							{joinByLink.error?.message ?? "Could not join this session."}
						</p>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => router.push("/sessions")}
						>
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
					<Loader2 className="size-10 animate-spin text-muted-foreground" />
					<p className="text-muted-foreground text-sm">Redirecting to verification…</p>
				</CardContent>
			</Card>
		</div>
	)
}
