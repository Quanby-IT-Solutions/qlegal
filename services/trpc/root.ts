import { createCallerFactory, createTRPCRouter } from "@/services/trpc/init"

import { appointmentsRouter } from "@/features/appointments/api/appointments.router"
import { requestsRouter } from "@/features/appointments/api/requests.router"
import { scheduleRouter } from "@/features/appointments/api/schedule.router"
import { authRouter } from "@/features/auth/api/auth.router"
import { browseRouter } from "@/features/browse/api/browse.router"
import { dashboardRouter } from "@/features/dashboard/api/dashboard.router"
import { documentsRouter } from "@/features/documents/api/documents.router"
import { envelopeLiteRouter } from "@/features/envelopes-lite/api/envelope-lite.router"
import { legalRegistrationRouter } from "@/features/legal-registration/api/legal-registration.router"
import { locationVerificationRouter } from "@/features/meetings/api/location-verification.router"
import { meetingsRouter } from "@/features/meetings/api/meetings.router"
import { signatureRequestsRouter } from "@/features/meetings/api/signature-requests.router"
import { messageFilesRouter } from "@/features/messages/api/message-files.router"
import { messagesRouter } from "@/features/messages/api/messages.router"
import { notarialBookRouter } from "@/features/notarial-book/api/notarial-book.router"
import { profileRouter } from "@/features/profile/api/profile.router"
import { settingsRouter } from "@/features/settings/api/settings.router"
import { signatureLiteRouter } from "@/features/signature-lite/api/new-signature.router"
import { userManagementRouter } from "@/features/user-management/api/user-management.router"
import { witnessesRouter } from "@/features/witnesses/api/witnesses.router"

/**
 * This is the primary router for your server.
 * All feature routers are registered here.
 *
 * To add a new router:
 * 1. Create the router file in features/[feature-name]/api/[router-name].router.ts
 * 2. Export the router from that file
 * 3. Import it here and add it to the appRouter
 *
 * @example
 * import { myFeatureRouter } from "@/features/my-feature/api/my-feature.router"
 * export const appRouter = createTRPCRouter({
 *   myFeature: myFeatureRouter,
 * })
 */
export const appRouter = createTRPCRouter({
	auth: authRouter,
	browse: browseRouter,
	appointments: appointmentsRouter,
	dashboard: dashboardRouter,
	documents: documentsRouter,
	envelopeLite: envelopeLiteRouter,
	legalRegistration: legalRegistrationRouter,
	locationVerification: locationVerificationRouter,
	meetings: meetingsRouter,
	signatureRequests: signatureRequestsRouter,
	messageFiles: messageFilesRouter,
	messages: messagesRouter,
	notarialBook: notarialBookRouter,
	profile: profileRouter,
	requests: requestsRouter,
	settings: settingsRouter,
	signatureLite: signatureLiteRouter,
	witnesses: witnessesRouter,
	userManagement: userManagementRouter,
	schedule: scheduleRouter,
})

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)

export type AppRouter = typeof appRouter
