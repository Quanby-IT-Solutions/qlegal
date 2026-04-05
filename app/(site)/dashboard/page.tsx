"use client"

import { useSession } from "next-auth/react"

import { PageHeader } from "@/core/components/navbar/page-header"

import { DashboardContent } from "@/features/dashboard/components/dashboard-content"
import { UserManagementDashboard } from "@/features/dashboard/components/admin-dashboard"

export default function Page() {
	const { data: session } = useSession()
	const userRole = session?.user?.role

	const isAdmin = userRole === "ADMIN"

	return (
		<div className="flex flex-1 flex-col">
			<PageHeader items={[{ label: "Dashboard" }]} />
			{isAdmin ? <UserManagementDashboard /> : <DashboardContent />}
		</div>
	)
}
