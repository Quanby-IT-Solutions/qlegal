"use client"

import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { motion } from "motion/react"

import { Button } from "@/core/components/ui/button"

const fadeInUp = {
	initial: { opacity: 0, y: 60 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6 },
}

export function CTA() {
	return (
		<section className="relative overflow-hidden py-20 lg:py-32">
			<div className="from-primary/10 via-secondary/10 to-primary/10 absolute inset-0 bg-linear-to-br" />

			<div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<motion.div
					initial="initial"
					whileInView="animate"
					viewport={{ once: true }}
					variants={fadeInUp}
					className="border-border/50 from-primary/20 to-secondary/20 relative overflow-hidden rounded-3xl border bg-linear-to-br p-12 text-center backdrop-blur-sm lg:p-16"
				>
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

					<div className="relative z-10 mx-auto max-w-2xl space-y-6">
						<h2 className="text-3xl font-bold tracking-tight lg:text-5xl">
							Ready for Compliant E-Notarization?
						</h2>
						<p className="text-muted-foreground text-lg lg:text-xl">
							Join Quanby Legal, the Supreme Court accredited ENF trusted by Electronic Notaries
							Public.
						</p>
						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Button
								asChild
								size="lg"
								className="group from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-linear-to-r px-8 py-6 text-lg shadow-xl transition-all duration-300 hover:shadow-2xl"
							>
								<Link href="/auth/register">
									Create Account
									<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="border-border/50 bg-background/50 hover:border-border hover:bg-background/80 px-8 py-6 text-lg backdrop-blur-sm transition-all duration-300"
							>
								<Link href="/find-notary">
									<Users className="mr-2 h-5 w-5" />
									Find a Notary
								</Link>
							</Button>
						</div>
					</div>
				</motion.div>
			</div>
		</section>
	)
}
