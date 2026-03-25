import { DashboardPageClient } from "./dashboard-page-client"
import { auth } from "@/services/next-auth"

export default async function Page() {
	const session = await auth()
	return <DashboardPageClient session={session} />
}
