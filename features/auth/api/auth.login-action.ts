"use server"

import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { AuthError } from "next-auth"

import { db } from "@/services/drizzle/db"
import { twoFactorConfirmations, twoFactorTokens } from "@/services/drizzle/schema/auth"
import { signIn } from "@/services/next-auth"
import { sendTwoFactorAuthToken } from "@/services/react-email/lib/send.two-factor-auth-token"
import { sendVerificationToken } from "@/services/react-email/lib/send.verification-token"

import { loginSchema, type LoginSchema } from "@/features/auth/api/auth.schemas"
import { generateTwoFactorToken, generateVerificationToken } from "@/features/auth/lib/token"

export const login = async (values: LoginSchema, callbackUrl?: string) => {
	const validatedFields = loginSchema.safeParse(values)

	if (!validatedFields.success) {
		return { error: "Invalid Fields" }
	}
	const { code, email, password } = validatedFields.data

	const existingUser = await db.query.users.findFirst({
		where: (data, { eq }) => eq(data.email, email),
	})

	if (!existingUser || existingUser instanceof Error || !existingUser.email) {
		return { error: "User does not exist!" }
	}

	if (!existingUser.emailVerified) {
		const verificationToken = await generateVerificationToken(existingUser.email)
		await sendVerificationToken(verificationToken.email, verificationToken.token)

		return { success: "Confirmation email sent!" }
	}

	if (existingUser.isTwoFactorEnabled) {
		if (!code) {
			const isPasswordValid = await compare(password, existingUser.password)
			if (!isPasswordValid) {
				return { error: "Invalid credentials" }
			}

			const twoFactorToken = await generateTwoFactorToken(existingUser.email)
			await sendTwoFactorAuthToken(twoFactorToken.email, twoFactorToken.token)

			return { success: "2FA email sent!", twoFactor: true }
		}

		const twoFactorToken = await db.query.twoFactorTokens.findFirst({
			where: (data, { eq }) => eq(data.email, existingUser.email!),
		})

		if (!twoFactorToken || twoFactorToken instanceof Error || twoFactorToken.token !== code) {
			return { error: "Invalid 2FA code!" }
		}

		const hasExpired = new Date(twoFactorToken.expires) < new Date()
		if (hasExpired) {
			return { error: "2FA code has expired!" }
		}

		await db.delete(twoFactorTokens).where(eq(twoFactorTokens.id, twoFactorToken.id))

		const existingConfirmation = await db.query.twoFactorConfirmations.findFirst({
			where: (data, { eq }) => eq(data.userId, existingUser.id),
		})

		if (!(existingConfirmation instanceof Error) && existingConfirmation) {
			await db
				.delete(twoFactorConfirmations)
				.where(eq(twoFactorConfirmations.id, existingConfirmation.id))
		}

		await db.insert(twoFactorConfirmations).values({
			userId: existingUser.id,
		})
	}

	try {
		await signIn("credentials", {
			email,
			password,
			redirectTo: callbackUrl ?? "/",
		})
		return { success: "Success" }
	} catch (error) {
		if (error instanceof AuthError) {
			switch (error.type) {
				case "CredentialsSignin":
					return { error: "Invalid credentials" }
				case "AccessDenied":
					return { error: "Access Denied!" }
				default:
					return { error: error.message }
			}
		}
		throw error
	}
}
