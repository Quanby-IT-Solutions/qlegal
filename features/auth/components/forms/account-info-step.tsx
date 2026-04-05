"use client"

import { type UseFormReturn } from "react-hook-form"

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { InputPassword } from "@/core/components/ui/input-password"
import { PasswordRequirementsChecklist } from "@/core/components/password-requirements-checklist"

import { type LawyerRegisterSchema } from "@/features/auth/api/auth.schemas"

interface AccountInfoStepProps {
	form: UseFormReturn<LawyerRegisterSchema>
}

export function AccountInfoStep({ form }: AccountInfoStepProps) {
	const password = form.watch("password")

	return (
		<div className="space-y-4">
			<FormField
				control={form.control}
				name="firstName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>First name</FormLabel>
						<FormControl>
							<Input placeholder="Enter your first name" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="middleName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Middle name</FormLabel>
						<FormControl>
							<Input placeholder="Enter your middle name (optional)" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="lastName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Last name</FormLabel>
						<FormControl>
							<Input placeholder="Enter your last name" {...field} />
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
							<Input type="email" placeholder="Enter your email" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="password"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Password</FormLabel>
						<FormControl>
							<InputPassword placeholder="Create a password" {...field} />
						</FormControl>
						<PasswordRequirementsChecklist password={password} />
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="confirmPassword"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Confirm Password</FormLabel>
						<FormControl>
							<InputPassword placeholder="Confirm your password" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	)
}
