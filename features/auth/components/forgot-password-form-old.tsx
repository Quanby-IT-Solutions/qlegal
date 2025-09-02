"use client"

import Link from "next/link"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"

import { trpc } from "@/services/trpc/client"

import {
	forgotPasswordSchema,
	type ForgotPasswordSchema
} from "@/features/auth/api/auth.schemas"

export function ForgotPasswordForm() {
	const [isSubmitted, setIsSubmitted] = useState(false)
	const [hasRecoveryEmail, setHasRecoveryEmail] = useState(false)

	const form = useForm<ForgotPasswordSchema>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: ""
		}
	})

	const { mutate: sendResetCode, isPending } =
		trpc.auth.forgotPassword.useMutation({
			onSuccess: (data) => {
				toast.success(data.message)
				setIsSubmitted(true)
				setHasRecoveryEmail(data.hasRecoveryEmail ?? false)
			},
			onError: (error) => {
				toast.error(error.message)
			}
		})

	const { mutate: sendRecoveryCode, isPending: isRecoveryPending } =
		trpc.auth.forgotPasswordRecovery.useMutation({
			onSuccess: (data) => {
				toast.success(data.message)
				setIsSubmitted(true)
			},
			onError: (error) => {
				toast.error(error.message)
			}
		})

	const onSubmit = (values: ForgotPasswordSchema) => {
		sendResetCode(values)
	}

	const handleRecoveryEmail = () => {
		const email = form.getValues("email")
		if (email) {
			sendRecoveryCode({ email })
		}
	}

	if (isSubmitted) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<QuanbyLogo className="mx-auto mb-6 h-12 w-12" />
					<CardTitle className="text-2xl">Check Your Email</CardTitle>
					<CardDescription>
						We&apos;ve sent a password reset code to your email address. Enter
						the code below to reset your password.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-center">
					<Button asChild className="w-full">
						<Link href="/auth/reset-password">Enter Reset Code</Link>
					</Button>

					{hasRecoveryEmail && (
						<div className="space-y-2">
							<p className="text-sm text-muted-foreground">
								Can&apos;t access your primary email?
							</p>
							<Button
								variant="outline"
								onClick={handleRecoveryEmail}
								disabled={isRecoveryPending}
								className="w-full"
							>
								{isRecoveryPending ? "Sending..." : "Send to Recovery Email"}
							</Button>
						</div>
					)}

					<div className="pt-2">
						<Button
							variant="ghost"
							onClick={() => setIsSubmitted(false)}
							className="text-sm text-muted-foreground hover:text-primary"
						>
							Try a different email
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<QuanbyLogo className="mx-auto mb-6 h-12 w-12" />
				<CardTitle className="text-2xl">Forgot Password?</CardTitle>
				<CardDescription>
					Enter your email address and we&apos;ll send you a code to reset your
					password
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="Enter your email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Sending..." : "Send Reset Code"}
						</Button>
					</form>
				</Form>

				<div className="mt-6 text-center">
					<Link
						href="/auth/login"
						className="text-sm text-primary hover:text-primary/80 hover:underline"
					>
						Back to Sign In
					</Link>
				</div>
			</CardContent>
		</Card>
	)
}
