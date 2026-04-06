"use client"

import { useSession } from "next-auth/react"

import { PageHeader } from "@/core/components/navbar/page-header"

import { AvatarCard } from "@/features/profile/components/avatar-card"
import { CertificationsCard } from "@/features/profile/components/certifications-card"
import { IdentityVerificationCard } from "@/features/profile/components/identity-verification-card"
import { LawyerDetailsCard } from "@/features/profile/components/lawyer-details-card"
import { LicensingCard } from "@/features/profile/components/licensing-card"
import { PersonalInformationCard } from "@/features/profile/components/personal-information-card"
import { RollRegistrationCard } from "@/features/profile/components/roll-registration-card"

export default function Page() {
	const { data: session } = useSession()

	const isENP = session?.user?.role === "ENP"
	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Profile", href: "/profile" }]} />
			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-7xl space-y-8">
					<div className="space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
						<p className="text-muted-foreground text-sm">
							Manage your profile information and settings here.
						</p>
					</div>

					<AvatarCard />
					<IdentityVerificationCard />
					<PersonalInformationCard />
					{isENP && (
						<>
							<LawyerDetailsCard />
							<RollRegistrationCard />
							<LicensingCard />
							<CertificationsCard />
						</>
					)}
				</div>
			</main>
		</div>
	)
}
