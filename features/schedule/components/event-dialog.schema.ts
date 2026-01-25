import { z } from "zod/v4"

export const eventDialogSchema = z
	.object({
		title: z.string().min(1, "Event title is required").trim(),
		description: z.string().optional().or(z.literal("")),
		allDay: z.boolean(),
		dateRange: z.object({
			from: z.date(),
			to: z.date(),
		}),
		// Time fields - only used when not all day
		startHour: z.string().optional(),
		startMinute: z.string().optional(),
		startPeriod: z.enum(["am", "pm"]).optional(),
		endHour: z.string().optional(),
		endMinute: z.string().optional(),
		endPeriod: z.enum(["am", "pm"]).optional(),
		timezone: z.string().min(1, "Timezone is required"),
		// Event properties
		color: z.enum(["sky", "emerald", "amber", "orange", "rose", "violet"]),
		recurrence: z.enum(["does-not-repeat", "daily", "weekly", "monthly", "annually", "weekdays", "custom"]),
		eventType: z.enum(["consultation", "notarization"]),
		mode: z.enum(["ren", "ien"]).optional(),
		location: z.string().optional().or(z.literal("")),
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
		data => data.eventType === "notarization" ? data.mode !== undefined : true,
		{ path: ["mode"], message: "Mode is required for notarization events" }
	)

export type EventDialogSchema = z.infer<typeof eventDialogSchema>
