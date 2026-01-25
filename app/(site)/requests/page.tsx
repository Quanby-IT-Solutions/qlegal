import { redirect } from "next/navigation"

import { PageHeader } from "@/core/components/navbar/page-header"

import { auth } from "@/services/next-auth"
import { HydrateClient, trpc } from "@/services/trpc/server"

import { RequestsClient } from "@/features/requests/components/requests-client"

export default async function RequestsPage() {
	const session = await auth()
	const userId = session?.user?.id
	const isENP = session?.user?.role === "ENP"

	// Pre-fetch data on server
	const incomingRequests = await trpc.requests.getIncomingRequests()

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Requests", href: "/requests" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<RequestsClient incomingRequests={incomingRequests} isENP={isENP} />
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
