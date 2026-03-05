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

import { trpc } from "@/services/trpc/client"

import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/features/auth/api/auth.schemas"
import { FormResponse } from "@/features/auth/components/ui/form-response"

export const ForgotPasswordForm = () => {
	const [isRecoverySectionOpen, setIsRecoverySectionOpen] = useState(false)
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

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-card-foreground">Find your account</FormLabel>
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
					{isPrimaryPending && <LoaderIcon className="animate-spin" />}
					Send reset email
				</Button>

				<button
					type="button"
					onClick={() => setIsRecoverySectionOpen(state => !state)}
					className="text-muted-foreground hover:text-foreground mx-auto block text-sm underline"
					disabled={isSubmitting}
				>
					I no longer have access to this email
				</button>

				{isRecoverySectionOpen ? (
					<div className="bg-muted/40 space-y-4 rounded-xl border p-4">
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Recovery Email
						</p>
						<p className="text-muted-foreground text-sm">
							Enter your account email for lookup. We&apos;ll send the password reset link to your
							recovery email instead.
						</p>

						<div className="space-y-2">
							<FormLabel className="text-card-foreground">Your account email</FormLabel>
							<Input
								placeholder="Enter your primary account email"
								type="email"
								autoComplete="email"
								value={form.watch("email")}
								onChange={event =>
									form.setValue("email", event.target.value, { shouldValidate: true })
								}
							/>
						</div>

						<Button
							type="button"
							variant="outline"
							className="w-full rounded-xl"
							onClick={onRecoverySubmit}
							disabled={isSubmitting}
						>
							{isRecoveryPending && <LoaderIcon className="animate-spin" />}
							Send to recovery email
						</Button>
					</div>
				) : null}

				<FormResponse
					type="error"
					message={activeSubmission === "primary" ? primaryError?.message : recoveryError?.message}
				/>
				<FormResponse
					type="success"
					message={activeSubmission === "primary" ? primaryData?.message : recoverySuccessMessage}
				/>
			</form>
		</Form>
	)
}
