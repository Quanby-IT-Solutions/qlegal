"use client"

import { Building2, Globe, Landmark, Scale, Shield, Users } from "lucide-react"
import { motion } from "motion/react"

const logos = [
	{ icon: Building2, name: "Corp One" },
	{ icon: Scale, name: "Legal Two" },
	{ icon: Shield, name: "Secure Three" },
	{ icon: Globe, name: "Global Four" },
	{ icon: Users, name: "People Five" },
	{ icon: Landmark, name: "Bank Six" },
	{ icon: Building2, name: "Corp Seven" },
	{ icon: Scale, name: "Legal Eight" },
]

export function TrustedBy() {
	return (
		<section className="relative overflow-hidden py-10 lg:py-16">
			{/* Background Elements */}
			<div className="via-background to-primary/3 absolute inset-0 bg-linear-to-br from-[rgb(91,26,128)]/3" />

			{/* Subtle Grid Pattern Fade */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:14px_24px]" />

			{/* Radial Gradient Overlay at Bottom - Fade into Features */}
			<div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,transparent_0%,hsl(var(--background))_70%)]" />

			<div className="relative z-10 container mx-auto px-4 text-center">
				<h3 className="text-muted-foreground mb-8 text-sm font-semibold tracking-wider uppercase">
					Trusted by industry leaders
				</h3>
				<div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
					<div className="group flex max-w-7xl flex-row gap-[var(--gap)] overflow-hidden p-2 [--gap:2rem]">
						<div className="animate-marquee flex shrink-0 flex-row justify-around gap-[var(--gap)] group-hover:[animation-play-state:paused]">
							{[...logos, ...logos].map((logo, key) => (
								<div
									key={key}
									className="flex items-center space-x-2 opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
								>
									<logo.icon className="h-8 w-8 lg:h-10 lg:w-10" />
									<span className="text-lg font-semibold lg:text-xl">{logo.name}</span>
								</div>
							))}
						</div>
						<div className="animate-marquee ml-[var(--gap)] flex shrink-0 flex-row justify-around gap-[var(--gap)] group-hover:[animation-play-state:paused]">
							{[...logos, ...logos].map((logo, key) => (
								<div
									key={key}
									className="flex items-center space-x-2 opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
								>
									<logo.icon className="h-8 w-8 lg:h-10 lg:w-10" />
									<span className="text-lg font-semibold lg:text-xl">{logo.name}</span>
								</div>
							))}
						</div>
					</div>
					<div className="from-background dark:from-background pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r"></div>
					<div className="from-background dark:from-background pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-linear-to-l"></div>
				</div>
			</div>
		</section>
	)
}
