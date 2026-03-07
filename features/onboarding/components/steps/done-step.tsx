"use client"

import { CircleCheck, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	CameraIcon,
	CheckCircle2Icon,
	MailIcon,
	PhoneIcon,
	ShieldCheckIcon,
	type LucideIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { Profile } from "@/core/components/user-profile"
import { cn } from "@/core/lib/utils"

interface DoneStepProps {
	onComplete: () => void
	isCompleting: boolean
	kycVerified: boolean
	recoveryEmailVerified: boolean
	recoveryEmailSubmitted: boolean
	recoveryEmail?: string | null
	phoneNumber?: string | null
	hasProfilePhoto: boolean
	userName: string
	userImage?: string | null
	onSnooze?: () => void
	isSnoozing?: boolean
}

interface SummaryItem {
	label: string
	detail: string
	statusLabel: string
	statusTone: "complete" | "pending" | "optional"
	icon: LucideIcon
}

export function DoneStep({
	onComplete,
	isCompleting,
	kycVerified,
	recoveryEmailVerified,
	recoveryEmailSubmitted,
	recoveryEmail,
	phoneNumber,
	hasProfilePhoto,
	userName,
	userImage,
	onSnooze,
	isSnoozing,
}: DoneStepProps) {
	const showReminder = recoveryEmailSubmitted && !recoveryEmailVerified
	const canSnoozeReminder = showReminder && !!onSnooze
	const summaryItems: SummaryItem[] = [
		{
			label: "Identity verification",
			detail: kycVerified
				? "Your identity is verified and ready for secure signing."
				: "Complete KYC soon to unlock the full signing experience.",
			statusLabel: kycVerified ? "Verified" : "Pending",
			statusTone: kycVerified ? "complete" : "pending",
			icon: ShieldCheckIcon,
		},
		{
			label: "Recovery email",
			detail: recoveryEmailVerified
				? recoveryEmail
					? `${recoveryEmail} is verified and ready for recovery support.`
					: "Your recovery email is verified and ready for recovery support."
				: recoveryEmailSubmitted
					? recoveryEmail
						? `${recoveryEmail} is waiting for verification from your inbox.`
						: "Your recovery email is waiting for verification from your inbox."
					: "Optional for now — you can add one later from account settings.",
			statusLabel: recoveryEmailVerified
				? "Verified"
				: recoveryEmailSubmitted
					? "Pending"
					: "Optional",
			statusTone: recoveryEmailVerified
				? "complete"
				: recoveryEmailSubmitted
					? "pending"
					: "optional",
			icon: MailIcon,
		},
		{
			label: "Phone number",
			detail: phoneNumber
				? `${phoneNumber} is saved for important account updates.`
				: "Skipped for now — you can add a number anytime from your profile.",
			statusLabel: phoneNumber ? "Added" : "Skipped",
			statusTone: phoneNumber ? "complete" : "optional",
			icon: PhoneIcon,
		},
		{
			label: "Profile photo",
			detail: hasProfilePhoto
				? "Your profile photo is ready to help others recognise you."
				: "Skipped for now — upload one later from your profile.",
			statusLabel: hasProfilePhoto ? "Added" : "Skipped",
			statusTone: hasProfilePhoto ? "complete" : "optional",
			icon: CameraIcon,
		},
	]

	const getBadgeClassName = (statusTone: SummaryItem["statusTone"]) => {
		switch (statusTone) {
			case "complete":
				return "border-success/30 bg-success/10 text-success"
			case "pending":
				return "border-warning/30 bg-warning/10 text-warning"
			default:
				return "border-border bg-muted text-muted-foreground"
		}
	}

	return (
		<>
			<div className="space-y-2">
				<CardContent className="px-2!">
					<div className="from-success/10 via-background to-background space-y-4 rounded-2xl border bg-linear-to-br p-5">
						<div className="flex items-start gap-4">
							<div className="bg-success/10 text-success flex size-12 shrink-0 items-center justify-center rounded-2xl border border-current/15">
								<HugeiconsIcon icon={CircleCheck} className="size-6" />
							</div>

							<div className="space-y-1">
								<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
									Ready to go
								</p>
								<h3 className="text-lg font-semibold tracking-tight">
									Your Quanby account is set up
								</h3>
								<p className="text-muted-foreground text-sm leading-6">
									You&apos;re ready to start signing, reviewing, and managing documents with a
									clean, secure profile.
								</p>
							</div>
						</div>

						<div className="bg-background/80 flex items-center gap-3 rounded-xl border px-3 py-3">
							<Profile url={userImage ?? null} name={userName} size="lg" />
							<div className="min-w-0 space-y-1 text-left">
								<p className="truncate text-sm font-medium">{userName}</p>
								<p className="text-muted-foreground text-sm">
									Your setup summary is below, and you can refine any of it later from settings.
								</p>
							</div>
						</div>
					</div>
				</CardContent>

				<CardContent className="px-2!">
					<div className="bg-background/70 space-y-3 rounded-2xl border p-4">
						<div className="space-y-1">
							<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
								Onboarding summary
							</p>
							<p className="text-sm font-medium">Everything important, at a glance.</p>
						</div>

						<div className="space-y-2">
							{summaryItems.map(item => {
								const ItemIcon = item.icon

								return (
									<div
										key={item.label}
										className="bg-background/80 flex items-start justify-between gap-3 rounded-xl border px-3 py-3"
									>
										<div className="flex min-w-0 items-start gap-3">
											<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
												<ItemIcon className="text-muted-foreground size-4" />
											</div>

											<div className="min-w-0 space-y-1 text-left">
												<div className="flex items-center gap-2">
													<p className="text-sm font-medium">{item.label}</p>
													{item.statusTone === "complete" ? (
														<CheckCircle2Icon className="text-success size-4" />
													) : null}
												</div>
												<p className="text-muted-foreground text-sm leading-5">{item.detail}</p>
											</div>
										</div>

										<Badge
											className={cn("mt-0.5", getBadgeClassName(item.statusTone))}
											variant="outline"
										>
											{item.statusLabel}
										</Badge>
									</div>
								)
							})}
						</div>
					</div>
				</CardContent>

				{showReminder ? (
					<CardContent className="px-2!">
						<Alert variant="warning">
							<HugeiconsIcon icon={InformationCircleIcon} />
							<AlertTitle>Recovery email still needs verification</AlertTitle>
							<AlertDescription>
								Don&apos;t forget to verify your recovery email from your inbox so account recovery
								is ready when you need it.
							</AlertDescription>
						</Alert>
					</CardContent>
				) : null}
			</div>

			<CardFooter
				className={cn(
					"flex items-center gap-2",
					canSnoozeReminder ? "justify-between" : "justify-end"
				)}
			>
				{canSnoozeReminder ? (
					<Button
						type="button"
						variant="outline"
						onClick={onSnooze}
						disabled={isSnoozing}
						size="sm"
					>
						{isSnoozing ? "Pausing reminders…" : "Remind me in 7 days"}
					</Button>
				) : null}

				<Button type="button" onClick={onComplete} disabled={isCompleting} size="sm">
					{isCompleting ? "Setting up…" : "Go to Dashboard"}
				</Button>
			</CardFooter>
		</>
	)
}
