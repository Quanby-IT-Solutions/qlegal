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
	CardTitle
} from "@/core/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/core/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@/core/components/ui/table"
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"

import type { UpdateApplicationStatus } from "../api/legal-registration.schemas"
import { useLegalRegistrationAdmin } from "../hooks/use-legal-registration"
import { DocumentPreview } from "./document-preview"

// Extended interface for document URLs that might not be in the base LegalApplication
interface LegalApplicationWithDocs extends LegalApplication {
	obcCertificationUrl?: string
	ibpCertificationUrl?: string
	passportPhotoUrl?: string
	paymentProofUrl?: string
	enfProviderCertificationUrl?: string
}

// Type for application from API
type LegalApplication = {
	id: string
	status: string
	submittedAt: Date | null
	citizenship: string
	dateOfBirth: Date | null
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
	applicant?: {
		name: string | null
		email: string | null
	}
}

export function LegalRegistrationAdminDashboard() {
	const {
		applications,
		isLoading,
		updateApplicationStatus,
		isUpdatingStatus,
		refetch
	} = useLegalRegistrationAdmin()

	const [selectedApplication, setSelectedApplication] =
		useState<LegalApplication | null>(null)
	const [reviewDialog, setReviewDialog] = useState(false)
	const [viewDialog, setViewDialog] = useState(false)
	const [reviewData, setReviewData] = useState<{
		status: "UNDER_REVIEW" | "APPROVED" | "REJECTED"
		remarks: string
	}>({
		status: "UNDER_REVIEW",
		remarks: ""
	})

	const handleView = (application: LegalApplication) => {
		setSelectedApplication(application)
		setViewDialog(true)
	}

	const handleReview = (application: LegalApplication) => {
		setSelectedApplication(application)
		setReviewData({
			status: "UNDER_REVIEW",
			remarks: ""
		})
		setReviewDialog(true)
	}

	const handleSubmitReview = () => {
		if (!selectedApplication) return

		const updateData: UpdateApplicationStatus = {
			applicationId: selectedApplication.id,
			status: reviewData.status,
			remarks: reviewData.remarks || undefined
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
								<CardDescription>
									Manage E-Notarial registration applications
								</CardDescription>
							</div>
						</div>
						<Button onClick={() => refetch()} variant="outline">
							Refresh
						</Button>
					</div>
				</CardHeader>
			</Card>

			{/* Applications Table */}
			<Card>
				<CardHeader>
					<CardTitle>Applications ({applications?.length || 0})</CardTitle>
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
							{(applications as LegalApplication[])?.map((application) => (
								<TableRow key={application.id}>
									<TableCell className="font-medium">
										{application.applicant?.name ?? "N/A"}
									</TableCell>
									<TableCell>{application.applicant?.email ?? "N/A"}</TableCell>
									<TableCell>{getStatusBadge(application.status)}</TableCell>
									<TableCell>
										{application.submittedAt
											? new Date(application.submittedAt).toLocaleDateString()
											: "-"}
									</TableCell>
									<TableCell>
										<div className="flex space-x-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleView(application)}
											>
												<Eye className="mr-1 h-4 w-4" />
												View
											</Button>

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

					{!applications ||
						(applications.length === 0 && (
							<div className="py-8 text-center">
								<p className="text-gray-500">No applications found</p>
							</div>
						))}
				</CardContent>
			</Card>

			{/* Review Dialog */}
			<Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Review Application</DialogTitle>
						<DialogDescription>
							{selectedApplication?.applicant?.name} -{" "}
							{selectedApplication?.applicant?.email}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="status">Decision</Label>
							<Select
								value={reviewData.status}
								onValueChange={(
									value: "UNDER_REVIEW" | "APPROVED" | "REJECTED"
								) => setReviewData((prev) => ({ ...prev, status: value }))}
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
								onChange={(e) =>
									setReviewData((prev) => ({
										...prev,
										remarks: e.target.value
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
			{/* View Application Dialog */}
			<Dialog open={viewDialog} onOpenChange={setViewDialog}>
				<DialogContent className="flex max-h-[95vh] max-w-7xl flex-col overflow-hidden">
					<DialogHeader className="flex-shrink-0">
						<DialogTitle>Application Details</DialogTitle>
						<DialogDescription>
							{selectedApplication?.applicant?.name} -{" "}
							{selectedApplication?.applicant?.email}
						</DialogDescription>
					</DialogHeader>

					<Tabs
						defaultValue="info"
						className="mt-4 flex min-h-0 flex-1 flex-col"
					>
						<TabsList className="grid w-full flex-shrink-0 grid-cols-2">
							<TabsTrigger value="info">Application Info</TabsTrigger>
							<TabsTrigger value="documents">Documents</TabsTrigger>
						</TabsList>

						<TabsContent value="info" className="mt-4 flex-1 overflow-y-auto">
							<div className="space-y-4 pr-2">
								<div>
									<h4 className="mb-2 font-semibold">Personal Information</h4>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<div>
											<strong>Citizenship:</strong>{" "}
											{selectedApplication?.citizenship}
										</div>
										<div>
											<strong>Date of Birth:</strong>{" "}
											{selectedApplication?.dateOfBirth
												? new Date(
														selectedApplication.dateOfBirth
													).toLocaleDateString()
												: "N/A"}
										</div>
										<div>
											<strong>Mobile:</strong>{" "}
											{selectedApplication?.mobileNumber}
										</div>
										<div>
											<strong>Email:</strong>{" "}
											{selectedApplication?.emailAddress}
										</div>
									</div>
								</div>

								<div>
									<h4 className="mb-2 font-semibold">Residential Address</h4>
									<p className="text-sm">
										{selectedApplication?.residentialAddress}
									</p>
								</div>

								<div>
									<h4 className="mb-2 font-semibold">Work Address</h4>
									<p className="text-sm">
										{selectedApplication?.workOrBusinessAddress}
									</p>
								</div>

								<div>
									<h4 className="mb-2 font-semibold">
										Professional Information
									</h4>
									<div className="grid grid-cols-2 gap-2 text-sm">
										<div>
											<strong>PTR:</strong>{" "}
											{selectedApplication?.professionalTaxReceiptNumber}
										</div>
										<div>
											<strong>Roll Number:</strong>{" "}
											{selectedApplication?.rollOfAttorneysNumber}
										</div>
										<div>
											<strong>IBP:</strong>{" "}
											{selectedApplication?.ibpMembershipNumber}
										</div>
										<div>
											<strong>MCLE:</strong>{" "}
											{selectedApplication?.mcleComplianceNumber}
										</div>
										<div>
											<strong>ULAS:</strong>{" "}
											{selectedApplication?.ulasComplianceNumber}
										</div>
									</div>
								</div>

								{selectedApplication?.remarks && (
									<div>
										<h4 className="mb-2 font-semibold">Review Remarks</h4>
										<p className="rounded bg-gray-50 p-2 text-sm">
											{selectedApplication.remarks}
										</p>
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value="documents" className="mt-4 min-h-0 flex-1">
							<div className="h-full">
								<DocumentPreview
									application={
										selectedApplication
											? {
													id: selectedApplication.id,
													applicant: selectedApplication.applicant ?? {
														name: null,
														email: null
													},
													status: selectedApplication.status,
													obcCertificationUrl:
														(selectedApplication as LegalApplicationWithDocs)
															.obcCertificationUrl ?? "",
													ibpCertificationUrl:
														(selectedApplication as LegalApplicationWithDocs)
															.ibpCertificationUrl ?? "",
													passportPhotoUrl:
														(selectedApplication as LegalApplicationWithDocs)
															.passportPhotoUrl ?? "",
													paymentProofUrl:
														(selectedApplication as LegalApplicationWithDocs)
															.paymentProofUrl ?? "",
													enfProviderCertificationUrl:
														(selectedApplication as LegalApplicationWithDocs)
															.enfProviderCertificationUrl ?? "",
													submittedAt: selectedApplication.submittedAt
												}
											: null
									}
								/>
							</div>
						</TabsContent>
					</Tabs>
				</DialogContent>
			</Dialog>
		</div>
	)
}
