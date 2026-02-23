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
import { PasswordRequirementsChecklist } from "@/core/components/password-requirements-checklist"

import { trpc } from "@/services/trpc/client"

import {
	changePasswordSchema,
	type ChangePasswordSchema,
} from "@/features/settings/api/settings.schema"

export function ChangePasswordForm() {
	const form = useForm({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	})

	const { mutate, isPending } = trpc.settings.changePassword.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			form.reset()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: ChangePasswordSchema) => mutate(values)

	const newPassword = form.watch("newPassword")

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:gap-8">
					<div className="md:col-span-1">
						<FormField
							control={form.control}
							name="currentPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Current Password</FormLabel>
									<FormControl>
										<InputPassword
											placeholder="Enter your current password"
											autoComplete="current-password"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
					<div className="row-start-2 md:col-span-1">
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
									<PasswordRequirementsChecklist password={newPassword} />
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="row-start-2 md:col-span-1">
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
					{isPending ? "Updating Password..." : "Update Password"}
				</Button>
			</form>
		</Form>
	)
}
