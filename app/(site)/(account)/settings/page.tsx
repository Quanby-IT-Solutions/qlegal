"use client"

import { trpc } from "@/services/trpc/client"

import { AddPasswordCard } from "@/features/settings/components/add-password-card"
import { ChangePasswordCard } from "@/features/settings/components/change-password-card"
import { PasswordCardSkeleton } from "@/features/settings/components/password-card-skeleton"

export default function Page() {
	const { data: userPasswordStatus, isLoading } = trpc.settings.checkUserHasPassword.useQuery()

	return (
		<main className="mx-auto mt-16 min-h-dvh max-w-4xl space-y-8 px-4 pt-14 sm:px-6 lg:px-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Account Settings</h1>
				<p className="text-muted-foreground text-sm">
					Manage your account information and settings here.
				</p>
			</div>

			{isLoading ? (
				<PasswordCardSkeleton />
			) : userPasswordStatus?.hasPassword ? (
				<ChangePasswordCard />
			) : (
				<AddPasswordCard />
			)}
		</main>
	)
}
