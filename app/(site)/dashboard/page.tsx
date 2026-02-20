import { PageHeader } from "@/core/components/navbar/page-header"

import { DashboardContent } from "@/features/dashboard/components/dashboard-content"

export default function Page() {
	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Dashboard" }]} />
			<DashboardContent />
		</div>
	)
}
