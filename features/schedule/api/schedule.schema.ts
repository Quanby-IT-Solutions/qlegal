import { z } from "zod/v4"

// Input for ENP creating their own consultation or notarization event
export const createEnpEventSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	appointmentDate: z.date(),
	startTime: z.regex(/^([01]?[0-9]|1[0-9]):[0-5][0-9]$/, "Invalid time format, use HH:MM"),
	endTime: z.regex(/^([01]?[0-9]|1[0-9]):[0-5][0-9]$/, "Invalid time format, use HH:MM"),
	duration: z.number().optional().default(60),
	allDay: z.boolean().default(false),
	location: z.string().optional(),
	type: z.enum(["CONSULTATION", "DOCUMENT_SIGNING"]),
	workflow: z.enum(["REN", "IEN"]).optional(),
	notes: z.string().optional(),
})

// Update existing event
export const updateEnpEventSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
	title: z.string().optional(),
	description: z.string().optional(),
	appointmentDate: z.date().optional(),
	startTime: z.regex(/^([01]?[0-9]|1[0-9]):[0-5][0-9]$/, "Invalid time format, use HH:MM"),
	endTime: z.regex(/^([01]?[0-9]|1[0-9]):[0-5][0-9]$/, "Invalid time format, use HH:MM"),
	duration: z.number().optional(),
	allDay: z.boolean().optional(),
	location: z.string().optional(),
	type: z.enum(["CONSULTATION", "DOCUMENT_SIGNING"]).optional(),
	workflow: z.enum(["REN", "IEN"]).optional(),
	notes: z.string().optional(),
})

// Delete event
export const deleteEnpEventSchema = z.object({
	appointmentId: z.string().min(1, "Appointment ID is required"),
})
