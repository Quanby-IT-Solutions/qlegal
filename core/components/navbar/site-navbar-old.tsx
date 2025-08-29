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

export function SiteNavbarOld({ isAuthenticated }: NavbarProps) {
	const { data: session } = useSession()
	const [isScrolled, setIsScrolled] = useState(false)
	const isMobile = useIsMobile()

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50)
		}

		window.addEventListener("scroll", handleScroll)
		handleScroll() // Check initial scroll position

		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<nav className="fixed inset-x-0 top-0 z-50 flex justify-center">
			<NavbarContainer isScrolled={isScrolled} isMobile={isMobile}>
				<NavbarContent
					isAuthenticated={isAuthenticated ?? !!session}
					isScrolled={isScrolled}
				/>
			</NavbarContainer>

			<NavbarBackground isScrolled={isScrolled} isMobile={isMobile} />
		</nav>
	)
}

function NavbarContainer({
	isScrolled,
	isMobile,
	children
}: {
	isScrolled: boolean
	isMobile: boolean
	children: React.ReactNode
}) {
	return (
		<motion.div
			initial={false}
			className="relative size-full max-w-7xl"
			animate={{
				width: isScrolled ? (isMobile ? "95%" : "80%") : "100%"
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1]
			}}
		>
			{children}
		</motion.div>
	)
}

function NavbarContent({
	isAuthenticated,
	isScrolled
}: {
	isAuthenticated: boolean
	isScrolled: boolean
}) {
	return (
		<div
			className={cn(
				"relative z-20 flex w-full items-center justify-between px-4 transition-all duration-300 ease-in-out sm:px-6 lg:px-8",
				isScrolled ? "h-9 translate-y-5 md:h-12" : "h-16 translate-y-0"
			)}
		>
			{/* Logo */}
			<div>
				<Link
					href="/"
					className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-muted/50"
				>
					<div>
						<QuanbyLogo className="!size-8" />
					</div>
					<span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-bold leading-tight tracking-tight text-transparent">
						QSign Lite
					</span>
				</Link>
			</div>

			{/* Actions */}
			<div className="flex h-full items-center gap-3">
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
											size: "sm"
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
									className={cn(
										buttonVariants({ size: "sm" }),
										"font-medium shadow-sm"
									)}
								>
									Sign Up
								</Link>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

function NavbarBackground({
	isScrolled,
	isMobile
}: {
	isScrolled: boolean
	isMobile: boolean
}) {
	return (
		<motion.div
			initial={false}
			className="absolute inset-x-0 top-0 -z-10 h-full"
			animate={{
				height: "64px",
				width: isScrolled ? (isMobile ? "95%" : "80%") : "100%",
				marginTop: isScrolled ? (isMobile ? "6px" : "12px") : "0px",
				left: isScrolled ? (isMobile ? "2.5%" : "10%") : "0%",
				right: isScrolled ? (isMobile ? "2.5%" : "10%") : "0%",
				backgroundColor: isScrolled
					? "hsl(var(--background) / 0.6)"
					: "hsl(var(--background) / 0)",
				backdropFilter: isScrolled ? "blur(12px)" : "none",
				borderRadius: isScrolled ? "12px" : "0px",
				border: isScrolled ? "1px solid hsl(var(--border) / 0.5)" : "none",
				borderBottom: isScrolled
					? "1px solid hsl(var(--border))"
					: "1px solid hsl(var(--border) / 0)"
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1]
			}}
		/>
	)
}
