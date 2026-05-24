"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderIcon } from "lucide-react"
import { useForm, type SubmitHandler } from "react-hook-form"

import { Button } from "@/core/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Separator } from "@/core/components/ui/separator"

import { trpc } from "@/services/trpc/client"

import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/features/auth/api/auth.schemas"
import { FormResponse } from "@/features/auth/components/ui/form-response"

export const ForgotPasswordForm = () => {
	const [isRecoverySectionOpen, setIsRecoverySectionOpen] = useState(false)
	const [hasAttemptedPrimary, setHasAttemptedPrimary] = useState(false)
	const [activeSubmission, setActiveSubmission] = useState<"primary" | "recovery" | null>(null)

	const form = useForm({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	})

	const {
		mutate: sendToPrimaryEmail,
		data: primaryData,
		error: primaryError,
		isPending: isPrimaryPending,
		reset: resetPrimaryMutation,
	} = trpc.auth.forgotPassword.useMutation()

	const {
		mutate: sendToRecoveryEmail,
		data: recoveryData,
		error: recoveryError,
		isPending: isRecoveryPending,
		reset: resetRecoveryMutation,
	} = trpc.auth.forgotPasswordViaRecovery.useMutation()

	const onSubmit: SubmitHandler<ForgotPasswordSchema> = data => {
		setHasAttemptedPrimary(true)
		setActiveSubmission("primary")
		resetPrimaryMutation()
		resetRecoveryMutation()
		sendToPrimaryEmail(data)
	}

	const onRecoverySubmit = async () => {
		const isValid = await form.trigger("email")
		if (!isValid) {
			return
		}

		setActiveSubmission("recovery")
		resetPrimaryMutation()
		resetRecoveryMutation()
		sendToRecoveryEmail({ email: form.getValues("email") })
	}

	const recoverySuccessMessage = recoveryData?.maskedRecoveryEmail
		? `Reset link sent to ${recoveryData.maskedRecoveryEmail}`
		: recoveryData?.message

	const isSubmitting = isPrimaryPending || isRecoveryPending
	const suppressUserEnumerationMessage = "User with this email not found."
	const shouldSuppressPrimaryError =
		activeSubmission === "primary" && primaryError?.message === suppressUserEnumerationMessage
	const safePrimaryFeedback =
		activeSubmission === "primary" && primaryError?.message === suppressUserEnumerationMessage
			? "If an account exists for that email, you’ll receive a reset link shortly."
			: null

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-card-foreground">Email</FormLabel>
							<FormControl>
								<Input
									placeholder="Enter your email"
									type="email"
									autoComplete="email"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button className="w-full rounded-xl" disabled={isSubmitting}>
					{isPrimaryPending && <LoaderIcon className="size-4 animate-spin" />}
					{isPrimaryPending ? "Sending..." : "Send reset email"}
				</Button>

				<FormResponse
					type="error"
					className="items-start"
					message={
						activeSubmission === "primary"
							? shouldSuppressPrimaryError
								? null
								: primaryError?.message
							: recoveryError?.message
					}
				/>
				<FormResponse
					type="success"
					className="items-start"
					message={
						activeSubmission === "primary"
							? (primaryData?.message ?? safePrimaryFeedback)
							: recoverySuccessMessage
					}
				/>

				{hasAttemptedPrimary && (
					<div className="space-y-3">
						<Separator />
						<div className="space-y-2">
							<div className="flex items-center justify-between gap-4">
								<p className="text-foreground text-sm font-medium">Need help?</p>
								<Button
									type="button"
									variant="link"
									onClick={() => setIsRecoverySectionOpen(state => !state)}
									disabled={isSubmitting}
									className="text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
								>
									{isRecoverySectionOpen ? "Hide options" : "Try recovery email"}
								</Button>
							</div>
							<p className="text-muted-foreground text-sm">
								If you can’t access your inbox, we can send the reset link to your recovery email.
							</p>

							{isRecoverySectionOpen && (
								<div className="bg-muted/40 space-y-3 rounded-xl border p-4">
									<div className="space-y-1">
										<p className="text-foreground text-sm font-medium">Send to recovery email</p>
										<p className="text-muted-foreground text-sm">
											We’ll look up your account and deliver the reset link to the recovery address
											on file.
										</p>
									</div>

									<Button
										type="button"
										variant="outline"
										className="w-full rounded-xl"
										onClick={onRecoverySubmit}
										disabled={isSubmitting}
									>
										{isRecoveryPending && <LoaderIcon className="size-4 animate-spin" />}
										Send to recovery email
									</Button>
								</div>
							)}
						</div>
					</div>
				)}
			</form>
		</Form>
	)
}
