"use client"

import { useEffect, useState } from "react"
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
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

import { trpc } from "@/services/trpc/client"

import { updateUserSchema, type UpdateUserInput } from "../api/user-management.schema"

interface UserActionsProps {
	userId: string
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess: () => void
}

export function UserActions({ userId, open, onOpenChange, onSuccess }: UserActionsProps) {
	const [isLoading, setIsLoading] = useState(false)
	const utils = trpc.useUtils()

	const { data: user, isLoading: isLoadingUser } = trpc.userManagement.getById.useQuery(
		{ id: userId },
		{ enabled: open }
	)

	const updateUserMutation = trpc.userManagement.update.useMutation({
		onSuccess: () => {
			toast.success("User updated successfully")
			onSuccess()
			// Invalidate and refetch user list and stats
			void utils.userManagement.list.invalidate()
			void utils.userManagement.stats.invalidate()
		},
		onError: error => {
			toast.error(error.message || "Failed to update user")
		},
	})

	const form = useForm<UpdateUserInput>({
		resolver: zodResolver(updateUserSchema),
		defaultValues: {
			id: userId,
			name: "",
			email: "",
			role: "PRINCIPAL",
		},
	})

	// Update form values when user data loads
	useEffect(() => {
		if (user) {
			form.reset({
				id: userId,
				name: user.name ?? "",
				email: user.email ?? "",
				role: user.role as "PRINCIPAL" | "ADMIN" | "ENP" | "ENA",
			})
		}
	}, [user, form, userId])

	const onSubmit = async (data: UpdateUserInput) => {
		setIsLoading(true)
		try {
			await updateUserMutation.mutateAsync({
				id: userId,
				name: data.name,
				email: data.email,
				role: data.role,
			})
		} finally {
			setIsLoading(false)
		}
	}

	if (isLoadingUser) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Loading...</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="h-4 w-full animate-pulse rounded bg-gray-200" />
						<div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
						<div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit User</DialogTitle>
					<DialogDescription>
						Make changes to user information here. Click save when you&apos;re done.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="name" className="text-right">
							Name
						</Label>
						<Input id="name" {...form.register("name")} className="col-span-3" />
					</div>
					{form.formState.errors.name && (
						<p className="col-span-4 text-sm text-red-500">{form.formState.errors.name.message}</p>
					)}

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="email" className="text-right">
							Email
						</Label>
						<Input id="email" type="email" {...form.register("email")} className="col-span-3" />
					</div>
					{form.formState.errors.email && (
						<p className="col-span-4 text-sm text-red-500">{form.formState.errors.email.message}</p>
					)}

				<div className="grid grid-cols-4 items-center gap-4">
					<Label htmlFor="role" className="text-right">
						Role *
					</Label>
					<div className="col-span-3">
						<Select	
							value={form.watch("role")}
							onValueChange={value =>
								form.setValue("role", value as "PRINCIPAL" | "ADMIN" | "ENP" | "ENA")
							}
						>
							<SelectTrigger id="role" className="w-full">
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="PRINCIPAL">Principal</SelectItem>
								<SelectItem value="ENP">ENP (Notary Public)</SelectItem>
								<SelectItem value="ENA">ENA (Notary Administrator)</SelectItem>
								<SelectItem value="ADMIN">Administrator</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading}>
							Save changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
