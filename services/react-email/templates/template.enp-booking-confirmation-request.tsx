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

interface BookingTemplateProps {
	email?: string
	clientName?: string
	clientEmail?: string
	bookingDate?: string
	bookingTime?: string
	sessionType?: "online" | "in-person"
	reason?: string
	confirmLink?: string
	siteUrl?: string
}

export const BookingTemplate = ({
	email,
	clientName,
	clientEmail,
	bookingDate,
	bookingTime,
	sessionType,
	reason,
	confirmLink,
	siteUrl,
}: BookingTemplateProps) => {
	const logoUrl = `${siteUrl}/LEGAL.png`
	const sessionTypeLabel = sessionType === "online" ? "Online Session" : "In-Person Meeting"

	return (
		<Html>
			<Head />
			<Preview>Booking request confirmation</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-gray-50 p-6 font-sans text-gray-800">
					<Container
						className="mx-auto max-w-150 overflow-hidden rounded-lg border border-gray-200 bg-white"
						style={{
							border: "1px solid #e2e8f0",
							boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
						}}
					>
						<Section
							className="relative overflow-hidden py-12 text-center"
							style={{
								background: "linear-gradient(135deg, #FF5E7E 0%, #E22C9A 50%, #C300B0 100%)",
							}}
						>
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

						<Section className="px-10 pb-10">
							<Text className="my-10 text-center text-2xl font-bold tracking-tight text-gray-900">
								Booking Request Received
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								Hello <strong className="font-bold text-gray-900">{email}</strong>,
							</Text>

							<Text className="mb-8 text-base leading-relaxed text-gray-700">
								This is to inform you that{" "}
								<strong className="font-bold text-gray-900">{clientName}</strong> has requested a
								booking schedule with you. The session is scheduled for{" "}
								<strong className="font-bold text-gray-900">
									{bookingDate} at {bookingTime}
								</strong>{" "}
								and will be conducted as an{" "}
								<strong className="font-bold text-gray-900">{sessionTypeLabel}</strong>.
							</Text>

							<Text className="mb-6 text-base leading-relaxed text-gray-700">
								The purpose of the appointment is{" "}
								<strong className="font-bold text-gray-900">{reason}.</strong> For reference, the
								client’s email address is{" "}
								<strong className="font-bold text-gray-900">{clientEmail}</strong>.
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
									Confirm Booking
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

BookingTemplate.PreviewProps = {
	email: "lawyer@example.com",
	clientName: "John Doe",
	clientEmail: "john.doe@example.com",
	bookingDate: "January 30, 2026",
	bookingTime: "2:00 PM",
	sessionType: "online",
	reason: "Notary for 3 documents",
	confirmLink: "http://localhost:3000/bookings/confirm/123456",
	siteUrl: "https://qlegal.quanbyit.com/",
} as BookingTemplateProps

export default BookingTemplate
