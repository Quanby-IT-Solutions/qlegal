"use client"

import { useRouter } from "next/navigation"
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
import { InputPassword } from "@/core/components/ui/input-password"

import { trpc } from "@/services/trpc/client"

import {
	resetPasswordSchema,
	type ResetPasswordSchema
} from "@/features/auth/api/auth.schemas"

export function ResetPasswordForm() {
	const router = useRouter()
	const [isSuccess, setIsSuccess] = useState(false)

	const form = useForm<ResetPasswordSchema>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			email: "",
			code: "",
			newPassword: "",
			confirmPassword: ""
		}
	})

	const { mutate: resetPassword, isPending } =
		trpc.auth.resetPassword.useMutation({
			onSuccess: (data) => {
				toast.success(data.message)
				setIsSuccess(true)
				// Redirect to login after 3 seconds
				setTimeout(() => {
					router.push("/auth/login")
				}, 3000)
			},
			onError: (error) => {
				toast.error(error.message)
			}
		})

	const onSubmit = (values: ResetPasswordSchema) => {
		resetPassword(values)
	}

	if (isSuccess) {
		return (
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<QuanbyLogo className="mx-auto mb-6 h-12 w-12" />
					<CardTitle className="text-2xl text-green-600">
						Password Reset Successful!
					</CardTitle>
					<CardDescription>
						Your password has been successfully reset. You will be redirected to
						the login page shortly.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center">
					<Button onClick={() => router.push("/auth/login")} className="w-full">
						Go to Login
					</Button>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<QuanbyLogo className="mx-auto mb-6 h-12 w-12" />
				<CardTitle className="text-2xl">Reset Your Password</CardTitle>
				<CardDescription>
					Enter the verification code sent to your email and create a new
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

						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Verification Code</FormLabel>
									<FormControl>
										<Input
											placeholder="Enter 6-digit code"
											maxLength={6}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<InputPassword
											placeholder="Enter your new password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm New Password</FormLabel>
									<FormControl>
										<InputPassword
											placeholder="Confirm your new password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Resetting..." : "Reset Password"}
						</Button>
					</form>
				</Form>

				<div className="mt-6 text-center">
					<p className="text-sm text-muted-foreground">
						Didn&apos;t receive a code?{" "}
						<Button
							variant="link"
							className="h-auto p-0 text-sm text-primary hover:text-primary/80"
							onClick={() => router.push("/auth/forgot-password")}
						>
							Send again
						</Button>
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
