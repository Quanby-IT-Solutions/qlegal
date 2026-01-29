import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

import { BookingTemplate } from "@/services/react-email/templates/template.enp-booking-confirmation-request"
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

export async function sendBookingConfirmation(
	email: string,
	clientName: string,
	clientEmail: string,
	bookingDate: string,
	bookingTime: string,
	sessionType: "online" | "in-person",
	reason: string
) {
	const confirmLink = `${getUrl()}/bookings/confirm`

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email,
		subject: `New Booking Request from ${clientName}`,
		html: await render(
			BookingTemplate({
				email,
				clientName,
				clientEmail,
				bookingDate,
				bookingTime,
				sessionType,
				reason,
				confirmLink,
			})
		),
	})
}
