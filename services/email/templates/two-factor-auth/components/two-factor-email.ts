import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Preview,
	Section,
	Text
} from "@react-email/components"

const baseUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: (process.env.AUTH_URL ?? "http://localhost:3000")

interface TwoFactorEmailProps {
	user: {
		name?: string | null
		email: string
	}
	code: string
	type: "login" | "enable" | "disable" | "reset"
}

const getTypeText = (type: string) => {
	switch (type) {
		case "login":
			return "Login Verification"
		case "enable":
			return "Enable Two-Factor Authentication"
		case "disable":
			return "Disable Two-Factor Authentication"
		case "reset":
			return "Password Reset"
		default:
			return "Verification"
	}
}

const getActionText = (type: string) => {
	switch (type) {
		case "login":
			return "complete your login"
		case "enable":
			return "enable two-factor authentication"
		case "disable":
			return "disable two-factor authentication"
		case "reset":
			return "reset your password"
		default:
			return "verify your identity"
	}
}

export const TwoFactorEmail = ({ user, code, type }: TwoFactorEmailProps) => (
	<Html>
		<Head />
		<Body style={main}>
			<Preview>
				Your verification code is {code} - Use this code to{" "}
				{getActionText(type)}
			</Preview>
			<Container style={container}>
				{/* Header with logo */}
				<Section style={header}>
					<Img
						src="https://aygaepypiusloubktinn.supabase.co/storage/v1/object/public/documents//Quanby%20LOGO.png"
						width="120"
						height="120"
						alt="Quanby Sign"
						style={logo}
					/>
				</Section>

				{/* Main content */}
				<Section style={box}>
					<Text style={heading}>{getTypeText(type)}</Text>

					<Text style={paragraph}>
						Hello <strong>{user.name ?? user.email}</strong>,
					</Text>

					<Text style={paragraph}>
						We received a request to {getActionText(type)} for your Quanby Sign
						account.
						{type === "disable"
							? " This action has been completed successfully."
							: type === "reset"
								? " To proceed, please use the verification code below to create a new password:"
								: " To proceed, please use the verification code below:"}
					</Text>

					{/* Verification Code Box - Only show for login/enable */}
					{type !== "disable" && (
						<Section style={codeContainer}>
							<Text style={codeLabel}>Your Verification Code</Text>
							<div style={codeBox}>
								<Text style={codeText}>{code}</Text>
							</div>
							<Text style={codeExpiry}>
								This code will expire in 10 minutes
							</Text>
						</Section>
					)}

					{/* Disable Confirmation */}
					{type === "disable" && (
						<Section style={disabledContainer}>
							<Text style={disabledText}>
								✅ Two-factor authentication has been disabled
							</Text>
							<Text style={disabledSubtext}>
								Your account security has been reduced. We recommend re-enabling
								2FA for better protection.
							</Text>
						</Section>
					)}

					<Text style={paragraph}>
						{type === "disable"
							? "If you didn&apos;t request this change, please secure your account immediately and contact our support team."
							: type === "reset"
								? "For your security, this code is only valid for 10 minutes and can only be used once. If you didn&apos;t request this password reset, please secure your account immediately."
								: "For your security, this code is only valid for 10 minutes and can only be used once. If you didn&apos;t request this verification, please secure your account immediately."}
					</Text>

					<Hr style={hr} />

					<Text style={paragraph}>
						<strong>Security Tips:</strong>
					</Text>

					<Section style={tipsContainer}>
						<Text style={tipItem}>
							• Never share your verification codes with anyone
						</Text>
						<Text style={tipItem}>
							• Quanby Sign will never ask for your verification code via phone
							or email
						</Text>
						<Text style={tipItem}>
							• Always verify you&apos;re on the official Quanby Sign website
						</Text>
						<Text style={tipItem}>
							• If you didn&apos;t request this code, secure your account
							immediately
						</Text>
					</Section>

					<Hr style={hr} />

					<Text style={paragraph}>
						If you need help or have questions about your account security,
						please contact our support team.
					</Text>

					<Button style={button} href={`${baseUrl}/profile/security`}>
						Manage Account Security →
					</Button>

					<Text style={paragraph}>— The Quanby Sign Security Team</Text>
				</Section>

				{/* Footer */}
				<Section style={footer}>
					<Text style={footerText}>
						This is an automated security message from Quanby Sign. Please do
						not reply to this email. If you didn&apos;t request this
						verification, please contact support immediately.
					</Text>
				</Section>
			</Container>
		</Body>
	</Html>
)

