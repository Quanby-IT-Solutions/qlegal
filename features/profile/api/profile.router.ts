import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { logError } from "@/core/middleware/logger"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { deleteAvatar, getAvatarUrl } from "@/features/profile/api/profile.actions"

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

			// Delete previous avatar from storage (if any and different)

			// If there's a previous avatar and it's different, attempt to delete it.
			// Failures to remove the previous file should not block the update but should be logged.
			try {
				const previousPath = session.user.image
				if (previousPath && previousPath !== imagePath) {
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

	getAvatarUrl: protectedProcedure.query(async ({ ctx }) => {
		const { session } = ctx

		// Get the current user's image path from the session
		const imagePath = session.user.image

		// Generate signed URL if path exists
		const avatarUrl = await getAvatarUrl(imagePath)

		return {
			avatarUrl,
			imagePath,
		}
	}),
})
