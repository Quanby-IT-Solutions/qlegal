import { z } from "zod/v4"

// Consultation workflow types
export const consultationWorkflowType = z.enum(["REN", "IEN"])
export type ConsultationWorkflowType = z.infer<typeof consultationWorkflowType>

// Consultation type
export const consultationType = z.enum(["INITIAL", "FOLLOWUP", "URGENT"])
export type ConsultationType = z.infer<typeof consultationType>

// Meeting preference for REN consultations
export const meetingPreference = z.enum(["VIDEO_CALL", "CHAT_ONLY"])
export type MeetingPreference = z.infer<typeof meetingPreference>

// Book consultation schema
export const bookConsultationSchema = z.object({
	enpId: z.string().min(1, "ENP ID is required"),
	workflowType: consultationWorkflowType,
	appointmentDate: z.coerce.date({
		message: "Appointment date is required",
	}),
	appointmentTime: z.string().min(1, "Appointment time is required"),
	consultationType: consultationType.default("INITIAL"),
	meetingPreference: meetingPreference.optional(), // For REN: VIDEO_CALL or CHAT_ONLY
	specialRequirements: z.string().optional(),
	location: z.string().optional(), // For IEN appointments
})

// Get ENP availability schema
export const getEnpAvailabilitySchema = z.object({
	enpId: z.string().min(1, "ENP ID is required"),
	workflowType: consultationWorkflowType,
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
})

// Get consultation by ID schema
export const getConsultationByIdSchema = z.object({
	consultationId: z.string().min(1, "Consultation ID is required"),
})

// Get consultations list schema
export const getConsultationsSchema = z.object({
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
	workflowType: consultationWorkflowType.optional(),
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
})

// Update consultation schema
export const updateConsultationSchema = z.object({
	consultationId: z.string().min(1, "Consultation ID is required"),
	status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
	meetingLink: z.string().url().optional().or(z.literal("")),
	notes: z.string().optional(),
})

// Cancel consultation schema
export const cancelConsultationSchema = z.object({
	consultationId: z.string().min(1, "Consultation ID is required"),
	cancelReason: z.string().min(1, "Cancel reason is required"),
})

// Set ENP availability schema
export const setEnpAvailabilitySchema = z.object({
	workflowType: consultationWorkflowType,
	date: z.coerce.date(),
	timeSlots: z.array(
		z.object({
			time: z.string(),
			duration: z.number().min(15).max(480),
			available: z.boolean().default(true),
		})
	),
})

// Get available ENPs schema
export const getAvailableEnpsSchema = z.object({
	workflowType: consultationWorkflowType.optional(),
	specialization: z.string().optional(),
	date: z.coerce.date().optional(),
})

// Type exports
export type BookConsultationInput = z.infer<typeof bookConsultationSchema>
export type GetEnpAvailabilityInput = z.infer<typeof getEnpAvailabilitySchema>
export type GetConsultationByIdInput = z.infer<typeof getConsultationByIdSchema>
export type GetConsultationsInput = z.infer<typeof getConsultationsSchema>
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>
export type CancelConsultationInput = z.infer<typeof cancelConsultationSchema>
export type SetEnpAvailabilityInput = z.infer<typeof setEnpAvailabilitySchema>
export type GetAvailableEnpsInput = z.infer<typeof getAvailableEnpsSchema>

