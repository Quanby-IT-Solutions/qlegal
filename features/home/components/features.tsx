"use client"

import { FileSignature, Users, BookOpen, Video, Scan, Shield } from "lucide-react"
import { motion } from "motion/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"

const fadeInUp = {
	initial: { opacity: 0, y: 60 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6 }
}

const staggerContainer = {
	initial: {},
	animate: {
		transition: {
			staggerChildren: 0.1
		}
	}
}

const features = [
	{
		icon: Video,
		title: "IEN & REN Services",
		description: "Perform In-Person and Remote Electronic Notarization with HD videoconferencing and real-time collaboration"
	},
	{
		icon: Shield,
		title: "e-KYC & Multi-Factor Authentication",
		description: "BSP-compliant electronic Know-Your-Customer with facial recognition, biometrics, OTP, and liveness detection"
	},
	{
		icon: FileSignature,
		title: "Electronic Signatures & Seal",
		description: "Create and affix electronic signatures for ENPs, principals, and witnesses with electronic notarial seal"
	},
	{
		icon: BookOpen,
		title: "Notarial Book & SC Integration",
		description: "Automated notarial book with automatic transmission to Supreme Court Central Notarial Database"
	},
	{
		icon: Scan,
		title: "Secure Document Handling",
		description: "End-to-end encrypted uploading, viewing, transmission and archival in PDF/A format with tamper-evident security"
	},
	{
		icon: Users,
		title: "Geolocation & Access Management",
		description: "VPN detection, geo-restrictions, and automated access control for expired commissions and invalid IDs"
	}
]

export function Features() {
	return (
		<section className="relative overflow-hidden py-20 lg:py-32">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
			
			<div className="relative z-10 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
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
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground lg:text-xl">
						Comprehensive ENF platform compliant with Supreme Court Rules on Electronic Notarization
					</p>
				</motion.div>

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{features.map((feature, index) => (
							<motion.div
								key={feature.title}
								variants={fadeInUp}
								custom={index}
							>
								<Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
									<CardHeader>
										<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
											<feature.icon className="h-6 w-6 text-primary" />
										</div>
										<CardTitle className="text-xl">{feature.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground">
											{feature.description}
										</p>
									</CardContent>
								</Card>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>
		</section>
	)
}
