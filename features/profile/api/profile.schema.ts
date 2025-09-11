import { z } from "zod/v4"

const phoneRegex = new RegExp(/^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/)

const nameSchema = z
	.string({ error: "Name is required" })
	.trim()
	.min(1, "Name cannot be empty")
	.trim()

const emailSchema = z
	.email("Please enter a valid email address")
	.min(1, "Email is required")
	.trim()
	.toLowerCase()

const phoneNumberSchema = z
	.string()
	.trim()
	.optional()
	.or(z.literal(""))
	.refine(val => !val || phoneRegex.test(val), "Invalid phone number!")

export const personalInformationSchema = z.object({
	name: nameSchema,
	email: emailSchema,
	phoneNumber: phoneNumberSchema,
})

export type PersonalInformationSchema = z.infer<typeof personalInformationSchema>
