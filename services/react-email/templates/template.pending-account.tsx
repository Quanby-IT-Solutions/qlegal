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

interface SignupPendingTemplateProps {
	userName?: string
	userEmail?: string
	accountType?: "ENP" | "Client" | "Witness"
	statusLink?: string
	siteUrl?: string
}

export const SignupPendingTemplate = ({
	userName,
	userEmail,
	accountType = "ENP",
	statusLink,
	siteUrl,
}: SignupPendingTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`
	const accountTypeLabel =
		accountType === "ENP" ? "E-Notary Public" : accountType === "Client" ? "Client" : "Witness"

	return (
		<Html>
			<Head />
			<Preview>Thank you for signing up - Your account is under review</Preview>
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
								alt="QLegal Logo"
								style={{
									display: "block",
									margin: "0 auto",
									borderRadius: "12px",
									maxWidth: "100px",
								}}
							/>
							<Text className="m-0 mt-4 text-2xl font-bold tracking-tight text-white">
								Thank You for Signing Up
							</Text>
							<Text className="m-0 mt-1 text-sm text-pink-100">
								Your registration has been received
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
									⏳ UNDER REVIEW
								</Text>
							</div>
						</Section>

						{/* Main content */}
						<Section className="px-8 py-10">
							<Text className="mb-4 text-base font-semibold text-gray-900">
								Hello{" "}
								{userEmail ? (
									<Link
										href={`mailto:${userEmail}`}
										style={{ color: "#FF5E7E", textDecoration: "underline" }}
									>
										{userName}
									</Link>
								) : (
									userName
								)}
								,
							</Text>

							<Text className="mb-6 text-sm leading-relaxed text-gray-700">
								Thank you for registering with QLegal! We have successfully received your
								application and your account is now under review.
							</Text>

							{/* Registration Details Box */}
							<Section
								className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6"
								style={{
									backgroundColor: "#f9fafb",
									border: "1px solid #e5e7eb",
								}}
							>
								<Text className="m-0 text-xs font-semibold tracking-wide text-gray-500 uppercase">
									📋 Registration Details
								</Text>
								<Text className="m-0 mt-3 text-sm text-gray-900">
									<strong>Account Type:</strong> {accountTypeLabel}
								</Text>
								<Text className="m-0 mt-2 text-sm text-gray-900">
									<strong>Email:</strong> {userEmail}
								</Text>
								<Text className="m-0 mt-2 text-sm text-gray-900">
									<strong>Status:</strong> Pending Approval
								</Text>
								<Text className="m-0 mt-4 border-t border-gray-300 pt-4 text-sm text-gray-700">
									Your account is currently being reviewed by our team. This process typically takes
									1-2 business days. You will receive a confirmation email once your account has
									been approved.
								</Text>
							</Section>

							{/* What Happens Next Section */}
							<Section
								className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6"
								style={{
									backgroundColor: "#eff6ff",
									border: "1px solid #bfdbfe",
								}}
							>
								<Text className="m-0 text-xs font-semibold tracking-wide text-blue-700 uppercase">
									📌 What Happens Next?
								</Text>
								<Text className="m-0 mt-3 text-sm text-gray-900">
									<strong>1. Review Process</strong>
									<br />
									Our team will verify your credentials and information.
								</Text>
								<Text className="m-0 mt-3 text-sm text-gray-900">
									<strong>2. Approval Notification</strong>
									<br />
									You'll receive an email confirmation once approved.
								</Text>
								<Text className="m-0 mt-3 text-sm text-gray-900">
									<strong>3. Access Your Account</strong>
									<br />
									Log in and start using QLegal's features immediately.
								</Text>
							</Section>

							{/* Check Status Button */}
							{statusLink && (
								<Section className="mb-8 text-center">
									<Button
										href={statusLink}
										className="rounded-lg px-8 py-4 text-center font-bold text-white no-underline"
										style={{
											background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
											boxShadow: "0 4px 12px rgba(255, 94, 126, 0.3)",
											display: "inline-block",
										}}
									>
										Check Application Status
									</Button>
								</Section>
							)}

							<Text className="mb-4 text-center text-sm leading-relaxed text-gray-700">
								Please note that you will not be able to access your account until it has been
								approved. We appreciate your patience during this process.
							</Text>

							<Text className="text-center text-xs leading-relaxed text-gray-600">
								If you have any questions or concerns, please contact our support team at{" "}
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
								QLegal - Legal Services Platform
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

SignupPendingTemplate.PreviewProps = {
	userName: "Maria Santos",
	userEmail: "maria.santos@example.com",
	accountType: "ENP",
	statusLink: "https://qlegal.quanbyit.com/account/status",
	siteUrl: "https://qlegal.quanbyit.com",
} as SignupPendingTemplateProps

export default SignupPendingTemplate
