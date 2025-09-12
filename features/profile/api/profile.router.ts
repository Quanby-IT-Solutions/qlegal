import { eq } from "drizzle-orm"
import { z } from "zod/v4"

import { logError } from "@/core/middleware/logger"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { deleteAvatar } from "@/features/profile/api/profile.actions"
import { personalInformationSchema } from "@/features/profile/api/profile.schema"

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

			try {
				const currentUser = await db.query.users.findFirst({
					where: eq(users.id, session.user.id),
					columns: { image: true },
				})

				const previousPath = currentUser?.image
				// Only delete if it's a Supabase storage path, not an external URL (like Google SSO)
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

	getPersonalInformation: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.session.user.id),
			columns: {
				name: true,
				email: true,
				phoneNumber: true,
			},
		})

		return {
			name: user?.name ?? "",
			email: user?.email ?? "",
			phoneNumber: user?.phoneNumber ?? "",
		}
	}),

	updatePersonalInformation: protectedProcedure
		.input(personalInformationSchema)
		.mutation(async ({ ctx, input }) => {
			const user = await ctx.db
				.update(users)
				.set({
					name: input.name,
					email: input.email,
					phoneNumber:
						input.phoneNumber && input.phoneNumber.trim() !== "" ? input.phoneNumber : null,
				})
				.where(eq(users.id, ctx.session.user.id))
				.returning()

			return { message: "Personal information updated successfully", user }
		}),
})
