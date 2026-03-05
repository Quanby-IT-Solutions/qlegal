"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { defineStepper } from "@/core/components/ui/stepper"

import { trpc } from "@/services/trpc/client"

import { AddressStep } from "@/features/onboarding/components/steps/address-step"
import { DoneStep } from "@/features/onboarding/components/steps/done-step"
import { KycStep } from "@/features/onboarding/components/steps/kyc-step"
import { PhoneStep } from "@/features/onboarding/components/steps/phone-step"
import { PhotoStep } from "@/features/onboarding/components/steps/photo-step"
import { RecoveryEmailStep } from "@/features/onboarding/components/steps/recovery-email-step"
import { WelcomeStep } from "@/features/onboarding/components/steps/welcome-step"

const { useStepper, steps, StepperProvider, StepperNavigation, StepperStep, StepperTitle } =
	defineStepper(
		{ id: "kyc", title: "KYC", description: "Identity verification" },
		{ id: "recovery-email", title: "Recovery Email", description: "Account recovery" },
		{ id: "phone", title: "Phone", description: "Contact details" },
		{ id: "photo", title: "Photo", description: "Profile image" },
		{ id: "address", title: "Address", description: "Home details" },
		{ id: "done", title: "Done", description: "Finish onboarding" }
	)

export function OnboardingWizard() {
	const router = useRouter()
	const { data: session, update: updateSession } = useSession()
	const [hasStarted, setHasStarted] = useState(false)
	const [recoveryEmailSubmitted, setRecoveryEmailSubmitted] = useState(false)

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
	}

	return (
		<Card className="w-full max-w-xl overflow-hidden border shadow-lg">
			<CardHeader className="text-center">
				<div className="mb-2 flex justify-center">
					<QuanbyLogo className="size-14" />
				</div>
				<CardTitle className="text-2xl">Account Onboarding</CardTitle>
				<CardDescription>
					Complete your profile setup to unlock the full Quanby Sign experience.
				</CardDescription>
			</CardHeader>

			{!hasStarted ? (
				<CardContent className="pb-8">
					<WelcomeStep onNext={handleStart} />
				</CardContent>
			) : (
				<StepperProvider variant="horizontal" className="space-y-6 px-4 pb-8 sm:px-6">
					<OnboardingWizardContent
						sessionKycStatus={session?.user?.kycStatus}
						recoveryEmail={status?.recoveryEmail ?? undefined}
						phoneNumber={status?.phoneNumber ?? undefined}
						homeStreet={status?.homeStreet ?? undefined}
						barangay={status?.barangay ?? undefined}
						cityProvince={status?.cityProvince ?? undefined}
						recoveryEmailVerified={!!status?.recoveryEmailVerified}
						recoveryEmailSubmitted={recoveryEmailSubmitted}
						onRecoveryEmailSubmitted={() => setRecoveryEmailSubmitted(true)}
						onRestartWelcome={() => setHasStarted(false)}
						onGoToKyc={handleGoToKyc}
						onComplete={handleComplete}
						isCompleting={completeOnboarding.isPending}
						onRefreshStatus={() => void refetchStatus()}
						onSnooze={handleSnoozeForSevenDays}
						isSnoozing={snoozeOnboarding.isPending}
					/>
				</StepperProvider>
			)}
		</Card>
	)
}

interface OnboardingWizardContentProps {
	sessionKycStatus?: string
	recoveryEmail?: string
	phoneNumber?: string
	homeStreet?: string
	barangay?: string
	cityProvince?: string
	recoveryEmailVerified: boolean
	recoveryEmailSubmitted: boolean
	onRecoveryEmailSubmitted: () => void
	onRestartWelcome: () => void
	onGoToKyc: () => void
	onComplete: () => void
	isCompleting: boolean
	onRefreshStatus: () => void
	onSnooze: () => void
	isSnoozing: boolean
}

function OnboardingWizardContent({
	sessionKycStatus,
	recoveryEmail,
	phoneNumber,
	homeStreet,
	barangay,
	cityProvince,
	recoveryEmailVerified,
	recoveryEmailSubmitted,
	onRecoveryEmailSubmitted,
	onRestartWelcome,
	onGoToKyc,
	onComplete,
	isCompleting,
	onRefreshStatus,
	onSnooze,
	isSnoozing,
}: OnboardingWizardContentProps) {
	const methods = useStepper()
	const currentIndex = steps.findIndex(step => step.id === methods.current.id)

	const handleBack = () => {
		if (methods.isFirst) {
			onRestartWelcome()
			return
		}

		methods.prev()
	}

	const handleNext = () => {
		if (!methods.isLast) {
			methods.next()
		}
	}

	return (
		<>
			<StepperNavigation>
				{steps.map((step, index) => (
					<StepperStep key={step.id} of={step.id} disabled={index > currentIndex}>
						<StepperTitle>{step.title}</StepperTitle>
					</StepperStep>
				))}
			</StepperNavigation>

			<CardContent>
				{methods.current.id === "kyc" && (
					<KycStep
						onNext={handleNext}
						onBack={handleBack}
						kycStatus={sessionKycStatus ?? undefined}
						onGoToKyc={onGoToKyc}
					/>
				)}

				{methods.current.id === "recovery-email" && (
					<RecoveryEmailStep
						onNext={() => {
							onRecoveryEmailSubmitted()
							handleNext()
						}}
						onBack={handleBack}
						existingEmail={recoveryEmail}
					/>
				)}

				{methods.current.id === "phone" && (
					<PhoneStep onNext={handleNext} onBack={handleBack} existingPhone={phoneNumber} />
				)}

				{methods.current.id === "photo" && <PhotoStep onNext={handleNext} onBack={handleBack} />}

				{methods.current.id === "address" && (
					<AddressStep
						onNext={handleNext}
						onBack={handleBack}
						existingAddress={{
							homeStreet,
							barangay,
							cityProvince,
						}}
					/>
				)}

				{methods.current.id === "done" && (
					<DoneStep
						onComplete={onComplete}
						isCompleting={isCompleting}
						recoveryEmailVerified={recoveryEmailVerified}
						recoveryEmailSubmitted={recoveryEmailSubmitted}
						onRefreshStatus={onRefreshStatus}
					/>
				)}

				{methods.current.id !== "done" && (
					<button
						type="button"
						onClick={onSnooze}
						disabled={isSnoozing}
						className="text-muted-foreground hover:text-foreground mt-6 w-full text-center text-xs underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50"
					>
						{isSnoozing ? "Pausing reminders…" : "Skip for 7 days"}
					</button>
				)}
			</CardContent>
		</>
	)
}
