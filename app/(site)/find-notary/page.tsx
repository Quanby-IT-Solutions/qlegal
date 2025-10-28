"use client"

import { type Route } from "next"
import { useState } from "react"
import { Calendar, Filter, Handshake, MapPin, Search, Star, Video } from "lucide-react"

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

// Mock data for ENPs (Electronic Notaries Public)
const mockENPs = [
	{
		id: "1",
		name: "Atty. Maria Santos",
		title: "Electronic Notary Public",
		location: "Makati City, Metro Manila",
		specialization: "Real Estate, Business Documents",
		rating: 4.9,
		reviewCount: 127,
		avatar: "/avatars/maria-santos.jpg",
		availability: "Available today",
		workflows: ["REN", "IEN"],
		experience: "8 years",
		languages: ["English", "Filipino", "Spanish"],
		responseTime: "Within 2 hours",
	},
	{
		id: "2",
		name: "Atty. Juan Dela Cruz",
		title: "Electronic Notary Public",
		location: "Quezon City, Metro Manila",
		specialization: "Legal Documents, Contracts",
		rating: 4.8,
		reviewCount: 89,
		avatar: "/avatars/juan-dela-cruz.jpg",
		availability: "Available tomorrow",
		workflows: ["REN", "IEN"],
		experience: "12 years",
		languages: ["English", "Filipino"],
		responseTime: "Within 1 hour",
	},
	{
		id: "3",
		name: "Atty. Ana Rodriguez",
		title: "Electronic Notary Public",
		location: "Cebu City, Cebu",
		specialization: "Immigration, Personal Documents",
		rating: 4.7,
		reviewCount: 156,
		avatar: "/avatars/ana-rodriguez.jpg",
		availability: "Available now",
		workflows: ["REN", "IEN"],
		experience: "6 years",
		languages: ["English", "Filipino", "Cebuano"],
		responseTime: "Within 30 minutes",
	},
	{
		id: "4",
		name: "Atty. Carlos Mendoza",
		title: "Electronic Notary Public",
		location: "Davao City, Davao del Sur",
		specialization: "Corporate, Government Documents",
		rating: 4.9,
		reviewCount: 203,
		avatar: "/avatars/carlos-mendoza.jpg",
		availability: "Available this week",
		workflows: ["REN", "IEN"],
		experience: "15 years",
		languages: ["English", "Filipino", "Bisaya"],
		responseTime: "Within 4 hours",
	},
]

export default function FindNotaryPage() {
	const [searchTerm, setSearchTerm] = useState("")
	const [selectedLocation, setSelectedLocation] = useState("ALL")
	const [selectedSpecialization, setSelectedSpecialization] = useState("ALL")
	const [selectedWorkflow, setSelectedWorkflow] = useState<"REN" | "IEN" | "ALL">("ALL")

	// Filter ENPs based on search criteria
	const filteredENPs = mockENPs.filter(enp => {
		const matchesSearch =
			enp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			enp.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
			enp.location.toLowerCase().includes(searchTerm.toLowerCase())

		const matchesLocation = selectedLocation === "ALL" || enp.location.includes(selectedLocation)
		const matchesSpecialization =
			selectedSpecialization === "ALL" || enp.specialization.includes(selectedSpecialization)
		const matchesWorkflow = selectedWorkflow === "ALL" || enp.workflows.includes(selectedWorkflow)

		return matchesSearch && matchesLocation && matchesSpecialization && matchesWorkflow
	})

	const handleBookConsultation = (enpId: string, workflow: "REN" | "IEN") => {
		// Navigate to consultation page with selected ENP and workflow
		window.location.href = `/consultations?enp=${enpId}&workflow=${workflow}`
	}

	return (
		<>
			<SiteNavbar items={[{ label: "Find a Notary", url: "/find-notary" as Route }]} />

			<div className="bg-muted/30 min-h-screen">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
									onValueChange={value => setSelectedWorkflow(value as "REN" | "IEN" | "ALL")}
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
								{filteredENPs.length} Notary{filteredENPs.length !== 1 ? "ies" : ""} Found
							</h2>
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4" />
								<span className="text-muted-foreground text-sm">Filtered by your criteria</span>
							</div>
						</div>

						{/* ENP Cards */}
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
							{filteredENPs.map(enp => (
								<Card key={enp.id} className="transition-shadow hover:shadow-lg">
									<CardHeader>
										<div className="flex items-start gap-4">
											<Avatar className="h-16 w-16">
												<AvatarImage src={enp.avatar} alt={enp.name} />
												<AvatarFallback>
													{enp.name
														.split(" ")
														.map(n => n[0])
														.join("")}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1">
												<CardTitle className="text-lg">{enp.name}</CardTitle>
												<CardDescription>{enp.title}</CardDescription>
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

											{/* Availability */}
											<div className="flex items-center gap-2">
												<Calendar className="h-4 w-4 text-green-600" />
												<span className="text-sm font-medium text-green-600">
													{enp.availability}
												</span>
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

						{/* No Results */}
						{filteredENPs.length === 0 && (
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
											setSelectedLocation("")
											setSelectedSpecialization("")
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
				</div>
			</div>
		</>
	)
}
