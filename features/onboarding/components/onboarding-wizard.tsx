"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Card, CardContent } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { AddressStep } from "@/features/onboarding/components/steps/address-step"
import { DoneStep } from "@/features/onboarding/components/steps/done-step"
import { KycStep } from "@/features/onboarding/components/steps/kyc-step"
import { PhoneStep } from "@/features/onboarding/components/steps/phone-step"
import { PhotoStep } from "@/features/onboarding/components/steps/photo-step"
import { RecoveryEmailStep } from "@/features/onboarding/components/steps/recovery-email-step"
import { WelcomeStep } from "@/features/onboarding/components/steps/welcome-step"

const STEPS = [
	{ id: "kyc", label: "KYC" },
	{ id: "recovery-email", label: "Recovery Email" },
	{ id: "phone", label: "Phone" },
	{ id: "photo", label: "Photo" },
	{ id: "address", label: "Address" },
	{ id: "done", label: "Done" },
] as const

export function OnboardingWizard() {
	const router = useRouter()
	const { data: session, update: updateSession } = useSession()
	const [hasStarted, setHasStarted] = useState(false)
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
		onError: err => toast.error(err.message),
	})

	const snoozeOnboarding = trpc.onboarding.snoozeOnboarding.useMutation({
		onSuccess: async () => {
			await updateSession()
			toast.success("Onboarding reminders paused for 7 days.")
			router.push("/dashboard")
		},
		onError: err => toast.error(err.message),
	})

	const goNext = () => {
		if (currentStepIndex < STEPS.length - 1) {
			setCurrentStepIndex(i => i + 1)
		}
	}

	const goBack = () => {
		if (currentStepIndex === 0) {
			setHasStarted(false)
			return
		}

		setCurrentStepIndex(i => i - 1)
	}

	const handleComplete = () => {
		completeOnboarding.mutate()
	}

	const handleSnoozeForSevenDays = () => {
		snoozeOnboarding.mutate()
	}

	const handleGoToKyc = () => {
		router.push("/auth/kyc")
	}

	const handleStart = () => {
		setHasStarted(true)
		setCurrentStepIndex(0)
	}

	return (
		<Card className="w-full max-w-130 overflow-hidden border shadow-lg">
			{hasStarted && (
				<>
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
				</>
			)}

			<CardContent className="px-8 pt-6 pb-8">
				{/* Logo */}
				<div className="mb-6 flex items-center gap-2">
					<QuanbyLogo className="size-8" />
					<span className="text-sm font-semibold">Quanby Sign</span>
				</div>

				{!hasStarted && <WelcomeStep onNext={handleStart} />}

				{hasStarted && currentStep.id === "kyc" && (
					<KycStep
						onNext={goNext}
						onBack={goBack}
						kycStatus={session?.user?.kycStatus}
						onGoToKyc={handleGoToKyc}
					/>
				)}

				{hasStarted && currentStep.id === "recovery-email" && (
					<RecoveryEmailStep
						onNext={() => {
							setRecoveryEmailSubmitted(true)
							goNext()
						}}
						onBack={goBack}
						existingEmail={status?.recoveryEmail ?? undefined}
					/>
				)}

				{hasStarted && currentStep.id === "phone" && (
					<PhoneStep
						onNext={goNext}
						onBack={goBack}
						existingPhone={status?.phoneNumber ?? undefined}
					/>
				)}

				{hasStarted && currentStep.id === "photo" && <PhotoStep onNext={goNext} onBack={goBack} />}

				{hasStarted && currentStep.id === "address" && (
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

				{hasStarted && currentStep.id === "done" && (
					<DoneStep
						onComplete={handleComplete}
						isCompleting={completeOnboarding.isPending}
						recoveryEmailVerified={!!status?.recoveryEmailVerified}
						recoveryEmailSubmitted={recoveryEmailSubmitted}
						onRefreshStatus={() => void refetchStatus()}
					/>
				)}

				{hasStarted && currentStep.id !== "done" && (
					<button
						type="button"
						onClick={handleSnoozeForSevenDays}
						disabled={snoozeOnboarding.isPending}
						className="text-muted-foreground hover:text-foreground mt-6 w-full text-center text-xs underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50"
					>
						{snoozeOnboarding.isPending ? "Pausing reminders…" : "Skip for 7 days"}
					</button>
				)}
			</CardContent>
		</Card>
	)
}
