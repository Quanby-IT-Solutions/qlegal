"use client"

import { type Route } from "next"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, CheckCircle, Clock, Filter, Handshake, Loader2, Mail, MapPin, Phone, Search, Star, User, Video } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"

type WorkflowType = "REN" | "IEN"
type ConsultationType = "INITIAL" | "FOLLOWUP" | "URGENT"
type MeetingPreference = "VIDEO_CALL" | "CHAT_ONLY"


export default function FindNotaryPage() {
	const router = useRouter()
	const searchParams = useSearchParams()

	const [searchTerm, setSearchTerm] = useState("")
	const [selectedLocation, setSelectedLocation] = useState("ALL")
	const [selectedSpecialization, setSelectedSpecialization] = useState("ALL")
	const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType | "ALL">("ALL")
	
	// Booking state
	const [selectedENP, setSelectedENP] = useState<string | null>(null)
	const [bookingWorkflow, setBookingWorkflow] = useState<WorkflowType>("REN")
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState<string>("")
	const [consultationType, setConsultationType] = useState<ConsultationType>("INITIAL")
	const [meetingPreference, setMeetingPreference] = useState<MeetingPreference>("VIDEO_CALL")
	const [specialRequirements, setSpecialRequirements] = useState("")
	const [location, setLocation] = useState("")

	// Fetch all ENPs (lawyers)
	const { data: enps, isLoading: isLoadingEnps } = trpc.lawyers.getLawyers.useQuery({
		query: searchTerm,
		limit: 100,
	})

	// Fetch ENP availability when ENP is selected
	const { data: availabilitySlots, isLoading: isLoadingAvailability } = trpc.consultations.getEnpAvailability.useQuery(
		{
			enpId: selectedENP || "",
			workflowType: bookingWorkflow,
		},
		{
			enabled: !!selectedENP,
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
				router.push("/dashboard" as Route)
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

	// Enhanced ENPs with mock data (until we have a proper profile/lawyer table)
	const enhancedEnps = enps?.map((enp) => ({
		...enp,
		specialization: "Legal Documents, Contracts",
		rating: 4.8,
		reviewCount: 0,
		experience: "5+ years",
		languages: ["English", "Filipino"],
		responseTime: "Within 2 hours",
		location: "Metro Manila", // Can be enhanced later with actual data
	}))

	// Filter ENPs based on search criteria
	const filteredENPs = enhancedEnps?.filter(enp => {
		const matchesSearch =
			enp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			enp.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
			enp.location.toLowerCase().includes(searchTerm.toLowerCase())

		const matchesLocation = selectedLocation === "ALL" || enp.location.includes(selectedLocation)
		const matchesSpecialization =
			selectedSpecialization === "ALL" || enp.specialization.includes(selectedSpecialization)
		// All ENPs support both REN and IEN
		const matchesWorkflow = selectedWorkflow === "ALL"

		return matchesSearch && matchesLocation && matchesSpecialization && matchesWorkflow
	}) || []

	const handleBookConsultation = (enpId: string, workflow: WorkflowType) => {
		setSelectedENP(enpId)
		setBookingWorkflow(workflow)
		setSelectedDate(undefined)
		setSelectedTime("")
	}

	const handleBooking = async () => {
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
			consultationType,
			meetingPreference: bookingWorkflow === "REN" ? meetingPreference : undefined,
			specialRequirements: specialRequirements || undefined,
			location: bookingWorkflow === "IEN" ? location : undefined,
		})
	}

	const enpDetails = enhancedEnps?.find((enp) => enp.id === selectedENP)
	const filteredSlots = selectedDate && availabilitySlots
		? availabilitySlots.filter((slot) => slot.date === format(selectedDate, "yyyy-MM-dd"))
		: []


	return (
		<>
			<SiteNavbar items={[{ label: "Find a Notary", url: "/find-notary" as Route }]} />

			<div className="bg-muted/30 min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Show list view when no ENP is selected */}
					{!selectedENP && (
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
							<Card className="mb-8">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Search className="h-5 w-5" />
										Search & Filter
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
										{/* Search Input */}
										<div className="lg:col-span-2">
											<Input
												placeholder="Search by name, specialization, or location..."
												value={searchTerm}
												onChange={e => setSearchTerm(e.target.value)}
												className="w-full"
											/>
										</div>

										{/* Location Filter */}
										<Select value={selectedLocation} onValueChange={setSelectedLocation}>
											<SelectTrigger>
												<SelectValue placeholder="All Locations" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ALL">All Locations</SelectItem>
												<SelectItem value="Metro Manila">Metro Manila</SelectItem>
												<SelectItem value="Cebu">Cebu</SelectItem>
												<SelectItem value="Davao">Davao</SelectItem>
												<SelectItem value="Iloilo">Iloilo</SelectItem>
											</SelectContent>
										</Select>

										{/* Specialization Filter */}
										<Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
											<SelectTrigger>
												<SelectValue placeholder="All Specializations" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ALL">All Specializations</SelectItem>
												<SelectItem value="Real Estate">Real Estate</SelectItem>
												<SelectItem value="Business">Business Documents</SelectItem>
												<SelectItem value="Legal">Legal Documents</SelectItem>
												<SelectItem value="Immigration">Immigration</SelectItem>
												<SelectItem value="Corporate">Corporate</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{/* Workflow Filter */}
									<div className="mt-4">
										<Tabs
											value={selectedWorkflow}
											onValueChange={value => setSelectedWorkflow(value as WorkflowType | "ALL")}
										>
											<TabsList>
												<TabsTrigger value="ALL">All Workflows</TabsTrigger>
												<TabsTrigger value="REN">Remote (REN)</TabsTrigger>
												<TabsTrigger value="IEN">In-Person (IEN)</TabsTrigger>
											</TabsList>
										</Tabs>
									</div>
								</CardContent>
							</Card>

							{/* Results */}
							<div className="space-y-6">
								<div className="flex items-center justify-between">
									<h2 className="text-xl font-semibold">
										{isLoadingEnps ? (
											<span className="flex items-center gap-2">
												<Loader2 className="h-5 w-5 animate-spin" />
												Loading...
											</span>
										) : (
											<>
												{filteredENPs.length} Notary{filteredENPs.length !== 1 ? "ies" : ""} Found
											</>
										)}
									</h2>
									<div className="flex items-center gap-2">
										<Filter className="h-4 w-4" />
										<span className="text-muted-foreground text-sm">Filtered by your criteria</span>
									</div>
								</div>

								{/* ENP Cards */}
								{isLoadingEnps ? (
									<div className="flex items-center justify-center py-12">
										<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
									</div>
								) : (
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
										{filteredENPs.map(enp => (
											<Card key={enp.id} className="transition-shadow hover:shadow-lg">
												<CardHeader>
													<div className="flex items-start gap-4">
														<Avatar className="h-16 w-16">
															<AvatarImage src={enp.image || undefined} alt={enp.name || "ENP"} />
															<AvatarFallback>
																{enp.name
																	?.split(" ")
																	.map(n => n[0])
																	.join("") || "EN"}
															</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<CardTitle className="text-lg">{enp.name}</CardTitle>
															<CardDescription>Electronic Notary Public</CardDescription>
															<div className="mt-2 flex items-center gap-2">
																<MapPin className="text-muted-foreground h-4 w-4" />
																<span className="text-muted-foreground text-sm">{enp.location}</span>
															</div>
														</div>
													</div>
												</CardHeader>
												<CardContent>
													<div className="space-y-4">
														{/* Rating */}
														<div className="flex items-center gap-2">
															<div className="flex items-center">
																{Array.from({ length: 5 }).map((_, i) => (
																	<Star
																		key={i}
																		className={`h-4 w-4 ${
																			i < Math.floor(enp.rating)
																				? "fill-current text-yellow-400"
																				: "text-gray-300"
																		}`}
																	/>
																))}
															</div>
															<span className="text-sm font-medium">{enp.rating}</span>
															<span className="text-muted-foreground text-sm">
																({enp.reviewCount} reviews)
															</span>
														</div>

														{/* Specialization */}
														<div>
															<p className="text-sm font-medium">Specialization</p>
															<p className="text-muted-foreground text-sm">{enp.specialization}</p>
														</div>

														{/* Experience & Languages */}
														<div className="grid grid-cols-2 gap-4 text-sm">
															<div>
																<p className="font-medium">Experience</p>
																<p className="text-muted-foreground">{enp.experience}</p>
															</div>
															<div>
																<p className="font-medium">Languages</p>
																<p className="text-muted-foreground">{enp.languages.join(", ")}</p>
															</div>
														</div>

														{/* Response Time */}
														<div className="text-muted-foreground text-sm">
															Response time: {enp.responseTime}
														</div>

														{/* Workflow Support */}
														<div className="flex gap-2">
															<Badge variant="outline" className="flex items-center gap-1">
																<Video className="h-3 w-3" />
																REN
															</Badge>
															<Badge variant="outline" className="flex items-center gap-1">
																<Handshake className="h-3 w-3" />
																IEN
															</Badge>
														</div>

														{/* Action Buttons */}
														<div className="flex gap-2 pt-2">
															<Button
																onClick={() => handleBookConsultation(enp.id, "REN")}
																className="flex-1"
																size="sm"
															>
																<Video className="mr-2 h-4 w-4" />
																Book REN
															</Button>
															<Button
																onClick={() => handleBookConsultation(enp.id, "IEN")}
																variant="outline"
																className="flex-1"
																size="sm"
															>
																<Handshake className="mr-2 h-4 w-4" />
																Book IEN
															</Button>
														</div>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								)}

								{/* No Results */}
								{!isLoadingEnps && filteredENPs.length === 0 && (
									<Card>
										<CardContent className="py-12 text-center">
											<Search className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
											<h3 className="mb-2 text-lg font-medium">No notaries found</h3>
											<p className="text-muted-foreground mb-4">
												Try adjusting your search criteria or filters to find more results.
											</p>
											<Button
												onClick={() => {
													setSearchTerm("")
													setSelectedLocation("ALL")
													setSelectedSpecialization("ALL")
													setSelectedWorkflow("ALL")
												}}
												variant="outline"
											>
												Clear Filters
											</Button>
										</CardContent>
									</Card>
								)}
							</div>
						</>
					)}

					{/* Booking view when ENP is selected */}
					{selectedENP && enpDetails && (
						<>
							{/* Header */}
							<div className="mb-8">
								<Button
									variant="outline"
									onClick={() => {
										setSelectedENP(null)
										setSelectedDate(undefined)
										setSelectedTime("")
									}}
									className="mb-4"
								>
									← Back to List
								</Button>
								<h1 className="text-3xl font-bold tracking-tight">Book Consultation</h1>
								<p className="text-muted-foreground mt-2">
									Schedule a {bookingWorkflow === "REN" ? "remote" : "in-person"} consultation with {enpDetails.name}
								</p>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
								{/* ENP Information */}
								<div className="lg:col-span-1">
									<Card>
										<CardHeader>
											<CardTitle>Notary Details</CardTitle>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="flex items-center gap-4">
												<Avatar className="h-16 w-16">
													<AvatarImage src={enpDetails.image || undefined} alt={enpDetails.name || "ENP"} />
													<AvatarFallback>
														{enpDetails.name?.split(" ").map(n => n[0]).join("") || "EN"}
													</AvatarFallback>
												</Avatar>
												<div>
													<h4 className="font-medium">{enpDetails.name}</h4>
													<p className="text-sm text-muted-foreground">Electronic Notary Public</p>
													<div className="flex items-center gap-1 mt-1">
														<span className="text-sm font-medium">{enpDetails.rating}</span>
														<span className="text-sm text-muted-foreground">
															({enpDetails.reviewCount} reviews)
														</span>
													</div>
												</div>
											</div>

											<div className="space-y-3 text-sm">
												{enpDetails.phoneNumber && (
													<div className="flex items-center gap-2">
														<Phone className="h-4 w-4 text-muted-foreground" />
														<span>{enpDetails.phoneNumber}</span>
													</div>
												)}
												<div className="flex items-center gap-2">
													<Mail className="h-4 w-4 text-muted-foreground" />
													<span>{enpDetails.email}</span>
												</div>
												<div>
													<p className="font-medium">Specialization</p>
													<p className="text-muted-foreground">{enpDetails.specialization}</p>
												</div>
												<div>
													<p className="font-medium">Languages</p>
													<p className="text-muted-foreground">{enpDetails.languages.join(", ")}</p>
												</div>
												<div>
													<p className="font-medium">Experience</p>
													<p className="text-muted-foreground">{enpDetails.experience}</p>
												</div>
												<div>
													<p className="font-medium">Response Time</p>
													<p className="text-muted-foreground">{enpDetails.responseTime}</p>
												</div>
											</div>

											{/* Workflow Badge */}
											<div className="pt-4 border-t">
												<p className="text-sm font-medium mb-2">Selected Workflow</p>
												<Badge variant="outline" className="flex items-center gap-1 w-fit">
													{bookingWorkflow === "REN" ? (
														<>
															<Video className="h-3 w-3" />
															Remote (REN)
														</>
													) : (
														<>
															<Handshake className="h-3 w-3" />
															In-Person (IEN)
														</>
													)}
												</Badge>
											</div>

											<Button 
												variant="outline" 
												onClick={() => {
													setSelectedENP(null)
													setSelectedDate(undefined)
													setSelectedTime("")
												}}
												className="w-full"
											>
												Change Notary
											</Button>
										</CardContent>
									</Card>

									{/* Workflow Info */}
									<Card className="mt-4">
										<CardContent className="pt-6">
											{bookingWorkflow === "REN" ? (
												<div className="space-y-4">
													<div className="flex items-start gap-3">
														<CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
														<div>
															<h4 className="font-medium">Remote Electronic Notarization</h4>
															<p className="text-sm text-muted-foreground">
																Conduct notarization remotely via video call or chat.
															</p>
														</div>
													</div>
													<div className="grid grid-cols-1 gap-2 text-sm">
														<div className="flex items-center gap-2">
															<Video className="h-4 w-4 text-blue-600" />
															<span>Video call or chat option</span>
														</div>
														<div className="flex items-center gap-2">
															<Clock className="h-4 w-4 text-blue-600" />
															<span>30-minute sessions</span>
														</div>
														<div className="flex items-center gap-2">
															<CheckCircle className="h-4 w-4 text-blue-600" />
															<span>Remote ID verification</span>
														</div>
													</div>
												</div>
											) : (
												<div className="space-y-4">
													<div className="flex items-start gap-3">
														<CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
														<div>
															<h4 className="font-medium">In-Person Electronic Notarization</h4>
															<p className="text-sm text-muted-foreground">
																Traditional in-person notarization with physical presence.
															</p>
														</div>
													</div>
													<div className="grid grid-cols-1 gap-2 text-sm">
														<div className="flex items-center gap-2">
															<MapPin className="h-4 w-4 text-green-600" />
															<span>Physical presence required</span>
														</div>
														<div className="flex items-center gap-2">
															<Clock className="h-4 w-4 text-green-600" />
															<span>45-minute sessions</span>
														</div>
														<div className="flex items-center gap-2">
															<User className="h-4 w-4 text-green-600" />
															<span>Physical ID verification</span>
														</div>
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								</div>

								{/* Booking Form */}
								<div className="lg:col-span-2">
									<Card>
										<CardHeader>
											<CardTitle>Schedule Your Consultation</CardTitle>
											<CardDescription>
												{bookingWorkflow === "REN" 
													? "Select a time for your remote consultation"
													: "Select a time for your in-person consultation"
												}
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-6">
											{/* Date Selection */}
											<div>
												<Label className="text-base font-medium">Select Date</Label>
												<Popover>
													<PopoverTrigger asChild>
														<Button variant="outline" className="w-full justify-start text-left font-normal mt-2">
															<Calendar className="mr-2 h-4 w-4" />
															{selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-auto p-0">
														<CalendarComponent
															mode="single"
															selected={selectedDate}
															onSelect={setSelectedDate}
															disabled={(date) => date < new Date()}
															initialFocus
														/>
													</PopoverContent>
												</Popover>
											</div>

											{/* Time Selection */}
											{selectedDate && (
												<div>
													<Label className="text-base font-medium">Available Times</Label>
													{isLoadingAvailability ? (
														<div className="flex items-center justify-center py-8">
															<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
														</div>
													) : (
														<div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
															{filteredSlots.map((slot, index) => (
																<Button
																	key={index}
																	variant={selectedTime === slot.time ? "default" : "outline"}
																	onClick={() => setSelectedTime(slot.time)}
																	className="justify-start"
																>
																	<Clock className="mr-2 h-4 w-4" />
																	{slot.time}
																</Button>
															))}
														</div>
													)}
													{!isLoadingAvailability && filteredSlots.length === 0 && (
														<p className="text-sm text-muted-foreground mt-2">
															No available times for this date. Please select another date.
														</p>
													)}
												</div>
											)}

											{/* Consultation Type */}
											<div>
												<Label className="text-base font-medium">Consultation Type</Label>
												<RadioGroup value={consultationType} onValueChange={(value) => setConsultationType(value as ConsultationType)} className="mt-2">
													<div className="flex items-center space-x-2">
														<RadioGroupItem value="INITIAL" id="initial" />
														<Label htmlFor="initial" className="font-normal">Initial Consultation</Label>
													</div>
													<div className="flex items-center space-x-2">
														<RadioGroupItem value="FOLLOWUP" id="followup" />
														<Label htmlFor="followup" className="font-normal">Follow-up Consultation</Label>
													</div>
													<div className="flex items-center space-x-2">
														<RadioGroupItem value="URGENT" id="urgent" />
														<Label htmlFor="urgent" className="font-normal">Urgent Consultation</Label>
													</div>
												</RadioGroup>
											</div>

											{/* Meeting Preference (REN only) */}
											{bookingWorkflow === "REN" && (
												<div>
													<Label className="text-base font-medium">Meeting Preference</Label>
													<RadioGroup value={meetingPreference} onValueChange={(value) => setMeetingPreference(value as MeetingPreference)} className="mt-2">
														<div className="flex items-center space-x-2">
															<RadioGroupItem value="VIDEO_CALL" id="video" />
															<Label htmlFor="video" className="font-normal">
																<div className="flex items-center gap-2">
																	<Video className="h-4 w-4" />
																	<div>
																		<div className="font-medium">Video Call</div>
																		<div className="text-xs text-muted-foreground">Full video consultation with screen sharing</div>
																	</div>
																</div>
															</Label>
														</div>
														<div className="flex items-center space-x-2">
															<RadioGroupItem value="CHAT_ONLY" id="chat" />
															<Label htmlFor="chat" className="font-normal">
																<div className="flex items-center gap-2">
																	<Mail className="h-4 w-4" />
																	<div>
																		<div className="font-medium">Chat Only</div>
																		<div className="text-xs text-muted-foreground">Text-based consultation via messaging</div>
																	</div>
																</div>
															</Label>
														</div>
													</RadioGroup>
												</div>
											)}

											{/* Location for IEN */}
											{bookingWorkflow === "IEN" && (
												<div>
													<Label htmlFor="location" className="text-base font-medium">
														Meeting Location <span className="text-red-500">*</span>
													</Label>
													<input
														id="location"
														type="text"
														placeholder="Enter the meeting location address..."
														value={location}
														onChange={(e) => setLocation(e.target.value)}
														className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
													/>
												</div>
											)}

											{/* Special Requirements */}
											<div>
												<Label htmlFor="requirements" className="text-base font-medium">
													Special Requirements (Optional)
												</Label>
												<Textarea
													id="requirements"
													placeholder="Any special requirements or documents you need notarized..."
													value={specialRequirements}
													onChange={(e) => setSpecialRequirements(e.target.value)}
													className="mt-2"
												/>
											</div>

											{/* Booking Button */}
											<Button
												onClick={handleBooking}
												disabled={!selectedDate || !selectedTime || bookConsultationMutation.isPending}
												className="w-full"
												size="lg"
											>
												{bookConsultationMutation.isPending ? (
													<>
														<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														Booking...
													</>
												) : (
													<>
														{bookingWorkflow === "REN" ? (
															<>
																<Video className="mr-2 h-4 w-4" />
																Book Remote Consultation
															</>
														) : (
															<>
																<Handshake className="mr-2 h-4 w-4" />
																Book In-Person Consultation
															</>
														)}
													</>
												)}
											</Button>

											{(!selectedDate || !selectedTime) && (
												<p className="text-sm text-muted-foreground text-center">
													Please select a date and time to continue
												</p>
											)}
										</CardContent>
									</Card>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</>
	)
}
