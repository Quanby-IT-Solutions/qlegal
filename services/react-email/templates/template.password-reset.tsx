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

interface PasswordResetTemplateProps {
	email?: string
	resetLink?: string
	siteUrl?: string
}

export const PasswordResetTemplate = ({
	email,
	resetLink,
	siteUrl,
}: PasswordResetTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`

	return (
		<Html>
			<Head />
			<Preview>Reset your password</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-gray-50 p-6 font-sans text-gray-800">
					<Container
						className="mx-auto max-w-150 overflow-hidden rounded-lg border border-gray-200 bg-white"
						style={{
							border: "1px solid #e2e8f0",
							boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
						}}
					>
						{/* Header with enhanced gradient background */}
						<Section
							className="relative overflow-hidden py-12 text-center"
							style={{
								background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
							}}
						>
							{/* Subtle overlay pattern for depth */}
							<div
								className="absolute inset-0"
								style={{
									background:
										"linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
								}}
							/>
							{/* Logo */}
							<Img
								src={logoUrl}
								width="120"
								height="120"
								alt="Quanby Sign"
								style={{
									display: "block",
									margin: "0 auto",
									borderRadius: "16px",
									maxWidth: "120px",
								}}
							/>
						</Section>

						{/* Main content */}
						<Section className="px-10 pb-10">
							<Text className="my-10 text-center text-2xl font-bold tracking-tight text-gray-900">
								Reset Your Password
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Hello <strong className="font-bold text-gray-900">{email}</strong>,
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								We received a request to reset your password for your QSign account. If this was
								you, you can set a new password by clicking the button below:
							</Text>

							{/* Reset Button - UPDATED TO PINK */}
							<Section className="my-10 text-center">
								<Button
									href={resetLink}
									className="rounded-lg px-8 py-4 text-center font-semibold tracking-wide text-white no-underline"
									style={{
										background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
										boxShadow: "0 4px 6px -1px rgba(255, 94, 126, 0.3)",
									}}
								>
									Reset Password
								</Button>
							</Section>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								This password reset link will expire in 1 hour for security reasons. If you did not
								request a password reset, please ignore this email.
							</Text>

							<Text className="text-base leading-relaxed text-gray-700">
								If you do not want to change your password, please ignore this email or contact
								support at{" "}
								<Link
									href="mailto:software@quanbyit.com"
									className="font-semibold no-underline"
									style={{ color: "#C300B0" }}
								>
									software@quanbyit.com
								</Link>
								.
							</Text>
						</Section>

						{/* Footer */}
						<Section
							className="rounded-b-lg border-t px-8 py-6 text-center"
							style={{
								background: "#f8fafc",
								borderTop: "1px solid #e2e8f0",
							}}
						>
							<Text className="m-0 text-xs font-medium text-gray-400">
								This is an automated security message. Please do not reply to this email. Contact
								support through your dashboard if you need help.
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

PasswordResetTemplate.PreviewProps = {
	email: "sample.email@quanby.com",
	resetLink: "http://localhost:3000/reset-password/123456",
	siteUrl: "https://qlegal.quanbyit.com/",
} as PasswordResetTemplateProps

export default PasswordResetTemplate
