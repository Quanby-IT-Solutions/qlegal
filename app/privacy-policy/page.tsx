import type { Metadata, Route } from "next"
import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/core/components/ui/button"

import { Navbar } from "@/features/home/components/navbar"

const sections = [
	{
		title: "Scope & Commitment",
		body: [
			"Quanby Legal collects and processes personal data in accordance with the Philippine Data Privacy Act of 2012 (R.A. 10173), its Implementing Rules and Regulations, and relevant NPC issuances.",
			"We gather only what is necessary to deliver, secure, and improve our electronic notarization and consultation services.",
		],
	},
	{
		title: "Data We Collect",
		body: [
			"Identification and contact details (e.g., name, email, phone).",
			"Account and authentication data (login credentials, session metadata).",
			"Notarization artifacts (documents, signatures, audit logs, timestamps, IP/device metadata).",
			"Operational telemetry and cookies used for security, performance, and user experience.",
		],
	},
	{
		title: "Purpose & Legal Bases",
		body: [
			"To deliver contracted services and comply with Supreme Court, regulatory, and notarial requirements (contractual necessity & legal obligation).",
			"To secure accounts, detect fraud, and maintain service reliability (legitimate interest & legal obligation).",
			"To communicate updates, support, and policy changes (legitimate interest/consent, where applicable).",
			"To improve UX and product quality through aggregated, non-sensitive analytics (consent, where applicable).",
		],
	},
	{
		title: "Cookies & Tracking",
		body: [
			"Essential cookies are required for security and core functionality.",
			"Optional cookies/trackers (if enabled) are used only after you consent through our banner. Declining keeps optional tracking off.",
		],
	},
	{
		title: "Data Sharing",
		body: [
			"Authorized personnel, notaries, and counterparties involved in a transaction.",
			"Service providers under data processing agreements (cloud, email, storage, security, analytics if enabled).",
			"Regulators, courts, or authorities when legally required.",
		],
	},
	{
		title: "Retention",
		body: [
			"We retain data only as long as necessary for the stated purposes, applicable laws, and regulatory/audit requirements, then securely delete or anonymize it.",
		],
	},
	{
		title: "Your Rights under R.A. 10173",
		body: [
			"Be informed, access, and obtain a copy of your personal data.",
			"Object or withdraw consent to non-essential processing, subject to legal/contractual limits.",
			"Rectify inaccuracies and request deletion or blocking when applicable.",
			"Data portability, where technically feasible and lawful.",
			"Right to lodge a complaint with the National Privacy Commission.",
		],
	},
	{
		title: "Security",
		body: [
			"We apply encryption, access controls, logging, and least-privilege practices to protect personal data. Security is reviewed periodically to address emerging risks.",
		],
	},
	{
		title: "Contact Our DPO",
		body: [
			"For data privacy requests or questions, email privacy@quanbyit.com. We may ask you to verify your identity before processing requests.",
		],
	},
	{
		title: "Updates",
		body: [
			"We may update this notice to reflect changes in law, guidance, or our services. Significant changes will be communicated through the app or email when appropriate.",
		],
	},
]

export const metadata: Metadata = {
	title: "Privacy Policy | Quanby Legal",
	description: "How Quanby Legal collects, uses, and protects personal data under R.A. 10173.",
}

interface PageProps {
	searchParams: Promise<{ from?: string }>
}

export default async function PrivacyPolicyPublicPage({ searchParams }: PageProps) {
	const params = await searchParams
	const backHref = (params.from ? decodeURIComponent(params.from) : "/") as Route

	return (
		<div className="relative min-h-screen w-full overflow-hidden">
			<Navbar />

			{/* Background Elements (similar to auth) */}
			<div className="via-background absolute inset-0 bg-linear-to-br from-[rgb(91,26,128)]/5 to-[rgb(233,30,140)]/5" />
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]" />
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />
			<div className="pointer-events-none absolute bottom-[-20%] left-[-10%] size-80 rounded-full bg-linear-to-r from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 blur-3xl" />
			<div className="pointer-events-none absolute -right-25 bottom-[20%] size-80 rounded-full bg-linear-to-r from-[rgb(233,30,140)]/15 to-[rgb(91,26,128)]/15 blur-3xl" />
			<div className="pointer-events-none absolute top-[-10%] left-[25%] size-80 rounded-full bg-linear-to-r from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 blur-3xl" />

			<main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-4 pt-24 pb-12 sm:px-6 lg:px-8">
				<Button variant="ghost" size="sm" asChild className="mb-4 w-fit">
					<Link href={backHref}>
						<ChevronLeftIcon className="size-4" />
						Go Back
					</Link>
				</Button>
				<header className="space-y-4">
					<p className="text-primary text-xs font-semibold tracking-wide uppercase">
						R.A. 10173 Compliance
					</p>
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
					<p className="text-muted-foreground max-w-3xl text-base leading-relaxed">
						This notice explains how Quanby Legal collects, uses, stores, and shares personal data
						in line with the Philippine Data Privacy Act of 2012 (R.A. 10173) and its Implementing
						Rules and Regulations.
					</p>
				</header>

				<div className="space-y-10">
					{sections.map(section => (
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
				</div>

				<footer className="border-border/60 text-muted-foreground mt-4 space-y-4 border-t pt-6 text-sm">
					<div className="pb-4">
						<p>Last updated: January 2026</p>
					</div>
					<div className="flex gap-4 text-sm">
						<Link href="/terms-of-service" className="hover:text-foreground transition-colors">
							Terms of Service
						</Link>
					</div>
				</footer>
			</main>
		</div>
	)
}
