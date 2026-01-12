import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { KycTestForm } from "./_components/kyc-test-form"

export default function KycTestPage() {
	return (
		<div className="container mx-auto p-8">
			<div className="mx-auto max-w-2xl space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>HyperVerge KYC Test Page</CardTitle>
						<CardDescription>
							Test the HyperVerge Onboard Links integration for KYC verification. This page allows
							you to generate KYC verification links and check their status.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="text-muted-foreground space-y-2 text-sm">
							<p>
								<strong>How it works:</strong>
							</p>
							<ol className="list-inside list-decimal space-y-1">
								<li>Enter the user&apos;s email and optionally their name</li>
								<li>Click &quot;Create KYC Link&quot; to generate a verification link</li>
								<li>Share the link with the user or open it yourself for testing</li>
								<li>The user completes the KYC workflow on HyperVerge&apos;s hosted page</li>
								<li>Use &quot;Check KYC Status&quot; to see the verification result</li>
							</ol>
						</div>
					</CardContent>
				</Card>

				<KycTestForm />

				<Card>
					<CardHeader>
						<CardTitle className="text-sm">Configuration Notes</CardTitle>
					</CardHeader>
					<CardContent className="text-muted-foreground text-xs">
						<p>Required environment variables:</p>
						<ul className="mt-2 list-inside list-disc space-y-1">
							<li>
								<code>HYPERVERGE_APP_ID</code> - Your HyperVerge App ID
							</li>
							<li>
								<code>HYPERVERGE_APP_KEY</code> - Your HyperVerge App Key
							</li>
							<li>
								<code>HYPERVERGE_WORKFLOW_ID</code> - Workflow ID from HyperVerge Dashboard
							</li>
							<li>
								<code>HYPERVERGE_API_URL</code> - API URL (optional, defaults to India region)
							</li>
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
