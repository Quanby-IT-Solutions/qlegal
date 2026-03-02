import type { Metadata, Route } from "next"
import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/core/components/ui/card"

const termsSections = [
	{
		title: "Acceptance of Terms",
		body: [
			"By creating an account or using Quanby Legal, you agree to these Terms of Service and our Privacy Policy.",
			"If you use the platform on behalf of an organization, you confirm you are authorized to bind that organization to these terms.",
		],
	},
	{
		title: "Service Description",
		body: [
			"Quanby Legal provides electronic notarization workflow tools, guided document execution, and related legal consultation features.",
			"Certain features may require identity verification, KYC checks, or additional approvals under applicable rules and regulations.",
		],
	},
	{
		title: "User Responsibilities",
		body: [
			"Provide accurate, lawful, and non-misleading information.",
			"Maintain the confidentiality of your credentials and notify us of suspected compromise.",
			"Use the platform in compliance with applicable laws, Supreme Court Rules on Electronic Notarization, and professional regulations.",
			"Do not upload malicious code, infringe intellectual property, or misuse the service for unlawful purposes.",
		],
	},
	{
		title: "Data Privacy",
		body: [
			"Personal data is collected and processed in accordance with R.A. 10173 (Philippine Data Privacy Act).",
			"See our Privacy Policy for details on data categories, purposes, sharing, and your rights as a data subject.",
		],
	},
	{
		title: "Documents, Signatures, and Audit Trails",
		body: [
			"You are responsible for ensuring documents are accurate, complete, and properly authorized for electronic notarization.",
			"Audit logs, timestamps, and signature artifacts may be retained to meet legal, regulatory, and evidentiary requirements.",
		],
	},
	{
		title: "Availability & Changes",
		body: [
			"We strive for high availability but do not guarantee uninterrupted service. Maintenance or updates may cause temporary downtime.",
			"We may update features or these Terms to reflect legal, security, or product changes. Continued use constitutes acceptance of updates.",
		],
	},
	{
		title: "Fees",
		body: [
			"Some services may be subject to fees or subscription terms disclosed at the point of purchase.",
		],
	},
	{
		title: "Third-Party Services",
		body: [
			"Integrations (e.g., storage, email, identity verification) may be provided by third parties governed by their own terms and policies.",
		],
	},
	{
		title: "Termination",
		body: [
			"We may suspend or terminate access for violations of these Terms, suspected fraud, security risks, or legal/regulatory requirements.",
			"You may stop using the service at any time. Certain obligations (e.g., payment, indemnities, legal retention) survive termination.",
		],
	},
	{
		title: "Disclaimers & Liability",
		body: [
			'Services are provided on an "as is" basis to the fullest extent permitted by law.',
			"We are not liable for indirect, incidental, or consequential damages. Our aggregate liability is limited to fees you paid for the applicable service in the last 3 months, unless prohibited by law.",
		],
	},
	{
		title: "Governing Law & Venue",
		body: [
			"These Terms are governed by Philippine law. Venue for disputes shall be the proper courts of Makati City, to the extent allowed by law.",
		],
	},
	{
		title: "Contact",
		body: ["For questions about these Terms, email support@quanbyit.com."],
	},
]

export const metadata: Metadata = {
	title: "Terms of Service | Quanby Legal",
	description:
		"Terms governing the use of Quanby Legal's electronic notarization and legal services platform.",
}

interface PageProps {
	searchParams: Promise<{ from?: string }>
}

export default async function TermsOfServicePage({ searchParams }: PageProps) {
	const params = await searchParams
	const backHref = (params.from ? decodeURIComponent(params.from) : "/auth/login") as Route

	return (
		<main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
			<Button variant="ghost" size="sm" asChild className="mb-2 w-fit">
				<Link href={backHref}>
					<ChevronLeftIcon className="size-4" />
					Go Back
				</Link>
			</Button>

			<Card className="w-full">
				<CardHeader className="space-y-4">
					<p className="text-primary text-xs font-semibold tracking-wide uppercase">
						User Agreement
					</p>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
					<p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
						Please read these Terms carefully. By using Quanby Legal, you acknowledge and agree to
						these conditions alongside our Privacy Policy and applicable professional and regulatory
						requirements.
					</p>
				</CardHeader>

				<CardContent className="space-y-10">
					{termsSections.map(section => (
						<section key={section.title} className="space-y-3">
							<h2 className="text-xl leading-tight font-semibold">{section.title}</h2>
							<ul className="text-muted-foreground space-y-2 text-base leading-relaxed">
								{section.body.map(item => (
									<li key={item} className="flex gap-2">
										<span className="text-primary">•</span>
										<span>{item}</span>
									</li>
								))}
							</ul>
						</section>
					))}
				</CardContent>

				<CardFooter className="border-border/60 text-muted-foreground mt-2 flex-col items-start space-y-4 border-t pt-6 text-sm">
					<div className="pb-4">
						<p>Last updated: January 2026</p>
					</div>
					<div className="flex gap-4 text-sm">
						<Link
							href={"/auth/privacy-policy" as Route}
							className="hover:text-foreground transition-colors"
						>
							Privacy Policy
						</Link>
					</div>
				</CardFooter>
			</Card>
		</main>
	)
}
