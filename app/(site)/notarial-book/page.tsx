"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Search, Download, FileText, Calendar, Filter, BookOpen } from "lucide-react"
import { format } from "date-fns"

import { trpc } from "@/services/trpc/client"
import { SiteNavbar } from "@/core/components/navbar/site-navbar"
import { Button } from "@/core/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"

export default function NotarialBookPage() {
	const { data: session } = useSession()
	const [searchTerm, setSearchTerm] = useState("")
	const [workflowFilter, setWorkflowFilter] = useState<"ALL" | "REN" | "IEN">("ALL")
	const [dateFilter, setDateFilter] = useState("ALL")

	// Fetch completed appointments (notarial acts)
	const { data: appointments, isLoading } = trpc.appointments.getMyAppointments.useQuery({
		status: "COMPLETED",
		limit: 100,
		offset: 0,
	})

	const notarialActs = useMemo(() => {
		if (!appointments) return []

		return appointments
			.filter(apt => apt.status === "COMPLETED")
			.map((appointment, index) => {
				const notesLower = (appointment.notes || "").toLowerCase()
				const hasRemoteKeywords = notesLower.includes("remote") || notesLower.includes("ren")
				const hasInPersonKeywords = notesLower.includes("in-person") || notesLower.includes("ien") || notesLower.includes("in person")
				
				let workflow: "REN" | "IEN"
				if (appointment.meetingLink) {
					workflow = "REN"
				} else if (appointment.location) {
					workflow = "IEN"
				} else if (hasRemoteKeywords && !hasInPersonKeywords) {
					workflow = "REN"
				} else if (hasInPersonKeywords && !hasRemoteKeywords) {
					workflow = "IEN"
				} else {
					workflow = hasRemoteKeywords ? "REN" : "IEN"
				}

				const enp = appointment.lawyer
				const principal = appointment.client

				let actDescription = ""
				if (appointment.notes) {
					const cleanedNotes = appointment.notes
						.replace(/Consultation Type:\s*/gi, "")
						.replace(/Workflow:\s*/gi, "")
						.replace(/Meeting Preference:\s*/gi, "")
						.replace(/Remote Electronic Notarization/gi, "REN")
						.replace(/In-Person Electronic Notarization/gi, "IEN")
						.trim()
					
					if (cleanedNotes.length > 100 || cleanedNotes.includes("\n")) {
						const firstLine = cleanedNotes.split("\n")[0]?.trim() || ""
						actDescription = firstLine.length > 100 ? `${firstLine.substring(0, 97)}...` : firstLine
					} else {
						actDescription = cleanedNotes
					}
				}
				
				if (!actDescription || actDescription.length < 3) {
					const typeLabel = appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation"
					actDescription = `${typeLabel} - ${principal?.name || "Client"}`
				}

				return {
					entryNumber: index + 1,
					id: appointment.id,
					date: appointment.updatedAt,
					workflow,
					actDescription,
					principalName: principal?.name || "Unknown",
					principalAddress: "", // TODO: Add to schema
					documentType: appointment.type === "DOCUMENT_SIGNING" ? "Document Signing" : "Consultation",
					enpName: enp?.name || "Unknown ENP",
					location: appointment.location || (workflow === "REN" ? "Remote Video Call" : "Location TBD"),
					documentsCount: 0, // TODO: Link to actual documents
					certificateNumber: appointment.id.substring(0, 8).toUpperCase(), // Placeholder
				}
			})
			.sort((a, b) => b.date.getTime() - a.date.getTime()) // Most recent first
	}, [appointments])

	const filteredActs = useMemo(() => {
		return notarialActs.filter(act => {
			const matchesSearch = 
				act.principalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				act.actDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
				act.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
			
			const matchesWorkflow = workflowFilter === "ALL" || act.workflow === workflowFilter
			
			// Date filtering
			let matchesDate = true
			if (dateFilter !== "ALL") {
				const now = new Date()
				const actDate = act.date
				const daysDiff = Math.floor((now.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24))
				
				switch (dateFilter) {
					case "TODAY":
						matchesDate = daysDiff === 0
						break
					case "WEEK":
						matchesDate = daysDiff <= 7
						break
					case "MONTH":
						matchesDate = daysDiff <= 30
						break
					case "YEAR":
						matchesDate = daysDiff <= 365
						break
				}
			}
			
			return matchesSearch && matchesWorkflow && matchesDate
		})
	}, [notarialActs, searchTerm, workflowFilter, dateFilter])

	const handleExport = () => {
		// TODO: Implement export functionality
		alert("Export functionality coming soon!")
	}

	return (
		<>
			<SiteNavbar 
				items={[
					{ label: "Notarial Book", url: "/notarial-book" }
				]} 
			/>
			
			<div className="min-h-screen bg-muted/30">
				<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{/* Header */}
					<div className="mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
									<BookOpen className="h-8 w-8" />
									Electronic Notarial Book
								</h1>
								<p className="mt-2 text-muted-foreground">
									Official electronic register of all notarial acts per Supreme Court Rules (A.M. No. 24-10-14-SC)
								</p>
							</div>
							<Button onClick={handleExport} variant="outline">
								<Download className="mr-2 h-4 w-4" />
								Export Records
							</Button>
						</div>
					</div>

					{/* Filters */}
					<Card className="mb-8">
						<CardContent className="pt-6">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<Input
									placeholder="Search by principal name, act description, or certificate number..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
								<Select 
									value={workflowFilter} 
									onValueChange={(value) => setWorkflowFilter(value as "ALL" | "REN" | "IEN")}
								>
									<SelectTrigger>
										<SelectValue placeholder="All Workflows" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Workflows</SelectItem>
										<SelectItem value="REN">REN</SelectItem>
										<SelectItem value="IEN">IEN</SelectItem>
									</SelectContent>
								</Select>
								<Select value={dateFilter} onValueChange={setDateFilter}>
									<SelectTrigger>
										<SelectValue placeholder="All Dates" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ALL">All Dates</SelectItem>
										<SelectItem value="TODAY">Today</SelectItem>
										<SelectItem value="WEEK">Last 7 Days</SelectItem>
										<SelectItem value="MONTH">Last 30 Days</SelectItem>
										<SelectItem value="YEAR">Last Year</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					{/* Notarial Acts Table */}
					<Card>
						<CardHeader>
							<CardTitle>Notarial Acts Register</CardTitle>
							<CardDescription>
								{isLoading ? (
									<Skeleton className="h-4 w-32" />
								) : (
									<>
										{filteredActs.length} notarial act{filteredActs.length !== 1 ? "s" : ""} recorded
									</>
								)}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="space-y-4">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton key={i} className="h-16 w-full" />
									))}
								</div>
							) : filteredActs.length === 0 ? (
								<div className="py-12 text-center">
									<FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-medium mb-2">No notarial acts found</h3>
									<p className="text-muted-foreground">
										{searchTerm || workflowFilter !== "ALL" || dateFilter !== "ALL"
											? "Try adjusting your search criteria or filters."
											: "You haven't completed any notarial acts yet. Completed notarizations will appear here."}
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="w-20">Entry #</TableHead>
												<TableHead>Date</TableHead>
												<TableHead>Workflow</TableHead>
												<TableHead>Principal</TableHead>
												<TableHead>Act Description</TableHead>
												<TableHead>Document Type</TableHead>
												<TableHead>Location</TableHead>
												<TableHead>Certificate #</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{filteredActs.map((act) => (
												<TableRow key={act.id}>
													<TableCell className="font-mono font-medium">
														{act.entryNumber}
													</TableCell>
													<TableCell>
														<span className="text-sm">
															{format(act.date, "MMM dd, yyyy")}
															<br />
															<span className="text-muted-foreground">
																{format(act.date, "hh:mm a")}
															</span>
														</span>
													</TableCell>
													<TableCell>
														<Badge variant={act.workflow === "REN" ? "default" : "secondary"}>
															{act.workflow}
														</Badge>
													</TableCell>
													<TableCell>
														<div>
															<p className="font-medium">{act.principalName}</p>
															{act.principalAddress && (
																<p className="text-xs text-muted-foreground">{act.principalAddress}</p>
															)}
														</div>
													</TableCell>
													<TableCell className="max-w-md">
														<p className="text-sm">{act.actDescription}</p>
													</TableCell>
													<TableCell>
														<span className="text-sm">{act.documentType}</span>
													</TableCell>
													<TableCell>
														<span className="text-sm">{act.location}</span>
													</TableCell>
													<TableCell>
														<span className="font-mono text-sm">{act.certificateNumber}</span>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	)
}

