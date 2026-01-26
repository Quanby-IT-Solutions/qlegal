
import { PageHeader } from "@/core/components/navbar/page-header"

import { auth } from "@/services/next-auth"
import { HydrateClient, trpc } from "@/services/trpc/server"
import type { RouterOutputs } from "@/services/trpc/client"

import { type IncomingItem } from "@/features/requests/api/requests.router"
import { RequestsClient } from "@/features/requests/components/requests-client"

export default async function RequestsPage() {
	const session = await auth()
	const isENP = session?.user?.role === "ENP"

	// Pre-fetch data on server
	const rawRequests = await trpc.requests.getIncomingRequests()
	
	// Transform requests to match IncomingItem structure
	// Database returns status/workflow as string, but schema constrains them to valid enum values
	const incomingRequests = rawRequests.map(request => ({
		id: request.id,
		title: request.title,
		description: request.description,
		// Type assertions are safe: database schema constrains status to valid enum values
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		status: request.status as IncomingItem["status"],
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
	if (isENP) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const rawAppointments = await trpc.requests.getIncomingAppointmentsForENP()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
		incomingAppointments = rawAppointments.map(apt => ({
			...apt,
			// Type assertion is safe: router constructs workflow as literal "REN" | "IEN"
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			workflow: apt.workflow as IncomingItem["workflow"],
		})) as IncomingItem[]
	}

	// Merge requests and appointments into a single list
	// Sort by creation date (newest first)
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const allIncomingItems = [...incomingRequests, ...incomingAppointments]
	
	allIncomingItems.sort((a, b) => { 
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
		const dateA = new Date(a.createdAt).getTime()
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
		const dateB = new Date(b.createdAt).getTime()
		return dateB - dateA
	})

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Requests", href: "/requests" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<RequestsClient incomingRequests={allIncomingItems} isENP={isENP} />
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
