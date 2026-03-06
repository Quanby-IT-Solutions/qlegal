"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { defineStepper } from "@/core/components/ui/stepper"

import { trpc } from "@/services/trpc/client"

import { DoneStep } from "@/features/onboarding/components/steps/done-step"
import { KycStep } from "@/features/onboarding/components/steps/kyc-step"
import { PhoneStep } from "@/features/onboarding/components/steps/phone-step"
import { PhotoStep } from "@/features/onboarding/components/steps/photo-step"
import { RecoveryEmailStep } from "@/features/onboarding/components/steps/recovery-email-step"

const { useStepper, steps, StepperProvider, StepperNavigation, StepperStep, StepperTitle } =
	defineStepper(
		{ id: "kyc", title: "KYC", description: "Identity verification" },
		{ id: "recovery-email", title: "Recovery Email", description: "Account recovery" },
		{ id: "phone", title: "Phone", description: "Contact details" },
		{ id: "photo", title: "Photo", description: "Profile image" },
		{ id: "done", title: "Done", description: "Finish onboarding" }
	)

interface OnboardingWizardContentProps {
	onRestartWelcome: () => void
}

export function OnboardingWizardContent({ onRestartWelcome }: OnboardingWizardContentProps) {
	const router = useRouter()
	const { data: session, update: updateSession } = useSession()
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
	const handleComplete = () => completeOnboarding.mutate()
	const handleSnoozeForSevenDays = () => snoozeOnboarding.mutate()
	const handleGoToKyc = () => router.push("/auth/kyc")

	const methods = useStepper()
	const currentIndex = steps.findIndex(step => step.id === methods.current.id)
	const currentStep = steps[currentIndex]

	const getCurrentStepContent = () => {
		switch (methods.current.id) {
			case "kyc":
				return {
					title: "Identity verification (KYC)",
					description:
						session?.user?.kycStatus === "VERIFIED"
							? "KYC is required before using the platform. Great news — you're verified."
							: "KYC is required before using the platform. You still need to complete verification.",
				}
			case "recovery-email":
				return {
					title: "Add a recovery email",
					description:
						"If you ever lose access to your primary email, we'll send your password reset link here instead.",
				}
			case "phone":
				return {
					title: "Add your phone number",
					description: "We may use this to contact you about important account updates.",
				}
			case "photo":
				return {
					title: "Add a profile photo",
					description:
						"Help others recognise you. You can always change this later from your profile settings.",
				}
			case "done":
				return {
					title: "You're all set!",
					description:
						"Your account is ready. You can update any of this information later from your profile and settings. Recovery email is optional.",
				}
			default:
				return {
					title: currentStep?.title ?? "Onboarding",
					description: currentStep?.description ?? "Complete your setup.",
				}
		}
	}

	const { title: currentTitle, description: currentDescription } = getCurrentStepContent()

	const handleBack = () => {
		if (methods.isFirst) {
			onRestartWelcome()
			return
		}
		methods.prev()
	}

	const handleNext = () => {
		if (!methods.isLast) methods.next()
	}

	return (
		<StepperProvider variant="horizontal" className="space-y-4">
			<CardHeader className="text-center">
				<div className="mb-2 flex justify-center">
					<QuanbyLogo className="size-14" />
				</div>
				<CardTitle>{currentTitle}</CardTitle>
				<CardDescription>{currentDescription}</CardDescription>
			</CardHeader>

			<CardContent>
				<StepperNavigation>
					{steps.map((step, index) => (
						<StepperStep key={step.id} of={step.id} disabled={index > currentIndex}>
							<StepperTitle>{step.title}</StepperTitle>
						</StepperStep>
					))}
				</StepperNavigation>
			</CardContent>

			{methods.current.id === "kyc" && (
				<KycStep
					onNext={handleNext}
					onBack={handleBack}
					kycStatus={session?.user?.kycStatus ?? undefined}
					onGoToKyc={handleGoToKyc}
				/>
			)}

			{methods.current.id === "recovery-email" && (
				<RecoveryEmailStep
					onNext={() => {
						setRecoveryEmailSubmitted(true)
						handleNext()
					}}
					onBack={handleBack}
					existingEmail={status?.recoveryEmail ?? undefined}
				/>
			)}

			{methods.current.id === "phone" && (
				<PhoneStep
					onNext={handleNext}
					onBack={handleBack}
					existingPhone={status?.phoneNumber ?? undefined}
				/>
			)}

			{methods.current.id === "photo" && <PhotoStep onNext={handleNext} onBack={handleBack} />}

			{methods.current.id === "done" && (
				<DoneStep
					onComplete={handleComplete}
					isCompleting={completeOnboarding.isPending}
					recoveryEmailVerified={!!status?.recoveryEmailVerified}
					recoveryEmailSubmitted={recoveryEmailSubmitted}
					onRefreshStatus={() => void refetchStatus()}
					onSnooze={handleSnoozeForSevenDays}
					isSnoozing={snoozeOnboarding.isPending}
				/>
			)}
		</StepperProvider>
	)
}
