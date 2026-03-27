import { Suspense } from "react"

import { PageHeader } from "@/core/components/navbar/page-header"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { AppointmentsScheduleClient } from "@/features/appointments/components/appointments-schedule-client"
import { CalendarSkeleton } from "@/features/appointments/components/calendar/calendar-skeleton"
import { EventListSkeleton } from "@/features/appointments/components/event-list/event-list-skeleton"

export default async function AppointmentsPage() {
	const today = new Date()
	const scheduleMonth = today.getMonth()
	const scheduleYear = today.getFullYear()

	void trpc.appointments.getEnpScheduleDashboard.prefetch({
		month: scheduleMonth,
		year: scheduleYear,
	})

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Appointments", href: "/appointments" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<div className="space-y-2">
							<h1 className="text-3xl font-bold tracking-tight">Appointments & Schedule</h1>
							<p className="text-muted-foreground">
								Manage incoming requests and your appointments
							</p>
						</div>
						<Suspense
							fallback={
								<div className="mt-4 grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:items-start lg:gap-x-4 lg:gap-y-0">
									<CalendarSkeleton />
									<EventListSkeleton />
								</div>
							}
						>
							<AppointmentsScheduleClient
								scheduleMonth={scheduleMonth}
								scheduleYear={scheduleYear}
							/>
						</Suspense>
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
