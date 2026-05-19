import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"

const NAV_ITEMS = [
	{ href: "#capabilities", label: "Capabilities" },
	{ href: "#contract-ai", label: "Contract AI" },
	{ href: "#how-it-works", label: "How it works" },
	{ href: "#pricing", label: "Pricing" },
	{ href: "#contact", label: "Contact" },
] as const

export function HomeNavbar() {
	return (
		<header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
			<div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-3">
					<QuanbyLogo className="size-10 rounded-md" />
					<div>
						<p className="text-sm font-semibold tracking-[0.24em] uppercase">Quanby Legal</p>
						<p className="text-muted-foreground text-xs">
							AI-powered contract and notarization workspace
						</p>
					</div>
				</Link>

				<nav className="hidden items-center gap-6 lg:flex">
					{NAV_ITEMS.map(item => (
						<Link
							key={item.href}
							href={item.href}
							className="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{item.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2">
					<Button asChild variant="ghost" className="hidden sm:inline-flex">
						<Link href="/auth/login">Log in</Link>
					</Button>
					<Button asChild>
						<Link href="/auth/register">Get started</Link>
					</Button>
				</div>
			</div>
		</header>
	)
}
