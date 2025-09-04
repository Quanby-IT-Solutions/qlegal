"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { InputPassword } from "@/core/components/ui/input-password"

import { login } from "@/features/auth/api/auth.login-action"
import { loginSchema, type LoginSchema } from "@/features/auth/api/auth.schemas"
import { FormResponse } from "@/features/auth/components/ui/form-response"

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
	const [formSuccess, setFormSuccess] = useState<string | null>(null)
	const [formError, setFormError] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()
	const [showTwoFactor, setShowTwoFactor] = useState(false)

	const form = useForm({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	})

	const onSubmit: SubmitHandler<LoginSchema> = data => {
		setFormError("")
		setFormSuccess("")

		startTransition(async () => {
			await login(data, callbackUrl)
				.then(data => {
					if (data?.error) {
						return setFormError(data.error)
					}
					if (data?.success) {
						setShowTwoFactor(data?.twoFactor ?? false)
						return setFormSuccess(data?.success)
					}
				})
				.catch(() => {
					setFormError("Something went wrong!")
				})
		})
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
							<FormLabel>Password</FormLabel>
							<FormControl>
								<InputPassword placeholder="Enter your password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex items-center justify-between">
					<Link
						href="/auth/forgot-password"
						className="text-primary hover:text-primary/80 text-sm hover:underline"
					>
						Forgot password?
					</Link>
				</div>

				<FormResponse type="error" message={formError} />
				<FormResponse type="success" message={formSuccess} />

				<Button type="submit" className="w-full" disabled={isPending}>
					{isPending ? "Signing in..." : "Sign In"}
				</Button>
			</form>
		</Form>
	)
}
