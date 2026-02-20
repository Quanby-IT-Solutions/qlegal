import { type inferRouterOutputs } from "@trpc/server"

import { PageHeader } from "@/core/components/navbar/page-header"

import { auth } from "@/services/next-auth"
import { type AppRouter } from "@/services/trpc/root"
import { HydrateClient, trpc } from "@/services/trpc/server"

import { AppointmentsClient } from "@/features/appointments/components/appointments-client"
import { AppointmentsScheduleClient } from "@/features/appointments/components/appointments-schedule-client"

type IncomingRequest = inferRouterOutputs<AppRouter>["appointments"]["getIncomingRequests"][number]
type IncomingAppointment =
	inferRouterOutputs<AppRouter>["appointments"]["getIncomingAppointmentsForENP"][number]

function sortIncomingItems<T extends { createdAt: Date }>(items: T[]) {
	items.sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime()
		const dateB = new Date(b.createdAt).getTime()
		return dateB - dateA
	})

	return items
}

export default async function RequestsPage() {
	const session = await auth()
	const isENP = session?.user?.role === "ENP"

	const incomingRequests = sortIncomingItems([
		...((await trpc.appointments.getIncomingRequests()) ?? []),
	]) as IncomingRequest[]

	let incomingAppointments: IncomingAppointment[] = []
	if (isENP) {
		incomingAppointments = sortIncomingItems([
			...((await trpc.appointments.getIncomingAppointmentsForENP()) ?? []),
		]) as IncomingAppointment[]
	}

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
									incomingRequests={incomingRequests}
									incomingAppointments={incomingAppointments}
								/>
							</>
						) : (
							<AppointmentsClient incomingRequests={incomingRequests} />
						)}
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
