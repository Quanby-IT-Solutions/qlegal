import { pgEnum } from "drizzle-orm/pg-core"

// User roles enum
export const userRoles = pgEnum("user_role", ["ENP", "PRINCIPAL", "ENA", "ADMIN"])

// User status enum
export const userStatus = pgEnum("user_status", ["ACTIVE", "PENDING", "SUSPENDED"])

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
export const kycStatus = pgEnum("kyc_status", [
	"NOT_STARTED",
	"PENDING",
	"VERIFIED",
	"REJECTED",
])
