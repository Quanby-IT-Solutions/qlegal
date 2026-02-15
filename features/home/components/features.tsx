"use client"

import { BookOpen, FileSignature, Scan, Shield, Users, Video } from "lucide-react"
import { motion } from "motion/react"

import { CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { CardSpotlight } from "@/core/components/ui/card-spotlight"

const fadeInUp = {
	initial: { opacity: 0, y: 60 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6 },
}

const staggerContainer = {
	initial: {},
	animate: {
		transition: {
			staggerChildren: 0.1,
		},
	},
}

const features = [
	{
		icon: Video,
		title: "IEN & REN Services",
		description:
			"Perform In-Person and Remote Electronic Notarization with HD videoconferencing and real-time collaboration",
		spotlightColor: "rgba(0, 229, 255, 0.2)", // Cyan
	},
	{
		icon: Shield,
		title: "e-KYC & Multi-Factor Authentication",
		description:
			"Compliant electronic Know-Your-Customer with facial recognition, biometrics, OTP, and liveness detection",
		spotlightColor: "rgba(0, 255, 127, 0.2)", // Spring Green
	},
	{
		icon: FileSignature,
		title: "Electronic Signatures & Seal",
		description:
			"Create and affix electronic signatures for ENPs, principals, and witnesses with electronic notarial seal",
		spotlightColor: "rgba(255, 0, 127, 0.2)", // Rose
	},
	{
		icon: BookOpen,
		title: "Notarial Book & Registry Integration",
		description: "Automated notarial book with automatic transmission to Central Notarial Registry",
		spotlightColor: "rgba(138, 43, 226, 0.2)", // Blue Violet
	},
	{
		icon: Scan,
		title: "Secure Document Handling",
		description:
			"End-to-end encrypted uploading, viewing, transmission and archival in PDF/A format with tamper-evident security",
		spotlightColor: "rgba(255, 165, 0, 0.2)", // Orange
	},
	{
		icon: Users,
		title: "Geolocation & Access Management",
		description:
			"VPN detection, geo-restrictions, and automated access control for expired commissions and invalid IDs",
		spotlightColor: "rgba(65, 105, 225, 0.2)", // Royal Blue
	},
]

export function Features() {
	return (
		<section className="relative overflow-hidden py-20 lg:py-32">
			{/* Background Elements */}
			<div className="from-primary/3 via-background to-secondary/5 absolute inset-0 bg-linear-to-br" />

			{/* Radial Gradient Overlay at Top - Fade from TrustedBy */}
			<div className="absolute inset-x-0 top-0 h-1/3 bg-[radial-gradient(ellipse_at_top,transparent_0%,hsl(var(--background))_60%)]" />

			<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<motion.div
					variants={staggerContainer}
					initial="initial"
					whileInView="animate"
					viewport={{ once: true }}
					className="space-y-12"
				>
					<motion.div variants={fadeInUp} className="text-center">
						<h2 className="mb-4 text-3xl font-bold tracking-tight lg:text-5xl">
							Full-Featured Electronic Notarization Facility
						</h2>
						<p className="text-muted-foreground mx-auto max-w-2xl text-lg lg:text-xl">
							Comprehensive ENF platform compliant with Electronic Notarization standards and
							regulations
						</p>
					</motion.div>

					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
						{features.map((feature, index) => (
							<motion.div key={feature.title} variants={fadeInUp} custom={index}>
								<CardSpotlight
									className="border-border/50 bg-background/50 hover:border-border h-full p-8 pt-8 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
									spotlightColor={feature.spotlightColor}
								>
									<CardHeader className="pb-4">
										<div className="bg-primary/10 mb-6 flex h-14 w-14 items-center justify-center rounded-lg">
											<feature.icon className="text-primary h-7 w-7" />
										</div>
										<CardTitle className="text-2xl">{feature.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground text-base leading-relaxed">
											{feature.description}
										</p>
									</CardContent>
								</CardSpotlight>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>
		</section>
	)
}
