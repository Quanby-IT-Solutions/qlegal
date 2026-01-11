"use client"

import { BookText, FileCheck, Scale, Shield } from "lucide-react"
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

const complianceItems = [
	{
		icon: Scale,
		title: "A.M. No. 24-10-14-SC",
		description: "Accredited ENF under Supreme Court Rules on Electronic Notarization",
		spotlightColor: "rgba(147, 51, 234, 0.2)", // Purple
	},
	{
		icon: FileCheck,
		title: "99.9% System Uptime",
		description: "Guaranteed operational reliability with real-time backup database",
		spotlightColor: "rgba(34, 197, 94, 0.2)", // Green
	},
	{
		icon: BookText,
		title: "SC Database Integration",
		description: "Automatic transmission to Central Notarial Database with real-time syncing",
		spotlightColor: "rgba(59, 130, 246, 0.2)", // Blue
	},
	{
		icon: Shield,
		title: "Data Privacy Compliant",
		description: "NPC registered with end-to-end encryption and BSP-compliant security measures",
		spotlightColor: "rgba(236, 72, 153, 0.2)", // Pink
	},
]

export function Compliance() {
	return (
		<section className="relative overflow-hidden py-20 lg:py-32">
			<div className="via-background absolute inset-0 bg-linear-to-br from-[rgb(233,30,140)]/5 to-[rgb(91,26,128)]/5" />

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
							Legally Compliant & Certified
						</h2>
						<p className="text-muted-foreground mx-auto max-w-2xl text-lg lg:text-xl">
							Built to meet Philippine Supreme Court requirements and national data standards
						</p>
					</motion.div>

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						{complianceItems.map((item, index) => (
							<motion.div key={item.title} variants={fadeInUp} custom={index}>
								<CardSpotlight
									className="border-border/50 bg-background/50 hover:border-border h-full pt-6 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
									spotlightColor={item.spotlightColor}
								>
									<CardHeader>
										<div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
											<item.icon className="text-primary h-6 w-6" />
										</div>
										<CardTitle className="text-xl">{item.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-muted-foreground text-sm">{item.description}</p>
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
