import { Suspense } from "react"

import { Skeleton } from "@/core/components/ui/skeleton"

import { HydrateClient, trpc } from "@/services/trpc/server"

import { SessionsPageClient } from "@/features/sessions/components/sessions-page-client"

type TabValue = "meetings" | "active" | "history"

export default async function SessionsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>
}) {
	const params = await searchParams
	const initialTab: TabValue =
		params.tab === "active" || params.tab === "history" ? params.tab : "meetings"

	void trpc.meetings.getUserMeetingsWithDocumentStats.prefetch({ limit: 10, offset: 0 })
	void trpc.appointments.getUpcomingAppointments.prefetch()
	void trpc.appointments.getMyAppointments.prefetch({ limit: 50, offset: 0 })

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<Suspense
					fallback={
						<div className="flex-1 p-4 md:p-6 lg:p-8">
							<div className="mx-auto max-w-7xl space-y-8">
								<div className="space-y-2">
									<Skeleton className="h-9 w-48" />
									<Skeleton className="h-5 w-96" />
								</div>
								<Skeleton className="h-10 w-full max-w-2xl" />
								<div className="space-y-4">
									<Skeleton className="h-32 w-full" />
									<Skeleton className="h-32 w-full" />
									<Skeleton className="h-32 w-full" />
								</div>
							</div>
						</div>
					}
				>
					<SessionsPageClient initialTab={initialTab} />
				</Suspense>
			</div>
		</HydrateClient>
	)
}
