"use client"

import { useState } from "react"
import { ChevronLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

import { trpc } from "@/services/trpc/client"

interface AddressStepProps {
	onNext: () => void
	onBack: () => void
	existingAddress?: {
		homeStreet?: string
		barangay?: string
		cityProvince?: string
	}
}

export function AddressStep({ onNext, onBack, existingAddress }: AddressStepProps) {
	const [homeStreet, setHomeStreet] = useState(existingAddress?.homeStreet ?? "")
	const [barangay, setBarangay] = useState(existingAddress?.barangay ?? "")
	const [cityProvince, setCityProvince] = useState(existingAddress?.cityProvince ?? "")

	const updateProfile = trpc.onboarding.updateProfile.useMutation({
		onSuccess: () => {
			toast.success("Address saved!")
			onNext()
		},
		onError: (err) => toast.error(err.message),
	})

	const hasAnyField = homeStreet.trim() || barangay.trim() || cityProvince.trim()

	const handleContinue = () => {
		if (!hasAnyField) return
		updateProfile.mutate({ homeStreet, barangay, cityProvince })
	}

	return (
		<div>
			<p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wider uppercase">
				Profile
			</p>
			<h2 className="text-xl font-semibold">Add your address</h2>
			<p className="text-muted-foreground mt-1.5 mb-6 text-sm leading-relaxed">
				Your address may be needed for document signing and delivery purposes.
			</p>

			<div className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="home-street">Street address</Label>
					<Input
						id="home-street"
						placeholder="e.g. 123 Mabini Street"
						value={homeStreet}
						onChange={(e) => setHomeStreet(e.target.value)}
						disabled={updateProfile.isPending}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="barangay">Barangay</Label>
					<Input
						id="barangay"
						placeholder="e.g. Barangay San Antonio"
						value={barangay}
						onChange={(e) => setBarangay(e.target.value)}
						disabled={updateProfile.isPending}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="city-province">City & Province</Label>
					<Input
						id="city-province"
						placeholder="e.g. Makati City, Metro Manila"
						value={cityProvince}
						onChange={(e) => setCityProvince(e.target.value)}
						disabled={updateProfile.isPending}
					/>
				</div>
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
						disabled={!hasAnyField || updateProfile.isPending}
					>
						{updateProfile.isPending ? "Saving…" : "Continue"}
					</Button>
				</div>
			</div>
		</div>
	)
}
