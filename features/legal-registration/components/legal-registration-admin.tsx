"use client"

import { useState } from "react"
import { Clock, Eye, FileText } from "lucide-react"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { Textarea } from "@/core/components/ui/textarea"

import type { UpdateApplicationStatus } from "../api/legal-registration.schemas"
import { useLegalRegistrationAdmin } from "../hooks/use-legal-registration"

// Type for application with applicant info
type ApplicationWithApplicant = {
	id: string
	status: string
	submittedAt: Date | null
	citizenship: string
	dateOfBirth: Date
	mobileNumber: string
	emailAddress: string
	residentialAddress: string
	workOrBusinessAddress: string
	professionalTaxReceiptNumber: string
	rollOfAttorneysNumber: string
	ibpMembershipNumber: string
	mcleComplianceNumber: string
	ulasComplianceNumber: string
	remarks: string | null
	applicant: {
		name: string | null
		email: string | null
	}
}

export function LegalRegistrationAdminDashboard() {
	const { applications, isLoading, updateApplicationStatus, isUpdatingStatus, refetch, error } =
		useLegalRegistrationAdmin()

	const [selectedApplication, setSelectedApplication] = useState<ApplicationWithApplicant | null>(
		null
	)
	const [reviewDialog, setReviewDialog] = useState(false)
	const [reviewData, setReviewData] = useState<{
		status: "UNDER_REVIEW" | "APPROVED" | "REJECTED"
		remarks: string
	}>({
		status: "UNDER_REVIEW",
		remarks: "",
	})

	const handleReview = (application: ApplicationWithApplicant) => {
		setSelectedApplication(application)
		setReviewData({
			status: "UNDER_REVIEW",
			remarks: "",
		})
		setReviewDialog(true)
	}

	const handleSubmitReview = () => {
		if (!selectedApplication) return

		const updateData: UpdateApplicationStatus = {
			applicationId: selectedApplication.id,
			status: reviewData.status,
			remarks: reviewData.remarks || undefined,
		}

		updateApplicationStatus(updateData)
		setReviewDialog(false)
		setSelectedApplication(null)
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "APPROVED":
				return <Badge className="bg-green-100 text-green-800">Approved</Badge>
			case "REJECTED":
				return <Badge variant="destructive">Rejected</Badge>
			case "UNDER_REVIEW":
				return <Badge variant="secondary">Under Review</Badge>
			case "SUBMITTED":
				return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
			default:
				return <Badge variant="outline">Draft</Badge>
		}
	}

	// Calculate statistics
	const applicationsArray = (applications as ApplicationWithApplicant[]) || []
	const submittedCount = applicationsArray.filter(app => app.status === "SUBMITTED").length
	const underReviewCount = applicationsArray.filter(app => app.status === "UNDER_REVIEW").length
	const approvedCount = applicationsArray.filter(app => app.status === "APPROVED").length
	const rejectedCount = applicationsArray.filter(app => app.status === "REJECTED").length

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
					<p className="mt-2 text-gray-600">Loading applications...</p>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="mb-2 text-red-600">Error loading applications</div>
					<p className="mb-4 text-gray-600">{error.message}</p>
					<Button onClick={() => refetch()} variant="outline">
						Try Again
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<FileText className="h-6 w-6 text-blue-600" />
							<div>
								<CardTitle>Legal Registration Applications</CardTitle>
								<CardDescription>Manage E-Notarial registration applications</CardDescription>
							</div>
						</div>
						<Button onClick={() => refetch()} variant="outline">
							Refresh
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Statistics */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-blue-600">{submittedCount}</div>
						<p className="text-sm text-gray-600">Pending Review</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-orange-600">{underReviewCount}</div>
						<p className="text-sm text-gray-600">Under Review</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-green-600">{approvedCount}</div>
						<p className="text-sm text-gray-600">Approved</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="pt-6">
						<div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
						<p className="text-sm text-gray-600">Rejected</p>
					</CardContent>
				</Card>
			</div>

			{/* Applications Table */}
			<Card>
				<CardHeader>
					<CardTitle>Applications</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Applicant</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Submitted</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{applicationsArray.map(application => (
								<TableRow key={application.id}>
									<TableCell className="font-medium">{application.applicant.name}</TableCell>
									<TableCell>{application.applicant.email}</TableCell>
									<TableCell>{getStatusBadge(application.status)}</TableCell>
									<TableCell>
										{application.submittedAt
											? new Date(application.submittedAt).toLocaleDateString()
											: "-"}
									</TableCell>
									<TableCell>
										<div className="flex space-x-2">
											<Dialog>
												<DialogTrigger asChild>
													<Button variant="outline" size="sm">
														<Eye className="mr-1 h-4 w-4" />
														View
													</Button>
												</DialogTrigger>
												<DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
													<DialogHeader>
														<DialogTitle>Application Details</DialogTitle>
														<DialogDescription>
															{application.applicant.name} - {application.applicant.email}
														</DialogDescription>
													</DialogHeader>
													<div className="space-y-4">
														<div>
															<h4 className="mb-2 font-semibold">Personal Information</h4>
															<div className="grid grid-cols-2 gap-2 text-sm">
																<div>
																	<strong>Citizenship:</strong> {application.citizenship}
																</div>
																<div>
																	<strong>Date of Birth:</strong>{" "}
																	{new Date(application.dateOfBirth).toLocaleDateString()}
																</div>
																<div>
																	<strong>Mobile:</strong> {application.mobileNumber}
																</div>
																<div>
																	<strong>Email:</strong> {application.emailAddress}
																</div>
															</div>
														</div>
														<div>
															<h4 className="mb-2 font-semibold">Residential Address</h4>
															<p className="text-sm">{application.residentialAddress}</p>
														</div>
														<div>
															<h4 className="mb-2 font-semibold">Work Address</h4>
															<p className="text-sm">{application.workOrBusinessAddress}</p>
														</div>
														<div>
															<h4 className="mb-2 font-semibold">Professional Information</h4>
															<div className="grid grid-cols-2 gap-2 text-sm">
																<div>
																	<strong>PTR:</strong> {application.professionalTaxReceiptNumber}
																</div>
																<div>
																	<strong>Roll Number:</strong> {application.rollOfAttorneysNumber}
																</div>
																<div>
																	<strong>IBP:</strong> {application.ibpMembershipNumber}
																</div>
																<div>
																	<strong>MCLE:</strong> {application.mcleComplianceNumber}
																</div>
																<div>
																	<strong>ULAS:</strong> {application.ulasComplianceNumber}
																</div>
															</div>
														</div>
														{application.remarks && (
															<div>
																<h4 className="mb-2 font-semibold">Review Remarks</h4>
																<p className="rounded bg-gray-50 p-2 text-sm">
																	{application.remarks}
																</p>
															</div>
														)}
													</div>
												</DialogContent>
											</Dialog>

											{(application.status === "SUBMITTED" ||
												application.status === "UNDER_REVIEW") && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleReview(application)}
												>
													<Clock className="mr-1 h-4 w-4" />
													Review
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{applicationsArray.length === 0 && (
						<div className="py-8 text-center">
							<p className="text-gray-500">No applications found</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Review Dialog */}
			<Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Review Application</DialogTitle>
						<DialogDescription>
							{selectedApplication?.applicant.name} - {selectedApplication?.applicant.email}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="status">Decision</Label>
							<Select
								value={reviewData.status}
								onValueChange={(value: "UNDER_REVIEW" | "APPROVED" | "REJECTED") =>
									setReviewData(prev => ({ ...prev, status: value }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
									<SelectItem value="APPROVED">Approve</SelectItem>
									<SelectItem value="REJECTED">Reject</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="remarks">Remarks</Label>
							<Textarea
								id="remarks"
								value={reviewData.remarks}
								onChange={e =>
									setReviewData(prev => ({
										...prev,
										remarks: e.target.value,
									}))
								}
								placeholder="Add any comments or feedback..."
								rows={4}
							/>
						</div>

						<div className="flex justify-end space-x-2">
							<Button variant="outline" onClick={() => setReviewDialog(false)}>
								Cancel
							</Button>
							<Button onClick={handleSubmitReview} disabled={isUpdatingStatus}>
								{isUpdatingStatus ? "Saving..." : "Submit Review"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
