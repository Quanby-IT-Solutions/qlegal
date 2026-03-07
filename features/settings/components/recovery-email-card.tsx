"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Separator } from "@/core/components/ui/separator"

import { trpc } from "@/services/trpc/client"

import { RecoveryEmailModal } from "@/features/settings/components/modals/modal.recovery-email"

function maskEmail(email: string) {
	const [localPart = "", domain = ""] = email.split("@")
	if (!localPart || !domain) {
		return email
	}

	if (localPart.length <= 2) {
		return `${localPart[0] ?? ""}*...@${domain}`
	}

	const first = localPart[0]
	const last = localPart[localPart.length - 1]
	const stars = "*".repeat(Math.max(localPart.length - 2, 3))

	return `${first}${stars}${last}@${domain}`
}

export function RecoveryEmailCard() {
	const utils = trpc.useUtils()
	const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false)
	const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)

	const { data, isLoading } = trpc.settings.getRecoveryEmail.useQuery()

	const resendVerification = trpc.onboarding.submitRecoveryEmail.useMutation({
		onSuccess: result => {
			toast.success(result.message)
		},
		onError: err => {
			toast.error(err.message)
		},
	})

	const removeRecoveryEmail = trpc.settings.removeRecoveryEmail.useMutation({
		onSuccess: async result => {
			toast.success(result.message)
			setIsRemoveDialogOpen(false)
			await utils.settings.getRecoveryEmail.invalidate()
		},
		onError: err => {
			toast.error(err.message)
		},
	})

	const recoveryEmail = data?.recoveryEmail ?? null
	const isVerified = Boolean(data?.recoveryEmailVerified)
	const hasRecoveryEmail = Boolean(recoveryEmail)
	const maskedRecoveryEmail = recoveryEmail ? maskEmail(recoveryEmail) : ""

	const handleResendVerification = () => {
		if (!recoveryEmail) {
			toast.error("No recovery email set.")
			return
		}

		resendVerification.mutate({ recoveryEmail })
	}

	const handleRemove = () => {
		removeRecoveryEmail.mutate()
	}

	return (
		<>
			<Card className="border-border/60 bg-card/80 dark:bg-card/70 border shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md">
				<CardHeader className="px-8 pt-4">
					<CardTitle className="flex items-center gap-2 text-lg font-medium">
						Recovery Email
					</CardTitle>
					<CardDescription>
						Used as a fallback when you cannot access your primary email for password resets.
					</CardDescription>
				</CardHeader>

				<CardContent className="px-8">
					{isLoading ? (
						<div className="text-muted-foreground text-sm">Loading recovery email settings...</div>
					) : !hasRecoveryEmail ? (
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="text-sm font-medium">No recovery email set</div>
							<Button onClick={() => setIsRecoveryModalOpen(true)}>Add recovery email</Button>
						</div>
					) : (
						<>
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">{maskedRecoveryEmail}</span>
									<Badge
										variant="outline"
										className={
											isVerified
												? "border-emerald-200 bg-emerald-50 text-emerald-700"
												: "border-amber-200 bg-amber-50 text-amber-700"
										}
									>
										{isVerified ? "Verified" : "Unverified"}
									</Badge>
								</div>

								<div className="flex items-center gap-2">
									<Button variant="outline" onClick={() => setIsRecoveryModalOpen(true)}>
										{isVerified ? "Change" : "Edit"}
									</Button>
									<Button variant="destructive" onClick={() => setIsRemoveDialogOpen(true)}>
										Remove
									</Button>
								</div>
							</div>

							{!isVerified && (
								<>
									<Separator className="my-4" />
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<p className="text-muted-foreground text-sm">
											Please verify your recovery email to use it for password reset fallback.
										</p>
										<Button
											variant="link"
											className="h-auto p-0"
											onClick={handleResendVerification}
											disabled={resendVerification.isPending}
										>
											{resendVerification.isPending ? "Sending..." : "Resend verification"}
										</Button>
									</div>
								</>
							)}
						</>
					)}
				</CardContent>
			</Card>

			<RecoveryEmailModal
				open={isRecoveryModalOpen}
				onOpenChange={setIsRecoveryModalOpen}
				initialRecoveryEmail={recoveryEmail}
			/>

			<AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove recovery email?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove your recovery email? You will not be able to use
							account recovery if you lose access to your primary email.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={removeRecoveryEmail.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemove}
							disabled={removeRecoveryEmail.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{removeRecoveryEmail.isPending ? "Removing..." : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
