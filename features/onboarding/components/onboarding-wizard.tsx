"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Card, CardContent } from "@/core/components/ui/card"
import { QuanbyLogo } from "@/core/components/quanby-logo"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { WelcomeStep } from "@/features/onboarding/components/steps/welcome-step"
import { RecoveryEmailStep } from "@/features/onboarding/components/steps/recovery-email-step"
import { PhoneStep } from "@/features/onboarding/components/steps/phone-step"
import { PhotoStep } from "@/features/onboarding/components/steps/photo-step"
import { AddressStep } from "@/features/onboarding/components/steps/address-step"
import { DoneStep } from "@/features/onboarding/components/steps/done-step"

const STEPS = [
	{ id: "welcome", label: "Welcome" },
	{ id: "recovery-email", label: "Recovery Email" },
	{ id: "phone", label: "Phone" },
	{ id: "photo", label: "Photo" },
	{ id: "address", label: "Address" },
	{ id: "done", label: "Done" },
] as const

export function OnboardingWizard() {
	const router = useRouter()
	const { update: updateSession } = useSession()
	const [currentStepIndex, setCurrentStepIndex] = useState(0)
	const [recoveryEmailSubmitted, setRecoveryEmailSubmitted] = useState(false)

	const currentStep = STEPS[currentStepIndex]!

	const { data: status, refetch: refetchStatus } = trpc.onboarding.getStatus.useQuery()

	const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation({
		onSuccess: async () => {
			await updateSession()
			toast.success("Welcome aboard! Redirecting to your dashboard…")
			router.push("/dashboard")
		},
		onError: (err) => toast.error(err.message),
	})

	const goNext = () => {
		if (currentStepIndex < STEPS.length - 1) {
			setCurrentStepIndex((i) => i + 1)
		}
	}

	const goBack = () => {
		if (currentStepIndex > 0) {
			setCurrentStepIndex((i) => i - 1)
		}
	}

	const handleComplete = () => {
		completeOnboarding.mutate()
	}

	return (
		<Card className="w-full max-w-[520px] overflow-hidden border shadow-lg">
			{/* Progress Bar */}
			<div className="px-8 pt-5">
				<p className="text-muted-foreground mb-2 text-xs">
					Step {currentStepIndex + 1} of {STEPS.length}
				</p>
				<div className="flex gap-1.5">
					{STEPS.map((step, index) => (
						<div
							key={step.id}
							className={cn(
								"h-1 flex-1 rounded-full transition-all duration-300",
								index < currentStepIndex
									? "bg-primary/60"
									: index === currentStepIndex
										? "bg-primary"
										: "bg-muted"
							)}
						/>
					))}
				</div>
			</div>

			<CardContent className="px-8 pt-6 pb-8">
				{/* Logo */}
				<div className="mb-6 flex items-center gap-2">
					<QuanbyLogo className="size-8" />
					<span className="text-sm font-semibold">Quanby Sign</span>
				</div>

				{/* Step Content */}
				{currentStep.id === "welcome" && <WelcomeStep onNext={goNext} />}

				{currentStep.id === "recovery-email" && (
					<RecoveryEmailStep
						onNext={() => {
							setRecoveryEmailSubmitted(true)
							goNext()
						}}
						onBack={goBack}
						existingEmail={status?.recoveryEmail ?? undefined}
					/>
				)}

				{currentStep.id === "phone" && (
					<PhoneStep
						onNext={goNext}
						onBack={goBack}
						existingPhone={status?.phoneNumber ?? undefined}
					/>
				)}

				{currentStep.id === "photo" && (
					<PhotoStep
						onNext={goNext}
						onBack={goBack}
					/>
				)}

				{currentStep.id === "address" && (
					<AddressStep
						onNext={goNext}
						onBack={goBack}
						existingAddress={{
							homeStreet: status?.homeStreet ?? undefined,
							barangay: status?.barangay ?? undefined,
							cityProvince: status?.cityProvince ?? undefined,
						}}
					/>
				)}

				{currentStep.id === "done" && (
					<DoneStep
						onComplete={handleComplete}
						isCompleting={completeOnboarding.isPending}
						recoveryEmailVerified={!!status?.recoveryEmailVerified}
						recoveryEmailSubmitted={recoveryEmailSubmitted}
						onRefreshStatus={() => void refetchStatus()}
					/>
				)}
			</CardContent>
		</Card>
	)
}
