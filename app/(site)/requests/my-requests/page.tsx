"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { type Route } from "next"
import { useSession } from "next-auth/react"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Card, CardContent } from "@/core/components/ui/card"

// Feature components
import { RequestFiltersComponent } from "@/features/requests/components/request-filters"
import { RequestCard } from "@/features/requests/components/request-card"
import { ViewRequestDialog } from "@/features/requests/components/view-request-dialog"

// Feature hooks
import { useRequestFilters } from "@/features/requests/hooks/use-request-filters"
import { useFilteredRequests } from "@/features/requests/hooks/use-filtered-requests"

// Types
import type { AppointmentWithDetails } from "@/features/requests/types/requests.types"

export default function MyRequestsPage() {
	const { data: session } = useSession()
	const userId = session?.user?.id

	const { filters, updateFilters } = useRequestFilters()
	const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)
	const [viewDialogOpen, setViewDialogOpen] = useState(false)

	// Fetch appointments for the current user
	const { data: appointments, isLoading } = trpc.appointments.getMyAppointments.useQuery(
		{ limit: 100, offset: 0 },
		{ enabled: !!userId }
	)

	// Only include appointments where the current user is the client (PRINCIPAL)
	const myAppointments = (appointments?.filter((apt: any) => apt.clientId === userId) || []) as AppointmentWithDetails[]

	const { filteredAppointments, stats } = useFilteredRequests(myAppointments, filters)

	const handleViewDetails = (appointment: AppointmentWithDetails) => {
		setSelectedAppointment(appointment)
		setViewDialogOpen(true)
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarization Requests", url: "/requests" as Route },
					{ label: "My Requests", url: "/requests/my-requests" as Route }
				]} 
			/>
            
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">My Notarization Requests</h1>
						<p className="mt-2 text-muted-foreground">
							Track the status of your submitted notarization requests
						</p>
						<div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
							<span>{stats.todayCount} today</span>
							<span>•</span>
							<span>{stats.upcomingCount} upcoming</span>
						</div>
					</div>

					{/* Filters */}
					<RequestFiltersComponent
						filters={filters}
						onFiltersChange={updateFilters}
						stats={stats}
						showWorkflowFilter={true}
					/>

					{/* Requests List */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold">
								{filteredAppointments.length} Request{filteredAppointments.length !== 1 ? "s" : ""}
							</h2>
						</div>

						{isLoading ? (
							<Card>
								<CardContent className="py-12 text-center">
									<p className="text-muted-foreground">Loading your requests...</p>
								</CardContent>
							</Card>
						) : filteredAppointments.length > 0 ? (
							filteredAppointments.map((appointment) => (
								<RequestCard
									key={appointment.id}
									appointment={appointment}
									viewMode="my-requests"
									onViewDetails={handleViewDetails}
								/>
							))
						) : (
							<Card>
								<CardContent className="py-12 text-center">
									<FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-medium mb-2">No requests found</h3>
									<p className="text-muted-foreground">
										{filters.search || filters.status !== "ALL" || filters.type !== "ALL" || filters.workflow !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "You haven't created any notarization requests yet."
										}
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>

			{/* Dialogs */}
			<ViewRequestDialog
				appointment={selectedAppointment}
				open={viewDialogOpen}
				onOpenChange={setViewDialogOpen}
				viewMode="my-requests"
			/>
		</>
	)
}
