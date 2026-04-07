import { z } from "zod/v4"

// =================== PRINCIPAL SCHEMAS ===================

// Create appointment schema
export const createAppointmentSchema = z
	.object({
		enpId: z.string().min(1, "ENP ID is required"),
		title: z.string().min(1, "Title is required"),
		description: z.string().optional(),
		type: z.enum(["NOTARIZATION", "CONSULTATION"], {
			message: "Appointment type is required",
		}),
		appointmentDate: z.coerce.date({
			message: "Appointment date is required",
		}),
		duration: z.number().min(15).max(480).default(60), // 15 minutes to 8 hours
		modeOfNotarization: z.enum(["REN", "IEN"]).default("REN"),
		location: z.string().optional(),
	})
	.refine(
		data => {
			// IEN (In-Person Electronic Notarization) appointments must have a location
			if (data.modeOfNotarization === "IEN") {
				return !!data.location && data.location.trim().length > 0
			}
			return true
		},
		{
			message: "Location is required for In-Person Electronic Notarization (IEN) appointments",
			path: ["location"],
		}
	)

// Get appointments schema
export const getAppointmentsSchema = z.object({
	status: z.enum(["PENDING", "CONFIRMED", "ONGOING", "CANCELLED", "COMPLETED"]).optional(),
	type: z.enum(["NOTARIZATION", "CONSULTATION"]).optional(),
	limit: z.number().min(1).max(100).default(20),
	offset: z.number().min(0).default(0),
})

// Create request schema (from requests.router.ts)
export const createRequestSchema = z.object({
	enpId: z.string().min(1, "ENP ID is required"),
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	workflow: z.enum(["REN", "IEN"]),
	priority: z.enum(["NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
})

// =================== ENP SCHEMAS ===================

// Confirm appointment schema
export const confirmAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
})

// Update request status schema (from requests.router.ts)
export const updateRequestStatusSchema = z.object({
	requestId: z.string().min(1, "Request ID is required"),
	status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
	rejectReason: z.string().optional(),
})

// Create ENP event schema (from schedule.schema.ts)
export const createEnpEventSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	appointmentDate: z.date(),
	startTime: z
		.string()
		.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, use HH:MM")
		.optional(),
	endTime: z
		.string()
		.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, use HH:MM")
		.optional(),
	duration: z.number().optional().default(60),
	allDay: z.boolean().default(false),
	location: z.string().optional(),
	type: z.enum(["CONSULTATION", "NOTARIZATION"]),
	workflow: z.enum(["REN", "IEN"]).optional(),
})

// Update ENP event schema (from schedule.schema.ts)
export const updateEnpEventSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	title: z.string().optional(),
	description: z.string().optional(),
	appointmentDate: z.date().optional(),
	startTime: z
		.string()
		.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, use HH:MM")
		.optional(),
	endTime: z
		.string()
		.regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, use HH:MM")
		.optional(),
	duration: z.number().optional(),
	allDay: z.boolean().optional(),
	location: z.string().optional(),
	type: z.enum(["CONSULTATION", "NOTARIZATION"]).optional(),
	workflow: z.enum(["REN", "IEN"]).optional(),
})

// Delete ENP event schema (from schedule.schema.ts)
export const deleteEnpEventSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
})

// Block time slot schema (from requests.router.ts)
export const blockTimeSlotSchema = z.object({
	type: z.enum(["ONE_TIME", "RECURRING"]),
	date: z.string().optional(),
	dayOfWeek: z.number().optional(),
	startTime: z.string(),
	endTime: z.string(),
	reason: z.string().optional(),
})

// Unblock time slot schema (from requests.router.ts)
export const unblockTimeSlotSchema = z.object({
	availabilityId: z.string().min(1),
})

// =================== SHARED SCHEMAS ===================

// Update appointment schema
export const updateAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	status: z.enum(["PENDING", "CONFIRMED", "ONGOING", "CANCELLED", "COMPLETED"]).optional(),
	appointmentDate: z.coerce.date().optional(),
	duration: z.number().min(15).max(480).optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	location: z.string().optional(),
})

// Cancel appointment schema
export const cancelAppointmentSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	cancelReason: z.string().min(1, "Cancel reason is required"),
})

// Get appointment by ID schema
export const getAppointmentByIdSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
})

// Get notarization session schema (accepts appointment ID or notarization request ID)
export const getNotarizationSessionSchema = z.object({
	sessionId: z.string().min(1, "Session ID is required"),
})

// Get request by ID schema (from requests.router.ts)
export const getRequestByIdSchema = z.object({
	requestId: z.string().min(1),
})

// =================== TYPE EXPORTS ===================

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type GetAppointmentsInput = z.infer<typeof getAppointmentsSchema>
export type CreateRequestInput = z.infer<typeof createRequestSchema>
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentSchema>
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>
export type CreateEnpEventInput = z.infer<typeof createEnpEventSchema>
export type UpdateEnpEventInput = z.infer<typeof updateEnpEventSchema>
export type DeleteEnpEventInput = z.infer<typeof deleteEnpEventSchema>
export type BlockTimeSlotInput = z.infer<typeof blockTimeSlotSchema>
export type UnblockTimeSlotInput = z.infer<typeof unblockTimeSlotSchema>

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>
export type GetAppointmentByIdInput = z.infer<typeof getAppointmentByIdSchema>
export type GetNotarizationSessionInput = z.infer<typeof getNotarizationSessionSchema>
export type GetRequestByIdInput = z.infer<typeof getRequestByIdSchema>
