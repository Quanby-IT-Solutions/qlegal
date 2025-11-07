"use client"

import { Calendar, Clock, FileText, Mail, Phone, User, MapPin, Video, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

import { Card, CardContent } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"

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
	const isOverdue = new Date(appointment.appointmentDate) < now &&
		(appointment.status === "PENDING" || appointment.status === "CONFIRMED")

	const getStatusBadge = (status: string) => {
		const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
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
			return <Badge variant="outline" className="text-blue-600 border-blue-600">REN</Badge>
		}
		if (isInPerson) {
			return <Badge variant="outline" className="text-green-600 border-green-600">IEN</Badge>
		}
		return null
	}

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardContent className="p-6">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 space-y-4">
						{/* Header */}
						<div className="flex items-start gap-3 flex-wrap">
							<div className="flex-1 min-w-0">
								<h3 className="text-lg font-medium mb-2">
									{appointment.type === "CONSULTATION" ? "Consultation Appointment" : "Document Signing"}
								</h3>
								<div className="flex items-center gap-2 flex-wrap">
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
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div className="flex items-center gap-2 text-muted-foreground">
								<Calendar className="h-4 w-4 shrink-0" />
								<span>{format(new Date(appointment.appointmentDate), "PPP")}</span>
							</div>
							<div className="flex items-center gap-2 text-muted-foreground">
								<Clock className="h-4 w-4 shrink-0" />
								<span>{format(new Date(appointment.appointmentDate), "p")} ({appointment.duration} min)</span>
							</div>
							{isInPerson && appointment.location && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<MapPin className="h-4 w-4 shrink-0" />
									<span className="truncate">{appointment.location}</span>
								</div>
							)}
							{isRemote && appointment.meetingLink && (
								<div className="flex items-center gap-2 text-muted-foreground">
									<Video className="h-4 w-4 shrink-0" />
									<span className="truncate">Remote Meeting</span>
								</div>
							)}
						</div>

						{/* Notes */}
						{appointment.notes && (
							<div className="bg-muted/50 rounded-lg p-3">
								<p className="text-sm text-muted-foreground line-clamp-2">{appointment.notes}</p>
							</div>
						)}

						{/* User Info */}
						<div className="bg-muted/50 rounded-lg p-3">
							<h4 className="font-medium text-sm mb-2">
								{viewMode === "incoming" ? "Client Information" : "Assigned Notary"}
							</h4>
							<div className="flex items-center gap-3">
								<Avatar className="h-10 w-10">
									<AvatarImage src={displayUser.image || undefined} alt={displayUser.name} />
									<AvatarFallback>
										{displayUser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm">{displayUser.name}</p>
									<div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
										{displayUser.email && (
											<a 
												href={`mailto:${displayUser.email}`}
												className="flex items-center gap-1 hover:text-foreground"
											>
												<Mail className="h-3 w-3" />
												<span className="truncate max-w-[150px]">{displayUser.email}</span>
											</a>
										)}
										{displayUser.phoneNumber && (
											<a 
												href={`tel:${displayUser.phoneNumber}`}
												className="flex items-center gap-1 hover:text-foreground"
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
								<p className="text-sm text-destructive">
									<span className="font-medium">Cancellation Reason:</span> {appointment.cancelReason}
								</p>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex flex-col gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onViewDetails(appointment)}
						>
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
							<Button
								variant="default"
								size="sm"
								onClick={() => onReschedule?.(appointment.id)}
							>
								Reschedule
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
