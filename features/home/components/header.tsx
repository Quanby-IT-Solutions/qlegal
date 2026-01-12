"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useSession } from "next-auth/react"

import { ModeToggle } from "@/core/components/mode-toggle"
import { buttonVariants } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"
import { useIsMobile } from "@/core/hooks/use-mobile"
import { getNavbarItems } from "@/core/lib/nav/home.config"
import { iconMap } from "@/core/lib/nav/site.config"
import { cn } from "@/core/lib/utils"

import { HeaderLogo } from "@/features/home/components/header-logo"

const SPRING_TRANSITION = {
	type: "spring" as const,
	stiffness: 200,
	damping: 30,
}

export const Header = ({ transition }: { transition: boolean }) => {
	const [isScrolled, setIsScrolled] = useState(false)

	useEffect(() => {
		const handleScroll = () => {
			// Only track scroll after animation is complete
			if (transition) {
				setIsScrolled(window.scrollY > 10)
			} else {
				// Reset scroll state when animation is not complete
				setIsScrolled(false)
			}
		}

		window.addEventListener("scroll", handleScroll)
		// Also check initial scroll position
		handleScroll()

		return () => window.removeEventListener("scroll", handleScroll)
	}, [transition])

	return (
		<motion.header
			variants={{
				center: {
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					height: "100%",
				},
				topLeft: {
					top: 0,
					left: 0,
					right: 0,
					bottom: "auto",
					height: "auto",
				},
			}}
			initial="center"
			animate={transition ? "topLeft" : "center"}
			transition={SPRING_TRANSITION}
			className="fixed z-40 flex items-center justify-center"
		>
			<HeaderContainer transition={transition} isScrolled={isScrolled}>
				<AnimatedLogo transition={transition} />
				<NavigationContent transition={transition} />
			</HeaderContainer>

			<HeaderBackground transition={transition} isScrolled={isScrolled} />
		</motion.header>
	)
}

function HeaderContainer({
	transition,
	isScrolled,
	children,
}: {
	transition: boolean
	isScrolled: boolean
	children: React.ReactNode
}) {
	const isMobile = useIsMobile()

	return (
		<motion.div
			className="relative size-full max-w-7xl"
			animate={{
				width: transition && isScrolled ? (isMobile ? "90%" : "80%") : "100%",
				y: transition && isScrolled ? 8 : 0,
			}}
			transition={{
				width: { duration: 0.7, ease: [0.2, 0, 0.2, 1] },
				y: { duration: 0.8, ease: [0.8, 0, 0.2, 1] },
			}}
		>
			{children}
		</motion.div>
	)
}

function AnimatedLogo({ transition }: { transition: boolean }) {
	return (
		<motion.div
			className="absolute z-10"
			variants={{
				center: {
					top: "45%",
					left: "50%",
					x: "-50%",
					y: "-50%",
					scale: 1,
				},
				topLeft: {
					top: "16px",
					left: "16px",
					x: 0,
					y: 0,
					scale: 1,
				},
			}}
			initial="center"
			animate={transition ? "topLeft" : "center"}
			transition={SPRING_TRANSITION}
		>
			<HeaderLogo
				size={transition ? "navbar" : "centered"}
				draw={!transition}
				text="Quanby Legal"
				isCentered={!transition}
			/>
		</motion.div>
	)
}

function NavigationContent({ transition }: { transition: boolean }) {
	const { data: session } = useSession()
	const navbarItems = session?.user ? getNavbarItems(session.user.role) : []

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: transition ? 1 : 0 }}
			transition={SPRING_TRANSITION}
			className="absolute inset-0 z-20 flex h-16 flex-row items-center justify-center"
		>
			<div className="container flex w-full items-center justify-between">
				{/* Navigation Items */}
				<nav
					className={cn("flex-1 px-2 md:px-4", "flex items-center", "!ml-0 md:!ml-44")}
					aria-label="Main navigation"
				>
					<ul className="hidden gap-2 md:flex">
						{navbarItems.map(item => {
							const IconComponent = item.icon ? iconMap[item.icon as keyof typeof iconMap] : null
							return (
								<li key={item.url}>
									<a href={item.url} className={cn(buttonVariants({ variant: "ghost" }), "h-8")}>
										{IconComponent && <IconComponent className="h-4 w-4" />}
										{item.title}
									</a>
								</li>
							)
						})}
					</ul>
				</nav>

				{/* Right Side Actions */}
				<div className="flex items-center justify-end gap-x-1 pr-4 md:gap-x-2">
					<ModeToggle className="hidden md:flex" />

					<Separator orientation="vertical" className="mx-2 hidden h-6 md:block" />

					<Link
						href="/auth/login"
						className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 md:h-9")}
					>
						Log In
					</Link>

					<Link href="/auth/register" className={cn(buttonVariants({ size: "sm" }), "h-8 md:h-9")}>
						Sign up
					</Link>
				</div>
			</div>
		</motion.div>
	)
}

function HeaderBackground({
	transition,
	isScrolled,
}: {
	transition: boolean
	isScrolled: boolean
}) {
	const isMobile = useIsMobile()

	return (
		<motion.div
			className={cn(
				"bg-background/70 absolute inset-x-0 top-0 -z-10 h-full backdrop-blur-md transition-all duration-500",
				transition && "bg-background/70 backdrop-blur-md",
				transition && !isScrolled && "border-b",
				transition && isScrolled && "rounded-md border"
			)}
			animate={{
				height: transition ? "64px" : "100vh",
				width: transition && isScrolled ? (isMobile ? "90%" : "80%") : "100%",
				marginTop: transition && isScrolled ? "8px" : "0px",
				left: transition && isScrolled ? (isMobile ? "5%" : "10%") : "0%",
				right: transition && isScrolled ? (isMobile ? "5%" : "10%") : "0%",
			}}
			transition={{
				height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
				width: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
				marginTop: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
				left: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
				right: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
			}}
		/>
	)
}
