"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

export function MessageFirstTab() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Message a Notary First</CardTitle>
					<CardDescription>
						Have questions before booking? Message a notary directly to discuss your needs, ask
						about their experience, or have them review your documents.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
						<h3 className="font-semibold text-blue-900">How it works:</h3>
						<ol className="list-inside list-decimal space-y-1 text-sm text-blue-900">
							<li>
								Go to <strong>Messages</strong> or browse notary profiles
							</li>
							<li>
								Click <strong>[💬 Message]</strong> on a notary's profile
							</li>
							<li>Chat about your needs, ask questions, share documents</li>
							<li>Either party can upgrade to a session when ready</li>
						</ol>
					</div>

					<div className="space-y-3">
						<h3 className="font-semibold">Perfect for:</h3>
						<ul className="text-muted-foreground space-y-2 text-sm">
							<li>✓ Complex document reviews before notarization</li>
							<li>✓ Discussing legal concerns with a notary</li>
							<li>✓ Finding a notary with specific expertise</li>
							<li>✓ Building rapport before committing to a session</li>
							<li>✓ Understanding fees and requirements upfront</li>
						</ul>
					</div>

					<div className="flex gap-3 pt-4">
						<Link href="/messages" className="flex-1">
							<Button className="w-full">
								<MessageSquare className="mr-2 h-4 w-4" />
								Go to Messages
							</Button>
						</Link>
						<Link href="/browse" className="flex-1">
							<Button variant="outline" className="w-full">
								Browse Profiles
							</Button>
						</Link>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Tips for Messaging</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground space-y-3 text-sm">
					<p>
						<strong>Be specific:</strong> Clearly describe what documents you need notarized and any
						special requirements.
					</p>
					<p>
						<strong>Share context:</strong> Explain why you need the notarization (e.g., for a bank,
						overseas application, etc.)
					</p>
					<p>
						<strong>Ask about experience:</strong> Check if the notary has handled similar documents
						or cases.
					</p>
					<p>
						<strong>Discuss timeline:</strong> Ask about availability and how quickly they can
						complete the work.
					</p>
					<p>
						<strong>Request fees upfront:</strong> Clarify the cost before upgrading to a session.
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
