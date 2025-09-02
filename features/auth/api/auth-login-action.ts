"use server"

import { compare } from "bcrypt"

import { db } from "@/services/drizzle/db"
import { emailService } from "@/services/email/service"
import { prepareTwoFactorEmail } from "@/services/email/templates/two-factor-auth/service"

import {
	loginSchema,
	twoFactorLoginSchema,
	type LoginSchema,
	type TwoFactorLoginSchema,
} from "@/features/auth/api/auth.schemas"

export const login = async (values: LoginSchema) => {
	const validatedFields = loginSchema.safeParse(values)

	if (!validatedFields.success) return { error: "Invalid Fields" }
	const { code, email, password } = validatedFields.data

	if (!email.endsWith("@ust-legazpi.edu.ph"))
		return { error: "Please use your UST Legazpi email address." }

	const existingUser = await getUserByEmail(email)

	if (!existingUser || existingUser instanceof Error || !existingUser.email)
		return { error: "User does not exist!" }

	if (!existingUser.password) return { error: "Sign in with Google instead!" }

	if (!existingUser.emailVerified) {
		const verificationToken = await generateVerificationToken(existingUser.email)
		await sendVerificationEmail(verificationToken.email, verificationToken.token)

		return { success: "Confirmation email sent!" }
	}

	if (existingUser.isTwoFactorEnabled) {
		if (!code) {
			const isPasswordValid = await compare(password, existingUser.password)
			if (!isPasswordValid) return { error: "Invalid credentials" }

			const twoFactorToken = await generateTwoFactorToken(existingUser.email)
			await sendTwoFactorTokenEmail(twoFactorToken.email, twoFactorToken.token)

			return { success: "2FA email sent!", twoFactor: true }
		}

		const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email)
		if (!twoFactorToken || twoFactorToken instanceof Error || twoFactorToken.token !== code)
			return { error: "Invalid 2FA code!" }

		const hasExpired = new Date(twoFactorToken.expires) < new Date()
		if (hasExpired) return { error: "2FA code has expired!" }

		await db.twoFactorToken.delete({
			where: { id: twoFactorToken.id },
		})

		const existingConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id)

		if (!(existingConfirmation instanceof Error) && existingConfirmation) {
			await db.twoFactorConfirmation.delete({
				where: { id: existingConfirmation.id },
			})
		}

		await db.twoFactorConfirmation.create({
			data: { userId: existingUser.id },
		})
	}

	try {
		await signIn("credentials", {
			email,
			password,
			redirectTo: DEFAULT_REDIRECT,
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

export async function initiateLogin(values: LoginSchema) {
	const parsed = loginSchema.safeParse(values)
	if (!parsed.success) {
		throw new Error("Invalid credentials")
	}
	const { email, password } = parsed.data

	// Fetch minimal user data
	const user = await db.query.users.findFirst({
		where: (data, { eq }) => eq(data.email, email),
		columns: {
			id: true,
			email: true,
			password: true,
			// twoFactorEnabled: true,
			name: true,
		},
	})
	if (!user) {
		throw new Error("Invalid credentials")
	}

	const isValidPassword = await compare(password, user.password)
	if (!isValidPassword) {
		throw new Error("Invalid credentials")
	}

	// if (!user.twoFactorEnabled) {
	// 	// Check if user has default signature
	// 	const userWithSignature = await db.user.findUnique({
	// 		where: { id: user.id },
	// 		select: { defaultSignature: true },
	// 	})

	// 	const hasDefaultSignature = !!userWithSignature?.defaultSignature
	// 	console.log("DEBUG: User signature check:", {
	// 		userId: user.id,
	// 		defaultSignature: userWithSignature?.defaultSignature,
	// 		hasDefaultSignature,
	// 	})

	// 	// Client will proceed to call signIn directly (keeps cookies flow consistent)
	// 	return {
	// 		requiresTwoFactor: false as const,
	// 		hasDefaultSignature,
	// 		message: "Credentials validated",
	// 	}
	// }

	// 2FA path
	const code = Math.floor(100000 + Math.random() * 900000).toString()
	const expires = new Date(Date.now() + 10 * 60 * 1000)

	// try {
	// 	await db.twoFactorCode.deleteMany({
	// 		where: { userId: user.id, used: false },
	// 	})
	// 	await db.twoFactorCode.create({ data: { userId: user.id, code, expires } })

	// 	const emailData = await prepareTwoFactorEmail({
	// 		user: { name: user.name, email: user.email! },
	// 		code,
	// 		type: "login",
	// 	})
	// 	await emailService.sendEmail(emailData)

	// 	return {
	// 		requiresTwoFactor: true as const,
	// 		email: user.email,
	// 		message: "Verification code sent to your email",
	// 	}
	// } catch (e) {
	// 	console.error("initiateLogin 2FA error", e)
	// 	throw new Error("Failed to send verification code")
	// }
}

/**
 * Step 2: Verify 2FA code & return a one-time verificationToken for credentials provider.
 * Mirrors previous tRPC authLogin.verifyTwoFactorLogin procedure.
 */
// export async function verifyTwoFactorLogin(values: TwoFactorLoginSchema) {
// 	const parsed = twoFactorLoginSchema.safeParse(values)
// 	if (!parsed.success) {
// 		throw new Error("Invalid request")
// 	}
// 	const { email, code } = parsed.data

// 	// const user = await db.user.findUnique({
// 	// 	where: { email },
// 	// 	select: { id: true, email: true, twoFactorEnabled: true },
// 	// })
// 	// if (!user?.twoFactorEnabled) {
// 	// 	throw new Error("Invalid request")
// 	// }

// 	// const twoFactorCode = await db.twoFactorCode.findFirst({
// 	// 	where: { userId: user.id, code, used: false, expires: { gt: new Date() } },
// 	// })
// 	// if (!twoFactorCode) {
// 	// 	throw new Error("Invalid or expired verification code")
// 	// }

// 	// await db.twoFactorCode.update({
// 	// 	where: { id: twoFactorCode.id },
// 	// 	data: { used: true },
// 	// })

// 	// try {
// 	// 	// Check if user has default signature
// 	// 	const userWithSignature = await db.user.findUnique({
// 	// 		where: { id: user.id },
// 	// 		select: { defaultSignature: true },
// 	// 	})

// 	// 	const hasDefaultSignature = !!userWithSignature?.defaultSignature
// 	// 	console.log("DEBUG: 2FA User signature check:", {
// 	// 		userId: user.id,
// 	// 		defaultSignature: userWithSignature?.defaultSignature,
// 	// 		hasDefaultSignature,
// 	// 	})

// 	// 	const verificationToken = `2FA_VERIFIED_${user.id}_${Date.now()}`
// 	// 	await db.twoFactorCode.deleteMany({
// 	// 		where: { userId: user.id, used: false },
// 	// 	})
// 	// 	await db.twoFactorCode.create({
// 	// 		data: {
// 	// 			userId: user.id,
// 	// 			code: verificationToken,
// 	// 			expires: new Date(Date.now() + 5 * 60 * 1000),
// 	// 		},
// 	// 	})
// 	// 	return {
// 	// 		success: true as const,
// 	// 		verificationToken,
// 	// 		email: user.email,
// 	// 		hasDefaultSignature,
// 	// 		message: "Verification successful",
// 	// 	}
// 	// } catch (e) {
// 	// 	console.error("verifyTwoFactorLogin error", e)
// 	// 	throw new Error("Failed to complete login")
// 	// }
// }
