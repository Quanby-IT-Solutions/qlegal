"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Form } from "@/core/components/ui/form"
import { defineStepper } from "@/core/components/ui/stepper"

import { trpc } from "@/services/trpc/client"

import {
	onboardingWizardSchema,
	type OnboardingWizardSchema,
} from "@/features/onboarding/api/onboarding.schemas"
import { DoneStep } from "@/features/onboarding/components/steps/done-step"
import { KycStep } from "@/features/onboarding/components/steps/kyc-step"
import { PhoneStep } from "@/features/onboarding/components/steps/phone-step"
import { PhotoStep } from "@/features/onboarding/components/steps/photo-step"
import { RecoveryEmailStep } from "@/features/onboarding/components/steps/recovery-email-step"

const { useStepper, steps, StepperProvider, StepperNavigation, StepperStep, StepperTitle } =
	defineStepper(
		{ id: "kyc", title: "KYC", description: "Identity verification" },
		{ id: "recovery-email", title: "Recovery", description: "Account recovery" },
		{ id: "phone", title: "Phone", description: "Contact details" },
		{ id: "photo", title: "Photo", description: "Profile image" },
		{ id: "done", title: "Summary", description: "Review your setup" }
	)

interface OnboardingWizardContentProps {
	onRestartWelcome: () => void
	onExpandChange?: (expanded: boolean) => void
}

export function OnboardingWizardContent({
	onRestartWelcome,
	onExpandChange,
}: OnboardingWizardContentProps) {
	return (
		<StepperProvider variant="horizontal" className="space-y-4">
			<OnboardingWizardContentBody
				onRestartWelcome={onRestartWelcome}
				onExpandChange={onExpandChange}
			/>
		</StepperProvider>
	)
}

