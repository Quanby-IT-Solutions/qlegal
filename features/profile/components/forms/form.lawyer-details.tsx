"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Separator } from "@/core/components/ui/separator"

import { trpc } from "@/services/trpc/client"

// Schema for lawyer pricing - based on Rules on eNotarization
const lawyerPricingSchema = z.object({
	// Consultation
	consultationPrice: z.string().min(1, "Consultation price is required"),
	
	// Notarial Acts (as per Rules on eNotarization, Rule IV)
	acknowledgmentPrice: z.string().min(1, "Acknowledgment price is required"),
	affirmationPrice: z.string().min(1, "Affirmation or Oath price is required"),
	juratPrice: z.string().min(1, "Jurat price is required"),
	signatureWitnessingPrice: z.string().min(1, "Signature Witnessing price is required"),
})

type LawyerPricingSchema = z.infer<typeof lawyerPricingSchema>

export function LawyerDetailsForm() {
	const { data: enpProfile, isLoading } = trpc.profile.getEnpProfile.useQuery()

	const form = useForm<LawyerPricingSchema>({
		resolver: zodResolver(lawyerPricingSchema),
		values: {
			consultationPrice: enpProfile?.consultationPrice?.toString() ?? "",
			acknowledgmentPrice: enpProfile?.acknowledgmentPrice?.toString() ?? "",
			affirmationPrice: enpProfile?.affirmationPrice?.toString() ?? "",
			juratPrice: enpProfile?.juratPrice?.toString() ?? "",
			signatureWitnessingPrice: enpProfile?.signatureWitnessingPrice?.toString() ?? "",
		},
	})

	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.profile.updateLawyerPricing.useMutation({
		onSuccess: async (data) => {
			await utils.profile.getEnpProfile.invalidate()
			toast.success(data.message)
			form.reset(form.getValues())
		},
		onError: (err) => toast.error(err.message),
	})

	const onSubmit = (values: LawyerPricingSchema) => {
		mutate({
			consultationPrice: parseFloat(values.consultationPrice),
			acknowledgmentPrice: parseFloat(values.acknowledgmentPrice),
			affirmationPrice: parseFloat(values.affirmationPrice),
			juratPrice: parseFloat(values.juratPrice),
			signatureWitnessingPrice: parseFloat(values.signatureWitnessingPrice),
		})
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<p className="text-muted-foreground">Loading lawyer details...</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
					{/* Consultation Section */}
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-semibold">Consultation</h3>
							<p className="text-sm text-muted-foreground">
								Set your pricing for legal consultation services
							</p>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="consultationPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Consultation Price</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													₱
												</span>
												<Input
													type="number"
													step="0.01"
													placeholder="9898"
													className="pl-7"
													autoComplete="off"
													{...field}
												/>
											</div>
										</FormControl>
										<FormDescription>
											Price per consultation session in Philippine Peso (₱)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<Separator />

					{/* eNotarization Section */}
					<div className="space-y-4">
						<div>
							<h3 className="text-lg font-semibold">eNotarization Acts</h3>
							<p className="text-sm text-muted-foreground">
								Set your pricing for eNotarization services as per Rules on eNotarization, Rule IV
							</p>
						</div>
						{/* Responsive Grid: 1 column on mobile, 2 columns on larger screens */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="acknowledgmentPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Acknowledgment</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													₱
												</span>
												<Input
													type="number"
													step="0.01"
													placeholder="908"
													className="pl-7"
													autoComplete="off"
													{...field}
												/>
											</div>
										</FormControl>
										<FormDescription className="text-xs">
											Section 1, Rule IV
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="affirmationPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Affirmation or Oath</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													₱
												</span>
												<Input
													type="number"
													step="0.01"
													placeholder="908"
													className="pl-7"
													autoComplete="off"
													{...field}
												/>
											</div>
										</FormControl>
										<FormDescription className="text-xs">
											Section 2, Rule IV
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="juratPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Jurat</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													₱
												</span>
												<Input
													type="number"
													step="0.01"
													placeholder="908"
													className="pl-7"
													autoComplete="off"
													{...field}
												/>
											</div>
										</FormControl>
										<FormDescription className="text-xs">
											Section 3, Rule IV
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="signatureWitnessingPrice"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Signature Witnessing</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													₱
												</span>
												<Input
													type="number"
													step="0.01"
													placeholder="908"
													className="pl-7"
													autoComplete="off"
													{...field}
												/>
											</div>
										</FormControl>
										<FormDescription className="text-xs">
											Section 4, Rule IV
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>

					<div className="flex justify-start">
						<Button type="submit" disabled={isPending}>
							{isPending ? "Updating Pricing..." : "Update Pricing"}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	)
}