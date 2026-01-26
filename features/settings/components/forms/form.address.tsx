"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSession } from "next-auth/react"
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
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import { addressSchema, type AddressSchema } from "@/features/profile/api/profile.schema"

export function AddressForm() {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const { data } = trpc.profile.getAddress.useQuery()

	const form = useForm({
		resolver: zodResolver(addressSchema),
		values: {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			address: data?.address ?? "",
		},
	})

	const { update: updateSession } = useSession()
	const router = useRouter()
	const utils = trpc.useUtils()

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
	const { mutate, isPending } = trpc.profile.updateAddress.useMutation({
		onSuccess: async data => {
			router.refresh()
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			await Promise.all([updateSession({ user: data.user }), utils.profile.getAddress.invalidate()])
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
			toast.success(data.message)
		},
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
		onError: err => toast.error(err.message),
	})

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
	const onSubmit = (values: AddressSchema) => mutate(values)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="address"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Address</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Enter your complete address (street, city, state, zip code)"
									className="min-h-24 resize-none"
									autoComplete="street-address"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
				<Button type="submit" className="mt-4" disabled={isPending}>
					{isPending ? "Updating Address..." : "Update Address"}
				</Button>
			</form>
		</Form>
	)
}
