import { TRPCError } from "@trpc/server"
import { compare, hash } from "bcryptjs"
import { eq } from "drizzle-orm"

import { users } from "@/services/drizzle/schema/auth"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { changePasswordSchema } from "@/features/settings/api/settings.schema"

export const settingsRouter = createTRPCRouter({
	changePassword: protectedProcedure
		.input(changePasswordSchema)
		.mutation(async ({ ctx, input }) => {
			const { db, session } = ctx
			const { currentPassword, newPassword } = input

			const user = await db.query.users.findFirst({
				where: eq(users.id, session.user.id),
			})

			if (!user) {
				throw new TRPCError({ code: "NOT_FOUND", message: "User not found" })
			}

			if (!user.password) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "User does not have a password." })
			}

			const isPasswordValid = await compare(currentPassword, user.password)

			if (!isPasswordValid) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect current password." })
			}

			const hashedNewPassword = await hash(newPassword, 10)

			await db
				.update(users)
				.set({ password: hashedNewPassword })
				.where(eq(users.id, session.user.id))

			return { message: "Password updated successfully." }
		}),
})
