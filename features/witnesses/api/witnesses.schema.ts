import { z } from "zod"

export const createWitnessSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email().optional().or(z.literal("")),
	phoneNumber: z.string().optional().or(z.literal("")),
	address: z.string().optional().or(z.literal("")),
	idType: z.enum(["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "OTHER"]).optional(),
	idNumber: z.string().optional().or(z.literal("")),
	appointmentId: z.string().optional(),
	notes: z.string().optional().or(z.literal("")),
})

export const updateWitnessSchema = z.object({
	witnessId: z.string(),
	name: z.string().min(1).optional(),
	email: z.string().email().optional().or(z.literal("")),
	phoneNumber: z.string().optional().or(z.literal("")),
	address: z.string().optional().or(z.literal("")),
	idType: z.enum(["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID", "OTHER"]).optional(),
	idNumber: z.string().optional().or(z.literal("")),
	idVerified: z.boolean().optional(),
	status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
	notes: z.string().optional().or(z.literal("")),
})

export const getWitnessByIdSchema = z.object({
	witnessId: z.string(),
})

export const getWitnessesSchema = z.object({
	status: z.enum(["ALL", "PENDING", "VERIFIED", "REJECTED"]).optional().default("ALL"),
	appointmentId: z.string().optional(),
	limit: z.number().min(1).max(100).optional().default(50),
	offset: z.number().min(0).optional().default(0),
})

export const deleteWitnessSchema = z.object({
	witnessId: z.string(),
})

export const verifyWitnessSchema = z.object({
	witnessId: z.string(),
	idVerified: z.boolean(),
})
