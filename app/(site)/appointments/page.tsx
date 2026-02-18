import { Suspense } from "react"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Skeleton } from "@/core/components/ui/skeleton"

import { auth } from "@/services/next-auth"
import type { RouterOutputs } from "@/services/trpc/client"
import { HydrateClient, trpc } from "@/services/trpc/server"

import { type AppointmentItem } from "@/features/appointments/api/appointments.router"
import { AppointmentsClient } from "@/features/appointments/components/appointments-client"
import { AppointmentsScheduleClient } from "@/features/appointments/components/appointments-schedule-client"
import { CalendarSkeleton } from "@/features/appointments/components/calendar/calendar-skeleton"
import { EventListSkeleton } from "@/features/appointments/components/event-list/event-list-skeleton"

function mapIncomingRequests(rawRequests: RouterOutputs["appointments"]["getIncomingRequests"]) {
	return rawRequests.map(request => ({
		id: request.id,
		title: request.title,
		description: request.description,
		status:
			request.status as RouterOutputs["appointments"]["getIncomingAppointmentsForENP"][number]["status"],
		workflow:
			request.workflow as RouterOutputs["appointments"]["getIncomingAppointmentsForENP"][number]["workflow"],
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
}

function sortIncomingItems(items: AppointmentItem[]) {
	items.sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime()
		const dateB = new Date(b.createdAt).getTime()
		return dateB - dateA
	})

	return items
}

function ScheduleBranchFallback() {
	return (
		<>
			<div className="space-y-2">
				<Skeleton className="h-9 w-64" />
				<Skeleton className="h-5 w-96" />
			</div>

			<div className="mt-4 grid grid-cols-1 gap-y-4 lg:grid-cols-3 lg:items-start lg:gap-x-4 lg:gap-y-0">
				<CalendarSkeleton />
				<EventListSkeleton />
			</div>
		</>
	)
}

function ListBranchFallback() {
	return (
		<div className="mx-auto max-w-7xl space-y-8">
			<div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
				<div className="space-y-1">
					<Skeleton className="h-8 w-40" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="flex items-center gap-6 text-sm">
					<div className="flex items-baseline gap-2">
						<Skeleton className="h-8 w-10" />
						<Skeleton className="h-4 w-12" />
					</div>
					<div className="bg-border h-8 w-px" />
					<div className="flex items-baseline gap-2">
						<Skeleton className="h-8 w-10" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-3 md:flex-row">
				<Skeleton className="h-10 flex-1" />
				<Skeleton className="h-10 w-32.5" />
			</div>

			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="border-border/50 overflow-hidden rounded-xl border shadow-sm">
						<div className="bg-muted/50 h-20" />
						<div className="relative flex flex-col items-center px-4 pt-0 pb-6">
							<Skeleton className="border-background -mt-10 size-20 rounded-full border-4" />
							<div className="mt-3 flex flex-col items-center gap-2">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-48" />
							</div>
							<Skeleton className="mt-6 h-24 w-full rounded-xl" />
							<div className="mt-4 grid w-full grid-cols-2 gap-2">
								<Skeleton className="h-8" />
								<Skeleton className="h-8" />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

async function ENPAppointmentsContent() {
	const [rawRequests, rawAppointments] = await Promise.all([
		trpc.appointments.getIncomingRequests(),
		trpc.appointments.getIncomingAppointmentsForENP(),
	])

	const incomingRequests = mapIncomingRequests(rawRequests)
	const incomingAppointments = rawAppointments.map(apt => ({
		...apt,
		workflow: apt.workflow,
	})) as AppointmentItem[]

	const allIncomingItems = sortIncomingItems([...incomingRequests, ...incomingAppointments])
	const today = new Date()
	const scheduleData = await trpc.appointments.getEnpSchedule({
		month: today.getMonth(),
		year: today.getFullYear(),
	})

	return (
		<>
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight">Appointments & Schedule</h1>
				<p className="text-muted-foreground">Manage incoming requests and your appointments</p>
			</div>
			<AppointmentsScheduleClient scheduleData={scheduleData} incomingRequests={allIncomingItems} />
		</>
	)
}

async function StandardAppointmentsContent() {
	const rawRequests = await trpc.appointments.getIncomingRequests()
	const incomingRequests = mapIncomingRequests(rawRequests)
	const allIncomingItems = sortIncomingItems([...incomingRequests])

	return <AppointmentsClient incomingRequests={allIncomingItems} />
}

export default async function AppointmentsPage() {
	const session = await auth()
	const isENP = session?.user?.role === "ENP"

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Appointments", href: "/appointments" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						{isENP ? (
							<Suspense fallback={<ScheduleBranchFallback />}>
								<ENPAppointmentsContent />
							</Suspense>
						) : (
							<Suspense fallback={<ListBranchFallback />}>
								<StandardAppointmentsContent />
							</Suspense>
						)}
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
