"use client"

import { type Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useSession } from "next-auth/react"
import { z } from "zod/v4"

import { Button, buttonVariants } from "@/core/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/core/components/ui/input-otp"
import { InputPassword } from "@/core/components/ui/input-password"
import { cn } from "@/core/lib/utils"

import { login, resendTwoFactorCode } from "@/features/auth/api/auth.login-action"
import { loginSchema, type LoginSchema } from "@/features/auth/api/auth.schemas"
import { OAuthButton } from "@/features/auth/components/oauth-button"
import { FormResponse } from "@/features/auth/components/ui/form-response"

export function LoginForm({ callbackUrl }: { callbackUrl?: Route }) {
	const router = useRouter()
	const { update } = useSession()
	const [formSuccess, setFormSuccess] = useState<string | null>(null)
	const [formError, setFormError] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()
	const [showTwoFactor, setShowTwoFactor] = useState(false)
	const [userEmail, setUserEmail] = useState<string>("")
	const [isResending, setIsResending] = useState(false)
	const [resendCooldown, setResendCooldown] = useState(0)

	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
			code: "",
		},
	})

	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
			return () => clearTimeout(timer)
		}
	}, [resendCooldown])

	useEffect(() => {
		form.clearErrors()
	}, [showTwoFactor, form])

	const requiredCodeSchema = showTwoFactor
		? loginSchema.extend({
				code: z.string().min(1, "2FA code is required").length(6, "Code must be 6 digits"),
			})
		: loginSchema

	const onSubmit: SubmitHandler<LoginSchema> = data => {
		setFormError("")
		setFormSuccess("")
		if (data.email) {
			setUserEmail(data.email)
		}

		if (showTwoFactor) {
			const twoFactorValidation = requiredCodeSchema.safeParse(data)
			if (!twoFactorValidation.success) {
				twoFactorValidation.error.issues.forEach(issue => {
					if (issue.path[0]) {
						form.setError(issue.path[0] as keyof LoginSchema, {
							type: "manual",
							message: issue.message,
						})
					}
				})
				return
			}
		}

		startTransition(async () => {
			const response = await login(data)
			if (response?.error) {
				setFormError(response.error)
			} else if (response?.success) {
				if (response?.twoFactor) {
					setShowTwoFactor(true)
					setFormSuccess(response.success)
				} else {
					// Login successful without 2FA or after 2FA verification
					setFormSuccess(response.success)
					// Update the session to reflect the logged-in user immediately
					const updatedSession = await update()
					// Navigate to KYC if not verified, otherwise go to callback URL or dashboard
					// @ts-expect-error augmented session field
					const kycStatus = updatedSession?.user?.kycStatus
					if (kycStatus === "NOT_STARTED" || kycStatus === "PENDING") {
						router.push("/auth/kyc")
					} else {
						router.push(callbackUrl ?? "/dashboard")
					}
					router.refresh()
				}
			}
		})
	}

	const handleResendCode = async () => {
		if (!userEmail || resendCooldown > 0) {
			return
		}

		setIsResending(true)
		setFormError("")
		setFormSuccess("")

		try {
			const result = await resendTwoFactorCode(userEmail)

			if (result?.error) {
				if (result.remainingTime) {
					setResendCooldown(result.remainingTime)
				}
				setFormError(result.error)
			} else if (result?.success) {
				setFormSuccess(result.success)
				setResendCooldown(120)
			}
		} catch {
			setFormError("Failed to resend code. Please try again.")
		} finally {
			setIsResending(false)
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				{showTwoFactor && (
					<FormField
						control={form.control}
						name="code"
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center justify-between">
									<FormLabel>Two Factor Code</FormLabel>

									<Button
										type="button"
										variant="link"
										onClick={handleResendCode}
										disabled={resendCooldown > 0 || isResending}
										className="text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
									>
										{isResending
											? "Sending..."
											: resendCooldown > 0
												? `Resend in ${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, "0")}`
												: "Resend code"}
									</Button>
								</div>
								<FormControl>
									<InputOTP maxLength={6} {...field}>
										<InputOTPGroup>
											<InputOTPSlot index={0} />
											<InputOTPSlot index={1} />
											<InputOTPSlot index={2} />
										</InputOTPGroup>

										<InputOTPSeparator />

										<InputOTPGroup>
											<InputOTPSlot index={3} />
											<InputOTPSlot index={4} />
											<InputOTPSlot index={5} />
										</InputOTPGroup>
									</InputOTP>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{!showTwoFactor && (
					<>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input type="email" placeholder="Enter your email" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<div className="flex items-center justify-between">
										<FormLabel>Password</FormLabel>
										<Link
											href="/auth/forgot-password"
											className={cn(
												buttonVariants({ variant: "link" }),
												"text-primary hover:text-primary/80 h-fit px-1.5 py-0.5 text-sm"
											)}
										>
											Forgot password
										</Link>
									</div>
									<FormControl>
										<InputPassword placeholder="Enter your password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</>
				)}

				<FormResponse type="error" message={formError} />
				<FormResponse type="success" message={formSuccess} />

				<Button type="submit" className="mt-4 w-full" disabled={isPending}>
					{isPending ? "Signing in..." : "Sign In"}
				</Button>

				<OAuthButton provider="google" label="Continue with Google" callbackUrl={callbackUrl} />
			</form>
		</Form>
	)
}
