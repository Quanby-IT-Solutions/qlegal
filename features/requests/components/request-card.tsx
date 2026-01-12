"use client"

import { format } from "date-fns"
import {
	AlertTriangle,
	Calendar,
	Clock,
	FileText,
	Mail,
	MapPin,
	Phone,
	User,
	Video,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent } from "@/core/components/ui/card"

import type { AppointmentWithDetails } from "../types/requests.types"

interface RequestCardProps {
	appointment: AppointmentWithDetails
	viewMode: "incoming" | "my-requests"
	onViewDetails: (appointment: AppointmentWithDetails) => void
	onConfirm?: (appointmentId: string) => void
	onReject?: (appointmentId: string) => void
	onReschedule?: (appointmentId: string) => void
	isProcessing?: boolean
}

export function RequestCard({
	appointment,
	viewMode,
	onViewDetails,
	onConfirm,
	onReject,
	isProcessing = false,
	onReschedule,
}: RequestCardProps) {
	const displayUser = viewMode === "incoming" ? appointment.client : appointment.lawyer
	const isRemote = appointment.meetingLink !== null
	const isInPerson = appointment.location !== null
	const now = new Date()
	const isOverdue =
		new Date(appointment.appointmentDate) < now &&
		(appointment.status === "PENDING" || appointment.status === "CONFIRMED")

	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			{ variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
		> = {
			PENDING: { variant: "secondary" },
			CONFIRMED: { variant: "default" },
			COMPLETED: { variant: "outline", className: "text-green-600 border-green-600" },
			CANCELLED: { variant: "destructive" },
		}
		const config = variants[status] || { variant: "secondary" as const }

		return (
			<Badge variant={config.variant} className={config.className}>
				{status.charAt(0) + status.slice(1).toLowerCase()}
			</Badge>
		)
	}

	const getTypeBadge = (type: string) => {
		return (
			<Badge variant="outline">
				{type === "CONSULTATION" ? "Consultation" : "Document Signing"}
			</Badge>
		)
	}

	const getWorkflowBadge = () => {
		if (isRemote) {
			return (
				<Badge variant="outline" className="border-blue-600 text-blue-600">
					REN
				</Badge>
			)
		}
		if (isInPerson) {
			return (
				<Badge variant="outline" className="border-green-600 text-green-600">
					IEN
				</Badge>
			)
		}
		return null
	}

	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardContent className="p-6">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 space-y-4">
						{/* Header */}
						<div className="flex flex-wrap items-start gap-3">
							<div className="min-w-0 flex-1">
								<h3 className="mb-2 text-lg font-medium">
									{appointment.type === "CONSULTATION"
										? "Consultation Appointment"
										: "Document Signing"}
								</h3>
								<div className="flex flex-wrap items-center gap-2">
									{getStatusBadge(appointment.status)}
									{getTypeBadge(appointment.type)}
									{getWorkflowBadge()}
									{isOverdue && (
										<Badge variant="destructive" className="flex items-center gap-1">
											<AlertTriangle className="h-3 w-3" />
											Overdue
										</Badge>
									)}
								</div>
							</div>
						</div>

						{/* Appointment Details */}
						<div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
							<div className="text-muted-foreground flex items-center gap-2">
								<Calendar className="h-4 w-4 shrink-0" />
								<span>{format(new Date(appointment.appointmentDate), "PPP")}</span>
							</div>
							<div className="text-muted-foreground flex items-center gap-2">
								<Clock className="h-4 w-4 shrink-0" />
								<span>
									{format(new Date(appointment.appointmentDate), "p")} ({appointment.duration} min)
								</span>
							</div>
							{isInPerson && appointment.location && (
								<div className="text-muted-foreground flex items-center gap-2">
									<MapPin className="h-4 w-4 shrink-0" />
									<span className="truncate">{appointment.location}</span>
								</div>
							)}
							{isRemote && appointment.meetingLink && (
								<div className="text-muted-foreground flex items-center gap-2">
									<Video className="h-4 w-4 shrink-0" />
									<span className="truncate">Remote Meeting</span>
								</div>
							)}
						</div>

						{/* Notes */}
						{appointment.notes && (
							<div className="bg-muted/50 rounded-lg p-3">
								<p className="text-muted-foreground line-clamp-2 text-sm">{appointment.notes}</p>
							</div>
						)}

						{/* User Info */}
						<div className="bg-muted/50 rounded-lg p-3">
							<h4 className="mb-2 text-sm font-medium">
								{viewMode === "incoming" ? "Client Information" : "Assigned Notary"}
							</h4>
							<div className="flex items-center gap-3">
								<Avatar className="h-10 w-10">
									<AvatarImage src={displayUser.image || undefined} alt={displayUser.name} />
									<AvatarFallback>
										{displayUser.name
											.split(" ")
											.map(n => n[0])
											.join("")
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium">{displayUser.name}</p>
									<div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
										{displayUser.email && (
											<a
												href={`mailto:${displayUser.email}`}
												className="hover:text-foreground flex items-center gap-1"
											>
												<Mail className="h-3 w-3" />
												<span className="max-w-[150px] truncate">{displayUser.email}</span>
											</a>
										)}
										{displayUser.phoneNumber && (
											<a
												href={`tel:${displayUser.phoneNumber}`}
												className="hover:text-foreground flex items-center gap-1"
											>
												<Phone className="h-3 w-3" />
												<span>{displayUser.phoneNumber}</span>
											</a>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Cancel Reason */}
						{appointment.status === "CANCELLED" && appointment.cancelReason && (
							<div className="bg-destructive/10 rounded-lg p-3">
								<p className="text-destructive text-sm">
									<span className="font-medium">Cancellation Reason:</span>{" "}
									{appointment.cancelReason}
								</p>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex flex-col gap-2">
						<Button variant="outline" size="sm" onClick={() => onViewDetails(appointment)}>
							View Details
						</Button>

						{viewMode === "incoming" && appointment.status === "PENDING" && (
							<>
								<Button
									size="sm"
									onClick={() => onConfirm?.(appointment.id)}
									disabled={isProcessing}
								>
									{isProcessing ? "Processing..." : "Confirm"}
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => onReject?.(appointment.id)}
									disabled={isProcessing}
								>
									{isProcessing ? "Processing..." : "Reject"}
								</Button>
							</>
						)}

						{isOverdue && (
							<Button variant="default" size="sm" onClick={() => onReschedule?.(appointment.id)}>
								Reschedule
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
