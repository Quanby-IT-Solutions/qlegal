import { render } from "@react-email/render"

import { getUrl } from "@/core/lib/get-url"

// Adjust this import path to match where you saved the previous template
import { emailTransporter } from "@/services/react-email/utils"

import { env } from "@/env"

import ClientSubmissionTemplate from "../templates/template.successfull-booking-request"

export async function sendClientSubmission(
	email: string,
	clientName: string,
	bookingDate: string,
	bookingTime: string,
	sessionType: "online" | "in-person",
	reason: string
) {
	const confirmLink = `${getUrl()}/bookings`
	const siteUrl = env.NEXT_PUBLIC_SITE_URL

	await emailTransporter.sendMail({
		from: `Quanby Sign <${env.EMAIL_FROM}>`,
		to: email, // Sending to the client
		subject: `Booking Request Submitted Successfully`,
		html: await render(
			ClientSubmissionTemplate({
				clientName,
				bookingDate,
				bookingTime,
				sessionType,
				reason,
				confirmLink,
				siteUrl,
			})
		),
	})
}
