"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
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

import {
	changeRecoveryEmailSchema,
	type ChangeRecoveryEmailSchema,
} from "@/features/settings/api/settings.schema"

interface RecoveryEmailModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	initialRecoveryEmail?: string | null
}

export function RecoveryEmailModal({
	open,
	onOpenChange,
	initialRecoveryEmail,
}: RecoveryEmailModalProps) {
	const utils = trpc.useUtils()

	const form = useForm<ChangeRecoveryEmailSchema>({
		resolver: zodResolver(changeRecoveryEmailSchema),
		defaultValues: {
			newRecoveryEmail: initialRecoveryEmail ?? "",
		},
	})

	useEffect(() => {
		if (!open) {
			return
		}

		form.reset({
			newRecoveryEmail: initialRecoveryEmail ?? "",
		})
	}, [form, initialRecoveryEmail, open])

	const initiateChange = trpc.settings.initiateRecoveryEmailChange.useMutation({
		onSuccess: async () => {
			toast.success(
				"Verification email sent. Your current recovery email stays active until the new one is verified."
			)
			onOpenChange(false)
			await utils.settings.getRecoveryEmail.invalidate()
		},
		onError: err => {
			toast.error(err.message)
		},
	})

	const onSubmit = (values: ChangeRecoveryEmailSchema) => {
		initiateChange.mutate(values)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{initialRecoveryEmail ? "Change recovery email" : "Add recovery email"}
					</DialogTitle>
					<DialogDescription>
						If you lose access to your primary email, we will use this as fallback for account
						recovery.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="newRecoveryEmail"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Recovery email address</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="name@example.com"
											autoComplete="email"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								disabled={initiateChange.isPending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={initiateChange.isPending}>
								{initiateChange.isPending ? "Sending..." : "Send verification email"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
