"use client"

import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { getFooterGroups } from "@/core/lib/nav/home.config"

import { MotionEffect } from "@/features/home/components/ui/motion-effect"

export function Footer() {
	return (
		<footer className="border-border/40 bg-muted/30 relative border-t px-4 py-16 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<MotionEffect
					inView
					slide={{ direction: "up", offset: 50 }}
					fade
					delay={0.1}
					className="grid gap-12 md:grid-cols-4"
				>
					<MotionEffect
						inView
						slide={{ direction: "up", offset: 30 }}
						fade
						delay={0.2}
						className="space-y-6"
					>
						<Link
							href="/"
							className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-1 transition-colors"
						>
							<QuanbyLogo className="size-8!" />
							<span className="from-foreground to-foreground/80 bg-linear-to-r bg-clip-text text-xl leading-tight font-bold tracking-tight text-transparent">
								QSign Main
							</span>
						</Link>
						<p className="text-muted-foreground leading-relaxed">
							QSign Main is a lightweight e-signature app focused on speed, simplicity, and privacy.
						</p>
					</MotionEffect>

					{Object.values(getFooterGroups()).map((section, index) => (
						<MotionEffect
							key={index}
							inView
							slide={{ direction: "up", offset: 40 }}
							fade
							delay={0.3 + index * 0.1}
						>
							<h3 className="text-foreground mb-6 font-semibold">{section.label}</h3>
							<ul className="space-y-3">
								{section.items?.map((link, linkIndex) => (
									<li key={linkIndex}>
										<Link
											// @ts-expect-error - bypass Next.js typed route for external URLs
											href={link.url}
											className="text-muted-foreground hover:text-foreground text-sm transition-colors"
										>
											{link.title}
										</Link>
									</li>
								))}
							</ul>
						</MotionEffect>
					))}
				</MotionEffect>

				<MotionEffect
					inView
					fade
					delay={1.1}
					className="border-border/40 mt-12 border-t pt-8 text-center"
				>
					<p className="text-muted-foreground text-sm">
						&copy; {new Date().getFullYear()} QSign Main. All rights reserved.
					</p>
				</MotionEffect>
			</div>
		</footer>
	)
}
