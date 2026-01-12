"use client"

import { useEffect, useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Check, FileText, Upload } from "lucide-react"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Checkbox } from "@/core/components/ui/checkbox"
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/core/components/ui/form"
import { Input } from "@/core/components/ui/input"
import { Separator } from "@/core/components/ui/separator"
import { Textarea } from "@/core/components/ui/textarea"

import { trpc } from "@/services/trpc/client"

import {
	legalRegistrationFormSchema,
	type FileUpload,
	type LegalRegistrationForm as LegalRegistrationFormValues,
} from "../api/legal-registration.schemas"
import { useFileUpload, useLegalRegistration } from "../hooks/use-legal-registration"

interface FileUploadFieldProps {
	label: string
	description: string
	value: FileUpload | null
	onChange: (file: FileUpload | null) => void
	accept?: string
	required?: boolean
	disabled?: boolean
	uploadParams?: { applicationId: string; organization?: string }
	isCreatingDraft?: boolean
	onCreateDraft?: () => void
}

function FileUploadField({
	label,
	description,
	value,
	onChange,
	accept,
	required = true,
	disabled = false,
	uploadParams,
	isCreatingDraft = false,
	onCreateDraft,
}: FileUploadFieldProps) {
	const [isUploading, setIsUploading] = useState(false)
	const { uploadFile } = useFileUpload()

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		if (disabled) {
			toast.error("File upload is disabled")
			return
		}

		// If no uploadParams, trigger auto-draft creation and inform user
		if (!uploadParams) {
			if (onCreateDraft && !isCreatingDraft) {
				// Trigger auto-draft creation if not already in progress
				onCreateDraft()
				toast.info("Creating application... Please try uploading again in a moment.")
			} else if (isCreatingDraft) {
				toast.info("Application is being created... Please wait a moment.")
			} else {
				toast.error("Missing upload parameters. Please refresh the page.")
			}
			return
		}

		console.log("Starting file upload:", file.name, "to bucket: legal-application")
		console.log("Upload params:", uploadParams)

		setIsUploading(true)
		try {
			const uploadResult = await uploadFile(file, uploadParams)
			console.log("Upload successful:", uploadResult)
			onChange(uploadResult)
			toast.success(`${label} uploaded successfully`)
		} catch (error) {
			console.error("Upload failed:", error)
			toast.error(
				`Failed to upload ${label}: ${error instanceof Error ? error.message : "Unknown error"}`
			)
		} finally {
			setIsUploading(false)
		}
	}

	return (
		<div className="space-y-2">
			<label
				className={`text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${required ? "after:text-red-500 after:content-['*']" : ""}`}
			>
				{label}
			</label>
			<p className="text-sm text-gray-600">{description}</p>

			<div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
				{value ? (
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Check className="h-4 w-4 text-green-500" />
							<span className="text-sm text-green-700">{value.fileName}</span>
							<span className="text-xs text-gray-500">({value.fileSize} bytes)</span>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
							Remove
						</Button>
					</div>
				) : (
					<div className="text-center">
						<Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
						<div className="space-y-2">
							<p className="text-sm text-gray-600">
								{!uploadParams
									? "Application will be created automatically to enable uploads"
									: "Click to upload or drag and drop"}
							</p>
							<input
								type="file"
								accept={accept}
								onChange={handleFileChange}
								disabled={isUploading}
								className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
							/>
						</div>
					</div>
				)}
			</div>

			{isUploading && (
				<div className="text-center">
					<p className="text-sm text-blue-600">Uploading...</p>
				</div>
			)}
		</div>
	)
}

