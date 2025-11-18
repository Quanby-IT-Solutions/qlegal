import { z } from "zod/v4"

// Personal Qualifications Schema
export const personalQualificationsSchema = z.object({
	// Basic Information
	citizenship: z.string().min(1, "Citizenship is required"),
	dateOfBirth: z.string().min(1, "Date of birth is required"),
	residentialAddress: z.string().min(10, "Complete residential address is required"),
	workOrBusinessAddress: z.string().min(10, "Work or business address is required"),

	// Contact Information
	telephoneNumber: z.string().optional(),
	mobileNumber: z.string().min(10, "Mobile number is required"),
	emailAddress: z.string().email("Valid email address is required"),

	// Professional Information
	professionalTaxReceiptNumber: z.string().min(1, "Professional tax receipt number is required"),
	rollOfAttorneysNumber: z.string().min(1, "Roll of Attorneys number is required"),
	ibpMembershipNumber: z.string().min(1, "IBP membership number is required"),
	mcleComplianceNumber: z.string().min(1, "MCLE compliance number is required"),
	ulasComplianceNumber: z.string().min(1, "ULAS compliance number is required"),
})

// File Upload Schema
export const fileUploadSchema = z.object({
	fileName: z.string(),
	fileUrl: z.string().url(),
	fileSize: z.number(),
	mimeType: z.string(),
})

// Legal Registration Schema
export const legalRegistrationSchema = z.object({
	// Personal Qualifications
	personalQualifications: personalQualificationsSchema,

	// Required Documents (file uploads)
	obcCertification: fileUploadSchema.describe("OBC Good Moral Character Certification"),
	ibpCertification: fileUploadSchema.describe("IBP Good Moral Character Certification"),
	passportPhoto: fileUploadSchema.describe("Passport-size colored photograph"),
	paymentProof: fileUploadSchema.describe("Proof of payment for application filing"),

	// Written Undertakings (boolean confirmations)
	// Note: These are enforced at submission time, not draft save.
	undertakingElectronicNotarialActs: z.boolean().default(false),
	undertakingDataSharingGuidelines: z.boolean().default(false),

	// ENF Provider Certification
	enfProviderCertification: fileUploadSchema.describe(
		"ENF Provider certification for instructional video"
	),

	// Electronic Signature (will be handled separately)
	electronicSignatureApplied: z.boolean().default(false),

	// Additional metadata - make these optional for form submission
	applicationDate: z.date().optional(),
	status: z.enum(["DRAFT", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"]).optional(),
})

// Form Schema (with nullable file uploads for form handling)
export const legalRegistrationFormSchema = z.object({
	// Personal Qualifications
	personalQualifications: personalQualificationsSchema,

	// Required Documents (file uploads - nullable for form)
	obcCertification: fileUploadSchema.nullable().describe("OBC Good Moral Character Certification"),
	ibpCertification: fileUploadSchema.nullable().describe("IBP Good Moral Character Certification"),
	passportPhoto: fileUploadSchema.nullable().describe("Passport-size colored photograph"),
	paymentProof: fileUploadSchema.nullable().describe("Proof of payment for application filing"),

	// Written Undertakings (boolean confirmations)
	// For the form, allow false during draft; enforce on submit flow instead.
	undertakingElectronicNotarialActs: z.boolean().default(false),
	undertakingDataSharingGuidelines: z.boolean().default(false),

	// ENF Provider Certification
	enfProviderCertification: fileUploadSchema
		.nullable()
		.describe("ENF Provider certification for instructional video"),

	// Electronic Signature (will be handled separately)
	electronicSignatureApplied: z.boolean().default(false),
})

// Update Application Schema (for status updates)
export const updateApplicationStatusSchema = z.object({
	applicationId: z.string(),
	status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED"]),
	remarks: z.string().optional(),
})

// Application Response Schema
export const applicationResponseSchema = z.object({
	id: z.string(),
	applicantId: z.string(),
	status: z.string(),
	submittedAt: z.date().nullable(),
	reviewedAt: z.date().nullable(),
	approvedAt: z.date().nullable(),
	rejectedAt: z.date().nullable(),
	remarks: z.string().nullable(),
	personalQualifications: z.object({
		citizenship: z.string(),
		dateOfBirth: z.string(),
		residentialAddress: z.string(),
		workOrBusinessAddress: z.string(),
		telephoneNumber: z.string().optional(),
		mobileNumber: z.string(),
		emailAddress: z.string(),
		professionalTaxReceiptNumber: z.string(),
		rollOfAttorneysNumber: z.string(),
		ibpMembershipNumber: z.string(),
		mcleComplianceNumber: z.string(),
		ulasComplianceNumber: z.string(),
	}),
	createdAt: z.date(),
	updatedAt: z.date(),
})

// Type exports
export type PersonalQualifications = z.infer<typeof personalQualificationsSchema>
export type FileUpload = z.infer<typeof fileUploadSchema>
export type LegalRegistration = z.infer<typeof legalRegistrationSchema>
export type LegalRegistrationForm = z.infer<typeof legalRegistrationFormSchema>
export type UpdateApplicationStatus = z.infer<typeof updateApplicationStatusSchema>
export type ApplicationResponse = z.infer<typeof applicationResponseSchema>

// Validation helpers
export const validatePhilippinePhoneNumber = (phone: string) => {
	const phoneRegex = /^(\+63|63|0)?[89]\d{9}$/
	return phoneRegex.test(phone.replace(/[-\s]/g, ""))
}

export const validateProfessionalTaxReceipt = (ptr: string) => {
	// Basic validation for PTR format (adjust based on actual format)
	return ptr.length >= 7 && /^\d+$/.test(ptr)
}

export const validateRollNumber = (rollNumber: string) => {
	// Basic validation for Roll of Attorneys number
	return rollNumber.length >= 4 && /^\d+$/.test(rollNumber)
}

export const validateIBPNumber = (ibpNumber: string) => {
	// Basic validation for IBP membership number
	return ibpNumber.length >= 6
}
