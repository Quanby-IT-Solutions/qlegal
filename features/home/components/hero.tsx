"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle, FileSignature, Scale, Shield, Users } from "lucide-react"
import { motion } from "motion/react"
import { useTheme } from "next-themes"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"
import { LineShadowText } from "@/core/components/ui/line-shadow-text"
import { OrbitingCircles } from "@/core/components/ui/orbiting-circles"
import { TextGenerateEffect } from "@/core/components/ui/text-generate-effect"

interface HeroProps {
	isAuthenticated?: boolean
}

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

export function Hero({ isAuthenticated = false }: HeroProps) {
	const theme = useTheme()
	// Use useState to ensure consistent initial render (matches server)
	const [shadowColor, setShadowColor] = useState<"white" | "black">("black")

	// Update shadow color after hydration to match theme
	useEffect(() => {
		setShadowColor(theme.resolvedTheme === "dark" ? "white" : "black")
	}, [theme.resolvedTheme])

	return (
		<section className="relative w-full overflow-hidden pt-48 pb-16 sm:pb-24 lg:pt-40">
			{/* Background Elements */}
			<div className="via-background absolute inset-0 bg-linear-to-br from-[rgb(91,26,128)]/5 to-[rgb(233,30,140)]/5" />

			{/* Grid Pattern */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px]" />

			{/* Radial Gradient Overlay */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

			{/* Noise Texture */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.015]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			/>

			{/* Floating Orbs - Kept subtle for background ambience */}
			<motion.div
				className="pointer-events-none absolute top-20 left-10 h-72 w-72 rounded-full bg-linear-to-r from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 blur-3xl"
				animate={{
					x: [0, 100, 0],
					y: [0, -50, 0],
				}}
				transition={{
					duration: 20,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			/>
			<motion.div
				className="pointer-events-none absolute right-10 bottom-20 h-96 w-96 rounded-full bg-linear-to-r from-[rgb(233,30,140)]/15 to-[rgb(91,26,128)]/15 blur-3xl"
				animate={{
					x: [0, -80, 0],
					y: [0, 30, 0],
				}}
				transition={{
					duration: 25,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			/>

			<div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
								className="mb-6 inline-flex items-center space-x-2 rounded-full border border-[rgb(91,26,128)]/20 bg-linear-to-r from-[rgb(91,26,128)]/10 to-[rgb(233,30,140)]/10 px-4 py-2 backdrop-blur-sm"
							>
								<Shield className="h-4 w-4 text-[rgb(91,26,128)]" />
								<span className="text-muted-foreground text-sm font-medium">
									🇵🇭 Supreme Court Accredited
								</span>
							</motion.div>

							<h1 className="leading-tighter text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
								<span className="bg-linear-to-r from-[rgb(91,26,128)] via-[rgb(91,26,128)]/80 to-[rgb(233,30,140)] bg-clip-text text-transparent">
									Electronic Notarization
								</span>{" "}
								<LineShadowText shadowColor={shadowColor}>Platform</LineShadowText>
							</h1>
						</motion.div>

						<div className="min-h-24">
							<TextGenerateEffect
								words="The Philippines' legal consultation and electronic notarization platform—secure, compliant, and trusted by legal professionals nationwide."
								className="text-muted-foreground text-base leading-relaxed font-normal sm:text-lg lg:text-xl"
							/>
						</div>

						<motion.div
							variants={fadeInUp}
							className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start"
						>
							{isAuthenticated ? (
								<Button
									asChild
									size="lg"
									className="group from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-linear-to-r px-8 py-6 text-base shadow-xl transition-all duration-300 hover:shadow-2xl sm:text-lg"
								>
									<Link href="/dashboard">
										Go to Dashboard
										<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
							) : (
								<Button
									asChild
									size="lg"
									className="group from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-linear-to-r px-8 py-6 text-base shadow-xl transition-all duration-300 hover:shadow-2xl sm:text-lg"
								>
									<Link href="/auth/register">
										Get Started
										<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
									</Link>
								</Button>
							)}
						</motion.div>

						<motion.div
							variants={fadeInUp}
							className="text-muted-foreground flex flex-wrap items-center justify-center gap-6 text-sm lg:justify-start"
						>
							<div className="flex items-center space-x-2">
								<div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
								<span>Bank-Level Security</span>
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
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.8, delay: 0.2 }}
						className="relative hidden h-137.5 w-full flex-col items-center justify-center overflow-hidden lg:flex lg:h-162.5 lg:justify-center"
					>
						{/* Center Logo */}
						<div className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full border border-[rgb(91,26,128)]/30 bg-linear-to-br from-[rgb(91,26,128)]/20 to-[rgb(233,30,140)]/20 shadow-2xl backdrop-blur-md">
							<QuanbyLogo className="h-24 w-24 object-contain" />
						</div>

						{/* Inner Orbit */}
						<OrbitingCircles iconSize={35} radius={125} duration={20} delay={0}>
							<div className="flex size-14 items-center justify-center rounded-full border border-[rgb(91,26,128)]/30 bg-linear-to-br from-[rgb(91,26,128)]/20 to-[rgb(91,26,128)]/10 shadow-lg backdrop-blur-sm">
								<Scale className="size-7 text-[rgb(91,26,128)]" />
							</div>
						</OrbitingCircles>
						<OrbitingCircles iconSize={35} radius={125} duration={20} delay={10}>
							<div className="flex size-14 items-center justify-center rounded-full border border-[rgb(233,30,140)]/30 bg-linear-to-br from-[rgb(233,30,140)]/20 to-[rgb(233,30,140)]/10 shadow-lg backdrop-blur-sm">
								<FileSignature className="size-7 text-[rgb(233,30,140)]" />
							</div>
						</OrbitingCircles>

						{/* Outer Orbit */}
						<OrbitingCircles iconSize={45} radius={225} reverse duration={25} delay={0}>
							<div className="flex size-18 items-center justify-center rounded-full border border-green-500/30 bg-linear-to-br from-green-500/20 to-emerald-500/10 shadow-lg backdrop-blur-sm">
								<Shield className="size-9 text-green-500" />
							</div>
						</OrbitingCircles>
						<OrbitingCircles iconSize={45} radius={225} reverse duration={25} delay={8}>
							<div className="flex size-18 items-center justify-center rounded-full border border-blue-500/30 bg-linear-to-br from-blue-500/20 to-cyan-500/10 shadow-lg backdrop-blur-sm">
								<CheckCircle className="size-9 text-blue-500" />
							</div>
						</OrbitingCircles>
						<OrbitingCircles iconSize={45} radius={225} reverse duration={25} delay={16}>
							<div className="flex size-18 items-center justify-center rounded-full border border-purple-500/30 bg-linear-to-br from-purple-500/20 to-pink-500/10 shadow-lg backdrop-blur-sm">
								<Users className="size-9 text-purple-500" />
							</div>
						</OrbitingCircles>
					</motion.div>
				</div>
			</div>
		</section>
	)
}
