"use client"

import { type Route } from "next"
import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import { Form } from "@/core/components/ui/form"
import { defineStepper } from "@/core/components/ui/stepper"

import { trpc } from "@/services/trpc/client"

import { lawyerRegisterSchema, type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"
import { FormResponse } from "@/features/auth/components/ui/form-response"

import { AccountInfoStep } from "./account-info-step"
import { CredentialsStep } from "./credentials-step"
import { NotarySealStep } from "./notary-seal-step"
import { ReviewStep } from "./review-step"

// Define the stepper with steps
const {
	useStepper,
	steps,
	StepperProvider,
	StepperNavigation,
	StepperStep,
	StepperTitle,
	StepperControls,
} = defineStepper(
	{ id: "account", title: "Account Info", description: "Basic account details" },
	{ id: "seal", title: "Notary Seal", description: "ENP seal information" },
	{ id: "notary", title: "Credentials", description: "Professional credentials" },
	{ id: "review", title: "Review", description: "Confirm your details" }
)

interface LawyerRegisterFormProps {
	callbackUrl?: Route
}

export function LawyerRegisterForm({ callbackUrl: _callbackUrl }: LawyerRegisterFormProps) {
	return (
		<StepperProvider variant="horizontal" className="space-y-6">
			<LawyerRegisterFormContent />
		</StepperProvider>
	)
}

function LawyerRegisterFormContent() {
	const methods = useStepper()
	const form = useForm<LawyerRegisterSchema>({
		resolver: zodResolver(lawyerRegisterSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			agreeToTerms: false,
			seal: {
				enpName: "",
				enpRollNumber: "",
				rollNoDate: "",
			},
			notaryInfo: {
				attyName: "",
				commissionNo: "",
				commissionNoValidUntil: "",
				ptrNo: "",
				ptrNoLocation: "",
				ptrNoDate: "",
				ibpNo: "",
				ibpNoDate: "",
				notaryEmail: "",
				notaryAddress: "",
				mcleNoPeriod: "",
				mcleNo: "",
				mcleNoDate: "",
				modeOfNotarization: "REN",
			},
		},
	})

	const name = form.watch("name")
	const email = form.watch("email")

	useEffect(() => {
		if (!name) return

		form.setValue("seal.enpName", name, { shouldValidate: false, shouldDirty: false })
		form.setValue("notaryInfo.attyName", name, { shouldValidate: false, shouldDirty: false })
	}, [form, name])

	useEffect(() => {
		if (!email) return

		form.setValue("notaryInfo.notaryEmail", email, { shouldValidate: false, shouldDirty: false })
	}, [email, form])

	const { mutate, data, error, isPending } = trpc.auth.registerLawyer.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			form.reset()
			methods.reset()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: LawyerRegisterSchema) => mutate(values)

	const goToNextStep = async () => {
		let fieldsToValidate: (keyof LawyerRegisterSchema)[] = []

		if (methods.current.id === "account") {
			fieldsToValidate = ["name", "email", "password", "confirmPassword"]
		} else if (methods.current.id === "seal") {
			fieldsToValidate = ["seal"]
		} else if (methods.current.id === "notary") {
			fieldsToValidate = ["notaryInfo"]
		}

		const isValid = await form.trigger(fieldsToValidate)

		if (isValid && !methods.isLast) {
			methods.next()
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				{/* Stepper Navigation */}
				<StepperNavigation className="mb-10">
					{steps.map(step => (
						<StepperStep key={step.id} of={step.id}>
							<StepperTitle>{step.title}</StepperTitle>
						</StepperStep>
					))}
				</StepperNavigation>

				{/* Step 1: Account Info */}
				{methods.current.id === "account" && <AccountInfoStep form={form} />}

				{/* Step 2: Seal Info */}
				{methods.current.id === "seal" && <NotarySealStep form={form} />}

				{/* Step 3: Notary Credentials */}
				{methods.current.id === "notary" && <CredentialsStep form={form} />}

				{/* Step 4: Review */}
				{methods.current.id === "review" && <ReviewStep form={form} error={error} data={data} />}

				<FormResponse type="error" message={error?.message} />
				<FormResponse type="success" message={data?.message} />

				{/* Navigation Controls */}
				<StepperControls>
					{!methods.isFirst && (
						<Button type="button" variant="outline" onClick={methods.prev} className="flex-1">
							Previous
						</Button>
					)}

					{!methods.isLast ? (
						<Button type="button" onClick={goToNextStep} className="flex-1">
							Next
						</Button>
					) : (
						<Button type="submit" disabled={isPending} className="flex-1">
							{isPending ? "Submitting..." : "Submit Application"}
						</Button>
					)}
				</StepperControls>
			</form>
		</Form>
	)
}
