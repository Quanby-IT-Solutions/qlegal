"use client"

import { useState } from "react"
import { ChevronLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { trpc } from "@/services/trpc/client"

interface PhoneStepProps {
	onNext: () => void
	onBack: () => void
	existingPhone?: string
}

export function PhoneStep({ onNext, onBack, existingPhone }: PhoneStepProps) {
	const [phone, setPhone] = useState(existingPhone ?? "")

	const updateProfile = trpc.onboarding.updateProfile.useMutation({
		onSuccess: () => {
			toast.success("Phone number saved!")
			onNext()
		},
		onError: (err) => toast.error(err.message),
	})

	const handleContinue = () => {
		if (!phone.trim()) return
		updateProfile.mutate({ phoneNumber: phone })
	}

	return (
		<div>
			<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
				Profile
			</p>
			<h2 className="text-xl font-semibold">Add your phone number</h2>
			<p className="text-muted-foreground mt-1.5 mb-6 text-sm leading-relaxed">
				We may use this to contact you about important account updates.
			</p>

			<div className="space-y-1.5">
				<Label htmlFor="phone-number">Phone number</Label>
				<Input
					id="phone-number"
					type="tel"
					placeholder="e.g. +63 912 345 6789"
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
					disabled={updateProfile.isPending}
				/>
			</div>

			<div className="mt-7 flex items-center justify-between">
				<Button type="button" variant="ghost" size="sm" onClick={onBack}>
					<ChevronLeftIcon className="mr-1 size-4" />
					Back
				</Button>
				<div className="flex items-center gap-4">
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
						onClick={onNext}
					>
						Skip for now
					</button>
					<Button
						onClick={handleContinue}
						disabled={!phone.trim() || updateProfile.isPending}
					>
						{updateProfile.isPending ? "Saving…" : "Continue"}
					</Button>
				</div>
			</div>
		</div>
	)
}
