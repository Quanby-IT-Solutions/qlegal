"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

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
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

const witnessFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email().optional().or(z.literal("")),
	phoneNumber: z.string().optional().or(z.literal("")),
	address: z.string().optional().or(z.literal("")),
	idType: z.enum(["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "OTHER"]).optional(),
	idNumber: z.string().optional().or(z.literal("")),
	notes: z.string().optional().or(z.literal("")),
})

type WitnessFormData = z.infer<typeof witnessFormSchema>

interface AddWitnessDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	appointmentId?: string
}

export function AddWitnessDialog({ open, onOpenChange, appointmentId }: AddWitnessDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const utils = trpc.useUtils()

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		watch,
	} = useForm<WitnessFormData>({
		resolver: zodResolver(witnessFormSchema),
		defaultValues: {
			name: "",
			email: "",
			phoneNumber: "",
			address: "",
			idType: undefined,
			idNumber: "",
			notes: "",
		},
	})

	const createWitness = trpc.witnesses.createWitness.useMutation({
		onSuccess: () => {
			toast.success("Witness added successfully!")
			// Invalidate witnesses query to refresh the list
			void utils.witnesses.getMyWitnesses.invalidate()
			reset()
			onOpenChange(false)
		},
		onError: error => {
			toast.error(error.message || "Failed to add witness")
		},
	})

	const onSubmit = async (data: WitnessFormData) => {
		setIsSubmitting(true)
		try {
			await createWitness.mutateAsync({
				name: data.name,
				email: data.email || undefined,
				phoneNumber: data.phoneNumber || undefined,
				address: data.address || undefined,
				idType: data.idType,
				idNumber: data.idNumber || undefined,
				appointmentId: appointmentId,
				notes: data.notes || undefined,
			})
		} catch (error) {
			// Error is handled by mutation onError
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] w-[95vw] max-w-6xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add New Witness</DialogTitle>
					<DialogDescription>
						Register a new witness for IEN notarization sessions. You can verify their ID and
						capture their signature later.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div className="grid grid-cols-2 gap-4 py-2">
						{/* Name - Full Width */}
						<div className="col-span-2 space-y-2">
							<Label htmlFor="name">Full Name *</Label>
							<Input
								id="name"
								{...register("name")}
								placeholder="John Doe"
								className={errors.name ? "border-red-500" : ""}
							/>
							{errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								{...register("email")}
								placeholder="john.doe@example.com"
								className={errors.email ? "border-red-500" : ""}
							/>
							{errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
						</div>

						{/* Phone */}
						<div className="space-y-2">
							<Label htmlFor="phoneNumber">Phone Number</Label>
							<Input
								id="phoneNumber"
								{...register("phoneNumber")}
								placeholder="+1 (555) 123-4567"
								className={errors.phoneNumber ? "border-red-500" : ""}
							/>
						</div>

						{/* Address - Full Width */}
						<div className="col-span-2 space-y-2">
							<Label htmlFor="address">Address</Label>
							<Textarea
								id="address"
								{...register("address")}
								placeholder="123 Main St, City, State, ZIP"
								rows={1}
							/>
						</div>

						{/* ID Type */}
						<div className="space-y-2">
							<Label htmlFor="idType">ID Type</Label>
							<Select
								value={watch("idType") || undefined}
								onValueChange={value =>
									setValue("idType", value === "none" ? undefined : (value as any))
								}
							>
								<SelectTrigger id="idType">
									<SelectValue placeholder="Select ID type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									<SelectItem value="PASSPORT">Passport</SelectItem>
									<SelectItem value="DRIVERS_LICENSE">Driver's License</SelectItem>
									<SelectItem value="NATIONAL_ID">National ID</SelectItem>
									<SelectItem value="OTHER">Other</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* ID Number */}
						<div className="space-y-2">
							<Label htmlFor="idNumber">ID Number</Label>
							<Input
								id="idNumber"
								{...register("idNumber")}
								placeholder="Enter ID number"
								className="font-mono"
							/>
						</div>

						{/* Notes - Full Width */}
						<div className="col-span-2 space-y-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								{...register("notes")}
								placeholder="Additional information about this witness..."
								rows={2}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								reset()
								onOpenChange(false)
							}}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Adding..." : "Add Witness"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
