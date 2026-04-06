"use client"

import Link from "next/link"
import { ArrowRight01Icon, Calendar01Icon, Location01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { buttonVariants } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"

import { type RouterOutputs } from "@/services/trpc/client"

import { getStatusVariant } from "../lib/dashboard-utils"

interface DashboardUpcomingAppointmentsProps {
	appointments: RouterOutputs["dashboard"]["getUpcomingAppointments"] | undefined
	isLoading: boolean
	isENP: boolean
}

export function DashboardUpcomingAppointments({
	appointments,
	isLoading,
	isENP,
}: DashboardUpcomingAppointmentsProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>
							{isENP ? "Upcoming Client Appointments" : "Upcoming Appointments"}
						</CardTitle>
						<CardDescription>
							{isENP ? "Your scheduled client consultations" : "Your scheduled consultations"}
						</CardDescription>
					</div>
					<Link href="/appointments" className={buttonVariants({ variant: "ghost", size: "sm" })}>
						View All
						<HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-2" />
					</Link>
				</div>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-start gap-4">
								<Skeleton className="h-10 w-10 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-4 w-32" />
									<Skeleton className="h-3 w-full" />
								</div>
							</div>
						))}
					</div>
				) : appointments && appointments.length > 0 ? (
					<div className="space-y-4">
						{appointments.map(appointment => (
							<div
								key={appointment.id}
								className="hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 transition-colors"
							>
								<Avatar className="h-10 w-10">
									<AvatarImage src={undefined} alt={appointment.title || "Appointment"} />
									<AvatarFallback>{(appointment.title?.[0] ?? "A").toUpperCase()}</AvatarFallback>
								</Avatar>
								<div className="flex-1 space-y-1">
									<div className="flex items-center justify-between">
										<p className="font-medium">{appointment.title ?? "Appointment"}</p>
										<Badge variant={getStatusVariant(appointment.status)}>
											{appointment.status}
										</Badge>
									</div>
									<p className="text-muted-foreground text-sm">{appointment.type}</p>
									<div className="text-muted-foreground flex items-center gap-2 text-xs">
										<HugeiconsIcon icon={Calendar01Icon} size={12} />
										{format(new Date(appointment.appointmentDate), "PPp")}
									</div>
									{appointment.location && (
										<div className="text-muted-foreground flex items-center gap-1 text-xs">
											<HugeiconsIcon icon={Location01Icon} size={12} />
											{appointment.location}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<HugeiconsIcon icon={Calendar01Icon} size={48} className="text-muted-foreground/50" />
						<p className="text-muted-foreground mt-4 text-sm">No upcoming appointments</p>
						<Link
							// @ts-expect-error Next.js typed routes
							href="/consultations"
							className={buttonVariants({
								variant: "outline",
								size: "sm",
								className: "mt-4",
							})}
						>
							Book Consultation
						</Link>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
