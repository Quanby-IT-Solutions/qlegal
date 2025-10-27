"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderIcon } from "lucide-react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { InputPassword } from "@/core/components/ui/input-password"

import { trpc } from "@/services/trpc/client"

import { resetPasswordSchema, type ResetPasswordSchema } from "@/features/auth/api/auth.schemas"
import { FormResponse } from "@/features/auth/components/ui/form-response"

export const ResetPasswordForm = ({ token }: { token?: string }) => {
	const router = useRouter()
	const form = useForm({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
			token,
		},
	})

	const { mutate, error, isPending } = trpc.auth.resetPassword.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			router.push("/auth/login")
		},
	})
	const onSubmit: SubmitHandler<ResetPasswordSchema> = data => mutate(data)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="newPassword"
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

				<FormResponse type="error" message={error?.message} />

				<Button className="w-full rounded-xl">
					{isPending && <LoaderIcon className="animate-spin" />}
					Reset password
				</Button>
			</form>
		</Form>
	)
}
