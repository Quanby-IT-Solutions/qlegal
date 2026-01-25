import { pgEnum } from "drizzle-orm/pg-core"

// User roles enum
export const userRoles = pgEnum("user_role", ["ENP", "PRINCIPAL", "ENA", "ADMIN"])

// User status enum
export const userStatus = pgEnum("user_status", ["ACTIVE", "PENDING", "SUSPENDED"])

// Enp availability type enum
export const enpAvailabilityType = pgEnum("enp_availability_type", ["REGULAR", "BLOCKED", "CUSTOM", "RECURRING_BLOCKED"])

// Document status enum
export const documentStatusEnum = pgEnum("document_status", [
	"UPLOADED",
	"PROCESSING",
	"READY",
	"ERROR",
])

// Meeting status enum
export const meetingStatus = pgEnum("meeting_status", [
	"SCHEDULED",
	"ONGOING",
	"COMPLETED",
	"CANCELLED",
])

// Meeting participant/invite status enum
export const meetingParticipantStatus = pgEnum("meeting_participant_status", [
	"PENDING",
	"ACCEPTED",
	"DECLINED",
])

// Appointment status enum
export const appointmentStatus = pgEnum("appointment_status", [
	"PENDING",
	"CONFIRMED",
	"CANCELLED",
	"COMPLETED",
])

// Appointment type enum
export const appointmentType = pgEnum("appointment_type", ["DOCUMENT_SIGNING", "CONSULTATION"])

// Legal application status enum
export const legalApplicationStatus = pgEnum("legal_application_status", [
	"DRAFT",
	"PENDING",
	"UNDER_REVIEW",
	"APPROVED",
	"REJECTED",
])

// KYC verification status enum
export const kycStatus = pgEnum("kyc_status", ["NOT_STARTED", "PENDING", "VERIFIED", "REJECTED"])

// Notarization type enum - eNotarization act types (Rule IV)
export const notarizationType = pgEnum("notarization_type", [
	"ACKNOWLEDGMENT", // Acknowledgment by Electronic Means (Section 1, Rule IV)
	"AFFIRMATION", // Affirmation or Oath by Electronic Means (Section 2, Rule IV)
	"JURAT", // Jurat by Electronic Means (Section 3, Rule IV)
	"SIGNATURE_WITNESSING", // Signature Witnessing by Electronic Means (Section 4, Rule IV)
])
