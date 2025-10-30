"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar, Clock, MapPin, Video, Handshake, User, Phone, Mail, CheckCircle } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Badge } from "@/core/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { Input } from "@/core/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Calendar as CalendarComponent } from "@/core/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover"
import { format } from "date-fns"

// Mock data for ENP details
const mockENPDetails = {
	"1": {
		id: "1",
		name: "Atty. Maria Santos",
		title: "Electronic Notary Public",
		location: "Makati City, Metro Manila",
		specialization: "Real Estate, Business Documents",
		rating: 4.9,
		reviewCount: 127,
		avatar: "/avatars/maria-santos.jpg",
		experience: "8 years",
		languages: ["English", "Filipino", "Spanish"],
		responseTime: "Within 2 hours",
		phone: "+63 917 123 4567",
		email: "maria.santos@notary.ph",
		officeHours: "9:00 AM - 6:00 PM (Mon-Fri), 9:00 AM - 2:00 PM (Sat)",
		availableSlots: {
			REN: [
				{ date: "2024-01-15", time: "10:00 AM", duration: "30 min" },
				{ date: "2024-01-15", time: "2:00 PM", duration: "30 min" },
				{ date: "2024-01-16", time: "9:00 AM", duration: "30 min" },
				{ date: "2024-01-16", time: "3:00 PM", duration: "30 min" },
			],
			IEN: [
				{ date: "2024-01-15", time: "10:00 AM", duration: "45 min" },
				{ date: "2024-01-15", time: "2:00 PM", duration: "45 min" },
				{ date: "2024-01-16", time: "9:00 AM", duration: "45 min" },
				{ date: "2024-01-16", time: "3:00 PM", duration: "45 min" },
			]
		}
	},
	"2": {
		id: "2",
		name: "Atty. Juan Dela Cruz",
		title: "Electronic Notary Public",
		location: "Quezon City, Metro Manila",
		specialization: "Legal Documents, Contracts",
		rating: 4.8,
		reviewCount: 89,
		avatar: "/avatars/juan-dela-cruz.jpg",
		experience: "12 years",
		languages: ["English", "Filipino"],
		responseTime: "Within 1 hour",
		phone: "+63 917 234 5678",
		email: "juan.delacruz@notary.ph",
		officeHours: "8:00 AM - 5:00 PM (Mon-Fri), 8:00 AM - 12:00 PM (Sat)",
		availableSlots: {
			REN: [
				{ date: "2024-01-15", time: "11:00 AM", duration: "30 min" },
				{ date: "2024-01-15", time: "3:00 PM", duration: "30 min" },
				{ date: "2024-01-17", time: "10:00 AM", duration: "30 min" },
				{ date: "2024-01-17", time: "2:00 PM", duration: "30 min" },
			],
			IEN: [
				{ date: "2024-01-15", time: "11:00 AM", duration: "45 min" },
				{ date: "2024-01-15", time: "3:00 PM", duration: "45 min" },
				{ date: "2024-01-17", time: "10:00 AM", duration: "45 min" },
				{ date: "2024-01-17", time: "2:00 PM", duration: "45 min" },
			]
		}
	}
}

