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

interface VerificationTemplateProps {
	email?: string
	confirmLink?: string
	siteUrl?: string
}

export const VerificationTemplate = ({
	email,
	confirmLink,
	siteUrl,
}: VerificationTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`

	return (
		<Html>
			<Head />
			<Preview>Confirm your email address</Preview>
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
								Verify Your Email Address
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Hello <strong className="font-bold text-gray-900">{email}</strong>,
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Thank you for signing up! We want to make sure it&apos;s really you. Please{" "}
								<strong className="font-bold text-gray-900">confirm your email address</strong> by
								clicking the button below:
							</Text>

							{/* Confirm Button */}
							<Section className="my-10 text-center">
								<Button
									href={confirmLink}
									className="rounded-lg px-8 py-4 text-center font-semibold tracking-wide text-white no-underline"
									style={{
										background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
										boxShadow: "0 4px 6px -1px rgba(255, 94, 126, 0.3)",
									}}
								>
									Confirm Email Address
								</Button>
							</Section>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								This verification link will expire in 24 hours for security reasons.
							</Text>

							<Text className="text-base leading-relaxed text-gray-700">
								If you did not sign up for this account, please ignore this email or contact support
								at{" "}
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

VerificationTemplate.PreviewProps = {
	email: "sample.email@quanby.com",
	confirmLink: "http://localhost:3000/verify/123456",
	siteUrl: "http://localhost:3000",
} as VerificationTemplateProps

export default VerificationTemplate
