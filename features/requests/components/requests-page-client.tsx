"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { PageHeader } from "@/core/components/navbar/page-header"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

import { trpc } from "@/services/trpc/client"

import { RequestsListView } from "./requests-list-view"
import { ScheduleCalendarView } from "./schedule-calendar-view"
import { RejectDialog } from "./reject-dialog"
import { BlockTimeModal } from "./block-time-modal"

export function RequestsPageClient() {
	const { data: session } = useSession()
	const userId = session?.user?.id
	const isENP = session?.user?.role === "ENP"

	// View state: requests (primary) vs calendar (secondary)
	const [view, setView] = useState<"requests" | "calendar">("requests")

	// Calendar state
	const [selectedDay, setSelectedDay] = useState<Date | null>(null)
	const [blockModalOpen, setBlockModalOpen] = useState(false)

	// Request management state
	const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
	const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
	const [processingId, setProcessingId] = useState<string | null>(null)

	// Fetch incoming notarization requests for ENP (primary section)
	const { data: incomingRequests = [], isLoading: isRequestsLoading } =
		trpc.requests.getIncomingRequests.useQuery(undefined, {
			enabled: !!userId && isENP,
		})

	const utils = trpc.useUtils()

	// Mutations
	const updateStatusMutation = trpc.requests.updateRequestStatus.useMutation({
		onSuccess: async () => {
			await utils.requests.getIncomingRequests.invalidate()
			toast.success("Request status updated successfully!")
			setRejectDialogOpen(false)
			setProcessingId(null)
		},
		onError: (error) => {
			toast.error("Failed to update request", {
				description: error?.message ?? "An unexpected error occurred",
			})
			setProcessingId(null)
		},
	})

	const handleAccept = async (requestId: string) => {
		setProcessingId(requestId)
		await updateStatusMutation.mutateAsync({
			requestId,
			status: "IN_PROGRESS",
		})
	}

	const handleRejectClick = (requestId: string) => {
		setSelectedRequestId(requestId)
		setRejectDialogOpen(true)
	}

	const handleReject = async () => {
		if (!selectedRequestId) return
		setProcessingId(selectedRequestId)
		await updateStatusMutation.mutateAsync({
			requestId: selectedRequestId,
			status: "REJECTED",
		})
	}

	const handleComplete = async (requestId: string) => {
		setProcessingId(requestId)
		await updateStatusMutation.mutateAsync({
			requestId,
			status: "COMPLETED",
		})
	}

	const handleBlockTimeClick = () => {
		setBlockModalOpen(true)
	}

	const handleDayClick = (day: Date) => {
		setSelectedDay(day)
	}

	const handleSaveBlockTime = async (data: unknown) => {
		console.log("Block time data:", data)
		// Will be connected to blockTimeSlot mutation
		toast.success("Time slot block feature coming soon - API integration pending")
		setBlockModalOpen(false)
	}

	return (
		<>
			<div className="flex flex-1 flex-col">
				<PageHeader items={[{ label: "Requests", href: "/requests" }]} />

				<main className="flex-1 p-4 md:p-6 lg:p-8">
					<div className="mx-auto max-w-7xl space-y-8">
						{/* View Toggle */}
						<div className="flex items-center justify-between mb-8">
							<div />
							<Tabs value={view} onValueChange={(v: string) => setView(v as "requests" | "calendar")} className="w-auto">
								<TabsList>
									<TabsTrigger value="requests">Requests</TabsTrigger>
									<TabsTrigger value="calendar">Schedule & Calendar</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>

						{view === "requests" ? (
							/* =================== PRIMARY: Requests List =================== */
							<RequestsListView
								incomingRequests={incomingRequests}
								isRequestsLoading={isRequestsLoading}
								onAccept={handleAccept}
								onReject={handleRejectClick}
								onComplete={handleComplete}
								processingId={processingId}
							/>
						) : (
							/* =================== SECONDARY: Schedule & Calendar =================== */
							<ScheduleCalendarView
								selectedDay={selectedDay}
								onDayClick={handleDayClick}
								onBlockTimeClick={handleBlockTimeClick}
								onSaveBlockTime={handleSaveBlockTime}
								isBlockModalOpen={blockModalOpen}
								setBlockModalOpen={setBlockModalOpen}
							/>
						)}
					</div>
				</main>
			</div>

			{/* Reject Dialog */}
			<RejectDialog
				isOpen={rejectDialogOpen}
				onOpenChange={setRejectDialogOpen}
				onConfirm={handleReject}
				isProcessing={processingId !== null}
			/>

			{/* Block Time Modal */}
			{blockModalOpen && (
				<BlockTimeModal
					isOpen={blockModalOpen}
					onClose={() => setBlockModalOpen(false)}
					onSave={handleSaveBlockTime}
				/>
			)}
		</>
	)
}
