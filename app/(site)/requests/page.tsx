
import { PageHeader } from "@/core/components/navbar/page-header"

import { auth } from "@/services/next-auth"
import { HydrateClient, trpc } from "@/services/trpc/server"
import type { RouterOutputs } from "@/services/trpc/client"

import { RequestsClient } from "@/features/requests/components/requests-client"

export default async function RequestsPage() {
	const session = await auth()
	const isENP = session?.user?.role === "ENP"

	// Pre-fetch data on server
	const incomingRequests = await trpc.requests.getIncomingRequests()

	// Only fetch appointments if user is an ENP
	type IncomingAppointmentsType = RouterOutputs['requests']['getIncomingAppointmentsForENP']

	let incomingAppointments: IncomingAppointmentsType
	if (isENP) {
		incomingAppointments = await trpc.requests.getIncomingAppointmentsForENP()
	} else {
		incomingAppointments = []
	}

	// Merge requests and appointments into a single list
	// Both return arrays that can be merged together
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
						<RequestsClient incomingRequests={allIncomingItems} isENP={isENP} />
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
