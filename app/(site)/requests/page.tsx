import { PageHeader } from "@/core/components/navbar/page-header"

import { auth } from "@/services/next-auth"
import { HydrateClient, trpc } from "@/services/trpc/server"

import { type AppointmentItem } from "@/features/appointments/api/appointments.router"
import { AppointmentsClient } from "@/features/appointments/components/appointments-client"
import { AppointmentsScheduleClient } from "@/features/appointments/components/appointments-schedule-client"

export default async function RequestsPage() {
	const session = await auth()
	const isENP = session?.user?.role === "ENP"

	const rawRequests = await trpc.appointments.getIncomingRequests()

	const incomingRequests = rawRequests.map(request => ({
		id: request.id,
		title: request.title,
		description: request.description,
		status: request.status as AppointmentItem["status"],
		workflow: request.workflow as AppointmentItem["workflow"],
		priority: request.priority,
		createdAt: request.createdAt,
		updatedAt: request.updatedAt,
		enpId: request.enpId,
		principalId: request.principalId,
		appointmentId: request.appointmentId ?? null,
		rejectReason: request.rejectReason,
		principal: request.principal,
		documents: 0,
		source: "request" as const,
		requestData: request,
	})) as AppointmentItem[]

	let incomingAppointments: AppointmentItem[] = []
	if (isENP) {
		const rawAppointments = await trpc.appointments.getIncomingAppointmentsForENP()
		incomingAppointments = rawAppointments.map(apt => ({
			...apt,
			workflow: apt.workflow as AppointmentItem["workflow"],
		})) as AppointmentItem[]
	}

	const allIncomingItems = [...incomingRequests, ...incomingAppointments]

	allIncomingItems.sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime()
		const dateB = new Date(b.createdAt).getTime()
		return dateB - dateA
	})

	const today = new Date()
	const scheduleData = isENP
		? await trpc.appointments.getEnpSchedule({
				month: today.getMonth(),
				year: today.getFullYear(),
			})
		: null

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Requests", href: "/requests" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						{isENP && scheduleData ? (
							<>
								<div className="space-y-2">
									<h1 className="text-3xl font-bold tracking-tight">Requests & Schedule</h1>
									<p className="text-muted-foreground">
										Manage incoming requests and your appointments
									</p>
								</div>
								<AppointmentsScheduleClient
									scheduleData={scheduleData}
									incomingRequests={allIncomingItems}
								/>
							</>
						) : (
							<AppointmentsClient incomingRequests={allIncomingItems} />
						)}
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
