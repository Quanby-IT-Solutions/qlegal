"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save, X } from "lucide-react"
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
import { Textarea } from "@/core/components/ui/textarea"

import { FormResponse } from "@/features/auth/components/ui/form-response"
import {
	professionalDetailsSchema,
	type ProfessionalDetailsSchema,
} from "@/features/profile/api/profile.schema"

interface ProfessionalDetailsFormProps {
	bio: string
	experience: string
	responseTime: string
	onCancel: () => void
	onSuccess?: () => void
}

export function ProfessionalDetailsForm({
	bio,
	experience,
	responseTime,
	onCancel,
	onSuccess,
}: ProfessionalDetailsFormProps) {
	const [formSuccess, setFormSuccess] = useState<string | null>(null)
	const [formError, setFormError] = useState<string | null>(null)
	const [isPending, startTransition] = useTransition()

	const form = useForm<ProfessionalDetailsSchema>({
		resolver: zodResolver(professionalDetailsSchema),
		defaultValues: {
			bio,
			experience,
			responseTime,
		},
	})

	const onSubmit: SubmitHandler<ProfessionalDetailsSchema> = data => {
		setFormError(null)
		setFormSuccess(null)

		startTransition(async () => {
			try {
				// TODO: Replace with actual API call
				// const response = await updateProfessionalDetails(data)

				// Simulate API call
				await new Promise(resolve => setTimeout(resolve, 1000))

				console.log("Saving professional details:", data)

				setFormSuccess("Professional details updated successfully!")

				// Call onSuccess callback if provided
				if (onSuccess) {
					onSuccess()
				}

				// Auto-close after success
				setTimeout(() => {
					onCancel()
				}, 1500)
			} catch (error) {
				setFormError("Failed to update professional details. Please try again.")
				console.error("Error updating professional details:", error)
			}
		})
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
				{/* BIO */}
				<FormField
					control={form.control}
					name="bio"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Bio</FormLabel>
							<FormControl>
								<Textarea
									{...field}
									className="min-h-25 resize-none"
									placeholder="Enter your professional bio..."
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Experience */}
				<FormField
					control={form.control}
					name="experience"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Experience</FormLabel>
							<FormControl>
								<Input {...field} placeholder="e.g., 10+ years" className="max-w-50" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Response Time */}
				<FormField
					control={form.control}
					name="responseTime"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Response Time</FormLabel>
							<FormControl>
								<Input {...field} placeholder="e.g., 2 hours" className="max-w-[200px]" />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormResponse type="error" message={formError} />
				<FormResponse type="success" message={formSuccess} />

				{/* Action Buttons */}
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isPending}
						className="flex-1"
					>
						<X className="mr-2 size-4" />
						Cancel
					</Button>
					<Button type="submit" disabled={isPending} className="flex-1">
						<Save className="mr-2 size-4" />
						{isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</form>
		</Form>
	)
}
