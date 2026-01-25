import { redirect } from "next/navigation"

import { trpc, HydrateClient } from "@/services/trpc/server"
import { auth } from "@/services/next-auth"
import { PageHeader } from "@/core/components/navbar/page-header"
import { ScheduleClient } from "@/features/schedule/components/schedule-client"

export default async function SchedulePage() {
	const session = await auth()
	const isENP = session?.user?.role === "ENP"

	// ENP-only access control
	if (!isENP) {
		redirect("/dashboard")
	}

	const today = new Date()
	const scheduleData = await trpc.requests.getEnpSchedule({
		month: today.getMonth(),
		year: today.getFullYear(),
	})

	return (
		<HydrateClient>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Schedule", href: "/schedule" }]} />
				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						<ScheduleClient scheduleData={scheduleData} />
					</div>
				</main>
			</div>
		</HydrateClient>
	)
}
