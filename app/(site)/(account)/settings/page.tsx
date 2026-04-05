"use client"

import { type Route } from "next"
import { useSession } from "next-auth/react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"

import { trpc } from "@/services/trpc/client"

import { SavedIdsCard } from "@/features/kyc/components/saved-ids-card"
import { AddPasswordCard } from "@/features/settings/components/add-password-card"
import { AddressCard } from "@/features/settings/components/address-card"
import { AvailabilityToggleCard } from "@/features/settings/components/availability-toggle-card"
import { ChangePasswordCard } from "@/features/settings/components/change-password-card"
import { PasswordCardSkeleton } from "@/features/settings/components/password-card-skeleton"
import { RecoveryEmailCard } from "@/features/settings/components/recovery-email-card"
import { ToggleTwoFACard } from "@/features/settings/components/toggle-two-fa-card"

export default function Page() {
	const { data: session } = useSession()
	const { data: userPasswordStatus, isLoading } = trpc.settings.checkUserHasPassword.useQuery()

	const isENP = session?.user?.role === "ENP"
	const isPrincipal = session?.user?.role === "PRINCIPAL"

	return (
		<>
			<SiteNavbar items={[{ label: "Settings", url: "/settings" as Route }]} showUserMenu={false} />

			<div className="bg-muted/30 min-h-screen">
				<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
					<div className="h-8" />
					<RecoveryEmailCard />
					<div className="h-8" />
					<ToggleTwoFACard />
					<div className="h-8" />
					<SavedIdsCard />
					{isPrincipal && (
						<>
							<div className="h-8" />
							<AddressCard />
						</>
					)}
					{isENP && (
						<>
							<div className="h-8" />
							<AvailabilityToggleCard />
							<div className="h-8" />
						</>
					)}
				</main>
			</div>
		</>
	)
}
