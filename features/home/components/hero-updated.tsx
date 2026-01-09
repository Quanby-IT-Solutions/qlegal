"use client"

import Link from "next/link"
import {
	ArrowRight,
	CheckCircle,
	Scale,
	Shield
} from "lucide-react"
import { motion } from "motion/react"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"

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

const floatingAnimation = {
	animate: {
		y: [0, -20, 0],
		rotate: [0, 5, 0]
	},
	transition: {
		duration: 6,
		repeat: Number.POSITIVE_INFINITY,
		ease: "easeInOut"
	}
}

export function Hero() {
	return (
		<section className="relative overflow-hidden pb-24 pt-20 sm:pt-24 lg:pt-40">

			{/* Background Elements */}
			<div className="absolute inset-0 bg-gradient-to-br from-[rgb(91,26,128)]/5 via-background to-[rgb(233,30,140)]/5" />

			{/* Grid Pattern */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />

			{/* Radial Gradient Overlay */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

			{/* Floating Orbs */}
			<motion.div
				className="pointer-events-none absolute left-10 top-20 h-72 w-72 rounded-full bg-gradient-to-r from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 blur-3xl"
				animate={{
					x: [0, 100, 0],
					y: [0, -50, 0]
				}}
				transition={{
					duration: 20,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut"
				}}
			/>
			<motion.div
				className="pointer-events-none absolute bottom-20 right-10 h-96 w-96 rounded-full bg-gradient-to-r from-[rgb(233,30,140)]/15 to-[rgb(91,26,128)]/15 blur-3xl"
				animate={{
					x: [0, -80, 0],
					y: [0, 30, 0]
				}}
				transition={{
					duration: 25,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut"
				}}
			/>

			<div className="relative z-10 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
				<div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
					{/* Left Content */}
					<motion.div
						variants={staggerContainer}
						initial="initial"
						animate="animate"
						className="space-y-8 text-center lg:text-left"
					>
						<motion.div variants={fadeInUp}>
							<motion.div
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5 }}
								className="mb-6 inline-flex items-center space-x-2 rounded-full border border-[rgb(91,26,128)]/20 bg-gradient-to-r from-[rgb(91,26,128)]/10 to-[rgb(233,30,140)]/10 px-4 py-2 backdrop-blur-sm"
							>
								<Shield className="h-4 w-4 text-[rgb(91,26,128)]" />
								<span className="text-sm font-medium text-muted-foreground">
									🇵🇭 Supreme Court Accredited ENF
								</span>
							</motion.div>

							<h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-6xl">
								Accredited{" "}
								<span className="bg-gradient-to-r from-[rgb(91,26,128)] via-[rgb(91,26,128)]/80 to-[rgb(233,30,140)] bg-clip-text text-transparent">
									Electronic Notarization
								</span>{" "}
								Platform
							</h1>
						</motion.div>

						<motion.p
							variants={fadeInUp}
							className="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground lg:mx-0 lg:text-2xl"
						>
							Secure, compliant, and Supreme Court accredited platform for electronic
							notarization in the Philippines.
						</motion.p>

						<motion.div
							variants={fadeInUp}
							className="flex flex-col gap-4 sm:flex-row lg:justify-start"
						>
							<Button
								asChild
								size="lg"
								className="group bg-gradient-to-r from-[rgb(91,26,128)] to-[rgb(91,26,128)]/90 px-8 py-6 text-lg shadow-xl transition-all duration-300 hover:from-[rgb(91,26,128)]/90 hover:to-[rgb(91,26,128)] hover:shadow-2xl"
							>
								<Link href="/auth/register">
									Get Started
									<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
						</motion.div>

						<motion.div
							variants={fadeInUp}
							className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground lg:justify-start"
						>
							<div className="flex items-center space-x-2">
								<div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
								<span>Supreme Court Compliant</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
								<span>Audit-Ready History</span>
							</div>
							<div className="flex items-center space-x-2">
								<div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
								<span>REN & IEN Support</span>
							</div>
						</motion.div>
					</motion.div>

					{/* Right Logo Section */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
						animate={{ opacity: 1, scale: 1, rotate: 0 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="relative flex justify-center lg:justify-end"
					>
						<div className="relative">
							{/* Main Logo Container */}
							<motion.div
								variants={floatingAnimation}
								animate="animate"
								className="relative flex h-96 w-96 items-center justify-center rounded-3xl border border-border/20 bg-gradient-to-br from-background via-background/80 to-background/60 shadow-2xl backdrop-blur-xl"
							>
								{/* Inner glow */}
								<div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-[rgb(91,26,128)]/10 to-[rgb(233,30,140)]/10" />

								{/* Logo */}
								<div className="relative z-10 flex h-48 w-48 items-center justify-center rounded-full border border-[rgb(91,26,128)]/30 bg-gradient-to-br from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20">
									<div className="h-32 w-32">
										<QuanbyLogo className="h-full w-full object-contain" />
									</div>
								</div>
							</motion.div>

							{/* Floating Elements */}
							<motion.div
								animate={{
									x: [0, 15, 0],
									y: [0, -10, 0],
									rotate: [0, 5, 0]
								}}
								transition={{
									duration: 4,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut"
								}}
								className="absolute -right-6 -top-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-[rgb(91,26,128)]/20 bg-gradient-to-br from-[rgb(91,26,128)]/20 to-[rgb(91,26,128)]/10 shadow-xl backdrop-blur-sm"
							>
								<Scale className="h-10 w-10 text-[rgb(91,26,128)]" />
							</motion.div>

							<motion.div
								animate={{
									x: [0, -12, 0],
									y: [0, 12, 0],
									rotate: [0, -5, 0]
								}}
								transition={{
									duration: 3.5,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
									delay: 1
								}}
								className="absolute -bottom-8 -left-8 flex h-16 w-16 items-center justify-center rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/20 to-green-400/10 shadow-xl backdrop-blur-sm"
							>
								<CheckCircle className="h-8 w-8 text-green-500" />
							</motion.div>

							<motion.div
								animate={{
									y: [0, -8, 0],
									rotate: [0, 3, 0]
								}}
								transition={{
									duration: 5,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
									delay: 2
								}}
								className="absolute -left-12 top-1/2 flex h-12 w-12 items-center justify-center rounded-lg border border-[rgb(233,30,140)]/20 bg-gradient-to-br from-[rgb(233,30,140)]/20 to-[rgb(233,30,140)]/10 shadow-lg backdrop-blur-sm"
							>
								<Shield className="h-6 w-6 text-[rgb(233,30,140)]" />
							</motion.div>

							{/* Decorative rings */}
							<motion.div
								animate={{ rotate: 360 }}
								transition={{
									duration: 20,
									repeat: Number.POSITIVE_INFINITY,
									ease: "linear"
								}}
								className="absolute inset-0 rounded-full border border-[rgb(91,26,128)]/10"
								style={{
									width: "120%",
									height: "120%",
									left: "-10%",
									top: "-10%"
								}}
							/>
							<motion.div
								animate={{ rotate: -360 }}
								transition={{
									duration: 30,
									repeat: Number.POSITIVE_INFINITY,
									ease: "linear"
								}}
								className="absolute inset-0 rounded-full border border-[rgb(233,30,140)]/10"
								style={{
									width: "140%",
									height: "140%",
									left: "-20%",
									top: "-20%"
								}}
							/>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	)
}
