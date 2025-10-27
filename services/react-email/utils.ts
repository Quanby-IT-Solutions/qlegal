import nodemailer from "nodemailer"

import { EMAIL_CONFIG } from "@/services/react-email/config"

/**
 * Global email transporter instance
 * Created once and reused across the application
 */
export const emailTransporter = (() => {
	return nodemailer.createTransport(EMAIL_CONFIG.TRANSPORTER)
})()
