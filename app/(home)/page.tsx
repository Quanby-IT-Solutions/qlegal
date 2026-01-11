"use client"

import { Compliance } from "@/features/home/components/compliance"
import { CTA } from "@/features/home/components/cta"
import { Features } from "@/features/home/components/features"
import { Footer } from "@/features/home/components/footer"
import { Header } from "@/features/home/components/header"
import { Hero } from "@/features/home/components/hero"
import { Navbar } from "@/features/home/components/navbar"

export default function Page() {
	return (
		<div className="relative">
			<Navbar />
			{/* <Header transition={true} /> */}

			{/* Hero Section */}
			<div className="bg-background flex h-dvh w-full items-center">
				<div className="w-full">
					<Hero />
				</div>
			</div>

			{/* Additional Sections */}
			<Features />
			<Compliance />
			<CTA />
			<Footer />
		</div>
	)
}
