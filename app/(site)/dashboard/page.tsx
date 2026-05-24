import { auth } from "@/services/next-auth"

import { DashboardPageClient } from "./dashboard-page-client"

export default async function Page() {
	const session = await auth()
	return <DashboardPageClient session={session} />
}
