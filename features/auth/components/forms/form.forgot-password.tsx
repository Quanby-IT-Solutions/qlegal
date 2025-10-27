"use client"

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
	const form = useForm({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	})

	const { mutate, data, error, isPending } = trpc.auth.forgotPassword.useMutation()
	const onSubmit: SubmitHandler<ForgotPasswordSchema> = data => mutate(data)

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

				<FormResponse type="error" message={error?.message} />
				<FormResponse type="success" message={data?.message} />

				<Button className="w-full rounded-xl">
					{isPending && <LoaderIcon className="animate-spin" />}
					Send reset email
				</Button>
			</form>
		</Form>
	)
}
