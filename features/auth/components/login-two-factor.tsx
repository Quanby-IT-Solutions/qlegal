"use client"

import { useState } from "react"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"

// import { trpc } from "@/services/trpc/client"
import { verifyTwoFactorLogin } from "@/features/auth/api/auth-login-action"

interface LoginTwoFactorProps {
	email: string
	password: string
	onBack: () => void
	onSuccess: (verificationToken: string, hasDefaultSignature: boolean) => void
}

export const LoginTwoFactor = ({
	email,
	password: _password,
	onBack,
	onSuccess
}: LoginTwoFactorProps) => {
	const [code, setCode] = useState("")

	const [isVerifying, setIsVerifying] = useState(false)

	const handleVerify = async () => {
		if (!code || code.length !== 6) {
			toast.error("Please enter a valid 6-digit code")
			return
		}
		setIsVerifying(true)
		try {
			const result = await verifyTwoFactorLogin({ email, code })
			if (result.success && result.verificationToken) {
				toast.success("Verification successful!")
				onSuccess(result.verificationToken, result.hasDefaultSignature)
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Verification failed"
			toast.error(message)
		} finally {
			setIsVerifying(false)
		}
	}

	const handleResend = () => {
		// You could add a resend functionality here by calling the initial login again
		toast.info("Please try logging in again to receive a new code")
		onBack()
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<div className="mb-4 flex items-center justify-center">
					<Mail className="h-16 w-16 text-primary" />
				</div>
				<CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
				<CardDescription>
					We&apos;ve sent a verification code to{" "}
					<span className="font-medium">{email}</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert>
					<Mail className="h-4 w-4" />
					<AlertDescription>
						Enter the 6-digit code from your email to complete login.
					</AlertDescription>
				</Alert>

				<div className="space-y-2">
					<Label htmlFor="verification-code">Verification Code</Label>
					<Input
						id="verification-code"
						type="text"
						placeholder="000000"
						value={code}
						onChange={(e) =>
							setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
						}
						maxLength={6}
						className="text-center text-lg tracking-widest"
						autoComplete="one-time-code"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Button
						onClick={handleVerify}
						disabled={isVerifying || code.length !== 6}
						className="w-full"
					>
						{isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Verify Code
					</Button>

					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={onBack}
							disabled={isVerifying}
							className="flex-1"
						>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Button>
						<Button
							variant="ghost"
							onClick={handleResend}
							disabled={isVerifying}
							className="flex-1"
						>
							Resend Code
						</Button>
					</div>
				</div>

				<div className="text-center text-sm text-muted-foreground">
					Didn&apos;t receive the code? Check your spam folder or try resending.
				</div>
			</CardContent>
		</Card>
	)
}
