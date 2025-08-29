"use client"

import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"

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
							<QuanbyLogo className="!size-8" />
							<span className="from-foreground to-foreground/80 bg-gradient-to-r bg-clip-text text-xl leading-tight font-bold tracking-tight text-transparent">
								QSign Lite
							</span>
						</Link>
						<p className="text-muted-foreground leading-relaxed">
							QSign Lite is a lightweight e-signature app focused on speed, simplicity, and privacy.
						</p>
					</MotionEffect>

					{[
						{
							title: "Product",
							links: [{ label: "Envelopes", href: "/envelopes" }],
						},
						{
							title: "Company",
							links: [
								{ label: "About Us", href: "https://quanbyit.com/about-us/" },
								{ label: "Blog", href: "https://quanbyit.com/quill-news/" },
								{ label: "Careers", href: "https://quanbyit.com/careers/" },
							],
						},
						{
							title: "Support",
							links: [
								{
									label: "Data Privacy",
									href: "https://quanbyit.com/data-privacy/",
								},
								{
									label: "Mission & Vision",
									href: "https://quanbyit.com/mission-vision/",
								},
								{
									label: "Contact Us",
									href: "https://quanbyit.com/contact-quanby/",
								},
							],
						},
					].map((section, index) => (
						<MotionEffect
							key={index}
							inView
							slide={{ direction: "up", offset: 40 }}
							fade
							delay={0.3 + index * 0.1}
						>
							<h3 className="text-foreground mb-6 font-semibold">{section.title}</h3>
							<ul className="space-y-3">
								{section.links.map((link, linkIndex) => (
									<li key={linkIndex}>
										<Link
											// @ts-expect-error - bypass Next.js 15.5 typed route
											href={link.href}
											className="text-muted-foreground hover:text-foreground text-sm transition-colors"
										>
											{link.label}
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
						&copy; {new Date().getFullYear()} QSign Lite. All rights reserved.
					</p>
				</MotionEffect>
			</div>
		</footer>
	)
}
