"use client"

import { useState, useEffect } from "react"
import { type Route } from "next"
import { useSearchParams, useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, Video, Handshake, User, Phone, Mail, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { format } from "date-fns"

type ConsultationType = "INITIAL" | "FOLLOWUP" | "URGENT"
type WorkflowType = "REN" | "IEN"
type MeetingPreference = "VIDEO_CALL" | "CHAT_ONLY"

export default function ConsultationsPage() {
	const searchParams = useSearchParams()
	const router = useRouter()
	
	const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>("REN")
	const [selectedENP, setSelectedENP] = useState<string | null>(null)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState<string>("")
	const [consultationType, setConsultationType] = useState<ConsultationType>("INITIAL")
	const [meetingPreference, setMeetingPreference] = useState<MeetingPreference>("VIDEO_CALL")
	const [specialRequirements, setSpecialRequirements] = useState("")
	const [location, setLocation] = useState("")

	// Get ENP ID from URL params
	const enpId = searchParams.get("enp")
	const workflowParam = searchParams.get("workflow") as WorkflowType | null

	useEffect(() => {
		if (enpId) {
			setSelectedENP(enpId)
		}
		if (workflowParam && (workflowParam === "REN" || workflowParam === "IEN")) {
			setSelectedWorkflow(workflowParam)
		}
	}, [enpId, workflowParam])

	// Fetch available ENPs
	const { data: availableEnps, isLoading: isLoadingEnps } = trpc.consultations.getAvailableEnps.useQuery({
		workflowType: selectedWorkflow,
	})

	// Fetch ENP availability when ENP is selected
	const { data: availabilitySlots, isLoading: isLoadingAvailability } = trpc.consultations.getEnpAvailability.useQuery(
		{
			enpId: selectedENP || "",
			workflowType: selectedWorkflow,
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
			if (data.workflowType === "REN" && data.meetingPreference === "VIDEO_CALL" && data.meetingId) {
				// Video call - go to meeting lobby
				toast.success("Video Consultation Ready!", {
					description: "Redirecting you to the meeting lobby...",
				})
				router.push(`/meetings/${data.meetingId}/lobby` as Route)
			} else if (data.workflowType === "REN" && data.meetingPreference === "CHAT_ONLY" && data.conversationId) {
				// Chat only - go to messages
				toast.success("Chat Consultation Ready!", {
					description: "You can now message the ENP directly.",
				})
				router.push("/messages" as Route)
			} else if (data.workflowType === "IEN") {
				// In-person - go to dashboard/appointments
				toast.success("Appointment Scheduled!", {
					description: "Check your appointments for details.",
				})
				router.push("/dashboard" as Route)
			} else {
				// Fallback
				router.push("/dashboard" as Route)
			}
		},
		onError: (error) => {
			toast.error("Booking Failed", {
				description: error.message || "Failed to book consultation. Please try again.",
			})
		},
	})

	const enpDetails = availableEnps?.find((enp) => enp.id === selectedENP)

	const handleWorkflowChange = (workflow: WorkflowType) => {
		setSelectedWorkflow(workflow)
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

		if (selectedWorkflow === "IEN" && !location) {
			toast.error("Location Required", {
				description: "Please provide a location for the in-person consultation.",
			})
			return
		}

		await bookConsultationMutation.mutateAsync({
			enpId: selectedENP,
			workflowType: selectedWorkflow,
			appointmentDate: selectedDate,
			appointmentTime: selectedTime,
			consultationType,
			meetingPreference: selectedWorkflow === "REN" ? meetingPreference : undefined,
			specialRequirements: specialRequirements || undefined,
			location: selectedWorkflow === "IEN" ? location : undefined,
		})
	}

	const filteredSlots = selectedDate && availabilitySlots
		? availabilitySlots.filter((slot) => slot.date === format(selectedDate, "yyyy-MM-dd"))
		: []

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Find a Notary", url: "/find-notary" },
					{ label: "Consultations", url: "/consultations" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Book Consultation</h1>
						<p className="mt-2 text-muted-foreground">
							Schedule a consultation with an Electronic Notary Public for your notarization needs.
						</p>
					</div>

					{/* Workflow Selection */}
					<Card className="mb-8">
						<CardHeader>
							<CardTitle>Select Notarization Type</CardTitle>
							<CardDescription>
								Choose between Remote Electronic Notarization (REN) or In-Person Electronic Notarization (IEN)
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Tabs value={selectedWorkflow} onValueChange={(value) => handleWorkflowChange(value as WorkflowType)}>
								<TabsList className="grid w-full grid-cols-2">
									<TabsTrigger value="REN" className="flex items-center gap-2">
										<Video className="h-4 w-4" />
										Remote (REN)
									</TabsTrigger>
									<TabsTrigger value="IEN" className="flex items-center gap-2">
										<Handshake className="h-4 w-4" />
										In-Person (IEN)
									</TabsTrigger>
								</TabsList>
								
								<TabsContent value="REN" className="mt-6">
									<div className="space-y-4">
										<div className="flex items-start gap-3">
											<CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
											<div>
												<h4 className="font-medium">Remote Electronic Notarization (REN)</h4>
												<p className="text-sm text-muted-foreground">
													Conduct notarization remotely via video call. Requires video/audio recording 
													and remote identity verification. Perfect for clients who cannot meet in person.
												</p>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
											<div className="flex items-center gap-2">
												<Video className="h-4 w-4 text-blue-600" />
												<span>Video call required</span>
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
								</TabsContent>
								
								<TabsContent value="IEN" className="mt-6">
									<div className="space-y-4">
										<div className="flex items-start gap-3">
											<CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
											<div>
												<h4 className="font-medium">In-Person Electronic Notarization (IEN)</h4>
												<p className="text-sm text-muted-foreground">
													Traditional in-person notarization with physical presence verification. 
													Includes document scanning and physical ID inspection.
												</p>
											</div>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
								</TabsContent>
							</Tabs>
						</CardContent>
					</Card>

					{/* ENP Selection */}
					{!selectedENP && (
						<Card className="mb-8">
							<CardHeader>
								<CardTitle>Select a Notary</CardTitle>
								<CardDescription>
									Choose from available Electronic Notaries Public
								</CardDescription>
							</CardHeader>
							<CardContent>
								{isLoadingEnps ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
									</div>
								) : availableEnps && availableEnps.length > 0 ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{availableEnps.map((enp) => (
											<Card 
												key={enp.id} 
												className="cursor-pointer hover:shadow-md transition-shadow"
												onClick={() => setSelectedENP(enp.id)}
											>
												<CardContent className="p-4">
													<div className="flex items-center gap-4">
														<Avatar className="h-12 w-12">
															<AvatarImage src={enp.image || undefined} alt={enp.name || "ENP"} />
															<AvatarFallback>{enp.name?.split(" ").map(n => n[0]).join("") || "EN"}</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<h4 className="font-medium">{enp.name}</h4>
															<p className="text-sm text-muted-foreground">{enp.specialization}</p>
															<div className="flex items-center gap-1 mt-1">
																<span className="text-sm font-medium">{enp.rating}</span>
																<span className="text-sm text-muted-foreground">
																	({enp.reviewCount} reviews)
																</span>
															</div>
														</div>
														<Badge variant="outline">Available</Badge>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								) : (
									<p className="text-center text-muted-foreground py-8">
										No Electronic Notaries Public available at the moment.
									</p>
								)}
							</CardContent>
						</Card>
					)}

					{/* ENP Details and Booking */}
					{selectedENP && enpDetails && (
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
												<AvatarFallback>{enpDetails.name?.split(" ").map(n => n[0]).join("") || "EN"}</AvatarFallback>
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

										<Button 
											variant="outline" 
											onClick={() => setSelectedENP(null)}
											className="w-full"
										>
											Change Notary
										</Button>
									</CardContent>
								</Card>
							</div>

							{/* Booking Form */}
							<div className="lg:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle>Schedule Your Consultation</CardTitle>
										<CardDescription>
											{selectedWorkflow === "REN" 
												? "Select a time for your remote video consultation"
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
										{selectedWorkflow === "REN" && (
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
										{selectedWorkflow === "IEN" && (
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
													{selectedWorkflow === "REN" ? (
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
					)}
				</div>
			</div>
		</>
	)
}
