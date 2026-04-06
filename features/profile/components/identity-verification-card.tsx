"use client"

import { type Route } from "next"
import Link from "next/link"
import { useSession } from "next-auth/react"
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Clock,
	Shield,
	type LucideIcon,
} from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"
import { buildOnboardingKycUrl } from "@/core/lib/onboarding-return-path"
import { cn } from "@/core/lib/utils"

function kycStatusMeta(status: string): {
	label: string
	badgeVariant: "default" | "secondary" | "outline" | "destructive"
	StatusIcon: LucideIcon
	badgeClassName: string
	iconWrapClassName: string
} {
	switch (status) {
		case "VERIFIED":
			return {
				label: "Verified",
				badgeVariant: "outline",
				StatusIcon: CheckCircle2,
				badgeClassName:
					"border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
				iconWrapClassName:
					"border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
			}
		case "PENDING":
			return {
				label: "In progress",
				badgeVariant: "outline",
				StatusIcon: Clock,
				badgeClassName:
					"border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
				iconWrapClassName:
					"border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
			}
		case "REJECTED":
			return {
				label: "Needs attention",
				badgeVariant: "destructive",
				StatusIcon: AlertCircle,
				badgeClassName: "",
				iconWrapClassName:
					"border-destructive/25 bg-gradient-to-br from-destructive/15 to-destructive/5 text-destructive",
			}
		case "NOT_STARTED":
		default:
			return {
				label: "Not started",
				badgeVariant: "outline",
				StatusIcon: Shield,
				badgeClassName:
					"border-border/80 bg-muted/40 text-foreground/90",
				iconWrapClassName:
					"border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary",
			}
	}
}

export function IdentityVerificationCard() {
	const { data: session } = useSession()
	const kycStatus =
		typeof session?.user?.kycStatus === "string" ? session.user.kycStatus : "NOT_STARTED"
	const meta = kycStatusMeta(kycStatus)
	const isVerified = kycStatus === "VERIFIED"

	return (
		<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
			<CardContent className="p-6 sm:p-8">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
					<div className="flex min-w-0 gap-4 sm:gap-5">
						<div
							className={cn(
								"flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm sm:size-14",
								meta.iconWrapClassName
							)}
						>
							<Shield className="size-6 sm:size-7" strokeWidth={1.75} aria-hidden />
						</div>
						<div className="min-w-0 space-y-2">
							<div>
								<h2 className="text-lg leading-tight font-semibold tracking-tight">
									Identity verification
								</h2>
								<p className="text-muted-foreground mt-1.5 max-w-xl text-sm leading-relaxed">
									Confirm who you are so we can protect your account. You can finish this whenever
									you&apos;re ready—signing and the rest of the app stay available in the meantime.
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2 pt-1">
								<span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Status
								</span>
								<Badge
									variant={meta.badgeVariant}
									className={cn(
										"gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
										meta.badgeClassName
									)}
								>
									<meta.StatusIcon className="size-3.5 shrink-0" aria-hidden />
									{meta.label}
								</Badge>
							</div>
						</div>
					</div>

					<div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
						{isVerified ? (
							<p className="text-muted-foreground text-center text-sm sm:text-left lg:text-right xl:text-left">
								Your identity is on file. Update verification if your provider asks you to redo it.
							</p>
						) : (
							<Button
								asChild
								size="lg"
								className="h-11 rounded-full px-6 font-medium shadow-sm transition-transform hover:translate-y-[-1px]"
							>
								<Link href={buildOnboardingKycUrl("/profile") as Route} className="gap-2">
									Continue verification
									<ArrowRight className="size-4" aria-hidden />
								</Link>
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
