"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { FileText } from "lucide-react"
import { type Route } from "next"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Card, CardContent } from "@/core/components/ui/card"

// Feature components
import { RequestFiltersComponent } from "@/features/requests/components/request-filters"
import { RequestCard } from "@/features/requests/components/request-card"
import { ViewRequestDialog } from "@/features/requests/components/view-request-dialog"
import { ConfirmRequestDialog } from "@/features/requests/components/confirm-request-dialog"
import { RejectRequestDialog } from "@/features/requests/components/reject-request-dialog"
import { RescheduleRequestDialog } from "@/features/requests/components/reschedule-request-dialog"

// Feature hooks
import { useRequestFilters } from "@/features/requests/hooks/use-request-filters"
import { useFilteredRequests } from "@/features/requests/hooks/use-filtered-requests"

// Types
import type { AppointmentWithDetails } from "@/features/requests/types/requests.types"

export default function IncomingRequestsPage() {
	const { data: session } = useSession()
	const userId = session?.user?.id
	const { filters, updateFilters } = useRequestFilters()
	const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)
	const [viewDialogOpen, setViewDialogOpen] = useState(false)
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [rescheduleOpen, setRescheduleOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	// Fetch appointments where current user is the lawyer (ENP)
	const { data: appointments, isLoading } = trpc.appointments.getMyAppointments.useQuery(
		{ limit: 100, offset: 0 },
		{ enabled: !!userId }
	)

	const utils = trpc.useUtils()

	// Filter to only show appointments where current user is the lawyer (incoming requests)
	const incomingAppointments = (appointments?.filter((apt: any) => apt.lawyerId === userId) || []) as AppointmentWithDetails[]

	const { filteredAppointments, stats } = useFilteredRequests(incomingAppointments, filters)

	// Mutations
	const confirmMutation = trpc.appointments.confirmAppointment.useMutation({
		onSuccess: () => {
			toast.success("Appointment confirmed successfully!")
			setConfirmDialogOpen(false)
			setProcessingId(null)
		},
		onError: (error: any) => {
			toast.error("Failed to confirm appointment", {
				description: error.message,
			})
			setProcessingId(null)
		},
	})

	const cancelMutation = trpc.appointments.cancelAppointment.useMutation({
		onSuccess: () => {
			toast.success("Appointment rejected")
			setRejectDialogOpen(false)
			setProcessingId(null)
		},
		onError: (error: any) => {
			toast.error("Failed to reject appointment", {
				description: error.message,
			})
			setProcessingId(null)
		},
	})

	const updateMutation = trpc.appointments.updateAppointment.useMutation({
		onSuccess: async () => {
			await utils.appointments.getMyAppointments.invalidate()
			setRescheduleOpen(false)
			setProcessingId(null)
		},
		onError: (error: any) => {
			toast.error("Failed to reschedule appointment", { description: error.message })
		},
	})

	const handleViewDetails = (appointment: AppointmentWithDetails) => {
		setSelectedAppointment(appointment)
		setViewDialogOpen(true)
	}

	const handleConfirmClick = (appointmentId: string) => {
		const appointment = filteredAppointments.find(a => a.id === appointmentId)
		if (appointment) {
			setSelectedAppointment(appointment)
			setConfirmDialogOpen(true)
		}
	}

	const handleConfirm = async (data: { meetingLink?: string }) => {
		if (!selectedAppointment) return
		setProcessingId(selectedAppointment.id)
		await confirmMutation.mutateAsync({
			appointmentId: selectedAppointment.id,
			meetingLink: data.meetingLink,
		})
	}

	const handleRejectClick = (appointmentId: string) => {
		const appointment = filteredAppointments.find(a => a.id === appointmentId)
		if (appointment) {
			setSelectedAppointment(appointment)
			setRejectDialogOpen(true)
		}
	}

	const handleReject = async (data: { cancelReason: string }) => {
		if (!selectedAppointment) return
		setProcessingId(selectedAppointment.id)
		await cancelMutation.mutateAsync({
			appointmentId: selectedAppointment.id,
			cancelReason: data.cancelReason,
		})
	}

	const handleRescheduleClick = (appointmentId: string) => {
		const appointment = filteredAppointments.find(a => a.id === appointmentId)
		if (appointment) {
			setSelectedAppointment(appointment)
			setRescheduleOpen(true)
		}
	}

	const handleReschedule = async (values: { appointmentDate: Date; duration: number }) => {
		if (!selectedAppointment) return
		setProcessingId(selectedAppointment.id)
		await updateMutation.mutateAsync({
			appointmentId: selectedAppointment.id,
			appointmentDate: values.appointmentDate,
			duration: values.duration,
			status: "PENDING",
		})
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarization Requests", url: "/requests" as Route },
					{ label: "Incoming Requests", url: "/requests/incoming" as Route }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Incoming Requests</h1>
						<p className="mt-2 text-muted-foreground">
							Review and manage notarization requests from clients
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
									<p className="text-muted-foreground">Loading appointments...</p>
								</CardContent>
							</Card>
						) : filteredAppointments.length > 0 ? (
							filteredAppointments.map((appointment) => (
								<RequestCard
									key={appointment.id}
									appointment={appointment}
									viewMode="incoming"
									onViewDetails={handleViewDetails}
									onConfirm={handleConfirmClick}
									onReject={handleRejectClick}
									onReschedule={handleRescheduleClick}
									isProcessing={processingId === appointment.id}
								/>
							))
						) : (
							<Card>
								<CardContent className="py-12 text-center">
									<FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-medium mb-2">No incoming requests</h3>
									<p className="text-muted-foreground">
										{filters.search || filters.status !== "ALL" || filters.type !== "ALL" || filters.workflow !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "No clients have requested your notarization services yet."
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
				viewMode="incoming"
			/>

			<ConfirmRequestDialog
				open={confirmDialogOpen}
				onOpenChange={setConfirmDialogOpen}
				onConfirm={handleConfirm}
				isLoading={confirmMutation.isPending}
			/>

			<RejectRequestDialog
				open={rejectDialogOpen}
				onOpenChange={setRejectDialogOpen}
				onReject={handleReject}
				isLoading={cancelMutation.isPending}
			/>

			<RescheduleRequestDialog
				open={rescheduleOpen}
				onOpenChange={setRescheduleOpen}
				appointment={selectedAppointment}
				onSubmit={handleReschedule}
				isSubmitting={updateMutation.isPending}
			/>
		</>
	)
}
