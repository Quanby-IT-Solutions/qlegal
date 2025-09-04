"use client"

import { useState } from "react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

export default function EmailTestPage() {
	const [isSending, setIsSending] = useState(false)
	const [result, setResult] = useState<string>("")

	const handleSendTestEmail = async () => {
		setIsSending(true)
		setResult("")

		try {
			const response = await fetch("/api/test/send-email", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: "test@example.com",
					type: "verification", // or "password-reset" or "two-fa"
				}),
			})

			const data = (await response.json()) as { error?: string }

			if (response.ok) {
				setResult("✅ Email sent successfully!")
			} else {
				setResult(`❌ Error: ${data.error ?? "Failed to send email"}`)
			}
		} catch (error) {
			setResult(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)
		} finally {
			setIsSending(false)
		}
	}

	return (
		<div className="container mx-auto p-8">
			<Card className="mx-auto max-w-md">
				<CardHeader>
					<CardTitle>Email Test Page</CardTitle>
					<CardDescription>
						Test the react-email functionality by sending a test email
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button onClick={handleSendTestEmail} disabled={isSending} className="w-full">
						{isSending ? "Sending..." : "Send Test Email"}
					</Button>

					{result && (
						<div
							className={`rounded-md p-3 text-sm ${
								result.startsWith("✅")
									? "border border-green-200 bg-green-100 text-green-800"
									: "border border-red-200 bg-red-100 text-red-800"
							}`}
						>
							{result}
						</div>
					)}

					<div className="text-muted-foreground text-xs">
						<p>This will send a test email to test@example.com</p>
						<p>Check the console for email configuration details</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
