import { type Route } from "next"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { AvatarCard } from "@/features/profile/components/avatar-card"
import { DefaultSignatureCard } from "@/features/profile/components/default-signature-card"
import { PersonalInformationCard } from "@/features/profile/components/personal-information-card"

export default function Page() {
	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Profile", url: "/profile" as Route }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
					<div className="mb-8 space-y-2">
						<h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
						<p className="text-muted-foreground text-sm">
							Manage your profile information and settings here.
						</p>
					</div>

					<AvatarCard />
					<PersonalInformationCard />
					<DefaultSignatureCard />
				</main>
			</div>
		</>
	)
}
