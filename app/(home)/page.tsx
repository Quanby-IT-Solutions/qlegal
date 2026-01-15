"use client"

import { Compliance } from "@/features/home/components/compliance"
import { CTA } from "@/features/home/components/cta"
import { Features } from "@/features/home/components/features"
import { Footer } from "@/features/home/components/footer"
import { Hero } from "@/features/home/components/hero"
import { Navbar } from "@/features/home/components/navbar"
import { TrustedBy } from "@/features/home/components/trusted-by"

export default function Page() {
	return (
		<div className="relative">
			<Navbar />

			{/* Hero Section */}
			<div className="bg-background flex h-dvh w-full items-center">
				<div className="w-full">
					<Hero />
				</div>
			</div>

			{/* Additional Sections */}
			<TrustedBy />
			<Features />
			<Compliance />
			<CTA />
			<Footer />
		</div>
	)
}
