import { AvatarCard } from "@/features/profile/components/avatar-card"
import { DefaultSignatureCard } from "@/features/profile/components/default-signature-card"
import { PersonalInformationCard } from "@/features/profile/components/personal-information-card"

export default function Page() {
	return (
		<main className="mx-auto mt-16 min-h-dvh max-w-4xl space-y-8 px-4 pt-14 sm:px-6 lg:px-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
				<p className="text-muted-foreground text-sm">
					Manage your profile information and settings here.
				</p>
			</div>

			<AvatarCard />
			<PersonalInformationCard />
			<DefaultSignatureCard />
		</main>
	)
}