export function LegalRegistrationForm() {
	const {
		application,
		isLoading,
		createNewApplication,
		updateExistingApplication,
		submitForReview,
		createDraftIfNeeded,
		isSubmitting,
		isCreatingDraft,
		canEdit,
		canSubmit,
	} = useLegalRegistration()

	// Fetch organization for folder path
	const { data: summary } = trpc.profile.getSummary.useQuery()

	const resolver: Resolver<LegalRegistrationFormValues> = zodResolver(
		legalRegistrationFormSchema
	) as unknown as Resolver<LegalRegistrationFormValues>

	const form = useForm<LegalRegistrationFormValues>({
		resolver,
		defaultValues: {
			personalQualifications: {
				citizenship: "Filipino",
				dateOfBirth: "",
				residentialAddress: "",
				workOrBusinessAddress: "",
				telephoneNumber: "",
				mobileNumber: "",
				emailAddress: "",
				professionalTaxReceiptNumber: "",
				rollOfAttorneysNumber: "",
				ibpMembershipNumber: "",
				mcleComplianceNumber: "",
				ulasComplianceNumber: "",
			},
			obcCertification: null,
			ibpCertification: null,
			passportPhoto: null,
			paymentProof: null,
			enfProviderCertification: null,
			undertakingElectronicNotarialActs: false,
			undertakingDataSharingGuidelines: false,
			electronicSignatureApplied: false,
		},
	})

	const [files, setFiles] = useState<{
		obcCertification: FileUpload | null
		ibpCertification: FileUpload | null
		passportPhoto: FileUpload | null
		paymentProof: FileUpload | null
		enfProviderCertification: FileUpload | null
	}>({
		obcCertification: null,
		ibpCertification: null,
		passportPhoto: null,
		paymentProof: null,
		enfProviderCertification: null,
	})

	// Temporary acknowledgement in lieu of ENF Provider Certification upload
	const [enfAcknowledged, setEnfAcknowledged] = useState(false)

	// Track if we've attempted to create draft to prevent multiple calls
	const [draftCreationAttempted, setDraftCreationAttempted] = useState(false)

	// Auto-create draft application if none exists
	useEffect(() => {
		console.log("Auto-draft useEffect triggered:", {
			isLoading,
			application: !!application,
			draftCreationAttempted,
			isCreatingDraft,
		})

		if (!isLoading && !application && !draftCreationAttempted && !isCreatingDraft) {
			console.log("Creating draft application...")
			setDraftCreationAttempted(true)
			createDraftIfNeeded()
		}
	}, [isLoading, application, draftCreationAttempted, isCreatingDraft, createDraftIfNeeded])

	// Reset draft creation flag when application is found
	useEffect(() => {
		if (application && draftCreationAttempted) {
			console.log("Application found, resetting draft creation flag")
			setDraftCreationAttempted(false)
		}
	}, [application, draftCreationAttempted])

	// Prefill form from existing application when loaded
	useEffect(() => {
		if (!application) return

		// Helper function to check if a value should be prefilled
		const shouldPrefill = (value: string | undefined | null) => {
			return value && value.trim() !== "" && value !== "TBD"
		}

		// Helper function to check if date should be prefilled (not default date)
		const shouldPrefillDate = (date: string) => {
			const defaultDate = "2000-01-01"
			return date && !date.startsWith(defaultDate)
		}

		form.reset({
			personalQualifications: {
				citizenship: application.personalQualifications.citizenship || "Filipino",
				dateOfBirth: shouldPrefillDate(application.personalQualifications.dateOfBirth)
					? application.personalQualifications.dateOfBirth
					: "",
				residentialAddress: shouldPrefill(application.personalQualifications.residentialAddress)
					? application.personalQualifications.residentialAddress
					: "",
				workOrBusinessAddress: shouldPrefill(
					application.personalQualifications.workOrBusinessAddress
				)
					? application.personalQualifications.workOrBusinessAddress
					: "",
				telephoneNumber: shouldPrefill(application.personalQualifications.telephoneNumber)
					? (application.personalQualifications.telephoneNumber ?? "")
					: "",
				mobileNumber: shouldPrefill(application.personalQualifications.mobileNumber)
					? application.personalQualifications.mobileNumber
					: "",
				emailAddress: shouldPrefill(application.personalQualifications.emailAddress)
					? application.personalQualifications.emailAddress
					: "",
				professionalTaxReceiptNumber: shouldPrefill(
					application.personalQualifications.professionalTaxReceiptNumber
				)
					? application.personalQualifications.professionalTaxReceiptNumber
					: "",
				rollOfAttorneysNumber: shouldPrefill(
					application.personalQualifications.rollOfAttorneysNumber
				)
					? application.personalQualifications.rollOfAttorneysNumber
					: "",
				ibpMembershipNumber: shouldPrefill(application.personalQualifications.ibpMembershipNumber)
					? application.personalQualifications.ibpMembershipNumber
					: "",
				mcleComplianceNumber: shouldPrefill(application.personalQualifications.mcleComplianceNumber)
					? application.personalQualifications.mcleComplianceNumber
					: "",
				ulasComplianceNumber: shouldPrefill(application.personalQualifications.ulasComplianceNumber)
					? application.personalQualifications.ulasComplianceNumber
					: "",
			},
			obcCertification: null,
			ibpCertification: null,
			passportPhoto: null,
			paymentProof: null,
			enfProviderCertification: null,
			undertakingElectronicNotarialActs: false,
			undertakingDataSharingGuidelines: false,
			electronicSignatureApplied: false,
		})
	}, [application, form])

	const canEditLocal = useMemo(() => canEdit || !application, [canEdit, application])
	const canSubmitLocal = useMemo(() => {
		if (!application || !canSubmit) return false

		const values = form.getValues()

		// Check all required form fields are filled
		const requiredFieldsFilled = Boolean(
			values.personalQualifications.citizenship &&
			values.personalQualifications.dateOfBirth &&
			values.personalQualifications.residentialAddress &&
			values.personalQualifications.workOrBusinessAddress &&
			values.personalQualifications.mobileNumber &&
			values.personalQualifications.emailAddress &&
			values.personalQualifications.professionalTaxReceiptNumber &&
			values.personalQualifications.rollOfAttorneysNumber &&
			values.personalQualifications.ibpMembershipNumber &&
			values.personalQualifications.mcleComplianceNumber &&
			values.personalQualifications.ulasComplianceNumber
		)

		// Check all required files are uploaded
		const requiredFilesUploaded = Boolean(
			files.obcCertification &&
			files.ibpCertification &&
			files.passportPhoto &&
			files.paymentProof &&
			(files.enfProviderCertification ?? enfAcknowledged)
		)

		// Check undertakings are confirmed
		const undertakingsConfirmed = Boolean(
			values.undertakingElectronicNotarialActs && values.undertakingDataSharingGuidelines
		)

		return requiredFieldsFilled && requiredFilesUploaded && undertakingsConfirmed
	}, [application, canSubmit, form, files, enfAcknowledged])

	// Debug submit validation
	useEffect(() => {
		if (application) {
			const values = form.getValues()
			const requiredFieldsFilled = Boolean(
				values.personalQualifications.citizenship &&
				values.personalQualifications.dateOfBirth &&
				values.personalQualifications.residentialAddress &&
				values.personalQualifications.workOrBusinessAddress &&
				values.personalQualifications.mobileNumber &&
				values.personalQualifications.emailAddress &&
				values.personalQualifications.professionalTaxReceiptNumber &&
				values.personalQualifications.rollOfAttorneysNumber &&
				values.personalQualifications.ibpMembershipNumber &&
				values.personalQualifications.mcleComplianceNumber &&
				values.personalQualifications.ulasComplianceNumber
			)
			const requiredFilesUploaded = Boolean(
				files.obcCertification &&
				files.ibpCertification &&
				files.passportPhoto &&
				files.paymentProof &&
				(files.enfProviderCertification ?? enfAcknowledged)
			)
			const undertakingsConfirmed = Boolean(
				values.undertakingElectronicNotarialActs && values.undertakingDataSharingGuidelines
			)

			console.log("Submit validation debug:", {
				canSubmitLocal,
				requiredFieldsFilled,
				requiredFilesUploaded,
				undertakingsConfirmed,
				application: !!application,
				canSubmit,
			})
		}
	}, [application, canSubmit, canSubmitLocal, form, files, enfAcknowledged])

	// no explicit onSubmit to avoid RHF generic mismatches; handle inline

	const handleSubmitForReview = async () => {
		if (!application) {
			toast.error("Please save your application first")
			return
		}

		const vals = form.getValues()
		if (!vals.undertakingElectronicNotarialActs || !vals.undertakingDataSharingGuidelines) {
			toast.error("Please confirm both written undertakings before submitting.")
			return
		}

		// First update the application with current form data and files
		const submissionData: Partial<LegalRegistrationFormValues> = {
			...vals,
			obcCertification: files.obcCertification ?? undefined,
			ibpCertification: files.ibpCertification ?? undefined,
			passportPhoto: files.passportPhoto ?? undefined,
			paymentProof: files.paymentProof ?? undefined,
			enfProviderCertification: files.enfProviderCertification ?? undefined,
			electronicSignatureApplied: false,
		}

		console.log("Submitting with data:", submissionData)
		console.log("Files state:", files)
		console.log("Application ID:", application.id)

		try {
			// Update the application first, then submit for review
			await updateExistingApplication(application.id, submissionData)

			// In a real implementation, this would capture an electronic signature
			const mockElectronicSignatureUrl = "https://example.com/signatures/mock-signature.png"

			// Submit for review after successful update
			await submitForReview(application.id, mockElectronicSignatureUrl)
		} catch (error) {
			console.error("Failed to update application before submission:", error)
			toast.error("Failed to update application. Please try again.")
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
					<p className="mt-2 text-gray-600">Loading application...</p>
				</div>
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-4xl space-y-6">
			{/* Header */}
			<Card>
				<CardHeader>
					<div className="flex items-center space-x-2 px-2">
						<FileText className="h-6 w-6 text-blue-600" />
						<div>
							<CardTitle>Legal Professional E-Notarial Registration</CardTitle>
							<CardDescription>
								Application for Electronic Notarization Authorization
							</CardDescription>
						</div>
					</div>
					{application && (
						<div className="mt-4 flex items-center space-x-2">
							<Badge
								variant={
									application.status === "APPROVED"
										? "default"
										: application.status === "REJECTED"
											? "destructive"
											: application.status === "UNDER_REVIEW"
												? "secondary"
												: "outline"
								}
							>
								{application.status.replace(/_/g, " ")}
							</Badge>
							{application.submittedAt && (
								<p className="text-sm text-gray-600">
									Submitted: {new Date(application.submittedAt).toLocaleDateString()}
								</p>
							)}
						</div>
					)}
				</CardHeader>
			</Card>

			{/* Status Messages */}
			{application?.status === "REJECTED" && application.remarks && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						<strong>Application Rejected:</strong> {application.remarks}
					</AlertDescription>
				</Alert>
			)}

			{application?.status === "APPROVED" && (
				<Alert className="border-green-200 bg-green-50 text-green-800">
					<Check className="h-4 w-4" />
					<AlertDescription>
						<strong>Application Approved!</strong> You are now authorized for electronic
						notarization.
					</AlertDescription>
				</Alert>
			)}

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(_values => {
						const values = form.getValues()
						const submissionData: Partial<LegalRegistrationFormValues> = {
							...values,
							obcCertification: files.obcCertification ?? undefined,
							ibpCertification: files.ibpCertification ?? undefined,
							passportPhoto: files.passportPhoto ?? undefined,
							paymentProof: files.paymentProof ?? undefined,
							enfProviderCertification: files.enfProviderCertification ?? undefined,
							electronicSignatureApplied: false,
						}

						if (application) {
							void updateExistingApplication(application.id, submissionData)
						} else {
							// Create a draft first
							void createNewApplication({
								...values,
								obcCertification: files.obcCertification ?? null,
								ibpCertification: files.ibpCertification ?? null,
								passportPhoto: files.passportPhoto ?? null,
								paymentProof: files.paymentProof ?? null,
								enfProviderCertification: files.enfProviderCertification ?? null,
								electronicSignatureApplied: false,
							})
						}
					})}
					className="space-y-6"
				>
					{/* Personal Qualifications */}
					<Card>
						<CardHeader>
							<CardTitle>Personal Qualifications</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									name="personalQualifications.citizenship"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Citizenship *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									name="personalQualifications.dateOfBirth"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Date of Birth *</FormLabel>
											<FormControl>
												<Input type="date" {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								name="personalQualifications.residentialAddress"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Residential Address *</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												rows={3}
												disabled={!canEditLocal}
												placeholder="Complete residential address including barangay, city/municipality, province"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								name="personalQualifications.workOrBusinessAddress"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Work or Business Address *</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												rows={3}
												disabled={!canEditLocal}
												placeholder="Complete work or business address"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									name="personalQualifications.telephoneNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Telephone Number</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} placeholder="(02) 123-4567" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									name="personalQualifications.mobileNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Mobile Number *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} placeholder="09XX-XXX-XXXX" />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								name="personalQualifications.emailAddress"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email Address *</FormLabel>
										<FormControl>
											<Input type="email" {...field} disabled={!canEditLocal} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Separator />

							<h4 className="font-semibold">Professional Information</h4>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									name="personalQualifications.professionalTaxReceiptNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Professional Tax Receipt Number *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									name="personalQualifications.rollOfAttorneysNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Roll of Attorneys Number *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								<FormField
									name="personalQualifications.ibpMembershipNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>IBP Membership Number *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									name="personalQualifications.mcleComplianceNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>MCLE Compliance Number *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									name="personalQualifications.ulasComplianceNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>ULAS Compliance Number *</FormLabel>
											<FormControl>
												<Input {...field} disabled={!canEditLocal} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Undertakings */}
					{canEditLocal && (
						<Card>
							<CardHeader>
								<CardTitle>Written Undertakings</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<FormField
									name="undertakingElectronicNotarialActs"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-y-0 space-x-3">
											<FormControl>
												<Checkbox
													checked={!!field.value}
													onCheckedChange={v => field.onChange(Boolean(v))}
													disabled={!canEditLocal}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>Electronic Notarial Acts Compliance</FormLabel>
												<FormDescription>
													I undertake to execute electronic notarial acts strictly in accordance
													with the Rules
												</FormDescription>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									name="undertakingDataSharingGuidelines"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-y-0 space-x-3">
											<FormControl>
												<Checkbox
													checked={!!field.value}
													onCheckedChange={v => field.onChange(Boolean(v))}
													disabled={!canEditLocal}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>Data Sharing Guidelines Compliance</FormLabel>
												<FormDescription>
													I undertake to comply with the Electronic Notarization Data Sharing
													Guidelines
												</FormDescription>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
					)}
				</form>
			</Form>

			{/* Required Documents */}
			{canEditLocal && (
				<Card>
					<CardHeader>
						<CardTitle>Required Documents</CardTitle>
						<CardDescription>
							{!application
								? "Save your application as a draft first to enable file uploads. Once saved, you can upload your required documents in the correct folder structure: legal-application/{applicationId}/{organization}/"
								: "Upload all required documents in PDF or image format. Files will be saved to: legal-application/" +
									application.id +
									"/" +
									(summary?.organization ?? "organization") +
									"/"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<FileUploadField
							label="OBC Good Moral Character Certification"
							description="Certification of good moral character from the Office of the Bar Confidant (OBC)"
							value={files.obcCertification}
							onChange={file => setFiles(prev => ({ ...prev, obcCertification: file }))}
							accept=".pdf,.jpg,.jpeg,.png"
							uploadParams={
								application
									? {
											applicationId: application.id,
											organization: summary?.organization ?? undefined,
										}
									: undefined
							}
							disabled={false} // Always allow uploads since auto-draft creation handles this
							isCreatingDraft={isCreatingDraft}
							onCreateDraft={createDraftIfNeeded}
						/>

						<FileUploadField
							label="IBP Good Moral Character Certification"
							description="Certification of good moral character from the Integrated Bar of the Philippines (IBP)"
							value={files.ibpCertification}
							onChange={file => setFiles(prev => ({ ...prev, ibpCertification: file }))}
							accept=".pdf,.jpg,.jpeg,.png"
							uploadParams={
								application
									? {
											applicationId: application.id,
											organization: summary?.organization ?? undefined,
										}
									: undefined
							}
							disabled={false} // Always allow uploads since auto-draft creation handles this
							isCreatingDraft={isCreatingDraft}
							onCreateDraft={createDraftIfNeeded}
						/>

						<FileUploadField
							label="Passport-size Colored Photograph"
							description="Unretouched passport-size colored photograph with light background taken within 30 days"
							value={files.passportPhoto}
							onChange={file => setFiles(prev => ({ ...prev, passportPhoto: file }))}
							accept=".jpg,.jpeg,.png"
							uploadParams={
								application
									? {
											applicationId: application.id,
											organization: summary?.organization ?? undefined,
										}
									: undefined
							}
							disabled={false} // Always allow uploads since auto-draft creation handles this
							isCreatingDraft={isCreatingDraft}
							onCreateDraft={createDraftIfNeeded}
						/>

						<FileUploadField
							label="Proof of Payment"
							description="Proof of payment for the filing of the application"
							value={files.paymentProof}
							onChange={file => setFiles(prev => ({ ...prev, paymentProof: file }))}
							accept=".pdf,.jpg,.jpeg,.png"
							uploadParams={
								application
									? {
											applicationId: application.id,
											organization: summary?.organization ?? undefined,
										}
									: undefined
							}
							disabled={false} // Always allow uploads since auto-draft creation handles this
							isCreatingDraft={isCreatingDraft}
							onCreateDraft={createDraftIfNeeded}
						/>

						<FileUploadField
							label="ENF Provider Certification"
							description="Certification from an ENF Provider stating that you have viewed the instructional video"
							value={files.enfProviderCertification}
							onChange={file =>
								setFiles(prev => ({
									...prev,
									enfProviderCertification: file,
								}))
							}
							accept=".pdf,.jpg,.jpeg,.png"
							uploadParams={
								application
									? {
											applicationId: application.id,
											organization: summary?.organization ?? undefined,
										}
									: undefined
							}
							disabled={false} // Always allow uploads since auto-draft creation handles this
							isCreatingDraft={isCreatingDraft}
							onCreateDraft={createDraftIfNeeded}
						/>

						<div className="rounded-md border p-3">
							<div className="flex items-start space-x-3">
								<Checkbox
									checked={enfAcknowledged}
									onCheckedChange={v => setEnfAcknowledged(Boolean(v))}
									disabled={!canEditLocal}
								/>
								<div>
									<p className="text-sm font-medium">ENF Instructional Video Acknowledgement</p>
									<p className="text-muted-foreground text-xs">
										You may proceed without uploading the ENF certification by acknowledging you
										will complete the instructional video. In the future, the system will issue an
										e-certificate after video completion.
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Submit for Review */}
			{application && (
				<Card>
					<CardHeader>
						<CardTitle>Submit Application</CardTitle>
						<CardDescription>
							Review your application and submit for official review
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Once submitted, you will not be able to modify your application. Please review all
								information carefully before proceeding.
							</AlertDescription>
						</Alert>

						{!canSubmitLocal && (
							<Alert className="mb-4" variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									Please complete all required fields, upload all required documents, and confirm
									all undertakings before submitting.
								</AlertDescription>
							</Alert>
						)}

						<div className="flex justify-end">
							<Button
								onClick={handleSubmitForReview}
								disabled={!canSubmitLocal || isSubmitting}
								className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
							>
								{isSubmitting ? "Submitting..." : "Submit for Review"}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
