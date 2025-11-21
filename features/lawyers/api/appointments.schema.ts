import { z } from "zod/v4"

// Create appointment schema
export const createAppointmentSchema = z.object({
	lawyerId: z.string().min(1, "Lawyer ID is required"),
	type: z.enum(["DOCUMENT_SIGNING", "CONSULTATION"], {
		message: "Appointment type is required",
	}),
	appointmentDate: z.coerce.date({
		message: "Appointment date is required",
	}),
	duration: z.number().min(15).max(480).default(60), // 15 minutes to 8 hours
	notes: z.string().optional(),
	location: z.string().optional(),
	meetingLink: z.string().url().optional().or(z.literal("")),
})

// Update appointment schema
export const updateAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
	appointmentDate: z.coerce.date().optional(),
	duration: z.number().min(15).max(480).optional(),
	notes: z.string().optional(),
	location: z.string().optional(),
	meetingLink: z.string().url().optional().or(z.literal("")),
})

// Cancel appointment schema
export const cancelAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	cancelReason: z.string().min(1, "Cancel reason is required"),
})

// Get appointments schema
export const getAppointmentsSchema = z.object({
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
	type: z.enum(["DOCUMENT_SIGNING", "CONSULTATION"]).optional(),
	lawyerId: z.string().optional(),
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
})

// Get appointment by ID schema
export const getAppointmentByIdSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
})

// Confirm appointment schema
export const confirmAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	meetingLink: z.string().url().optional().or(z.literal("")),
})

// Get notarization session schema (accepts appointment ID or notarization request ID)
export const getNotarizationSessionSchema = z.object({
	sessionId: z.string().min(1, "Session ID is required"),
})

// Type exports
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>
export type GetAppointmentsInput = z.infer<typeof getAppointmentsSchema>
export type GetAppointmentByIdInput = z.infer<typeof getAppointmentByIdSchema>
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>
export type GetNotarizationSessionInput = z.infer<typeof getNotarizationSessionSchema>
