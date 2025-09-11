import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

export const profileRouter = createTRPCRouter({
	updateAvatar: protectedProcedure
		.input(
			z.object({
				imageUrl: z.string().url("Must be a valid URL"),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { imageUrl } = input

			// Update the user's image in the database
			const [updatedUser] = await db
				.update(users)
				.set({ image: imageUrl })
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