export default function ConsultationsPage() {
	const searchParams = useSearchParams()
	const [selectedWorkflow, setSelectedWorkflow] = useState<"REN" | "IEN">("REN")
	const [selectedENP, setSelectedENP] = useState<string | null>(null)
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
	const [selectedTime, setSelectedTime] = useState<string>("")
	const [consultationType, setConsultationType] = useState<"initial" | "followup" | "urgent">("initial")
	const [specialRequirements, setSpecialRequirements] = useState("")
	const [isBooking, setIsBooking] = useState(false)

	// Get ENP ID from URL params
	const enpId = searchParams.get("enp")
	const workflowParam = searchParams.get("workflow") as "REN" | "IEN" | null

	useEffect(() => {
		if (enpId) {
			setSelectedENP(enpId)
		}
		if (workflowParam && (workflowParam === "REN" || workflowParam === "IEN")) {
			setSelectedWorkflow(workflowParam)
		}
	}, [enpId, workflowParam])

	const enpDetails = selectedENP ? mockENPDetails[selectedENP as keyof typeof mockENPDetails] : null

	const handleWorkflowChange = (workflow: "REN" | "IEN") => {
		setSelectedWorkflow(workflow)
		setSelectedDate(undefined)
		setSelectedTime("")
	}

	const handleBooking = async () => {
		if (!selectedENP || !selectedDate || !selectedTime) return

		setIsBooking(true)
		try {
			// Simulate booking API call
			await new Promise(resolve => setTimeout(resolve, 2000))
			
			// Redirect to appropriate next step
			if (selectedWorkflow === "REN") {
				// Redirect to video meeting setup
				window.location.href = `/meetings/new?enp=${selectedENP}&date=${selectedDate.toISOString()}&time=${selectedTime}&workflow=REN`
			} else {
				// Redirect to in-person appointment confirmation
				window.location.href = `/appointments/confirm?enp=${selectedENP}&date=${selectedDate.toISOString()}&time=${selectedTime}&workflow=IEN`
			}
		} catch (error) {
			console.error("Booking failed:", error)
		} finally {
			setIsBooking(false)
		}
	}

	const availableSlots = enpDetails?.availableSlots[selectedWorkflow] || []
	const filteredSlots = selectedDate 
		? availableSlots.filter(slot => slot.date === format(selectedDate, "yyyy-MM-dd"))
		: availableSlots

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
							<Tabs value={selectedWorkflow} onValueChange={handleWorkflowChange}>
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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{Object.values(mockENPDetails).map((enp) => (
										<Card key={enp.id} className="cursor-pointer hover:shadow-md transition-shadow"
											onClick={() => setSelectedENP(enp.id)}>
											<CardContent className="p-4">
												<div className="flex items-center gap-4">
													<Avatar className="h-12 w-12">
														<AvatarImage src={enp.avatar} alt={enp.name} />
														<AvatarFallback>{enp.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
													</Avatar>
													<div className="flex-1">
														<h4 className="font-medium">{enp.name}</h4>
														<p className="text-sm text-muted-foreground">{enp.specialization}</p>
														<p className="text-sm text-muted-foreground">{enp.location}</p>
													</div>
													<Badge variant="outline">Available</Badge>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
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
												<AvatarImage src={enpDetails.avatar} alt={enpDetails.name} />
												<AvatarFallback>{enpDetails.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
											</Avatar>
											<div>
												<h4 className="font-medium">{enpDetails.name}</h4>
												<p className="text-sm text-muted-foreground">{enpDetails.title}</p>
												<div className="flex items-center gap-1 mt-1">
													<span className="text-sm font-medium">{enpDetails.rating}</span>
													<span className="text-sm text-muted-foreground">({enpDetails.reviewCount} reviews)</span>
												</div>
											</div>
										</div>

										<div className="space-y-3 text-sm">
											<div className="flex items-center gap-2">
												<MapPin className="h-4 w-4 text-muted-foreground" />
												<span>{enpDetails.location}</span>
											</div>
											<div className="flex items-center gap-2">
												<Phone className="h-4 w-4 text-muted-foreground" />
												<span>{enpDetails.phone}</span>
											</div>
											<div className="flex items-center gap-2">
												<Mail className="h-4 w-4 text-muted-foreground" />
												<span>{enpDetails.email}</span>
											</div>
											<div>
												<p className="font-medium">Office Hours</p>
												<p className="text-muted-foreground">{enpDetails.officeHours}</p>
											</div>
											<div>
												<p className="font-medium">Specialization</p>
												<p className="text-muted-foreground">{enpDetails.specialization}</p>
											</div>
											<div>
												<p className="font-medium">Languages</p>
												<p className="text-muted-foreground">{enpDetails.languages.join(", ")}</p>
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
													<Button variant="outline" className="w-full justify-start text-left font-normal">
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
												{filteredSlots.length === 0 && (
													<p className="text-sm text-muted-foreground mt-2">
														No available times for this date. Please select another date.
													</p>
												)}
											</div>
										)}

										{/* Consultation Type */}
										<div>
											<Label className="text-base font-medium">Consultation Type</Label>
											<RadioGroup value={consultationType} onValueChange={(value) => setConsultationType(value as any)}>
												<div className="flex items-center space-x-2">
													<RadioGroupItem value="initial" id="initial" />
													<Label htmlFor="initial">Initial Consultation</Label>
												</div>
												<div className="flex items-center space-x-2">
													<RadioGroupItem value="followup" id="followup" />
													<Label htmlFor="followup">Follow-up Consultation</Label>
												</div>
												<div className="flex items-center space-x-2">
													<RadioGroupItem value="urgent" id="urgent" />
													<Label htmlFor="urgent">Urgent Consultation</Label>
												</div>
											</RadioGroup>
										</div>

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
											disabled={!selectedDate || !selectedTime || isBooking}
											className="w-full"
											size="lg"
										>
											{isBooking ? (
												"Booking..."
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
