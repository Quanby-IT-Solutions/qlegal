import { randomInt } from "crypto"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

import { db } from "@/services/drizzle/db"
import {
	passwordResetTokens,
	twoFactorTokens,
	verificationTokens,
	type VerificationToken,
} from "@/services/drizzle/schema/auth"

export const generatePasswordResetToken = async (email: string) => {
	const token = uuidv4()
	const expires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

	const existingToken = await db.query.passwordResetTokens.findFirst({
		where: (data, { eq }) => eq(data.email, email),
	})

	if (existingToken && !(existingToken instanceof Error)) {
		await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, existingToken.id))
	}

	const [passwordResetToken] = await db
		.insert(passwordResetTokens)
		.values({
			email,
			token,
			expires,
		})
		.returning()

	if (!passwordResetToken) {
		throw new Error("Failed to create password reset token")
	}

	return passwordResetToken
}

export const generateTwoFactorToken = async (email: string) => {
	const token = randomInt(100_000, 1_000_000).toString()
	const expires = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

	const existingToken = await db.query.twoFactorTokens.findFirst({
		where: (data, { eq }) => eq(data.email, email),
	})

	if (existingToken && !(existingToken instanceof Error)) {
		await db.delete(twoFactorTokens).where(eq(twoFactorTokens.id, existingToken.id))
	}

	const [twoFactorToken] = await db
		.insert(twoFactorTokens)
		.values({
			email,
			token,
			expires,
		})
		.returning()

	if (!twoFactorToken) {
		throw new Error("Failed to create two factor token")
	}

	return twoFactorToken
}

export const generateVerificationToken = async (email: string): Promise<VerificationToken> => {
	const token = uuidv4()
	const expires = new Date(Date.now() + 3600 * 1000) // 1 hour

	const existingToken = await db.query.verificationTokens.findFirst({
		where: (data, { eq }) => eq(data.email, email),
	})

	if (existingToken && !(existingToken instanceof Error)) {
		await db.delete(verificationTokens).where(eq(verificationTokens.id, existingToken.id))
	}

	const [verificationToken] = await db
		.insert(verificationTokens)
		.values({
			email,
			token,
			expires,
		})
		.returning()

	if (!verificationToken) {
		throw new Error("Failed to create verification token")
	}

	return verificationToken
}
