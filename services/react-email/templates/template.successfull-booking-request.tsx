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

interface ClientSubmissionTemplateProps {
	clientName?: string
	clientEmail?: string
	bookingDate?: string
	bookingTime?: string
	sessionType?: "online" | "in-person"
	reason?: string
	statusLink?: string
	siteUrl?: string
}

export const ClientSubmissionTemplate = ({
	clientName,
	clientEmail,
	bookingDate,
	bookingTime,
	sessionType,
	reason,
	statusLink,
	siteUrl,
}: ClientSubmissionTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`
	const sessionTypeLabel = sessionType === "online" ? "Online Session" : "In-Person Meeting"

	return (
		<Html>
			<Head />
			<Preview>Your booking request has been successfully submitted</Preview>
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
								Request Submitted
							</Text>
							<Text className="m-0 mt-1 text-sm text-pink-100">Booking confirmation pending</Text>
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
									✓ SUBMITTED
								</Text>
							</div>
						</Section>

						{/* Main content */}
						<Section className="px-8 py-10">
							<Text className="mb-4 text-base font-semibold text-gray-900">
								Hello{" "}
								<Link
									href={`mailto:${clientEmail}`}
									style={{ color: "#FF5E7E", textDecoration: "underline" }}
								>
									{clientName}
								</Link>
								,
							</Text>

							<Text className="mb-6 text-sm leading-relaxed text-gray-700">
								We are pleased to inform you that your booking request has been successfully
								submitted. Your appointment details are listed below.
							</Text>

							{/* Booking Details Box */}
							<Section
								className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-6"
								style={{
									backgroundColor: "#f9fafb",
									border: "1px solid #e5e7eb",
								}}
							>
								<Text className="m-0 text-xs font-semibold tracking-wide text-gray-500 uppercase">
									📅 Appointment Details
								</Text>
								<Text className="m-0 mt-3 text-sm text-gray-900">
									<strong>Date & Time:</strong> {bookingDate} at {bookingTime}
								</Text>
								<Text className="m-0 mt-2 text-sm text-gray-900">
									<strong>Session Type:</strong> {sessionTypeLabel}
								</Text>
								<Text className="m-0 mt-2 text-sm text-gray-900">
									<strong>Purpose:</strong> {reason}
								</Text>
								<Text className="m-0 mt-4 border-t border-gray-300 pt-4 text-sm text-gray-700">
									Please note that this schedule is subject to confirmation by the lawyer. Kindly
									wait for the confirmation email with further instructions.
								</Text>
							</Section>

							{/* View Status Button */}
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
									View Booking Status
								</Button>
							</Section>

							<Text className="text-center text-xs leading-relaxed text-gray-600">
								Questions? Contact our support team at{" "}
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
								Legal Document Management System
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

ClientSubmissionTemplate.PreviewProps = {
	clientName: "John Doe",
	clientEmail: "john.doe@example.com",
	bookingDate: "January 30, 2026",
	bookingTime: "2:00 PM",
	sessionType: "online",
	reason: "Notarization of three (3) documents",
	statusLink: "http://localhost:3000/bookings/track/123456",
	siteUrl: "https://qlegal.quanbyit.com",
} as ClientSubmissionTemplateProps

export default ClientSubmissionTemplate