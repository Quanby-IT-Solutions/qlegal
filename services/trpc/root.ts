import { createCallerFactory, createTRPCRouter } from "@/services/trpc/init"

import { approvalRouter } from "@/features/approval/api/approval.router"
import { auditEventRouter } from "@/features/audit-event/api/audit.router"
import { authRouter } from "@/features/auth/api/auth.router"
import { userRouter } from "@/features/client/api/user.router"
import { dashboardRouter } from "@/features/dashboard/api/dashboard.router"
import { signatureRegistrationRouter } from "@/features/default-signature-registration/api/signature-registration.router"
import { document2Router } from "@/features/document2/api/document2.router"
import { documentsRouter } from "@/features/documents/api/documents.router"
import { envelope2Router } from "@/features/envelope2/api/envelope2.router"
import { envelopeLiteRouter } from "@/features/envelopes-lite/api/envelope-lite.router"
import { envelopeRouter } from "@/features/envelopes/api/envelope.router"
import { homeRouter } from "@/features/home/api/home.router"
import { mistralOcrRouter } from "@/features/id-info-ocr/api/mistral-ocr.router"
import { ocrRouter } from "@/features/id-info-ocr/api/ocr.router"
import { legalRegistrationRouter } from "@/features/legal-registration/api/legal-registration.router"
import { meetingsRouter } from "@/features/messages/api/meetings.router"
import { messagesRouter } from "@/features/messages/api/messages.router"
import { mySignedRouter } from "@/features/my-signed/api/my-signed.router"
import { notaryBookRouter } from "@/features/notary-book/api/notary.router"
import { notificationRouter } from "@/features/notification/api/notification.router"
import { profileRouter } from "@/features/profile/api/profile.router"
import { signatureLiteRouter } from "@/features/signature-lite/api/new-signature.router"
import { toSignRouter } from "@/features/to-sign/api/to-sign.router"
import { twoFactorRouter } from "@/features/two-factor-auth/api/two-factor.router"
import { userManagementRouter } from "@/features/user-management/api/user-management.router"
import { usermanagement2Router } from "@/features/user-management2/api/usermanagement2.router"

import { testRouter } from "@/app/test/_root/test.router"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
// Create the root router with proper typing
export const appRouter = createTRPCRouter({
	document2: document2Router,
	envelope2: envelope2Router,
	approval: approvalRouter,
	auditEvent: auditEventRouter,
	auth: authRouter,
	dashboard: dashboardRouter,
	documents: documentsRouter,
	envelope: envelopeRouter,
	envelopeLite: envelopeLiteRouter,
	legalRegistration: legalRegistrationRouter,
	meetings: meetingsRouter,
	messages: messagesRouter,
	mySigned: mySignedRouter,
	mistralOcr: mistralOcrRouter,
	notaryBook: notaryBookRouter,
	notifications: notificationRouter,
	ocr: ocrRouter,
	profile: profileRouter,
	signatureLite: signatureLiteRouter,
	home: homeRouter,
	signatureRegistration: signatureRegistrationRouter,
	test: testRouter,
	toSign: toSignRouter,
	twoFactor: twoFactorRouter,
	user: userRouter,
	userManagement: userManagementRouter,
	userManagement2: usermanagement2Router
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)
