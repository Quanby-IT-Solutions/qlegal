import {
	Body,
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

interface TwoFactorAuthTemplateProps {
	email: string
	token: string
	siteUrl?: string
}

export const TwoFactorAuthTemplate = ({ email, token, siteUrl }: TwoFactorAuthTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`

	return (
		<Html>
			<Head />
			<Preview>Your verification code is {token}</Preview>
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
								Security Verification
							</Text>
							<Text className="m-0 mt-1 text-sm text-pink-100">
								Two-factor authentication required
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
									🔐 VERIFY CODE
								</Text>
							</div>
						</Section>

						{/* Main content */}
						<Section className="px-8 py-10">
							<Text className="mb-4 text-base font-semibold text-gray-900">
								Hello{" "}
								<Link
									href={`mailto:${email}`}
									style={{ color: "#FF5E7E", textDecoration: "underline" }}
								>
									{email}
								</Link>
								,
							</Text>

							<Text className="mb-8 text-sm leading-relaxed text-gray-700">
								We've detected a sign-in attempt to your account. To protect your account and
								documents, we require additional verification. Please use the code below to complete
								your authentication:
							</Text>

							{/* Verification Code Box */}
							<Section className="mb-8 text-center">
								<div
									className="mx-auto inline-block rounded-lg border px-6 py-6"
									style={{
										background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #f3f4f6 100%)",
										border: "2px solid #FF5E7E",
										boxShadow: "0 4px 12px rgba(255, 94, 126, 0.2)",
									}}
								>
									<Text
										className="m-0 text-center font-mono text-4xl font-bold tracking-[0.3rem]"
										style={{
											color: "#C300B0",
											letterSpacing: "0.3rem",
										}}
									>
										{token}
									</Text>
									<Text className="m-0 mt-4 text-center text-xs font-semibold text-red-500">
										Expires in 10 minutes
									</Text>
								</div>
							</Section>

							<Text className="text-center text-xs font-bold tracking-wide text-gray-500 uppercase">
								Enter this code in your application to proceed
							</Text>
						</Section>

						{/* Help Section */}
						<Section className="border-t border-gray-100 px-8 py-8">
							<Text className="text-center text-xs leading-relaxed text-gray-600">
								If you did not attempt to sign in, please ignore this email or contact support at{" "}
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
								Secure Account Protection
							</Text>
							<Text className="m-0 text-xs text-gray-500">
								This is an automated security message. Do not reply to this email.
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

TwoFactorAuthTemplate.PreviewProps = {
	email: "john.doe@example.com",
	token: "123456",
	siteUrl: "https://qlegal.quanbyit.com/",
} as TwoFactorAuthTemplateProps

export default TwoFactorAuthTemplate
