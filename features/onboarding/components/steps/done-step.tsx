"use client"

import { useMemo } from "react"
import { CircleCheck, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
	ArrowLeftIcon,
	CameraIcon,
	CheckCircle2Icon,
	MailIcon,
	PhoneIcon,
	ShieldCheckIcon,
	type LucideIcon,
} from "lucide-react"

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
	onBack,
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
	const completedItemsCount = useMemo(
		() =>
			[kycVerified, recoveryEmailVerified, !!phoneNumber, hasProfilePhoto].filter(Boolean).length,
		[hasProfilePhoto, kycVerified, phoneNumber, recoveryEmailVerified]
	)
	const optionalItemsCount = useMemo(
		() => [!recoveryEmailSubmitted, !phoneNumber, !hasProfilePhoto].filter(Boolean).length,
		[hasProfilePhoto, phoneNumber, recoveryEmailSubmitted]
	)
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
					<div className="grid gap-4 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:items-start">
						<div className="from-success/10 via-background to-background space-y-4 rounded-2xl border bg-linear-to-br p-5">
							<div className="flex items-start gap-4 md:gap-3">
								<div className="bg-success/10 text-success flex size-12 shrink-0 items-center justify-center rounded-2xl border border-current/15 md:size-11">
									<HugeiconsIcon icon={CircleCheck} className="size-6 md:size-5" />
								</div>

								<div className="space-y-1.5 md:space-y-1">
									<p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
										Ready to go
									</p>
									<h3 className="text-lg font-semibold tracking-tight md:text-xl">
										Your Quanby account is set up
									</h3>
									<p className="text-muted-foreground text-sm leading-6">
										You&apos;re ready to start signing, reviewing, and managing documents with a
										clean, secure profile.
									</p>
									<div className="flex flex-wrap items-center gap-2 pt-1">
										<Badge
											variant="outline"
											className="border-success/25 bg-success/8 text-success"
										>
											{completedItemsCount}/4 completed
										</Badge>
										{optionalItemsCount > 0 ? (
											<Badge variant="outline" className="bg-background/70 text-muted-foreground">
												{optionalItemsCount} optional item{optionalItemsCount > 1 ? "s" : ""}
											</Badge>
										) : (
											<Badge variant="outline" className="bg-background/70 text-muted-foreground">
												Everything essential is in place
											</Badge>
										)}
									</div>
								</div>
							</div>

							<div className="bg-background/80 flex items-center gap-3 rounded-xl border px-3 py-3">
								<Profile url={userImage ?? null} name={userName} size="lg" />
								<div className="min-w-0 space-y-1 text-left">
									<p className="truncate text-sm font-medium">{userName}</p>
									<p className="text-muted-foreground text-sm leading-5">
										Your setup summary is below, and you can refine any of it later from settings.
									</p>
								</div>
							</div>
						</div>

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
											className="bg-background/80 flex min-w-0 flex-col gap-3 rounded-xl border px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
										>
											<div className="flex min-w-0 items-start gap-3">
												<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border">
													<ItemIcon className="text-muted-foreground size-4" />
												</div>

												<div className="min-w-0 space-y-1 text-left">
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
											</div>

											<Badge
												className={cn(
													"shrink-0 self-start sm:mt-0.5 sm:self-center",
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
					"flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between",
					!canSnoozeReminder && "sm:justify-between"
				)}
			>
				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
					<Button type="button" variant="ghost" onClick={onBack} size="sm">
						<ArrowLeftIcon className="size-4" />
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

				<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
					<Button type="button" onClick={onComplete} disabled={isCompleting} size="sm">
						{isCompleting ? "Setting up…" : "Go to Dashboard"}
					</Button>
				</div>
			</CardFooter>
		</>
	)
}
