"use client"

import { useState } from "react"
import { InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { CardContent, CardFooter } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { trpc } from "@/services/trpc/client"

interface RecoveryEmailStepProps {
	onNext: () => void
	onBack: () => void
	existingEmail?: string
}

export function RecoveryEmailStep({ onNext, onBack, existingEmail }: RecoveryEmailStepProps) {
	const [email, setEmail] = useState(existingEmail ?? "")
	const [submitted, setSubmitted] = useState(false)

	const submitRecoveryEmail = trpc.onboarding.submitRecoveryEmail.useMutation({
		onSuccess: () => {
			setSubmitted(true)
			// Auto-advance after a brief delay so the user sees the banner
			setTimeout(() => {
				onNext()
			}, 1500)
		},
		onError: err => toast.error(err.message),
	})

	const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

	const handleContinue = () => {
		if (!email.trim()) {
			onNext()
			return
		}

		if (!isValidEmail) {
			onNext()
			return
		}

		submitRecoveryEmail.mutate({ recoveryEmail: email })
	}

	return (
		<>
			<CardContent className="px-2!">
				<form>
					<div className="bg-background/70 rounded-md border p-4">
						<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
							Account Security
						</p>

						<div className="space-y-1.5">
							<Label htmlFor="recovery-email">Recovery email address</Label>
							<Input
								id="recovery-email"
								type="email"
								placeholder="e.g. yourname@gmail.com"
								value={email}
								onChange={e => setEmail(e.target.value)}
								disabled={submitRecoveryEmail.isPending || submitted}
							/>
						</div>

						{submitted && (
							<div className="mt-4 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
								<InfoIcon className="mt-0.5 size-4 shrink-0" />
								<span>
									A verification link was sent to <strong>{email}</strong>. You can continue setting
									up your profile while we wait — your recovery email will activate once you click
									the link.
								</span>
							</div>
						)}
					</div>
				</form>
			</CardContent>

			<CardFooter className="justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onNext}>
					Skip for now
				</Button>
				<div className="flex items-center gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onBack}>
						Back
					</Button>
					<Button
						onClick={handleContinue}
						disabled={submitRecoveryEmail.isPending || submitted}
						size="sm"
					>
						{submitRecoveryEmail.isPending ? "Sending…" : "Continue"}
					</Button>
				</div>
			</CardFooter>
		</>
	)
}
