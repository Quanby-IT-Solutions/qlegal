import type { InferSelectModel } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"

// Combined type for ENP data from user + enpProfiles tables (INNER JOIN result)
export type EnpCombined = Readonly<{
	// From users table
	id: InferSelectModel<typeof users>["id"]
	name: InferSelectModel<typeof users>["name"]
	email: InferSelectModel<typeof users>["email"]
	image: InferSelectModel<typeof users>["image"]
	phoneNumber: InferSelectModel<typeof users>["phoneNumber"]
	// From enpProfiles table
	specialization: InferSelectModel<typeof enpProfiles>["specialization"]
	bio: InferSelectModel<typeof enpProfiles>["bio"]
	experience: InferSelectModel<typeof enpProfiles>["experience"]
	languages: InferSelectModel<typeof enpProfiles>["languages"]
	responseTime: InferSelectModel<typeof enpProfiles>["responseTime"]
	rating: InferSelectModel<typeof enpProfiles>["rating"]
	reviewCount: InferSelectModel<typeof enpProfiles>["reviewCount"]
	createdAt: InferSelectModel<typeof enpProfiles>["createdAt"]
}>
