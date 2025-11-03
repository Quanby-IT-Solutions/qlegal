"use client"

import { Calendar, Clock, FileText, Mail, MapPin, Phone, User, Video, X } from "lucide-react"
import { format } from "date-fns"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/core/components/ui/dialog"
import { Badge } from "@/core/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Button } from "@/core/components/ui/button"
import { Separator } from "@/core/components/ui/separator"

import type { AppointmentWithDetails } from "../types/requests.types"

interface ViewRequestDialogProps {
	appointment: AppointmentWithDetails | null
	open: boolean
	onOpenChange: (open: boolean) => void
	viewMode: "incoming" | "my-requests"
}

export function ViewRequestDialog({
	appointment,
	open,
	onOpenChange,
	viewMode,
}: ViewRequestDialogProps) {
	if (!appointment) return null

	const displayUser = viewMode === "incoming" ? appointment.client : appointment.lawyer
	const otherUser = viewMode === "incoming" ? appointment.lawyer : appointment.client
	const isRemote = appointment.meetingLink !== null
	const isInPerson = appointment.location !== null

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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3">
						<span>Appointment Details</span>
						{getStatusBadge(appointment.status)}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Appointment Type and Workflow */}
					<div>
						<h3 className="text-sm font-medium mb-2">Appointment Type</h3>
						<div className="flex items-center gap-2">
							<Badge variant="outline">
								{appointment.type === "CONSULTATION" ? "Consultation" : "Document Signing"}
							</Badge>
							{isRemote && (
								<Badge variant="outline" className="text-blue-600 border-blue-600">
									REN (Remote)
								</Badge>
							)}
							{isInPerson && (
								<Badge variant="outline" className="text-green-600 border-green-600">
									IEN (In-Person)
								</Badge>
							)}
						</div>
					</div>

					<Separator />

					{/* Date and Time */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<h3 className="text-sm font-medium mb-2 flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								Date
							</h3>
							<p className="text-sm text-muted-foreground">
								{format(new Date(appointment.appointmentDate), "PPPP")}
							</p>
						</div>
						<div>
							<h3 className="text-sm font-medium mb-2 flex items-center gap-2">
								<Clock className="h-4 w-4" />
								Time
							</h3>
							<p className="text-sm text-muted-foreground">
								{format(new Date(appointment.appointmentDate), "p")} ({appointment.duration} minutes)
							</p>
						</div>
					</div>

					<Separator />

					{/* Location or Meeting Link */}
					{isInPerson && appointment.location && (
						<>
							<div>
								<h3 className="text-sm font-medium mb-2 flex items-center gap-2">
									<MapPin className="h-4 w-4" />
									Location
								</h3>
								<p className="text-sm text-muted-foreground">{appointment.location}</p>
							</div>
							<Separator />
						</>
					)}

					{isRemote && appointment.meetingLink && (
						<>
							<div>
								<h3 className="text-sm font-medium mb-2 flex items-center gap-2">
									<Video className="h-4 w-4" />
									Meeting Link
								</h3>
								<a 
									href={appointment.meetingLink}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 hover:underline break-all"
								>
									{appointment.meetingLink}
								</a>
							</div>
							<Separator />
						</>
					)}

					{/* Client/ENP Information */}
					<div>
						<h3 className="text-sm font-medium mb-3">
							{viewMode === "incoming" ? "Client Information" : "Notary Information"}
						</h3>
						<div className="bg-muted/50 rounded-lg p-4">
							<div className="flex items-start gap-3">
								<Avatar className="h-12 w-12">
									<AvatarImage src={displayUser.image || undefined} alt={displayUser.name} />
									<AvatarFallback>
										{displayUser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 space-y-2">
									<div>
										<p className="font-medium">{displayUser.name}</p>
										<p className="text-sm text-muted-foreground">
											{viewMode === "incoming" ? "Client" : "Electronic Notary Public"}
										</p>
									</div>
									{displayUser.email && (
										<div className="flex items-center gap-2 text-sm">
											<Mail className="h-4 w-4 text-muted-foreground" />
											<a 
												href={`mailto:${displayUser.email}`}
												className="text-muted-foreground hover:text-foreground"
											>
												{displayUser.email}
											</a>
										</div>
									)}
									{displayUser.phoneNumber && (
										<div className="flex items-center gap-2 text-sm">
											<Phone className="h-4 w-4 text-muted-foreground" />
											<a 
												href={`tel:${displayUser.phoneNumber}`}
												className="text-muted-foreground hover:text-foreground"
											>
												{displayUser.phoneNumber}
											</a>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Notes */}
					{appointment.notes && (
						<>
							<Separator />
							<div>
								<h3 className="text-sm font-medium mb-2 flex items-center gap-2">
									<FileText className="h-4 w-4" />
									Notes
								</h3>
								<p className="text-sm text-muted-foreground whitespace-pre-wrap">
									{appointment.notes}
								</p>
							</div>
						</>
					)}

					{/* Cancellation Reason */}
					{appointment.status === "CANCELLED" && appointment.cancelReason && (
						<>
							<Separator />
							<div>
								<h3 className="text-sm font-medium mb-2 text-destructive">Cancellation Reason</h3>
								<p className="text-sm text-destructive">{appointment.cancelReason}</p>
							</div>
						</>
					)}

					{/* Metadata */}
					<Separator />
					<div className="text-xs text-muted-foreground space-y-1">
						<p>Created: {format(new Date(appointment.createdAt), "PPpp")}</p>
						<p>Last Updated: {format(new Date(appointment.updatedAt), "PPpp")}</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
