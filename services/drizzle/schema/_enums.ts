import { pgEnum } from "drizzle-orm/pg-core"

// User roles enum
export const userRoles = pgEnum("user_role", ["ENP", "PRINCIPAL", "ENA", "ADMIN"])

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
export const appointmentType = pgEnum("appointment_type", [
	"DOCUMENT_SIGNING",
	"CONSULTATION",
])
