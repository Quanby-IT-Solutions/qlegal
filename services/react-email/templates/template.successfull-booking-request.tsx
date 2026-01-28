import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components"

interface ClientSubmissionTemplateProps {
	clientName?: string
	bookingDate?: string
	bookingTime?: string
	sessionType?: "online" | "in-person"
	reason?: string
	confirmLink?: string
	siteUrl?: string
}

export const ClientSubmissionTemplate = ({
	clientName,
	bookingDate,
	bookingTime,
	sessionType,
	reason,
	confirmLink,
	siteUrl,
}: ClientSubmissionTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`
	// Use lowercase for grammatical correctness in the sentence
	const sessionTypeLabel = sessionType === "online" ? "online session" : "in-person meeting"

	return (
		<Html>
			<Head />
			<Preview>Booking request submitted successfully</Preview>
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
								Booking Request Submitted
							</Text>

							{/* Dear John Doe... */}
							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Dear <strong className="font-bold text-gray-900">{clientName}</strong>, we are
								pleased to inform you that your booking request has been successfully submitted.
							</Text>

							{/* Your appointment is scheduled for... */}
							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Your appointment is scheduled for{" "}
								<strong className="font-bold text-gray-900">
									{bookingDate} at {bookingTime}
								</strong>{" "}
								and will be conducted as an{" "}
								<strong className="font-bold text-gray-900">{sessionTypeLabel}</strong> for the
								purpose of <strong className="font-bold text-gray-900">{reason}</strong>.
							</Text>

							{/* Please note... */}
							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Please note that this schedule is subject to confirmation by the lawyer. Kindly wait
								for the lawyer’s confirmation email with further instructions.
							</Text>

							{/* Thank you... */}
							<Text className="mb-10 text-base leading-relaxed text-gray-700">
								Thank you for choosing our services.
							</Text>

							{/* View Status Button */}
							<Section className="my-10 text-center">
								<Button
									href={confirmLink}
									className="rounded-lg px-8 py-4 text-center font-semibold tracking-wide text-white no-underline"
									style={{
										background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
										boxShadow: "0 4px 6px -1px rgba(255, 94, 126, 0.3)",
									}}
								>
									View Booking Status
								</Button>
							</Section>
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
								This is an automated booking notification. Please do not reply to this email.
								Contact support through your dashboard if you need help.
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	)
}

ClientSubmissionTemplate.PreviewProps = {
	clientName: "John Doe",
	bookingDate: "January 30, 2026",
	bookingTime: "2:00 PM",
	sessionType: "online",
	reason: "notarization of three (3) documents",
	confirmLink: "http://localhost:3000/bookings/track/123456",
	siteUrl: "https://qlegal.quanbyit.com/",
} as ClientSubmissionTemplateProps

export default ClientSubmissionTemplate
