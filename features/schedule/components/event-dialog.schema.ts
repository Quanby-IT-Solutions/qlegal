import { z } from "zod/v4"

// Email validation - checks if it's a valid email format
const emailSchema = z
	.string()
	.email("Invalid email address")
	.min(1, "Email is required")
	.trim()
	.toLowerCase()

// Guest schema with validation
export const guestSchema = z.object({
	name: z.string().min(1, "Guest name is required").trim(),
	email: emailSchema,
})

export const eventDialogSchema = z
	.object({
		title: z.string().min(1, "Event title is required").trim(),
		description: z.string().optional().or(z.literal("")),
		allDay: z.boolean().default(false),
		dateRange: z
			.object({
				from: z.coerce.date({ errorMap: () => ({ message: "Start date is required" }) }),
				to: z.coerce.date({ errorMap: () => ({ message: "End date is required" }) }),
			})
			.required(),
		// Time fields - only used when not all day
		startHour: z.string().optional(),
		startMinute: z.string().optional(),
		startPeriod: z.enum(["am", "pm"]).optional(),
		endHour: z.string().optional(),
		endMinute: z.string().optional(),
		endPeriod: z.enum(["am", "pm"]).optional(),
		timezone: z.string().default("UTC"),
		// Event properties
		color: z.enum(["sky", "emerald", "amber", "orange", "rose", "violet"]).default("sky"),
		recurrence: z
			.enum(["does-not-repeat", "daily", "weekly", "monthly", "annually", "weekdays", "custom"])
			.default("does-not-repeat"),
		eventType: z.enum(["consultation", "notarization"]).default("consultation"),
		mode: z.enum(["ren", "ien"]).optional(),
		location: z.string().optional().or(z.literal("")),
		guests: z
			.array(guestSchema)
			.refine(
				guests => {
					// Check for duplicate emails
					const emails = guests.map(g => g.email.toLowerCase())
					const uniqueEmails = new Set(emails)
					if (emails.length !== uniqueEmails.size) {
						return false
					}
					return true
				},
				{ message: "Duplicate guest email detected" }
			)
			.default([]),
	})
	.refine(data => {
		// If not all day, time fields are required
		if (!data.allDay) {
			return (
				data.startHour !== undefined &&
				data.startMinute !== undefined &&
				data.startPeriod !== undefined &&
				data.endHour !== undefined &&
				data.endMinute !== undefined &&
				data.endPeriod !== undefined
			)
		}
		return true
	}, "Time fields are required for non-all-day events")
	.refine(data => data.dateRange.to >= data.dateRange.from, "End date must be on or after start date")
	.refine(
		data => {
			if (data.eventType === "notarization") {
				return data.mode !== undefined
			}
			return true
		},
		{ path: ["mode"], message: "Mode is required for notarization events" }
	)

export type EventDialogSchema = z.infer<typeof eventDialogSchema>
export type GuestSchema = z.infer<typeof guestSchema>