export default TwoFactorEmail

const main = {
	backgroundColor: "#f1f5f9",
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
	lineHeight: "1.6",
	color: "#334155",
	padding: "40px 20px"
}

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	padding: "0",
	maxWidth: "600px",
	borderRadius: "16px",
	overflow: "hidden",
	boxShadow:
		"0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
	border: "1px solid #e2e8f0"
}

const header = {
	background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
	padding: "40px 32px",
	textAlign: "center" as const
}

const box = {
	padding: "40px 32px"
}

const logo = {
	margin: "0 auto",
	display: "block"
}

const heading = {
	fontSize: "28px",
	fontWeight: "700",
	color: "#0f172a",
	margin: "0 0 24px 0",
	textAlign: "center" as const,
	letterSpacing: "-0.025em"
}

const hr = {
	border: "none",
	borderTop: "1px solid #e2e8f0",
	margin: "32px 0"
}

const paragraph = {
	color: "#475569",
	fontSize: "16px",
	lineHeight: "1.7",
	textAlign: "left" as const,
	margin: "0 0 16px 0"
}

const codeContainer = {
	textAlign: "center" as const,
	margin: "32px 0"
}

const codeLabel = {
	color: "#64748b",
	fontSize: "14px",
	fontWeight: "600",
	textTransform: "uppercase" as const,
	letterSpacing: "0.1em",
	margin: "0 0 16px 0"
}

const codeBox = {
	backgroundColor: "#f8fafc",
	border: "2px solid #e2e8f0",
	borderRadius: "12px",
	padding: "24px",
	margin: "16px auto",
	display: "inline-block",
	boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
}

const codeText = {
	fontSize: "36px",
	fontWeight: "800",
	color: "#1e40af",
	fontFamily: "monospace",
	letterSpacing: "0.2em",
	margin: "0",
	textAlign: "center" as const
}

const codeExpiry = {
	color: "#ef4444",
	fontSize: "13px",
	fontWeight: "600",
	margin: "12px 0 0 0",
	textAlign: "center" as const
}

const tipsContainer = {
	backgroundColor: "#fefefe",
	border: "1px solid #e2e8f0",
	borderRadius: "8px",
	padding: "24px",
	margin: "24px 0"
}

const tipItem = {
	color: "#475569",
	fontSize: "15px",
	lineHeight: "1.6",
	margin: "8px 0",
	paddingLeft: "8px"
}

const button = {
	background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
	borderRadius: "12px",
	color: "#ffffff",
	fontSize: "18px",
	fontWeight: "700",
	textDecoration: "none",
	textAlign: "center" as const,
	display: "block",
	padding: "16px 32px",
	margin: "32px 0",
	boxShadow:
		"0 10px 15px -3px rgba(59, 130, 246, 0.4), 0 4px 6px -2px rgba(59, 130, 246, 0.2)"
}

const footer = {
	backgroundColor: "#f8fafc",
	padding: "24px 32px",
	textAlign: "center" as const,
	borderTop: "1px solid #e2e8f0"
}

const footerText = {
	color: "#94a3b8",
	fontSize: "13px",
	lineHeight: "1.4",
	margin: "0"
}

const disabledContainer = {
	backgroundColor: "#f0f9ff",
	border: "2px solid #0ea5e9",
	borderRadius: "12px",
	padding: "24px",
	margin: "32px 0",
	textAlign: "center" as const
}

const disabledText = {
	fontSize: "18px",
	fontWeight: "700",
	color: "#0369a1",
	margin: "0 0 12px 0",
	textAlign: "center" as const
}

const disabledSubtext = {
	fontSize: "14px",
	color: "#0369a1",
	margin: "0",
	textAlign: "center" as const
}
