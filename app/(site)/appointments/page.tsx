import { PageHeader } from "@/core/components/navbar/page-header"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { AppointmentsScheduleClient } from "@/features/appointments/components/appointments-schedule-client"

export default async function AppointmentsPage() {
	const today = new Date()
	const scheduleMonth = today.getMonth()
	const scheduleYear = today.getFullYear()

	await trpc.appointments.getEnpScheduleDashboard.prefetch({
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
						<AppointmentsScheduleClient scheduleMonth={scheduleMonth} scheduleYear={scheduleYear} />
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
