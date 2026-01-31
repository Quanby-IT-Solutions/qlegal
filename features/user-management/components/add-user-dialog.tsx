"use client"

import { useState } from "react"
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

import { createUserSchema, type CreateUserInput } from "../api/user-management.schema"

interface AddUserDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
	const [isLoading, setIsLoading] = useState(false)

	const utils = trpc.useUtils()

	const createUserMutation = trpc.userManagement.create.useMutation({
		onSuccess: () => {
			toast.success("User created successfully")
			onOpenChange(false)
			form.reset()
			// Invalidate and refetch user list and stats
			void utils.userManagement.list.invalidate()
			void utils.userManagement.stats.invalidate()
		},
		onError: error => {
			toast.error(error.message || "Failed to create user")
		},
	})

	const form = useForm<CreateUserInput>({
		resolver: zodResolver(createUserSchema),
		defaultValues: {
			name: "",
			email: "",
			role: "PRINCIPAL",
		},
	})

	const onSubmit = async (data: CreateUserInput) => {
		setIsLoading(true)
		try {
			await createUserMutation.mutateAsync(data)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add New User</DialogTitle>
					<DialogDescription>
						Create a new user account. Fill in the required information below.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="name" className="text-right">
							Name *
						</Label>
						<Input
							id="name"
							{...form.register("name")}
							className="col-span-3"
							placeholder="Enter full name"
						/>
					</div>
					{form.formState.errors.name && (
						<p className="col-span-4 text-sm text-red-500">{form.formState.errors.name.message}</p>
					)}

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="email" className="text-right">
							Email *
						</Label>
						<Input
							id="email"
							type="email"
							{...form.register("email")}
							className="col-span-3"
							placeholder="Enter email address"
						/>
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
									<SelectItem value="ENP">Electronic Notary Public</SelectItem>
									<SelectItem value="ENA">Electronic Notary Administrator</SelectItem>
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
							{isLoading ? "Creating..." : "Create User"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
