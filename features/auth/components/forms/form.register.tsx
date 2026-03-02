"use client"

import { type Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { PasswordRequirementsChecklist } from "@/core/components/password-requirements-checklist"
import { Button, buttonVariants } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
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
import { cn } from "@/core/lib/utils"

import { trpc } from "@/services/trpc/client"

import { registerSchema, type RegisterSchema } from "@/features/auth/api/auth.schemas"
import { OAuthButton } from "@/features/auth/components/oauth-button"
import { FormResponse } from "@/features/auth/components/ui/form-response"

interface RegisterFormProps {
	callbackUrl?: Route
}

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
	const pathname = usePathname()
	const form = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			firstName: "",
			middleName: "",
			lastName: "",
			email: "",
			password: "",
			confirmPassword: "",
			agreeToTerms: false,
		},
	})

	const { mutate, data, error, isPending } = trpc.auth.register.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			form.reset()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: RegisterSchema) => mutate(values)

	const password = form.watch("password")

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="firstName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>First name</FormLabel>
							<FormControl>
								<Input placeholder="Enter your first name" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="middleName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Middle name</FormLabel>
							<FormControl>
								<Input placeholder="Enter your middle name (optional)" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="lastName"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Last name</FormLabel>
							<FormControl>
								<Input placeholder="Enter your last name" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

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
								<InputPassword placeholder="Create a password" {...field} />
							</FormControl>
							<PasswordRequirementsChecklist password={password} />
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="confirmPassword"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Confirm Password</FormLabel>
							<FormControl>
								<InputPassword placeholder="Confirm your password" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="agreeToTerms"
					render={({ field }) => (
						<FormItem className="flex flex-row items-start space-y-0 space-x-2 rounded-md px-4">
							<FormControl>
								<Checkbox checked={field.value} onCheckedChange={field.onChange} />
							</FormControl>
							<div className="space-y-1 leading-none">
								<FormLabel className="text-muted-foreground text-xs">
									I agree to the
									<Link
										href={{
											pathname: "/auth/terms-of-service",
											query: { from: pathname },
										}}
										target="_blank"
										className={cn(
											buttonVariants({ variant: "link" }),
											"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
										)}
									>
										Terms of Service
									</Link>
									and
									<Link
										href={{
											pathname: "/auth/privacy-policy",
											query: { from: pathname },
										}}
										target="_blank"
										className={cn(
											buttonVariants({ variant: "link" }),
											"text-primary hover:text-primary/80 h-fit p-0 text-xs hover:cursor-pointer"
										)}
									>
										Privacy Policy
									</Link>
								</FormLabel>
							</div>
						</FormItem>
					)}
				/>

				<FormResponse type="error" message={error?.message} />
				<FormResponse type="success" message={data?.message} />

				<Button type="submit" className="mt-4 w-full" disabled={isPending}>
					{isPending ? "Creating Account..." : "Create Account"}
				</Button>

				<OAuthButton provider="google" label="Continue with Google" callbackUrl={callbackUrl} />
			</form>
		</Form>
	)
}
