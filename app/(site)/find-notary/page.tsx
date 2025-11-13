"use client"

import { type Route } from "next"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"

// Feature components
import { SearchFiltersComponent } from "@/features/find-notary/components/search-filters"
import { NotaryResults } from "@/features/find-notary/components/notary-results"
import { NotaryDetails } from "@/features/find-notary/components/notary-details"
import { BookingForm } from "@/features/find-notary/components/booking-form"

// Hooks
import { useSearchFilters } from "@/features/find-notary/hooks/use-search-filters"
import { useBookingState } from "@/features/find-notary/hooks/use-booking-state"
import { useFilteredNotaries } from "@/features/find-notary/hooks/use-filtered-notaries"

// Types
import type { 
	WorkflowType, 
	EnhancedENP 
} from "@/features/find-notary/types/find-notary.types"


export default function FindNotaryPage() {
	const router = useRouter()

	// Custom hooks for state management
	const { filters, updateFilters, clearFilters } = useSearchFilters()
	const { bookingState, updateBookingState, initializeBooking, resetBooking } = useBookingState()

	// Fetch all ENPs (lawyers)
	const { data: enps, isLoading: isLoadingEnps } = trpc.lawyers.getLawyers.useQuery({
		query: filters.searchTerm,
		limit: 100,
	})

	// Fetch ENP availability when ENP is selected
	const { data: availabilitySlots, isLoading: isLoadingAvailability } = trpc.consultations.getEnpAvailability.useQuery(
		{
			enpId: bookingState.selectedENP || "",
			workflowType: bookingState.bookingWorkflow,
		},
		{
			enabled: !!bookingState.selectedENP,
		}
	)

	// Book consultation mutation
	const bookConsultationMutation = trpc.consultations.bookConsultation.useMutation({
		onSuccess: (data) => {
			toast.success("Consultation Booked!", {
				description: "Your consultation has been successfully booked.",
			})

		// Redirect based on workflow type and meeting preference
		if (data.workflowType === "REN" && data.meetingId) {
			router.push(`/meetings/${data.meetingId}` as Route)
		} else if (data.workflowType === "REN" && data.conversationId) {
			toast.success("Ready to Chat!", {
				description: "You can now message the ENP directly.",
			})
			router.push("/messages" as Route)
		} else if (data.workflowType === "IEN") {
			router.push("/dashboard" as Route)
		} else {
			router.push("/dashboard" as Route)
		}
		},
		onError: (error) => {
			toast.error("Booking Failed", {
				description: error.message || "Failed to book consultation. Please try again.",
			})
		},
	})

	// Transform ENPs to EnhancedENP format with real data from backend
	const enhancedEnps: EnhancedENP[] | undefined = enps?.map((enp) => ({
		...enp,
		specialization: enp.specialization || "General Notary Services",
		rating: enp.rating || 0,
		reviewCount: enp.reviewCount || 0,
		experience: enp.experience || "Not specified",
		languages: Array.isArray(enp.languages) ? enp.languages : (enp.languages ? [enp.languages] : ["English"]),
		responseTime: enp.responseTime || "Not specified",
		location: "Not specified", // Location not stored in schema yet - can be added later
	}))

	// Filter ENPs based on search criteria
	const filteredENPs = useFilteredNotaries(enhancedEnps, filters)

	const handleBookConsultation = (enpId: string, workflow: WorkflowType) => {
		initializeBooking(enpId, workflow)
	}

	const handleBooking = async () => {
		const { selectedENP, selectedDate, selectedTime, bookingWorkflow, location } = bookingState

		if (!selectedENP || !selectedDate || !selectedTime) {
			toast.error("Missing Information", {
				description: "Please select a date and time to continue.",
			})
			return
		}

		if (bookingWorkflow === "IEN" && !location) {
			toast.error("Location Required", {
				description: "Please provide a location for the in-person consultation.",
			})
			return
		}

		await bookConsultationMutation.mutateAsync({
			enpId: selectedENP,
			workflowType: bookingWorkflow,
			appointmentDate: selectedDate,
			appointmentTime: selectedTime,
			consultationType: bookingState.consultationType,
			meetingPreference: bookingWorkflow === "REN" ? bookingState.meetingPreference : undefined,
			specialRequirements: bookingState.specialRequirements || undefined,
			location: bookingWorkflow === "IEN" ? location : undefined,
		})
	}

	const enpDetails = enhancedEnps?.find((enp) => enp.id === bookingState.selectedENP)

	return (
		<>
			<SiteNavbar items={[{ label: "Find a Notary", url: "/find-notary" as Route }]} />

			<div className="bg-muted/30 min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Show list view when no ENP is selected */}
					{!bookingState.selectedENP && (
						<>
							{/* Header */}
							<div className="mb-8">
								<h1 className="text-3xl font-bold tracking-tight">Find a Notary</h1>
								<p className="text-muted-foreground mt-2">
									Discover Electronic Notaries Public (ENPs) who can help with your notarization needs.
									All ENPs support both Remote (REN) and In-Person (IEN) workflows.
								</p>
							</div>

							{/* Search and Filters */}
							<SearchFiltersComponent
								filters={filters}
								onFiltersChange={updateFilters}
							/>

							{/* Results */}
							<NotaryResults
								notaries={filteredENPs}
								isLoading={isLoadingEnps}
								onBookConsultation={handleBookConsultation}
								onClearFilters={clearFilters}
							/>
						</>
					)}

					{/* Booking view when ENP is selected */}
					{bookingState.selectedENP && enpDetails && (
						<>
							{/* Header */}
							<div className="mb-8">
								<Button
									variant="outline"
									onClick={resetBooking}
									className="mb-4"
								>
									← Back to List
								</Button>
								<h1 className="text-3xl font-bold tracking-tight">Book Consultation</h1>
								<p className="text-muted-foreground mt-2">
									Schedule a {bookingState.bookingWorkflow === "REN" ? "remote" : "in-person"} consultation with {enpDetails.name}
								</p>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								{/* ENP Information */}
								<div className="lg:col-span-1">
									<NotaryDetails
										enp={enpDetails}
										bookingWorkflow={bookingState.bookingWorkflow}
										onChangeNotary={resetBooking}
									/>
								</div>

								{/* Booking Form */}
								<div className="lg:col-span-2">
									<BookingForm
										bookingState={bookingState}
										availabilitySlots={availabilitySlots}
										isLoadingAvailability={isLoadingAvailability}
										isBookingInProgress={bookConsultationMutation.isPending}
										onBookingStateChange={updateBookingState}
										onSubmitBooking={handleBooking}
									/>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</>
	)
}
