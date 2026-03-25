"use client"

import type { Session } from "next-auth"

import { PageHeader } from "@/core/components/navbar/page-header"
import { DashboardContent } from "@/features/dashboard/components/dashboard-content"
import { UserManagementDashboard } from "@/features/dashboard/components/admin-dashboard"
import { EnpAccreditationProgressBanner } from "@/features/legal-registration/components/enp-accreditation-progress-banner"

export function DashboardPageClient({ session }: { session: Session | null }) {
	const userRole = session?.user?.role
	const isAdmin = userRole === "ADMIN"

	return (
		<div className="flex flex-1 flex-col">
			<div className="px-4 pt-4">
				<EnpAccreditationProgressBanner />
			</div>
			<PageHeader items={[{ label: "Dashboard" }]} />
			{isAdmin ? <UserManagementDashboard /> : <DashboardContent />}
		</div>
	)
}
