"use client"

import type { Route } from "next"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useSession } from "next-auth/react"

import { ModeToggle } from "@/core/components/mode-toggle"
import { QuanbyLogo } from "@/core/components/quanby-logo"
import { buttonVariants } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { getNavbarItems } from "@/core/lib/nav/home.config"
import { cn } from "@/core/lib/utils"

interface NavbarProps {
	isAuthenticated?: boolean
}

export function Navbar({ isAuthenticated }: NavbarProps) {
	const [isScrolled, setIsScrolled] = useState(false)
	const isMobile = useIsMobile()
	const { data: session } = useSession()

	// Use prop if provided (SSR), otherwise fallback to session (CSR)
	const isUserAuthenticated = isAuthenticated ?? (session?.user ? true : false)

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 50)
		window.addEventListener("scroll", handleScroll, { passive: true })
		handleScroll()
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<nav className="fixed inset-x-0 top-0 z-50 flex justify-center">
			<NavbarContainer isScrolled={isScrolled} isMobile={isMobile}>
				<NavbarContent isAuthenticated={isUserAuthenticated} isScrolled={isScrolled} />
			</NavbarContainer>

			<NavbarBackground isScrolled={isScrolled} isMobile={isMobile} />
		</nav>
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
				width: isScrolled ? (isMobile ? "95%" : "80%") : "100%",
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
	const { data: session } = useSession()
	const navbarItems = session?.user ? getNavbarItems(session.user.role) : []

	return (
		<motion.div
			className="relative z-20 flex w-full items-center justify-between pr-4 pl-2 lg:pr-6 lg:pl-4"
			initial={{ height: "64px", y: 0 }}
			animate={{
				height: isScrolled ? "38px" : "64px",
				y: isScrolled ? 20 : 0,
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1],
			}}
		>
			{/* Logo */}
			<div className="flex">
				<Link
					href="/"
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"items-center justify-center px-1 py-0 lg:px-1.5"
					)}
				>
					<QuanbyLogo className="size-8!" />

					<span className="from-foreground to-foreground/80 bg-linear-to-r bg-clip-text text-xl leading-tight font-bold tracking-tight text-transparent">
						Quanby Legal
					</span>
				</Link>
			</div>

			{/* Navigation Items */}
			{isAuthenticated && (
				<nav
					className={cn("flex-1 px-2 md:px-4", "flex items-center", "ml-0!")}
					aria-label="Main navigation"
				>
					<ul className="hidden gap-2 md:flex">
						{navbarItems.map(item => {
							return (
								<li key={item.url}>
									<Link
										href={item.url as Route}
										className={cn(buttonVariants({ variant: "ghost" }), "h-8")}
									>
										{item.title}
									</Link>
								</li>
							)
						})}
					</ul>
				</nav>
			)}

			{/* Actions */}
			<div className="flex h-full items-center gap-3">
				<ModeToggle />

				<div className="h-[40%]">
					<Separator className="h-full" orientation="vertical" />
				</div>

				<div className="flex items-center gap-2">
					{isAuthenticated ? (
						<Link
							href="/dashboard"
							className={cn(
								buttonVariants({
									variant: "outline",
									size: "sm",
								}),
								"font-medium"
							)}
						>
							Dashboard
						</Link>
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
			</div>
		</motion.div>
	)
}

function NavbarBackground({ isScrolled, isMobile }: { isScrolled: boolean; isMobile: boolean }) {
	return (
		<motion.div
			className="bg-background/60 border-border/50 border-b-border absolute inset-x-0 top-0 -z-10 h-full border backdrop-blur-md"
			animate={{
				height: "64px",
				width: isScrolled ? (isMobile ? "95%" : "80%") : "100%",
				marginTop: isScrolled ? "6px" : "0px",
				left: isScrolled ? (isMobile ? "2.5%" : "10%") : "0%",
				right: isScrolled ? (isMobile ? "2.5%" : "10%") : "0%",
				borderRadius: isScrolled ? "1rem" : "0.0rem",
			}}
			transition={{
				duration: 0.6,
				ease: [0.4, 0, 0.2, 1],
			}}
		/>
	)
}
