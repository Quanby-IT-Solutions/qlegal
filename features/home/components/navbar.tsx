"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useSession } from "next-auth/react"

import { ModeToggle } from "@/core/components/mode-toggle"
import { SiteUser } from "@/core/components/navbar/site-user"
import { QuanbyLogo } from "@/core/components/quanby-logo"
import { buttonVariants } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { cn } from "@/core/lib/utils"

interface NavbarProps {
	isAuthenticated?: boolean
}

export function Navbar({ isAuthenticated }: NavbarProps) {
	const [isScrolled, setIsScrolled] = useState(false)
	const [hasAnimated, setHasAnimated] = useState(false)
	const isMobile = useIsMobile()
	const { data: session } = useSession()

	const isUserAuthenticated = session?.user ? true : (isAuthenticated ?? false)

	useEffect(() => {
		const timer = setTimeout(() => setHasAnimated(true), 1800)
		return () => clearTimeout(timer)
	}, [])

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 50)
		window.addEventListener("scroll", handleScroll, { passive: true })
		handleScroll()
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<motion.nav
			initial={{ y: -100, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{
				duration: 0.8,
				delay: 1,
				ease: [0.23, 0.86, 0.39, 0.96],
			}}
			className="fixed inset-x-0 top-0 z-50 flex justify-center"
		>
			<NavbarContainer isScrolled={isScrolled && hasAnimated} isMobile={isMobile}>
				<NavbarContent
					isAuthenticated={isUserAuthenticated}
					isScrolled={isScrolled && hasAnimated}
				/>
			</NavbarContainer>

			<NavbarBackground isScrolled={isScrolled && hasAnimated} isMobile={isMobile} />
		</motion.nav>
	)
}

function NavbarContainer({
	isScrolled,
	isMobile,
	children,
}: {
	isScrolled: boolean
	isMobile: boolean
	children: React.ReactNode
}) {
	return (
		<motion.div
			className="relative size-full max-w-7xl"
			animate={{
				width: isScrolled ? (isMobile ? "90%" : "80%") : "100%",
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1],
			}}
		>
			{children}
		</motion.div>
	)
}

function NavbarContent({
	isAuthenticated,
	isScrolled,
}: {
	isAuthenticated: boolean
	isScrolled: boolean
}) {
	return (
		<motion.div
			className="relative z-20 flex w-full items-center justify-between px-4 sm:px-6 lg:px-8"
			animate={{
				height: isScrolled ? "48px" : "64px",
				y: isScrolled ? 20 : 0,
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1],
			}}
		>
			{/* Logo */}
			<motion.div
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{
					duration: 0.7,
					delay: 1.7,
					ease: "easeOut",
				}}
				className="flex"
			>
				<Link
					href="/"
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"items-center justify-center px-1.5 py-0"
					)}
				>
					<QuanbyLogo className="!size-8" />

					<span className="from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-xl leading-tight font-bold tracking-tight text-transparent">
						QSign
					</span>
				</Link>
			</motion.div>

			{/* Actions */}
			<motion.div
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{
					duration: 0.7,
					delay: 1.7,
					ease: "easeOut",
				}}
				className="flex h-full items-center gap-3"
			>
				<ModeToggle />

				<div className="h-[40%]">
					<Separator className="h-full" orientation="vertical" />
				</div>

				<div className="flex items-center gap-2">
					{isAuthenticated ? (
						<SiteUser />
					) : (
						<div className="flex items-center gap-2">
							<div>
								<Link
									href="/auth/login"
									className={cn(
										buttonVariants({
											variant: "ghost",
											size: "sm",
										}),
										"font-medium"
									)}
								>
									Login
								</Link>
							</div>
							<div>
								<Link
									href="/auth/register"
									className={cn(buttonVariants({ size: "sm" }), "font-medium shadow-sm")}
								>
									Sign Up
								</Link>
							</div>
						</div>
					)}
				</div>
			</motion.div>
		</motion.div>
	)
}

function NavbarBackground({ isScrolled, isMobile }: { isScrolled: boolean; isMobile: boolean }) {
	return (
		<motion.div
			className="bg-background/60 border-border/50 border-b-border absolute inset-x-0 top-0 -z-10 h-full rounded-xl border backdrop-blur-md"
			animate={{
				height: "64px",
				width: isScrolled ? (isMobile ? "90%" : "80%") : "100%",
				marginTop: isScrolled ? "12px" : "0px",
				left: isScrolled ? (isMobile ? "5%" : "10%") : "0%",
				right: isScrolled ? (isMobile ? "5%" : "10%") : "0%",
				opacity: isScrolled ? 1 : 0,
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1],
			}}
		/>
	)
}
