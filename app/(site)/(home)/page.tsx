import { auth } from "@/services/next-auth"

import { Footer } from "@/features/home/components/footer"
import { Hero } from "@/features/home/components/hero"
import { Navbar } from "@/features/home/components/navbar"
import { RecentEnvelopes } from "@/features/home/components/recent-envelopes"

export default async function Page() {
	const session = await auth()
	const isAuthenticated = !!session?.user

	return (
		<div className="flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
			{/* Animated Navbar */}
			<Navbar isAuthenticated={isAuthenticated} />

			{/* Content */}
			<div className="flex flex-1 flex-col">
				<Hero
					title1="Digitally Sign"
					title2="Documents"
					description="Instantly sign documents online—fast, secure, and legally binding. No hassle, just signatures."
				/>

				{isAuthenticated && <RecentEnvelopes />}

				<Footer />
			</div>
		</div>
	)
}
