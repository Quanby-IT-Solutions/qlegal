"use client"

import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckCircle2Icon, MailIcon, PhoneIcon, type LucideIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/core/components/reui/alert"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { FieldGroup } from "@/core/components/ui/field"
import { Profile } from "@/core/components/user-profile"
import { cn } from "@/core/lib/utils"

interface DoneStepProps {
	onBack: () => void
	onComplete: () => void
	isCompleting: boolean
	kycVerified: boolean
	recoveryEmailVerified: boolean
	recoveryEmailSubmitted: boolean
	recoveryEmail?: string | null
	phoneNumber?: string | null
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
	onBack,
	onComplete,
	isCompleting,
	kycVerified,
	recoveryEmailVerified,
	recoveryEmailSubmitted,
	recoveryEmail,
	phoneNumber,
	userName,
	userImage,
	onSnooze,
	isSnoozing,
}: DoneStepProps) {
	const showReminder = recoveryEmailSubmitted && !recoveryEmailVerified
	const canSnoozeReminder = showReminder && !!onSnooze
	const summaryItems: SummaryItem[] = [
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
					<FieldGroup className="bg-background/70 rounded-md border p-4">
						<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
							Setup summary
						</p>

						<div className="space-y-3">
							<div className="bg-background flex min-w-0 items-start gap-3 rounded-md border px-3 py-3">
								<Profile
									url={userImage ?? null}
									name={userName}
									size="default"
									className="shrink-0"
								/>

								<div className="min-w-0 flex-1 space-y-1 text-left">
									<div className="flex flex-wrap items-center gap-2">
										<p className="truncate text-sm font-medium">{userName}</p>
										{kycVerified ? (
											<CheckCircle2Icon className="text-success size-4 shrink-0" />
										) : null}
									</div>
									<p className="text-muted-foreground text-sm leading-5">
										{kycVerified
											? "Your identity is verified and ready for secure signing."
											: "Complete KYC soon to unlock the full signing experience."}
									</p>
								</div>

								<Badge
									className={cn(
										"mt-0.5 shrink-0",
										getBadgeClassName(kycVerified ? "complete" : "pending")
									)}
									variant="outline"
								>
									{kycVerified ? "Verified" : "Pending"}
								</Badge>
							</div>

							{summaryItems.map(item => {
								const ItemIcon = item.icon

								return (
									<div
										key={item.label}
										className="bg-background flex min-w-0 items-start gap-3 rounded-md border px-3 py-3"
									>
										<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
											<ItemIcon className="text-muted-foreground size-4" />
										</div>

										<div className="min-w-0 flex-1 space-y-1 text-left">
											<div className="flex flex-wrap items-center gap-2">
												<p className="text-sm font-medium">{item.label}</p>
												{item.statusTone === "complete" ? (
													<CheckCircle2Icon className="text-success size-4" />
												) : null}
											</div>
											<p className="text-muted-foreground text-sm leading-5 wrap-break-word">
												{item.detail}
											</p>
										</div>

										<Badge
											className={cn(
												"mt-0.5 shrink-0",
												getBadgeClassName(item.statusTone)
											)}
											variant="outline"
										>
											{item.statusLabel}
										</Badge>
									</div>
								)
							})}
						</div>
					</FieldGroup>
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

			<CardFooter className="justify-between">
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" onClick={onBack} size="sm">
						Back
					</Button>

					{canSnoozeReminder ? (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button type="button" variant="outline" disabled={isSnoozing} size="sm">
									{isSnoozing ? "Pausing reminders…" : "Remind me in 7 days"}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Pause onboarding reminders for 7 days?</AlertDialogTitle>
									<AlertDialogDescription>
										We&apos;ll stop nudging you about verifying your recovery email for the next 7
										days. You can still finish onboarding anytime from your account.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Keep reminders on</AlertDialogCancel>
									<AlertDialogAction onClick={onSnooze}>Pause for 7 days</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					) : null}
				</div>

				<Button type="button" onClick={onComplete} disabled={isCompleting} size="sm">
					{isCompleting ? "Setting up…" : "Go to Dashboard"}
				</Button>
			</CardFooter>
		</>
	)
}
