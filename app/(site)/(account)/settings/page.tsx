"use client"

import { type Route } from "next"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { trpc } from "@/services/trpc/client"

import { AddPasswordCard } from "@/features/settings/components/add-password-card"
import { ChangePasswordCard } from "@/features/settings/components/change-password-card"
import { PasswordCardSkeleton } from "@/features/settings/components/password-card-skeleton"
import { ToggleTwoFACard } from "@/features/settings/components/toggle-two-fa-card"

export default function Page() {
	const { data: userPasswordStatus, isLoading } = trpc.settings.checkUserHasPassword.useQuery()

	return (
		<>
			<SiteNavbar items={[{ label: "Settings", url: "/settings" as Route }]} />

			<div className="bg-muted/30 min-h-screen">
				<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
					<div className="mb-8 space-y-2">
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

					<ToggleTwoFACard />
				</main>
			</div>
		</>
	)
}
