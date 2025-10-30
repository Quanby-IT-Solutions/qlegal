"use client"

import { useState } from "react"
import { Upload, FileText, X, Plus, Search, MapPin, Calendar, Clock, Video, Handshake } from "lucide-react"

import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Badge } from "@/core/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/core/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"

// Mock data for available ENPs
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
		workflows: ["REN", "IEN"],
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
		workflows: ["REN", "IEN"],
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
		workflows: ["REN", "IEN"],
		responseTime: "Within 30 minutes",
	},
]

export default function NewRequestPage() {
	const [selectedWorkflow, setSelectedWorkflow] = useState<"REN" | "IEN">("REN")
	const [selectedENP, setSelectedENP] = useState<string>("")
	const [requestTitle, setRequestTitle] = useState("")
	const [description, setDescription] = useState("")
	const [priority, setPriority] = useState<"NORMAL" | "HIGH" | "URGENT">("NORMAL")
	const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files || [])
		setUploadedFiles(prev => [...prev, ...files])
	}

	const handleRemoveFile = (index: number) => {
		setUploadedFiles(prev => prev.filter((_, i) => i !== index))
	}

	const handleSubmitRequest = async () => {
		if (!selectedENP || !requestTitle || uploadedFiles.length === 0) {
			alert("Please fill in all required fields and upload at least one document.")
			return
		}

		setIsSubmitting(true)
		try {
			// Simulate API call
			await new Promise(resolve => setTimeout(resolve, 2000))
			
			// Redirect to requests page
			window.location.href = "/requests"
		} catch (error) {
			console.error("Failed to submit request:", error)
		} finally {
			setIsSubmitting(false)
		}
	}

	const selectedENPDetails = mockENPs.find(enp => enp.id === selectedENP)

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarization Requests", url: "/requests" },
					{ label: "New Request", url: "/requests/new" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold tracking-tight">Create Notarization Request</h1>
						<p className="mt-2 text-muted-foreground">
							Submit a request for document notarization to an Electronic Notary Public
						</p>
					</div>

					<div className="space-y-8">
						{/* Workflow Selection */}
						<Card>
							<CardHeader>
								<CardTitle>Select Notarization Type</CardTitle>
								<CardDescription>
									Choose between Remote (REN) or In-Person (IEN) notarization
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Tabs value={selectedWorkflow} onValueChange={(value) => setSelectedWorkflow(value as "REN" | "IEN")}>
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
									
									<TabsContent value="REN" className="mt-4">
										<div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
											<h4 className="font-medium text-blue-900 dark:text-blue-100">Remote Electronic Notarization</h4>
											<p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
												Conduct notarization remotely via video call. Requires video/audio recording and remote identity verification.
											</p>
										</div>
									</TabsContent>
									
									<TabsContent value="IEN" className="mt-4">
										<div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
											<h4 className="font-medium text-green-900 dark:text-green-100">In-Person Electronic Notarization</h4>
											<p className="text-sm text-green-700 dark:text-green-200 mt-1">
												Traditional in-person notarization with physical presence verification and document scanning.
											</p>
										</div>
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>

						{/* ENP Selection */}
						<Card>
							<CardHeader>
								<CardTitle>Select Electronic Notary Public</CardTitle>
								<CardDescription>
									Choose an ENP who supports your selected workflow
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<Input
										placeholder="Search ENPs by name, specialization, or location..."
										className="w-full"
									/>
									
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{mockENPs.map((enp) => (
											<Card 
												key={enp.id} 
												className={`cursor-pointer transition-all ${
													selectedENP === enp.id 
														? "ring-2 ring-primary border-primary" 
														: "hover:shadow-md"
												}`}
												onClick={() => setSelectedENP(enp.id)}
											>
												<CardContent className="p-4">
													<div className="flex items-start gap-4">
														<Avatar className="h-12 w-12">
															<AvatarImage src={enp.avatar} alt={enp.name} />
															<AvatarFallback>{enp.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
														</Avatar>
														<div className="flex-1">
															<h4 className="font-medium">{enp.name}</h4>
															<p className="text-sm text-muted-foreground">{enp.title}</p>
															<p className="text-sm text-muted-foreground">{enp.location}</p>
															<div className="flex items-center gap-2 mt-2">
																<Badge variant="outline" className="text-xs">
																	{enp.specialization}
																</Badge>
																<span className="text-xs text-muted-foreground">
																	{enp.rating} ({enp.reviewCount} reviews)
																</span>
															</div>
															<div className="flex items-center gap-2 mt-1">
																<Badge variant="outline" className="text-xs">
																	{selectedWorkflow}
																</Badge>
																<span className="text-xs text-muted-foreground">
																	{enp.responseTime}
																</span>
															</div>
														</div>
													</div>
												</CardContent>
											</Card>
										))}
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Request Details */}
						<Card>
							<CardHeader>
								<CardTitle>Request Details</CardTitle>
								<CardDescription>
									Provide information about your notarization request
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div>
									<Label htmlFor="title">Request Title *</Label>
									<Input
										id="title"
										placeholder="e.g., Real Estate Purchase Agreement"
										value={requestTitle}
										onChange={(e) => setRequestTitle(e.target.value)}
										className="mt-1"
									/>
								</div>

								<div>
									<Label htmlFor="description">Description</Label>
									<Textarea
										id="description"
										placeholder="Provide additional details about your notarization needs..."
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										className="mt-1"
										rows={3}
									/>
								</div>

								<div>
									<Label>Priority Level</Label>
									<RadioGroup value={priority} onValueChange={(value) => setPriority(value as any)} className="mt-2">
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="NORMAL" id="normal" />
											<Label htmlFor="normal">Normal - Standard processing time</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="HIGH" id="high" />
											<Label htmlFor="high">High - Faster processing</Label>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="URGENT" id="urgent" />
											<Label htmlFor="urgent">Urgent - Immediate attention</Label>
										</div>
									</RadioGroup>
								</div>
							</CardContent>
						</Card>

						{/* Document Upload */}
						<Card>
							<CardHeader>
								<CardTitle>Upload Documents</CardTitle>
								<CardDescription>
									Upload the documents you need notarized (PDF format recommended)
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Upload Area */}
									<div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
										<Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
										<div className="space-y-2">
											<h4 className="text-lg font-medium">Upload Documents</h4>
											<p className="text-sm text-muted-foreground">
												Drag and drop files here, or click to browse
											</p>
											<Input
												type="file"
												multiple
												accept=".pdf,.doc,.docx"
												onChange={handleFileUpload}
												className="hidden"
												id="file-upload"
											/>
											<Button asChild>
												<Label htmlFor="file-upload" className="cursor-pointer">
													<Plus className="mr-2 h-4 w-4" />
													Choose Files
												</Label>
											</Button>
										</div>
									</div>

									{/* Uploaded Files */}
									{uploadedFiles.length > 0 && (
										<div className="space-y-2">
											<h4 className="font-medium">Uploaded Files</h4>
											{uploadedFiles.map((file, index) => (
												<div key={index} className="flex items-center justify-between p-3 border rounded-lg">
													<div className="flex items-center gap-3">
														<FileText className="h-8 w-8 text-blue-600" />
														<div>
															<p className="font-medium">{file.name}</p>
															<p className="text-sm text-muted-foreground">
																{(file.size / 1024 / 1024).toFixed(2)} MB
															</p>
														</div>
													</div>
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleRemoveFile(index)}
													>
														<X className="h-4 w-4" />
													</Button>
												</div>
											))}
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Selected ENP Summary */}
						{selectedENPDetails && (
							<Card>
								<CardHeader>
									<CardTitle>Selected Notary</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex items-center gap-4">
										<Avatar className="h-16 w-16">
											<AvatarImage src={selectedENPDetails.avatar} alt={selectedENPDetails.name} />
											<AvatarFallback>{selectedENPDetails.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
										</Avatar>
										<div className="flex-1">
											<h4 className="font-medium">{selectedENPDetails.name}</h4>
											<p className="text-sm text-muted-foreground">{selectedENPDetails.title}</p>
											<p className="text-sm text-muted-foreground">{selectedENPDetails.location}</p>
											<div className="flex items-center gap-2 mt-2">
												<Badge variant="outline">{selectedWorkflow}</Badge>
												<span className="text-sm text-muted-foreground">
													{selectedENPDetails.responseTime}
												</span>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Submit Button */}
						<div className="flex justify-end gap-4">
							<Button variant="outline" onClick={() => window.history.back()}>
								Cancel
							</Button>
							<Button
								onClick={handleSubmitRequest}
								disabled={!selectedENP || !requestTitle || uploadedFiles.length === 0 || isSubmitting}
							>
								{isSubmitting ? "Submitting..." : "Submit Request"}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
