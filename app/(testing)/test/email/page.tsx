import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { EmailTestForm } from "./_components/email-test-form"

export default function EmailTestPage() {
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
					<EmailTestForm />

					<div className="text-muted-foreground text-xs">
						<p>This will send a test email to test@example.com</p>
						<p>Check the console for email configuration details</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
