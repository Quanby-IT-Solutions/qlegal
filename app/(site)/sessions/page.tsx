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

	await Promise.all([
		trpc.meetings.getUserMeetingsWithDocumentStats.prefetch({ limit: 10, offset: 0 }),
		trpc.appointments.getUpcomingAppointments.prefetch(),
		trpc.appointments.getMyAppointments.prefetch({ limit: 50, offset: 0 }),
	])

	return (
		<HydrateClient>
			<SessionsPageClient initialTab={initialTab} />
		</HydrateClient>
	)
}
