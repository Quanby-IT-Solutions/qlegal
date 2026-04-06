"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { CheckCircle2, Landmark } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import {
	ENP_SC_CREDENTIALS_CHANGED_EVENT,
	getEnpScCredentialsStorageKey,
	readEnpScCredentialsRecordedAt,
	writeEnpScCredentialsRecorded,
} from "../lib/enp-sc-credentials"

type EnpScCredentialsPlaceholderProps = {
	/** Show only after the QLegal application has been submitted for review. */
	applicationStatus: string | null | undefined
}

export function EnpScCredentialsPlaceholder({ applicationStatus }: EnpScCredentialsPlaceholderProps) {
	const { data: session } = useSession()
	const userId = session?.user?.id

	const submittedToQlegal =
		applicationStatus !== null &&
		applicationStatus !== "DRAFT" &&
		applicationStatus !== "REJECTED"

	const [recordedAtIso, setRecordedAtIso] = useState<string | null>(null)

	useEffect(() => {
		setRecordedAtIso(readEnpScCredentialsRecordedAt(userId))
	}, [userId])

	useEffect(() => {
		const handler = (event: StorageEvent) => {
			const key = getEnpScCredentialsStorageKey(userId)
			if (!key || event.key !== key) return
			setRecordedAtIso(readEnpScCredentialsRecordedAt(userId))
		}
		window.addEventListener("storage", handler)
		return () => window.removeEventListener("storage", handler)
	}, [userId])

	useEffect(() => {
		const sync = () => setRecordedAtIso(readEnpScCredentialsRecordedAt(userId))
		window.addEventListener(ENP_SC_CREDENTIALS_CHANGED_EVENT, sync)
		return () => window.removeEventListener(ENP_SC_CREDENTIALS_CHANGED_EVENT, sync)
	}, [userId])

	if (!submittedToQlegal) return null

	const isRecorded = Boolean(recordedAtIso)
	const recordedLabel = recordedAtIso ? new Date(recordedAtIso).toLocaleString() : null

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2">
					<Landmark className="text-muted-foreground size-5" />
					<CardTitle className="text-lg">Supreme Court credentials (placeholder)</CardTitle>
				</div>
				<CardDescription>
					Your ENP checklist already treats a submitted application (PENDING or later) as having cleared
					the Supreme Court credentials step for now. Use this only if you want to log when you sent
					documents outside QLegal — optional until a real Supreme Court integration exists.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isRecorded ? (
					<Alert
						className="border-emerald-500/35 bg-emerald-500/10 text-foreground dark:border-emerald-400/30 dark:bg-emerald-400/10"
						role="status"
					>
						<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />
						<AlertTitle>Recorded</AlertTitle>
						<AlertDescription className="text-muted-foreground mt-1">
							You marked Supreme Court submission on {recordedLabel ?? "a previous visit"}. The
							&quot;Submit your certificate/credentials to the Supreme Court&quot; step stays completed.
							You can update the timestamp below if you need to confirm again.
						</AlertDescription>
					</Alert>
				) : null}

				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						disabled={!userId}
						onClick={() => {
							if (!userId) return
							const iso = new Date().toISOString()
							writeEnpScCredentialsRecorded(userId, iso)
							setRecordedAtIso(iso)
						}}
					>
						{isRecorded ? "Confirm again (updates timestamp)" : "I've submitted to the Supreme Court"}
					</Button>
					{!userId ? (
						<p className="text-muted-foreground text-xs">Sign in to record this step.</p>
					) : null}
				</div>
			</CardContent>
		</Card>
	)
}
