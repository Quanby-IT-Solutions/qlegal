import { z } from "zod/v4"

export const bookingDialogSchema = z
	.object({
		bookingMode: z.enum(["CONSULTATION", "NOTARIZATION"]),
		workflowType: z.enum(["REN", "IEN"]).optional(),
		selectedDate: z.date(),
		selectedTime: z.object({
			hour: z.string(),
			minute: z.string(),
			period: z.enum(["am", "pm"]),
		}),
		description: z.string().optional().or(z.literal("")),
	})
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

export type BookingDialogSchema = z.infer<typeof bookingDialogSchema>
