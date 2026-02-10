"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { use } from "react"
import { format } from "date-fns"
import { AlertCircle, Calendar, Clock, MapPin, User, Video } from "lucide-react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { trpc } from "@/services/trpc/client"

function getWorkflowLabel(meetingLink?: string | null, location?: string | null) {
	if (meetingLink) {
		return "Remote"
	}
	if (location) {
		return "In-Person"
	}
	return "Not specified"
}

export default function AppointmentMeetingPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()

	const {
		data: appointment,
		isLoading,
		error,
	} = trpc.appointments.getAppointmentById.useQuery({
		appointmentId: id,
	})

	const meetingLink = appointment?.meetingLink ?? null
	const workflowLabel = getWorkflowLabel(meetingLink, appointment?.location ?? null)

	const handleJoin = () => {
		if (!meetingLink) {
			return
		}
		// If the link is absolute, navigate there; otherwise push within the app
		try {
			const url = new URL(meetingLink)
			window.location.href = url.toString()
		} catch {
			// If URL parsing fails, treat as internal route
			router.push(meetingLink as unknown as Route)
		}
	}

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader
				items={[{ label: "Appointments", href: "/appointments" }, { label: "Meeting" }]}
			/>

			<main className="flex-1 p-4 md:p-6 lg:p-8">
				<div className="mx-auto max-w-4xl space-y-6">
					<div className="space-y-2">
						<h1 className="text-3xl font-bold tracking-tight">Appointment Meeting</h1>
						<p className="text-muted-foreground">
							Join the lawyer's virtual office for this appointment. Only one session can be live at
							a time.
						</p>
					</div>

					{isLoading && (
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-40" />
								<Skeleton className="h-4 w-64" />
							</CardHeader>
							<CardContent className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
							</CardContent>
						</Card>
					)}

					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Unable to load appointment</AlertTitle>
							<AlertDescription>{error.message}</AlertDescription>
						</Alert>
					)}

					{appointment && (
						<Card>
							<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div>
									<CardTitle className="text-xl">
										{appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"}
									</CardTitle>
									<CardDescription>
										{format(new Date(appointment.appointmentDate), "PPP")} at{" "}
										{format(new Date(appointment.appointmentDate), "p")}
									</CardDescription>
								</div>
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">{workflowLabel}</Badge>
									<Badge variant={appointment.status === "CONFIRMED" ? "default" : "secondary"}>
										{appointment.status}
									</Badge>
								</div>
							</CardHeader>

							<CardContent className="space-y-4">
								<div className="text-muted-foreground grid gap-3 text-sm">
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										<span>
											Date: {format(new Date(appointment.appointmentDate), "PPP")} ·{" "}
											{format(new Date(appointment.appointmentDate), "p")}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4" />
										<span>Duration: {appointment.duration || 30} mins</span>
									</div>
									<div className="flex items-center gap-2">
										<User className="h-4 w-4" />
										<span>Lawyer: {appointment.lawyer?.name ?? "Your lawyer"}</span>
									</div>
									<div className="flex items-center gap-2">
										<User className="h-4 w-4" />
										<span>Client: {appointment.client?.name ?? "Client"}</span>
									</div>
									<div className="flex items-center gap-2">
										{meetingLink ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
										<span>
											{meetingLink
												? "Remote session — join via the button below."
												: appointment.location
													? `In-Person: ${appointment.location}`
													: "Session location to be confirmed."}
										</span>
									</div>
								</div>

								{meetingLink ? (
									<div className="space-y-2">
										<Button size="lg" className="w-full md:w-auto" onClick={handleJoin}>
											<Video className="mr-2 h-4 w-4" />
											Join Meeting
										</Button>
										<p className="text-muted-foreground text-xs">
											This uses the lawyer's single-occupancy office. If another session is live,
											you'll be asked to wait.
										</p>
									</div>
								) : (
									<Alert>
										<AlertCircle className="h-4 w-4" />
										<AlertTitle>Meeting link not available</AlertTitle>
										<AlertDescription>
											The meeting link hasn&apos;t been provided yet. Please contact your lawyer to
											confirm the remote session.
										</AlertDescription>
									</Alert>
								)}

								{appointment.notes && (
									<div className="bg-muted/40 rounded-lg border p-3 text-sm">
										<p className="text-foreground mb-1 font-medium">Notes</p>
										<p className="text-muted-foreground whitespace-pre-wrap">{appointment.notes}</p>
									</div>
								)}
							</CardContent>
						</Card>
					)}
				</div>
			</main>
		</div>
	)
}
