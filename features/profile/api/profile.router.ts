import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { logError } from "@/core/middleware/logger"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { deleteAvatar } from "@/features/profile/api/profile.actions"

export const profileRouter = createTRPCRouter({
	updateAvatar: protectedProcedure
		.input(
			z.object({
				imagePath: z.string().min(1, "Image path is required"),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { imagePath } = input

			// Only delete if it's a Supabase storage path, not an external URL (like Google SSO)
			try {
				const previousPath = session.user.image
				if (previousPath && previousPath !== imagePath && !previousPath.startsWith("http")) {
					try {
						await deleteAvatar(previousPath)
					} catch (err) {
						// Log non-fatal deletion errors and continue.
						logError(err, "profile:updateAvatar:deletePrevious")
					}
				}
			} catch (err) {
				logError(err, "profile:updateAvatar:precheck")
			}

			// Update the user's image path in the database
			const [updatedUser] = await db
				.update(users)
				.set({ image: imagePath })
				.where(eq(users.id, session.user.id))
				.returning()

			if (!updatedUser) {
				throw new Error("Failed to update user avatar")
			}

			return {
				success: true,
				user: updatedUser,
			}
		}),
})
