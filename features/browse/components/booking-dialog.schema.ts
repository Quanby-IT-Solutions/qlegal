import { z } from "zod/v4"

const bookingDialogBaseSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional().or(z.literal("")),
	bookingMode: z.enum(["CONSULTATION", "NOTARIZATION"]),
	workflowType: z.enum(["REN", "IEN"]).optional(),
	selectedDate: z.date(),
	// Time fields - simplified pattern matching event-dialog schema
	hour: z.string().optional(),
	minute: z.string().optional(),
	period: z.enum(["am", "pm"]).optional(),
})

export const bookingDialogSchema = bookingDialogBaseSchema
	.refine(data => {
		// Ensure time is provided when date is set
		if (data.selectedDate) {
			return data.hour !== undefined && data.minute !== undefined && data.period !== undefined
		}
		return true
	}, "Time is required when a date is selected")
	.refine(
		data => {
			// For NOTARIZATION, workflowType (session mode) is required
			if (data.bookingMode === "NOTARIZATION") {
				return data.workflowType !== undefined
			}
			return true
		},
		{
			path: ["workflowType"],
			message: "Session mode is required for notarization",
		}
	)

export interface BookingDialogSchema {
	title: string
	description?: string | ""
	bookingMode: "CONSULTATION" | "NOTARIZATION"
	workflowType?: "REN" | "IEN"
	selectedDate: Date
	hour?: string
	minute?: string
	period?: "am" | "pm"
}
