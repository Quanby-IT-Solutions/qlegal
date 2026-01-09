"use client"

import { Shield, FileCheck, BookText, Scale } from "lucide-react"
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

const complianceItems = [
	{
		icon: Scale,
		title: "A.M. No. 24-10-14-SC",
		description: "Accredited ENF under Supreme Court Rules on Electronic Notarization"
	},
	{
		icon: FileCheck,
		title: "99.9% System Uptime",
		description: "Guaranteed operational reliability with real-time backup database"
	},
	{
		icon: BookText,
		title: "SC Database Integration",
		description: "Automatic transmission to Central Notarial Database with real-time syncing"
	},
	{
		icon: Shield,
		title: "Data Privacy Compliant",
		description: "NPC registered with end-to-end encryption and BSP-compliant security measures"
	}
]

export function Compliance() {
	return (
		<section className="relative overflow-hidden py-20 lg:py-32">
			<div className="absolute inset-0 bg-gradient-to-br from-[rgb(233,30,140)]/5 via-background to-[rgb(91,26,128)]/5" />
			
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
							Legally Compliant & Certified
						</h2>
						<p className="mx-auto max-w-2xl text-lg text-muted-foreground lg:text-xl">
							Built to meet Philippine Supreme Court requirements and national data standards
						</p>
					</motion.div>

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						{complianceItems.map((item, index) => (
							<motion.div
								key={item.title}
								variants={fadeInUp}
								custom={index}
							>
								<Card className="h-full border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
									<CardHeader>
										<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
											<item.icon className="h-6 w-6 text-primary" />
										</div>
										<CardTitle className="text-xl">{item.title}</CardTitle>
									</CardHeader>
									<CardContent>
										<p className="text-sm text-muted-foreground">
											{item.description}
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
