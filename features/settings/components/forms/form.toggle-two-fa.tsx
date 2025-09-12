"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
} from "@/core/components/ui/form"
import { Switch } from "@/core/components/ui/switch"

import { trpc } from "@/services/trpc/client"

import { toggleTwoFASchema, type ToggleTwoFASchema } from "@/features/settings/api/settings.schema"

export function ToggleTwoFAForm() {
	const { data: twoFAStatus, isLoading: isLoadingStatus } =
		trpc.settings.checkTwoFAStatus.useQuery()

	const form = useForm<ToggleTwoFASchema>({
		resolver: zodResolver(toggleTwoFASchema),
		values: {
			enabled: twoFAStatus?.twoFactorEnabled ?? false,
		},
	})

	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.settings.toggleTwoFA.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			void utils.settings.checkTwoFAStatus.invalidate()
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: ToggleTwoFASchema) => mutate(values)

	const handleToggleChange = (checked: boolean) => {
		form.setValue("enabled", checked)
		void form.handleSubmit(onSubmit)()
	}

	if (isLoadingStatus) {
		return <div className="text-muted-foreground text-sm">Loading...</div>
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="enabled"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-sm border p-4 shadow-sm">
							<div className="space-y-0.5">
								<FormLabel>Two-Factor Authentication</FormLabel>
								<FormDescription>
									{field.value
										? "Two-factor authentication is currently enabled."
										: "Add an extra layer of security to your account."}
								</FormDescription>
							</div>
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={handleToggleChange}
									disabled={isPending}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
			</form>
		</Form>
	)
}