function OnboardingWizardContentBody({
	onRestartWelcome,
	onExpandChange,
}: OnboardingWizardContentProps) {
	const router = useRouter()
	const { data: session, update: updateSession } = useSession()
	const utils = trpc.useUtils()
	const [recoveryEmailSubmittedInSession, setRecoveryEmailSubmittedInSession] = useState(false)
	const { data: status } = trpc.onboarding.getStatus.useQuery()
	const form = useForm<OnboardingWizardSchema>({
		resolver: zodResolver(onboardingWizardSchema),
		values: {
			recoveryEmail: status?.recoveryEmail ?? "",
			phoneNumber: status?.phoneNumber ?? "",
		},
	})
	const submitRecoveryEmail = trpc.onboarding.submitRecoveryEmail.useMutation({
		onSuccess: () => void utils.onboarding.getStatus.invalidate(),
	})
	const updateProfile = trpc.onboarding.updateProfile.useMutation({
		onSuccess: () => void utils.onboarding.getStatus.invalidate(),
	})
	const updateAvatar = trpc.onboarding.updateAvatar.useMutation({
		onSuccess: () => void utils.onboarding.getStatus.invalidate(),
	})
	const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation({
		onSuccess: async () => {
			void utils.onboarding.getStatus.invalidate()
			await updateSession()
			toast.success("Welcome aboard! Redirecting to your dashboard…")
			router.push("/dashboard")
		},
		onError: err => toast.error(err.message),
	})
	const snoozeOnboarding = trpc.onboarding.snoozeOnboarding.useMutation({
		onSuccess: async () => {
			void utils.onboarding.getStatus.invalidate()
			await updateSession()
			toast.success("Onboarding reminders paused for 7 days.")
			router.push("/dashboard")
		},
		onError: err => toast.error(err.message),
	})
	const handleComplete = () => completeOnboarding.mutate()
	const handleSnoozeForSevenDays = () => snoozeOnboarding.mutate()

	const RECOVERY_EMAIL_COOLDOWN_SECONDS = 90
	const [cooldownEndTime, setCooldownEndTime] = useState<number | null>(null)
	const [cooldownRemaining, setCooldownRemaining] = useState(0)
	const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	useEffect(() => {
		if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)

		if (!cooldownEndTime) {
			setCooldownRemaining(0)
			return
		}

		const tick = () => {
			const remaining = Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000))
			setCooldownRemaining(remaining)
			if (remaining <= 0) {
				setCooldownEndTime(null)
			}
		}

		tick()
		cooldownIntervalRef.current = setInterval(tick, 1000)
		return () => {
			if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current)
		}
	}, [cooldownEndTime])

	const startCooldown = useCallback(() => {
		setCooldownEndTime(Date.now() + RECOVERY_EMAIL_COOLDOWN_SECONDS * 1000)
	}, [])

	const methods = useStepper()
	const currentStepId = methods.current.id
	const currentIndex = steps.findIndex(step => step.id === methods.current.id)
	const currentStep = steps[currentIndex]
	const hasPendingRecoveryEmail = !!status?.recoveryEmail && !status?.recoveryEmailVerified
	const recoveryEmailSubmitted = recoveryEmailSubmittedInSession || hasPendingRecoveryEmail
	const isKycVerified = session?.user?.kycStatus === "VERIFIED"
	const hasPhoneNumber = !!status?.phoneNumber?.trim()

	useEffect(() => {
		if (currentStepId !== "kyc") {
			// KYC step manages its own expansion via onExpandChange prop
			onExpandChange?.(false)
		}
	}, [currentStepId, onExpandChange])

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
					title: "Review your setup",
					description:
						"Everything looks good. Here’s a quick summary before you head to your dashboard.",
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

	const handleRecoveryEmailContinue = async () => {
		const isValid = await form.trigger("recoveryEmail")

		if (!isValid) return

		const recoveryEmail = form.getValues("recoveryEmail").trim()

		if (!recoveryEmail) {
			handleNext()
			return
		}

		const isVerifiedAndUnchanged =
			recoveryEmail === (status?.recoveryEmail ?? "") && !!status?.recoveryEmailVerified

		if (isVerifiedAndUnchanged) {
			handleNext()
			return
		}

		const unchanged = recoveryEmail === (status?.recoveryEmail ?? "") && hasPendingRecoveryEmail

		if (unchanged) {
			try {
				const result = await submitRecoveryEmail.mutateAsync({ recoveryEmail })
				setRecoveryEmailSubmittedInSession(true)
				toast.success(result.message)
				startCooldown()
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to resend verification.")
			}
			return
		}

		try {
			const result = await submitRecoveryEmail.mutateAsync({ recoveryEmail })
			setRecoveryEmailSubmittedInSession(true)
			toast.success(result.message)
			startCooldown()
			handleNext()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save recovery email.")
		}
	}

	const handlePhoneContinue = async () => {
		const isValid = await form.trigger("phoneNumber")

		if (!isValid) return

		const phoneNumber = form.getValues("phoneNumber").trim()

		if (!phoneNumber) {
			handleNext()
			return
		}

		if (phoneNumber === (status?.phoneNumber ?? "")) {
			handleNext()
			return
		}

		try {
			const result = await updateProfile.mutateAsync({ phoneNumber })
			toast.success(result.message)
			handleNext()
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save phone number.")
		}
	}

	const handlePhotoSave = async (imagePath: string) => {
		await updateAvatar.mutateAsync({ imagePath })
	}

	const handleCurrentStepSubmit = async () => {
		if (methods.current.id === "recovery-email") {
			await handleRecoveryEmailContinue()
			return
		}

		if (methods.current.id === "photo") {
			handleNext()
			return
		}

		if (methods.current.id === "phone") await handlePhoneContinue()
	}

	return (
		<Form {...form}>
			<form
				onSubmit={event => {
					event.preventDefault()
					void handleCurrentStepSubmit()
				}}
				className="space-y-4"
			>
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
						onExpandChange={onExpandChange}
					/>
				)}

				{methods.current.id === "recovery-email" && (
					<RecoveryEmailStep
						control={form.control}
						onBack={handleBack}
						onSkip={handleNext}
						isSubmitting={submitRecoveryEmail.isPending}
						hasPendingRecoveryEmail={hasPendingRecoveryEmail}
						cooldownRemaining={cooldownRemaining}
					/>
				)}

				{methods.current.id === "phone" && (
					<PhoneStep
						control={form.control}
						onBack={handleBack}
						onSkip={handleNext}
						isSubmitting={updateProfile.isPending}
					/>
				)}

				{methods.current.id === "photo" && (
					<PhotoStep
						onNext={handleNext}
						onBack={handleBack}
						onSaveImagePath={handlePhotoSave}
						isSaving={updateAvatar.isPending}
					/>
				)}

				{methods.current.id === "done" && (
					<DoneStep
						onBack={handleBack}
						onComplete={handleComplete}
						isCompleting={completeOnboarding.isPending}
						kycVerified={isKycVerified}
						recoveryEmailVerified={!!status?.recoveryEmailVerified}
						recoveryEmailSubmitted={recoveryEmailSubmitted}
						recoveryEmail={status?.recoveryEmail}
						phoneNumber={hasPhoneNumber ? status?.phoneNumber : undefined}
						userName={session?.user?.name ?? "Your profile"}
						userImage={session?.user?.image}
						onSnooze={handleSnoozeForSevenDays}
						isSnoozing={snoozeOnboarding.isPending}
					/>
				)}
			</form>
		</Form>
	)
}
