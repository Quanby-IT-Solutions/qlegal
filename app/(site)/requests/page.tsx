import { PageHeader } from "@/core/components/navbar/page-header"

import { auth } from "@/services/next-auth"
import { HydrateClient, trpc } from "@/services/trpc/server"

import { type IncomingItem } from "@/features/appointments/api/requests.router"
import { RequestsClient } from "@/features/appointments/components/requests-client"

export default async function RequestsPage() {
	const rawRequests = await trpc.requests.getIncomingRequests()

	const incomingRequests = rawRequests.map(request => ({
		id: request.id,
		title: request.title,
		description: request.description,
		status: request.status as IncomingItem["status"],
		workflow: request.workflow as IncomingItem["workflow"],
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
	})) as IncomingItem[]

	// Only fetch appointments if user is an ENP
	let incomingAppointments: IncomingItem[] = []
	const rawAppointments = await trpc.requests.getIncomingAppointmentsForENP()
	incomingAppointments = rawAppointments.map(apt => ({
		...apt,
		workflow: apt.workflow as IncomingItem["workflow"],
	})) as IncomingItem[]

	const allIncomingItems = [...incomingRequests, ...incomingAppointments]

	allIncomingItems.sort((a, b) => {
		const dateA = new Date(a.createdAt).getTime()
		const dateB = new Date(b.createdAt).getTime()
		return dateB - dateA
	})

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Requests", href: "/requests" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<RequestsClient incomingRequests={allIncomingItems} />
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
