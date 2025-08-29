"use client"

import { FileTextIcon } from "lucide-react"

import { Card, CardContent } from "@/core/components/ui/card"
import {
	Status,
	StatusIndicator,
	StatusLabel
} from "@/core/components/ui/status"
import type { StatusProps } from "@/core/components/ui/status"

import { MotionEffect } from "./ui/motion-effect"

interface Envelope {
	id: string
	title: string
	status: "completed" | "pending" | "draft"
	createdAt: Date
	signerCount: number
}

interface RecentEnvelopeProps {
	envelope: Envelope
	index: number
	onEnvelopeClick?: (envelope: Envelope) => void
}

function mapEnvelopeStatusToSystemStatus(
	status: Envelope["status"]
): StatusProps["status"] {
	switch (status) {
		case "completed":
			return "success"
		case "pending":
			return "warning"
		case "draft":
			return "secondary"
		default:
			return "danger"
	}
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	})
}

function generateSignerAvatars(signerCount: number) {
	const maxVisible = 3
	const visibleSigners = Math.min(maxVisible, signerCount)

	return (
		<div className="flex -space-x-1">
			{Array.from({ length: visibleSigners }, (_, j) => (
				<div
					key={j}
					className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-gradient-to-br from-primary/20 to-primary/5"
				>
					<span className="text-xs font-medium text-primary">
						{String.fromCharCode(65 + j)}
					</span>
				</div>
			))}
			{signerCount > maxVisible && (
				<div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted">
					<span className="text-xs font-medium text-muted-foreground">
						+{signerCount - maxVisible}
					</span>
				</div>
			)}
		</div>
	)
}

export const RecentEnvelope = ({
	envelope,
	index,
	onEnvelopeClick
}: RecentEnvelopeProps) => {
	const systemStatus = mapEnvelopeStatusToSystemStatus(envelope.status)

	const handleClick = () => {
		onEnvelopeClick?.(envelope)
	}

	return (
		<MotionEffect
			inView
			slide={{ direction: "up", offset: 50 }}
			fade
			delay={index * 0.1}
		>
			<Card
				className="group cursor-pointer border-muted/50 bg-background/60 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg"
				onClick={handleClick}
			>
				<CardContent className="p-5">
					<div className="space-y-4">
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-2">
								<FileTextIcon className="size-5 text-muted-foreground" />
								<span className="font-semibold">{envelope.title}</span>
							</div>
							<Status status={systemStatus} className="text-xs font-medium">
								<StatusIndicator />
								<StatusLabel />
							</Status>
						</div>

						<div className="space-y-2">
							<p className="text-sm font-medium text-foreground">
								Contract Agreement Document
							</p>
							<p className="text-xs text-muted-foreground">
								{formatDate(envelope.createdAt)}
							</p>
						</div>

						<div className="flex items-center justify-between border-t border-muted/50 pt-2">
							<div className="flex items-center gap-2">
								{generateSignerAvatars(envelope.signerCount)}
							</div>
							<span className="text-xs font-medium text-muted-foreground">
								{envelope.signerCount} signer
								{envelope.signerCount !== 1 ? "s" : ""}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</MotionEffect>
	)
}
