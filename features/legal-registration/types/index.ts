import type { InferSelectModel } from "drizzle-orm"

import type { users } from "@/services/drizzle/schema/auth"
import type { legalRegistrations } from "@/services/drizzle/schema/legal-registration"

// Database types
export type LegalRegistration = InferSelectModel<typeof legalRegistrations>
export type User = InferSelectModel<typeof users>

export type LegalRegistrationWithApplicant = LegalRegistration & {
	applicant: Pick<User, "name" | "email">
}

export type LegalRegistrationRecord = LegalRegistration

// Update data types
export interface LegalRegistrationUpdateData {
	citizenship?: string
	dateOfBirth?: Date
	residentialAddress?: string
	workOrBusinessAddress?: string
	telephoneNumber?: string | null
	mobileNumber?: string
	emailAddress?: string
	professionalTaxReceiptNumber?: string
	rollOfAttorneysNumber?: string
	ibpMembershipNumber?: string
	mcleComplianceNumber?: string
	ulasComplianceNumber?: string
	obcCertificationUrl?: string
	ibpCertificationUrl?: string
	passportPhotoUrl?: string
	paymentProofUrl?: string
	enfProviderCertificationUrl?: string
	undertakingElectronicNotarialActs?: boolean
	undertakingDataSharingGuidelines?: boolean
}

export interface LegalRegistrationStatusUpdateData {
	status: "UNDER_REVIEW" | "APPROVED" | "REJECTED"
	reviewedBy: string
	reviewedAt: Date
	remarks?: string
	approvedAt?: Date
	rejectedAt?: Date
}

export interface LegalRegistrationSubmissionData {
	status: "PENDING"
	electronicSignatureApplied: boolean
	electronicSignatureUrl: string
	submittedAt: Date
}

// Query result types
export interface LegalRegistrationListResult {
	applications: LegalRegistrationWithApplicant[]
	pagination: {
		page: number
		limit: number
		total: number
		pages: number
	}
}
