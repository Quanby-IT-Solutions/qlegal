"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Button, buttonVariants } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

import { RecentEnvelope } from "./recent-envelope"
import { MotionEffect } from "./ui/motion-effect"

export function RecentEnvelopes() {
	return (
		<section className="w-full border-t bg-gradient-to-b from-muted/20 to-muted/40 px-4 py-12 sm:px-6 lg:px-8">
			<div className="mx-auto w-full max-w-6xl space-y-10">
				<MotionEffect inView slide={{ direction: "up", offset: 30 }} fade>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h2 className="text-3xl font-bold tracking-tight">
								Recent Envelopes
							</h2>
							<p className="text-muted-foreground">
								Track and manage your document signing workflow
							</p>
						</div>
						<Link
							href="/envelopes"
							className={cn(
								buttonVariants({ variant: "outline", size: "sm" }),
								"font-medium"
							)}
						>
							View all
							<ArrowRightIcon />
						</Link>
					</div>
				</MotionEffect>

				{/* Envelope grid */}
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 8 }, (_, i) => {
						const status: "completed" | "pending" | "draft" =
							i % 3 === 0 ? "completed" : i % 3 === 1 ? "pending" : "draft"
						const signerCount = (i % 4) + 1

						const envelope = {
							id: `envelope-${i + 1}`,
							title: `Envelope #${i + 1}`,
							status,
							createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
							signerCount
						}

						return (
							<RecentEnvelope
								key={envelope.id}
								envelope={envelope}
								index={i}
								onEnvelopeClick={(envelope) => {
									console.log("Envelope clicked:", envelope)
								}}
							/>
						)
					})}
				</div>

				{/* Load more indicator */}
				<MotionEffect
					inView
					slide={{ direction: "up", offset: 20 }}
					fade
					delay={0.8}
				>
					<div className="flex justify-center py-8">
						<Button variant="outline">Load More</Button>
					</div>
				</MotionEffect>
			</div>
		</section>
	)
}
