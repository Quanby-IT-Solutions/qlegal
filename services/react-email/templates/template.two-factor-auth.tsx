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

export const TwoFactorAuthTemplate = ({
	email,
	token,
	siteUrl = "http://localhost:3000",
}: TwoFactorAuthTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`

	return (
		<Html>
			<Head />
			<Preview>Your verification code is {token}</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-gray-50 p-6 font-sans text-gray-800">
					<Container
						className="mx-auto max-w-150 overflow-hidden rounded-lg border border-gray-200 bg-white"
						style={{
							border: "1px solid #e2e8f0",
							boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
						}}
					>
						{/* Header with enhanced gradient background - UPDATED TO PINK */}
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
								Two-Factor Authentication Required
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Hello <strong className="font-bold text-gray-900">{email}</strong>,
							</Text>

							<Text className="mb-0 text-base leading-relaxed text-gray-700">
								We&apos;ve detected a sign-in attempt to your QSign account. To protect your account
								and documents, we require additional verification.
							</Text>

							{/* Verification Code Box - UPDATED WITH PINK ACCENTS */}
							<Section className="my-10 text-center">
								<Text className="mb-4 text-base font-semibold tracking-wide text-gray-600 uppercase">
									Your Code
								</Text>
								<div
									className="mx-auto inline-block rounded-lg border px-6 py-4"
									style={{
										background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 50%, #f3f4f6 100%)",
										border: "1px solid #e2e8f0",
										boxShadow: "0 4px 6px -1px rgba(255, 94, 126, 0.3)",
									}}
								>
									<Text
										className="m-0 text-center font-mono text-3xl font-bold tracking-[0.3rem]"
										style={{
											color: "#C300B0",
										}}
									>
										{token}
									</Text>
								</div>
								<Text className="mt-4 text-center text-xs font-semibold text-red-500">
									This code will expire in 10 minutes
								</Text>
							</Section>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Please use this code to complete your authentication. This security step ensures
								only you can access your account.
							</Text>

							<Text className="text-base leading-relaxed text-gray-700">
								If you did not attempt to sign in, please ignore this email or contact support at{" "}
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

TwoFactorAuthTemplate.PreviewProps = {
	email: "john.doe@example.com",
	token: "123456",
	siteUrl: "http://localhost:3000",
} as TwoFactorAuthTemplateProps

export default TwoFactorAuthTemplate
