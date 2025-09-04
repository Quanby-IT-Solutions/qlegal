"use client"

import { useTransition } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { sendTestEmail } from "../_api/actions"

export function EmailTestForm() {
	const [isPending, startTransition] = useTransition()

	const handleSendTestEmail = () => {
		startTransition(async () => {
			await sendTestEmail()
		})
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Send Test Email</CardTitle>
					<CardDescription>Send a test email to verify everything works</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={handleSendTestEmail} disabled={isPending} className="w-full">
						{isPending ? "Sending..." : "Send Test Email"}
					</Button>

					{isPending && (
						<div className="text-muted-foreground mt-2 text-center text-sm">Sending email...</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
