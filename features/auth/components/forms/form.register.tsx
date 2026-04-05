"use client"

import { useState } from "react"
import { type Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { PasswordRequirementsChecklist } from "@/core/components/password-requirements-checklist"
import { Button, buttonVariants } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/core/components/ui/collapsible"
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
	const [showOptionalName, setShowOptionalName] = useState(false)

	const form = useForm({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			middleName: "",
			prefix: "",
			suffix: "",
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
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
				{/* ── Name Fields ────────────────────────────────────── */}
				<div className="grid grid-cols-3 gap-3">
					<FormField
						control={form.control}
						name="firstName"
						render={({ field }) => (
							<FormItem>
								<FormLabel>First Name</FormLabel>
								<FormControl>
									<Input placeholder="Juan" autoComplete="given-name" {...field} />
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
								<FormLabel>Middle Name</FormLabel>
								<FormControl>
									<Input
										placeholder="Santos"
										autoComplete="additional-name"
										{...field}
									/>
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
								<FormLabel>Last Name</FormLabel>
								<FormControl>
									<Input
										placeholder="dela Cruz"
										autoComplete="family-name"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<Collapsible open={showOptionalName} onOpenChange={setShowOptionalName}>
					<CollapsibleTrigger asChild>
						<button
							type="button"
							className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
						>
							<ChevronDown
								className={cn(
									"size-3.5 transition-transform duration-200",
									showOptionalName && "rotate-180"
								)}
							/>
							Add prefix or suffix
						</button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3">
						<div className="grid grid-cols-2 gap-3">
							<FormField
								control={form.control}
								name="prefix"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-muted-foreground text-xs">
											Prefix
										</FormLabel>
										<FormControl>
											<Input placeholder="e.g. Atty." {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="suffix"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-muted-foreground text-xs">
											Suffix
										</FormLabel>
										<FormControl>
											<Input placeholder="e.g. Jr., III" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>

				<div className="bg-border h-px" />

				{/* ── Account Credentials ────────────────────────────── */}
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email Address</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="juandelacruz@example.com"
									autoComplete="email"
									{...field}
								/>
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
								<InputPassword
									placeholder="Create a password"
									autoComplete="new-password"
									{...field}
								/>
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
								<InputPassword
									placeholder="Re-enter your password"
									autoComplete="new-password"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* ── Terms & Submission ─────────────────────────────── */}
				<FormField
					control={form.control}
					name="agreeToTerms"
					render={({ field }) => (
						<FormItem className="space-y-2">
							<label className="flex cursor-pointer flex-row items-center gap-x-3">
								<FormControl>
									<Checkbox checked={field.value} onCheckedChange={field.onChange} />
								</FormControl>
								<p className="text-muted-foreground whitespace-nowrap text-xs">
									I agree to the{" "}
									<Link
										href={{ pathname: "/auth/terms-of-service", query: { from: pathname } }}
										target="_blank"
										onClick={e => e.stopPropagation()}
										className={cn(
											buttonVariants({ variant: "link" }),
											"text-primary hover:text-primary/80 h-fit p-0 text-xs"
										)}
									>
										Terms of Service
									</Link>{" "}
									and{" "}
									<Link
										href={{ pathname: "/auth/privacy-policy", query: { from: pathname } }}
										target="_blank"
										onClick={e => e.stopPropagation()}
										className={cn(
											buttonVariants({ variant: "link" }),
											"text-primary hover:text-primary/80 h-fit p-0 text-xs"
										)}
									>
										Privacy Policy
									</Link>
								</p>
							</label>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormResponse type="error" message={error?.message} />
				<FormResponse type="success" message={data?.message} />

				<Button type="submit" className="w-full" disabled={isPending}>
					{isPending ? "Creating Account..." : "Create Account"}
				</Button>

				<OAuthButton provider="google" label="Continue with Google" callbackUrl={callbackUrl} />
			</form>
		</Form>
	)
}
