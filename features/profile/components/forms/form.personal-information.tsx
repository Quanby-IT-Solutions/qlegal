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
import { Input } from "@/core/components/ui/input"

import { trpc } from "@/services/trpc/client"

import {
	personalInformationSchema,
	type PersonalInformationSchema,
} from "@/features/profile/api/profile.schema"

export function PersonalInformationForm() {
	const { data } = trpc.profile.getPersonalInformation.useQuery()

	const form = useForm({
		resolver: zodResolver(personalInformationSchema),
		values: {
			name: data?.name ?? "",
			email: data?.email ?? "",
			phoneNumber: data?.phoneNumber ?? "",
		},
	})

	const { update: updateSession } = useSession()
	const router = useRouter()
	const utils = trpc.useUtils()

	const { mutate, isPending } = trpc.profile.updatePersonalInformation.useMutation({
		onSuccess: async data => {
			router.refresh()
			await Promise.all([
				updateSession({ user: data.user }),
				utils.profile.getPersonalInformation.invalidate(),
			])
			toast.success(data.message)
		},
		onError: err => toast.error(err.message),
	})

	const onSubmit = (values: PersonalInformationSchema) => mutate(values)

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Name</FormLabel>
								<FormControl>
									<Input placeholder="Enter your name" autoComplete="name" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										type="email"
										placeholder="Enter your email"
										autoComplete="email"
										disabled
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="phoneNumber"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Phone Number</FormLabel>
								<FormControl>
									<Input placeholder="Enter your phone number" autoComplete="tel" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<Button type="submit" className="mt-4" disabled={isPending}>
					{isPending ? "Updating Personal Information..." : "Update Personal Information"}
				</Button>
			</form>
		</Form>
	)
}
