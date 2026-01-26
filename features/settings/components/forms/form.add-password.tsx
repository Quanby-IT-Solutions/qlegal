"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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

import { addPasswordSchema, type AddPasswordSchema } from "@/features/settings/api/settings.schema"

export function AddPasswordForm() {
	const form = useForm({
		resolver: zodResolver(addPasswordSchema),
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
	})

	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.settings.addPassword.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			form.reset()
			void utils.settings.checkUserHasPassword.invalidate()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: AddPasswordSchema) => mutate(values)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8">
					<div className="md:col-span-1">
						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Password</FormLabel>
									<FormControl>
										<InputPassword
											placeholder="Enter your new password"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="md:col-span-1">
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm Password</FormLabel>
									<FormControl>
										<InputPassword
											placeholder="Confirm your new password"
											autoComplete="new-password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>

				<Button type="submit" className="mt-4" disabled={isPending}>
					{isPending ? "Adding Password..." : "Add Password"}
				</Button>
			</form>
		</Form>
	)
}
