import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components"

interface RecoveryEmailVerificationTemplateProps {
	recoveryEmail?: string
	confirmLink?: string
	siteUrl?: string
}

export const RecoveryEmailVerificationTemplate = ({
	recoveryEmail,
	confirmLink,
	siteUrl,
}: RecoveryEmailVerificationTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`

	return (
		<Html>
			<Head />
			<Preview>Verify your recovery email address</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-gray-100 p-4 font-sans text-gray-800">
					<Container
						className="mx-auto max-w-xl overflow-hidden rounded-lg border border-gray-200 bg-white"
						style={{
							boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
						}}
					>
						{/* Header with gradient background */}
						<Section
							className="relative overflow-hidden py-12 text-center"
							style={{
								background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
							}}
						>
							{/* Logo */}
							<Img
								src={logoUrl}
								width="100"
								height="100"
								alt="Logo"
								style={{
									display: "block",
									margin: "0 auto",
									borderRadius: "12px",
									maxWidth: "100px",
								}}
							/>
							<Text className="m-0 mt-4 text-2xl font-bold tracking-tight text-white">
								Recovery Email Verification
							</Text>
							<Text className="m-0 mt-1 text-sm text-pink-100">
								Confirm your recovery email
							</Text>
						</Section>

						{/* Badge Section */}
						<Section className="border-b border-gray-100 px-8 py-4 text-center">
							<div
								style={{
									display: "inline-block",
									borderRadius: "20px",
									border: "2px solid #FF5E7E",
									padding: "8px 16px",
									backgroundColor: "transparent",
								}}
							>
								<Text
									className="m-0 text-xs font-bold tracking-widest text-pink-600"
									style={{ letterSpacing: "1px" }}
								>
									✓ VERIFY RECOVERY EMAIL
								</Text>
							</div>
						</Section>

						{/* Main content */}
						<Section className="px-8 py-10">
							<Text className="mb-4 text-base font-semibold text-gray-900">
								Recovery email verification for{" "}
								<Link
									href={`mailto:${recoveryEmail}`}
									style={{ color: "#FF5E7E", textDecoration: "underline" }}
								>
									{recoveryEmail}
								</Link>
							</Text>

							<Text className="mb-6 text-sm leading-relaxed text-gray-700">
								You (or someone on your account) requested to set this email as a recovery
								email address. Please verify it by clicking the button below:
							</Text>

							{/* Confirm Button */}
							<Section className="mb-8 text-center">
								<Button
									href={confirmLink}
									className="rounded-lg px-8 py-4 text-center font-bold text-white no-underline"
									style={{
										background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
										boxShadow: "0 4px 12px rgba(255, 94, 126, 0.3)",
										display: "inline-block",
									}}
								>
									✓ Verify Recovery Email
								</Button>
							</Section>

							<Text className="mb-6 text-sm leading-relaxed text-gray-700">
								This verification link will expire in <strong>1 hour</strong> for security
								reasons.
							</Text>

							<Text className="text-sm leading-relaxed text-gray-700">
								If you did not request this, please ignore this email or contact support
								at{" "}
								<Link
									href="mailto:software@quanbyit.com"
									className="font-semibold text-pink-600 no-underline"
									style={{ color: "#FF5E7E" }}
								>
									software@quanbyit.com
								</Link>
								.
							</Text>
						</Section>

						{/* Footer */}
						<Section
							className="border-t px-8 py-8 text-center"
							style={{
								background: "#f3f4f6",
								borderTop: "1px solid #e5e7eb",
							}}
						>
							<Text className="m-0 mb-4 text-sm font-semibold text-gray-900">
								Secure Account Management
							</Text>
							<Text className="m-0 text-xs text-gray-500">
								This is an automated message. Do not reply to this email.
							</Text>
							<div
								style={{
									margin: "8px 0 0 0",
									paddingTop: "8px",
									borderTop: "1px solid #d1d5db",
								}}
							>
								<Link
									href="https://example.com/privacy"
									className="mx-2 text-xs text-pink-600 no-underline"
									style={{ color: "#FF5E7E", textDecoration: "none" }}
								>
									Privacy Policy
								</Link>
								<span className="text-xs text-gray-400">|</span>
								<Link
									href="https://example.com/terms"
									className="mx-2 text-xs text-pink-600 no-underline"
									style={{ color: "#FF5E7E", textDecoration: "none" }}
								>
									Terms of Service
								</Link>
								<span className="text-xs text-gray-400">|</span>
								<Link
									href="https://example.com/support"
									className="mx-2 text-xs text-pink-600 no-underline"
									style={{ color: "#FF5E7E", textDecoration: "none" }}
								>
									Support
								</Link>
							</div>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

RecoveryEmailVerificationTemplate.PreviewProps = {
	recoveryEmail: "recovery@gmail.com",
	confirmLink: "http://localhost:3000/auth/verify-recovery-email?token=123456",
	siteUrl: "https://qlegal.quanbyit.com/",
} as RecoveryEmailVerificationTemplateProps

export default RecoveryEmailVerificationTemplate
