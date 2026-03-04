"use client"

import { useState } from "react"
import { ChevronLeftIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
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
		onError: (err) => toast.error(err.message),
	})

	const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

	const handleSubmit = () => {
		if (!isValidEmail) return
		submitRecoveryEmail.mutate({ recoveryEmail: email })
	}

	return (
		<div>
			<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
				Account Security
			</p>
			<h2 className="text-xl font-semibold">Add a recovery email</h2>
			<p className="text-muted-foreground mt-1.5 mb-6 text-sm leading-relaxed">
				If you ever lose access to your primary email, we&apos;ll send your password reset
				link here instead.
			</p>

			<div className="space-y-1.5">
				<Label htmlFor="recovery-email">Recovery email address</Label>
				<Input
					id="recovery-email"
					type="email"
					placeholder="e.g. yourname@gmail.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					disabled={submitRecoveryEmail.isPending || submitted}
				/>
			</div>

			{submitted && (
				<div className="mt-4 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
					<InfoIcon className="mt-0.5 size-4 shrink-0" />
					<span>
						A verification link was sent to <strong>{email}</strong>. You can continue
						setting up your profile while we wait — your recovery email will activate once
						you click the link.
					</span>
				</div>
			)}

			<div className="mt-7 flex items-center justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					<ChevronLeftIcon className="mr-1 size-4" />
					Back
				</Button>
				<Button
					onClick={handleSubmit}
					disabled={!isValidEmail || submitRecoveryEmail.isPending || submitted}
				>
					{submitRecoveryEmail.isPending ? "Sending…" : "Continue"}
				</Button>
			</div>
		</div>
	)
}
