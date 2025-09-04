"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
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
import { FormResponse } from "@/features/auth/components/ui/form-response"

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

	const { mutate, data, error, isPending } = trpc.auth.register.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			if (callbackUrl) {
				router.push(callbackUrl as never)
			} else {
				router.push("/auth/login")
			}
			form.reset()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: RegisterSchema) => mutate(values)

	return (
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
							<FormLabel className="text-sm">
								I agree to the
								<span
									className={cn(
										buttonVariants({ variant: "link" }),
										"h-fit p-0 hover:cursor-pointer"
									)}
								>
									Terms of Service
								</span>
								and
								<span
									className={cn(
										buttonVariants({ variant: "link" }),
										"h-fit p-0 hover:cursor-pointer"
									)}
								>
									Privacy Policy
								</span>
							</FormLabel>
						</FormItem>
					)}
				/>

				<FormResponse type="error" message={error?.message} />
				<FormResponse type="success" message={data?.message} />

				<Button type="submit" className="w-full" disabled={isPending}>
					{isPending ? "Creating Account..." : "Create Account"}
				</Button>
			</form>
		</Form>
	)
}
