"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
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

import { trpc } from "@/services/trpc/client"

import { registerSchema, type RegisterSchema } from "@/features/auth/api/auth.schemas"

interface RegisterFormProps {
	callbackUrl?: string
}

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
	const router = useRouter()

	const form = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
			agreeToTerms: false,
		},
	})

	const { mutate, isPending } = trpc.auth.register.useMutation({
		onSuccess: () => {
			toast.success("Account created successfully!", {
				description: "You can now sign in with your credentials.",
			})

			const redirectUrl = callbackUrl ?? "/"
			router.push(redirectUrl as never)

			form.reset()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: RegisterSchema) => mutate(values)

	const handleLoginRedirect = () => {
		const loginUrl = callbackUrl
			? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
			: "/auth/login"
		router.push(loginUrl as never)
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<QuanbyLogo className="h-16 w-16" />
				</div>
				<CardTitle className="text-2xl">Create Account</CardTitle>
				<CardDescription>Join Quanby Sign and start signing documents securely</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{form.formState.errors.agreeToTerms && (
							<Alert variant="destructive">
								<AlertDescription>{form.formState.errors.agreeToTerms.message}</AlertDescription>
							</Alert>
						)}
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Full Name</FormLabel>
									<FormControl>
										<Input placeholder="Enter your full name" {...field} />
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
								<FormItem className="flex flex-row items-start space-y-0 space-x-3">
									<FormControl>
										<Checkbox checked={field.value} onCheckedChange={field.onChange} />
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel className="text-sm">
											I agree to the{" "}
											<span
												className="text-primary hover:text-primary/80 cursor-pointer hover:underline"
												onClick={() => {
													// TODO: Open terms modal or navigate to terms page
												}}
											>
												Terms of Service
											</span>{" "}
											and{" "}
											<span
												className="text-primary hover:text-primary/80 cursor-pointer hover:underline"
												onClick={() => {
													// TODO: Open privacy modal or navigate to privacy page
												}}
											>
												Privacy Policy
											</span>
										</FormLabel>
									</div>
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Creating Account..." : "Create Account"}
						</Button>
					</form>
				</Form>

				<div className="mt-6 text-center">
					<p className="text-muted-foreground text-sm">
						Already have an account?{" "}
						<button
							type="button"
							onClick={handleLoginRedirect}
							className="text-primary hover:text-primary/80 border-none bg-transparent p-0 font-normal hover:underline"
						>
							Sign in
						</button>
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
