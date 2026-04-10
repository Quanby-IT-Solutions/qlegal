import Link from "next/link"
import {
	ArrowRight,
	BriefcaseBusiness,
	Building2,
	CheckCircle2,
	FileCheck2,
	Fingerprint,
	Gavel,
	Globe2,
	Layers3,
	LockKeyhole,
	MessageSquareText,
	ShieldCheck,
	Sparkles,
	Workflow,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"

import { ContractAgentSection } from "@/features/contract-agent/components/contract-agent-section"
import { HomeNavbar } from "@/features/home/components/home-navbar"

const HERO_METRICS = [
	{ label: "Core workflows", value: "Analyze · Ask · Generate" },
	{ label: "Public entry point", value: "Anonymous-first, auth-ready" },
	{ label: "Downstream path", value: "Ready for signing and notarization" },
] as const

const FEATURE_CARDS = [
	{
		title: "Contract intelligence without the swivel-chair tax",
		description:
			"Upload the draft once, keep the context live, and let the assistant stay grounded in the actual contract instead of generic advice.",
		icon: Sparkles,
	},
	{
		title: "Secure handoff into regulated workflows",
		description:
			"Move from early drafting to execution with the same product surface, without making users jump to a separate landing page or toolchain.",
		icon: ShieldCheck,
	},
	{
		title: "Role-aware by design",
		description:
			"The landing page is public for discovery, while the rest of Quanby Legal keeps its existing authenticated dashboards and access control model.",
		icon: Fingerprint,
	},
	{
		title: "Drafting fallback built in",
		description:
			"Even without an external model key, the Contract AI still produces structured analysis, grounded answers, and first-draft scaffolds.",
		icon: FileCheck2,
	},
] as const

const WORKFLOW_STEPS = [
	{
		label: "01",
		title: "Upload or drop in a contract",
		description:
			"Bring in a PDF, DOCX, TXT, or Markdown contract to kick off a grounded review from the actual document text.",
	},
	{
		label: "02",
		title: "Review the risk snapshot",
		description:
			"See likely parties, date references, clause gaps, risk flags, and a recommendation before you escalate the draft.",
	},
	{
		label: "03",
		title: "Ask targeted follow-up questions",
		description:
			"Interrogate payment, liability, termination, or negotiation points in plain language while preserving the upload context.",
	},
	{
		label: "04",
		title: "Generate the next working draft",
		description:
			"Produce a tailored first draft for common commercial templates, then continue into signing and notarization when the language is ready.",
	},
] as const

const USE_CASES = [
	{
		title: "Legal and ops teams",
		description:
			"Triage incoming contracts faster, flag clause gaps, and prep the next revision before legal review becomes a bottleneck.",
		icon: BriefcaseBusiness,
	},
	{
		title: "Founders and business teams",
		description:
			"Move service agreements, NDAs, purchase terms, and lease paperwork forward without starting from a blank page.",
		icon: Building2,
	},
	{
		title: "Electronic notary workflows",
		description:
			"Start the public conversation at the landing page, then route finalized documents into Quanby Legal’s execution and audit-ready flows.",
		icon: Gavel,
	},
] as const

const TRUST_POINTS = [
	{
		title: "Featureized architecture",
		description:
			"The landing logic lives in dedicated features instead of crowding the App Router shell, keeping future work isolated and reviewable.",
		icon: Layers3,
	},
	{
		title: "DB-backed session continuity",
		description:
			"Contract AI sessions persist beyond a single request, so analysis, Q&A, and generated drafts stay connected.",
		icon: Workflow,
	},
	{
		title: "Security-minded access model",
		description:
			"Anonymous visitors can explore the public workflow, while signed-in users continue to land in their protected dashboards.",
		icon: LockKeyhole,
	},
	{
		title: "Philippines-ready workflow posture",
		description:
			"Drafting and routing language is tailored to the product’s existing legal and notarization direction, instead of acting like a generic SaaS toy.",
		icon: Globe2,
	},
] as const

const PRICING_TIERS = [
	{
		name: "Pilot",
		price: "Talk to us",
		description: "For teams validating Contract AI as a front door to execution workflows.",
		points: [
			"Public landing experience",
			"Analyze, ask, and generate",
			"Manual onboarding support",
		],
	},
	{
		name: "Scale",
		price: "Custom",
		description:
			"For organizations that want contract intake to feed real signing and notarization operations.",
		points: [
			"Product-aligned workflow tailoring",
			"Role-aware access and routing",
			"Deployment and integration support",
		],
	},
	{
		name: "Enterprise",
		price: "Custom",
		description:
			"For regulated teams that need brand, controls, and workflow adaptation across business units.",
		points: [
			"Private environment strategy",
			"Security and architecture review",
			"Dedicated rollout partnership",
		],
	},
] as const

export function HomePage() {
	return (
		<div className="bg-background text-foreground min-h-screen">
			<HomeNavbar />
			<main>
				<section className="relative overflow-hidden border-b">
					<div className="absolute inset-x-0 top-0 -z-10 h-136 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_42%),radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_38%)]" />
					<div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
						<div className="space-y-8">
							<div className="space-y-5">
								<Badge
									variant="outline"
									className="border-primary/30 bg-primary/5 gap-1.5 px-3 py-1 text-[11px] tracking-[0.24em] uppercase"
								>
									<Sparkles className="text-primary size-3.5" />
									Now native inside Quanby Legal
								</Badge>
								<h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
									Contracts, compliance, and notarization now share one front door.
								</h1>
								<p className="text-muted-foreground max-w-2xl text-base leading-8 sm:text-lg">
									Extracted from the legacy AI prototype and rebuilt inside the main codebase, this
									landing page keeps the full Contract AI flow alive while fitting Quanby Legal’s
									architecture, auth model, and downstream execution paths.
								</p>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<Button asChild size="lg">
									<Link href="#contract-ai">
										Try Contract AI
										<ArrowRight className="size-4" />
									</Link>
								</Button>
								<Button asChild size="lg" variant="outline">
									<Link href="/auth/register">Create a Quanby Legal account</Link>
								</Button>
							</div>

							<div className="grid gap-4 sm:grid-cols-3">
								{HERO_METRICS.map(item => (
									<div
										key={item.label}
										className="bg-background/80 rounded-2xl border p-4 shadow-sm"
									>
										<p className="text-muted-foreground text-xs tracking-[0.22em] uppercase">
											{item.label}
										</p>
										<p className="mt-2 text-sm leading-6 font-semibold">{item.value}</p>
									</div>
								))}
							</div>
						</div>

						<Card className="border-primary/20 bg-background/85 shadow-primary/5 shadow-xl">
							<CardHeader>
								<CardTitle className="text-2xl">Public landing. Protected operations.</CardTitle>
								<CardDescription className="text-sm leading-7">
									Anonymous visitors can explore the AI experience at `/`, while authenticated users
									still route straight into their private dashboard and role-based workflows.
								</CardDescription>
							</CardHeader>
							<CardContent className="text-muted-foreground space-y-4 text-sm leading-7">
								<div className="bg-background rounded-2xl border p-4">
									<p className="text-foreground font-medium">Why this matters</p>
									<p className="mt-2">
										The product can now introduce itself properly before the dashboard wall shows up
										— without sacrificing the existing auth and middleware behavior deeper in the
										app.
									</p>
								</div>
								<div className="bg-background rounded-2xl border p-4">
									<p className="text-foreground font-medium">What stayed intact</p>
									<p className="mt-2">
										The Contract AI flow still analyzes drafts, answers grounded questions, and
										generates fresh contract language — now through the main Next.js/tRPC/Drizzle
										stack.
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</section>

				<section id="capabilities" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-2xl space-y-3">
							<Badge variant="outline">Capabilities</Badge>
							<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
								A landing page that actually leads somewhere useful
							</h2>
							<p className="text-muted-foreground text-base leading-7">
								This isn’t a static brochure. It is the first step in a wider legal execution flow,
								designed to move from intake and drafting into authenticated document operations.
							</p>
						</div>
						<Button asChild variant="outline">
							<Link href="#how-it-works">See the workflow</Link>
						</Button>
					</div>

					<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						{FEATURE_CARDS.map(feature => {
							const Icon = feature.icon
							return (
								<Card key={feature.title} className="bg-background/70 h-full">
									<CardHeader>
										<div className="bg-primary/5 flex size-12 items-center justify-center rounded-2xl border">
											<Icon className="text-primary size-5" />
										</div>
										<CardTitle className="text-xl">{feature.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground text-sm leading-7">{feature.description}</p>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</section>

				<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
					<ContractAgentSection />
				</div>

				<section id="how-it-works" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
						<div className="space-y-4">
							<Badge variant="outline">How it works</Badge>
							<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
								From contract intake to execution readiness
							</h2>
							<p className="text-muted-foreground text-base leading-7">
								The landing page now behaves like a proper product entry: capture intent, analyze
								the document, keep context live, and then transition naturally into the rest of the
								platform.
							</p>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							{WORKFLOW_STEPS.map(step => (
								<Card key={step.label} className="bg-background/70">
									<CardHeader>
										<Badge variant="outline" className="w-fit">
											{step.label}
										</Badge>
										<CardTitle className="text-xl">{step.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground text-sm leading-7">{step.description}</p>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
						<div className="space-y-6">
							<div className="space-y-3">
								<Badge variant="outline">Use cases</Badge>
								<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
									Built for the teams that move documents, not just pixels
								</h2>
							</div>
							<div className="grid gap-4">
								{USE_CASES.map(useCase => {
									const Icon = useCase.icon
									return (
										<Card key={useCase.title} className="bg-background/70">
											<CardContent className="flex gap-4 p-6">
												<div className="bg-primary/5 flex size-12 shrink-0 items-center justify-center rounded-2xl border">
													<Icon className="text-primary size-5" />
												</div>
												<div>
													<p className="text-base font-semibold">{useCase.title}</p>
													<p className="text-muted-foreground mt-2 text-sm leading-7">
														{useCase.description}
													</p>
												</div>
											</CardContent>
										</Card>
									)
								})}
							</div>
						</div>

						<Card className="from-primary/10 via-background to-background bg-linear-to-br">
							<CardHeader>
								<CardTitle className="text-2xl">Why this migration matters technically</CardTitle>
								<CardDescription className="text-sm leading-7">
									The old prototype proved the UX. This rebuild makes it belong in the real product
									without keeping a sidecar Python backend alive forever out of sentimentality.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{TRUST_POINTS.map(point => {
									const Icon = point.icon
									return (
										<div key={point.title} className="bg-background/80 rounded-2xl border p-4">
											<div className="flex items-center gap-3">
												<div className="bg-primary/5 flex size-10 items-center justify-center rounded-2xl border">
													<Icon className="text-primary size-4" />
												</div>
												<p className="text-sm font-semibold">{point.title}</p>
											</div>
											<p className="text-muted-foreground mt-3 text-sm leading-7">
												{point.description}
											</p>
										</div>
									)
								})}
							</CardContent>
						</Card>
					</div>
				</section>

				<section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
					<div className="space-y-4 text-center">
						<Badge variant="outline">Pricing and rollout</Badge>
						<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
							Commercial packaging that fits real legal operations
						</h2>
						<p className="text-muted-foreground mx-auto max-w-2xl text-base leading-7">
							We kept the landing-page pricing intent from the prototype, but expressed it in a way
							that matches enterprise legal workflows: scoped, consultative, and
							implementation-aware.
						</p>
					</div>
					<div className="mt-8 grid gap-4 lg:grid-cols-3">
						{PRICING_TIERS.map(tier => (
							<Card key={tier.name} className="bg-background/70 h-full">
								<CardHeader>
									<CardTitle className="text-2xl">{tier.name}</CardTitle>
									<CardDescription>{tier.description}</CardDescription>
									<p className="pt-3 text-3xl font-semibold tracking-tight">{tier.price}</p>
								</CardHeader>
								<CardContent>
									<ul className="text-muted-foreground space-y-3 text-sm leading-7">
										{tier.points.map(point => (
											<li key={point} className="flex gap-3">
												<CheckCircle2 className="text-primary mt-1 size-4 shrink-0" />
												<span>{point}</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				<section
					id="contact"
					className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24"
				>
					<Card className="from-primary/10 via-background to-background overflow-hidden bg-linear-to-r">
						<CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
							<div className="space-y-4">
								<Badge variant="outline">Contact and next steps</Badge>
								<h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
									Want the landing flow wired into your full document operation?
								</h2>
								<p className="text-muted-foreground text-base leading-8">
									Use the public Contract AI experience to validate the workflow, then talk to us
									about onboarding, branded rollout, and downstream routing into signing, review,
									and notarization.
								</p>
								<div className="flex flex-col gap-3 sm:flex-row">
									<Button asChild size="lg">
										<Link href="/auth/register">Start with Quanby Legal</Link>
									</Button>
									<Button asChild size="lg" variant="outline">
										<Link href="/auth/login">Return to your dashboard</Link>
									</Button>
								</div>
							</div>

							<div className="grid gap-4">
								<div className="bg-background/80 rounded-2xl border p-5">
									<div className="flex items-center gap-3">
										<MessageSquareText className="text-primary size-5" />
										<p className="font-semibold">Product walkthrough</p>
									</div>
									<p className="text-muted-foreground mt-3 text-sm leading-7">
										See how the public landing page, AI drafting, and protected dashboards now fit
										together in one product narrative.
									</p>
								</div>
								<div className="bg-background/80 rounded-2xl border p-5">
									<div className="flex items-center gap-3">
										<ShieldCheck className="text-primary size-5" />
										<p className="font-semibold">Architecture review</p>
									</div>
									<p className="text-muted-foreground mt-3 text-sm leading-7">
										Walk through the featureized implementation, session persistence, and
										environment strategy for deployment.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</section>
			</main>

			<footer className="border-t">
				<div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 text-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
					<p>
						© {new Date().getFullYear()} Quanby Legal. Contract AI landing experience rebuilt inside
						the main platform.
					</p>
					<div className="flex flex-wrap items-center gap-4">
						<Link href="/auth/privacy-policy" className="hover:text-foreground transition-colors">
							Privacy Policy
						</Link>
						<Link href="/auth/terms-of-service" className="hover:text-foreground transition-colors">
							Terms of Service
						</Link>
						<Link href="#contract-ai" className="hover:text-foreground transition-colors">
							Contract AI
						</Link>
					</div>
				</div>
			</footer>
		</div>
	)
}
