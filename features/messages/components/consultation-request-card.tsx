"use client"

import { format } from "date-fns"
import {
	CalendarCheck,
	CalendarX,
	CheckCircle2,
	Clock,
	FileText,
	Loader2,
	MapPin,
	Monitor,
	XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { getBubbleBorderRadius, useChatBubble } from "@/core/components/chat"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { cn } from "@/core/lib/utils"

import { useMessages } from "@/features/messages/api/messages.hooks"

export interface ConsultationRequestMetadata {
	title: string
	description?: string
	appointmentDate: string
	startTime: string
	endTime: string
	duration: number
	eventType: "consultation" | "notarization"
	mode?: "ren" | "ien"
	location?: string
	status: "PENDING" | "ACCEPTED" | "DECLINED"
	senderId: string
	/** @deprecated Use senderId instead */
	enpId?: string
}

interface ConsultationRequestCardProps {
	messageId: string
	metadata: ConsultationRequestMetadata
	isOwnMessage: boolean // true = sender, false = receiver
}

export function ConsultationRequestCard({
	messageId,
	metadata,
	isOwnMessage,
}: ConsultationRequestCardProps) {
	const { respondToConsultationRequest } = useMessages()
	const { variant, isFirst, isLast } = useChatBubble()
	const borderRadius = getBubbleBorderRadius(variant, isFirst, isLast)
	const isPending = metadata.status === "PENDING"
	const isAccepted = metadata.status === "ACCEPTED"
	const isDeclined = metadata.status === "DECLINED"

	const appointmentDate = new Date(metadata.appointmentDate)
	const isValidDate = !isNaN(appointmentDate.getTime())

	const handleRespond = (response: "ACCEPTED" | "DECLINED") => {
		respondToConsultationRequest.mutate(
			{ messageId, response },
			{
				onSuccess: () => {
					toast.success(
						response === "ACCEPTED"
							? "Consultation accepted! Appointment has been created."
							: "Consultation request declined."
					)
				},
				onError: err => {
					toast.error("Failed to respond", { description: err.message })
				},
			}
		)
	}

	return (
		<div
			className={cn(
				"border p-3 text-sm shadow-sm",
				borderRadius,
				isPending && "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
				isAccepted && "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40",
				isDeclined && "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40"
			)}
		>
			{/* Header */}
			<div className="mb-2 flex items-start justify-between gap-2">
				<div className="flex items-center gap-1.5 leading-tight font-semibold">
					{metadata.eventType === "consultation" ? (
						<CalendarCheck className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
					) : (
						<FileText className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
					)}
					<span>{metadata.title}</span>
				</div>
				<StatusBadge status={metadata.status} />
			</div>

			{/* Details */}
			<div className="text-muted-foreground space-y-1 text-xs">
				{/* Date & time */}
				<div className="flex items-center gap-1.5">
					<CalendarCheck className="size-3.5 shrink-0" />
					<span>{isValidDate ? format(appointmentDate, "MMMM d, yyyy") : "—"}</span>
				</div>
				<div className="flex items-center gap-1.5">
					<Clock className="size-3.5 shrink-0" />
					<span>
						{metadata.startTime} – {metadata.endTime} ({metadata.duration} min)
					</span>
				</div>
				{/* Mode */}
				{metadata.mode && (
					<div className="flex items-center gap-1.5">
						<Monitor className="size-3.5 shrink-0" />
						<span>
							{metadata.mode.toUpperCase()} —{" "}
							{metadata.eventType === "consultation" ? "Consultation" : "Notarization"}
						</span>
					</div>
				)}
				{/* Location */}
				{metadata.location && (
					<div className="flex items-center gap-1.5">
						<MapPin className="size-3.5 shrink-0" />
						<span className="truncate">{metadata.location}</span>
					</div>
				)}
				{/* Description */}
				{metadata.description && <p className="pt-1 italic">{metadata.description}</p>}
			</div>

			{/* Actions – only for the principal when status is PENDING */}
			{!isOwnMessage && isPending && (
				<div className="mt-3 flex gap-2">
					<Button
						size="sm"
						variant="default"
						className="h-7 gap-1 bg-green-600 text-xs hover:bg-green-700"
						onClick={() => handleRespond("ACCEPTED")}
						disabled={respondToConsultationRequest.isPending}
					>
						{respondToConsultationRequest.isPending ? (
							<Loader2 className="size-3 animate-spin" />
						) : (
							<CheckCircle2 className="size-3" />
						)}
						Accept
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-7 gap-1 border-rose-300 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
						onClick={() => handleRespond("DECLINED")}
						disabled={respondToConsultationRequest.isPending}
					>
						{respondToConsultationRequest.isPending ? (
							<Loader2 className="size-3 animate-spin" />
						) : (
							<XCircle className="size-3" />
						)}
						Decline
					</Button>
				</div>
			)}

			{/* Result label for ENP (own message) or after principal responds */}
			{isAccepted && isOwnMessage && (
				<p className="mt-2 text-xs font-medium text-green-700 dark:text-green-400">
					✓ Request accepted – appointment created
				</p>
			)}
			{isDeclined && isOwnMessage && (
				<p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
					✗ Request declined
				</p>
			)}
		</div>
	)
}

function StatusBadge({ status }: { status: "PENDING" | "ACCEPTED" | "DECLINED" }) {
	if (status === "PENDING") {
		return (
			<Badge
				variant="outline"
				className="border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-300"
			>
				Pending
			</Badge>
		)
	}
	if (status === "ACCEPTED") {
		return (
			<Badge
				variant="outline"
				className="border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900 dark:text-green-300"
			>
				Accepted
			</Badge>
		)
	}
	return (
		<Badge
			variant="outline"
			className="border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-700 dark:bg-rose-900 dark:text-rose-300"
		>
			Declined
		</Badge>
	)
}
