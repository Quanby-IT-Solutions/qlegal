"use client"

import Link from "next/link"

import { QuanbyLogo } from "@/core/components/quanby-logo"

import { MotionEffect } from "./ui/motion-effect"

export function Footer() {
	return (
		<footer className="relative border-t border-border/40 bg-muted/30 px-4 py-16 sm:px-6 lg:px-8">
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
							className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-muted/50"
						>
							<QuanbyLogo className="!size-8" />
							<span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-bold leading-tight tracking-tight text-transparent">
								QSign Lite
							</span>
						</Link>
						<p className="leading-relaxed text-muted-foreground">
							QSign Lite is a lightweight e-signature app focused on speed,
							simplicity, and privacy.
						</p>
					</MotionEffect>

					{[
						{
							title: "Product",
							links: [{ label: "Envelopes", href: "/envelopes" }]
						},
						{
							title: "Company",
							links: [
								{ label: "About Us", href: "https://quanbyit.com/about-us/" },
								{ label: "Blog", href: "https://quanbyit.com/quill-news/" },
								{ label: "Careers", href: "https://quanbyit.com/careers/" }
							]
						},
						{
							title: "Support",
							links: [
								{
									label: "Data Privacy",
									href: "https://quanbyit.com/data-privacy/"
								},
								{
									label: "Mission & Vision",
									href: "https://quanbyit.com/mission-vision/"
								},
								{
									label: "Contact Us",
									href: "https://quanbyit.com/contact-quanby/"
								}
							]
						}
					].map((section, index) => (
						<MotionEffect
							key={index}
							inView
							slide={{ direction: "up", offset: 40 }}
							fade
							delay={0.3 + index * 0.1}
						>
							<h3 className="mb-6 font-semibold text-foreground">
								{section.title}
							</h3>
							<ul className="space-y-3">
								{section.links.map((link, linkIndex) => (
									<li key={linkIndex}>
										<Link
											href={link.href}
											className="text-sm text-muted-foreground transition-colors hover:text-foreground"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</MotionEffect>
					))}
				</MotionEffect>

				{/* Contact Information */}
				{/* <MotionEffect
					inView
					slide={{ direction: "up", offset: 30 }}
					fade
					delay={0.6}
					className="mt-12 border-t border-border/40 pt-8"
				>
					<div className="grid gap-8 md:grid-cols-2">
						<MotionEffect
							inView
							slide={{ direction: "left", offset: 40 }}
							delay={0.7}
							fade
						>
							<h3 className="mb-4 font-semibold text-foreground">
								Contact Information
							</h3>
							<div className="space-y-3">
								<div className="flex items-center space-x-3">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										support@quanbysign.ph
									</span>
								</div>
								<div className="flex items-center space-x-3">
									<Phone className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										+63 2 8XXX XXXX
									</span>
								</div>
								<div className="flex items-center space-x-3">
									<MapPin className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										Makati City, Metro Manila, Philippines
									</span>
								</div>
							</div>
						</MotionEffect>
						<MotionEffect
							inView
							slide={{ direction: "right", offset: 40 }}
							fade
							delay={0.9}
						>
							<h3 className="mb-4 font-semibold text-foreground">
								Legal Compliance
							</h3>
							<div className="space-y-2 text-sm text-muted-foreground">
								<p>• DICT Compliant</p>
								<p>• Supreme Court Rules Compliant</p>
								<p>• E-Commerce Act Compliant</p>
								<p>• Data Privacy Act Compliant</p>
							</div>
						</MotionEffect>
					</div>
				</MotionEffect> */}

				<MotionEffect
					inView
					fade
					delay={1.1}
					className="mt-12 border-t border-border/40 pt-8 text-center"
				>
					<p className="text-sm text-muted-foreground">
						&copy; {new Date().getFullYear()} QSign Lite. All rights reserved.
					</p>
				</MotionEffect>
			</div>
		</footer>
	)
}
