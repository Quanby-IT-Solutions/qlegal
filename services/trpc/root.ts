import { createCallerFactory, createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import { authRouter } from "@/features/auth/api/auth.router"
import { consultationsRouter } from "@/features/consultations/api/consultations.router"
import { enpProfileRouter } from "@/features/consultations/api/enp-profile.router"
import { dashboardRouter } from "@/features/dashboard/api/dashboard.router"
import { envelopeLiteRouter } from "@/features/envelopes-lite/api/envelope-lite.router"
import { appointmentsRouter } from "@/features/lawyers/api/appointments.router"
import { legalRegistrationRouter } from "@/features/legal-registration/api/legal-registration.router"
import { locationVerificationRouter } from "@/features/meetings/api/location-verification.router"
import { meetingsRouter } from "@/features/meetings/api/meetings.router"
import { signatureRequestsRouter } from "@/features/meetings/api/signature-requests.router"
import { messageFilesRouter } from "@/features/messages/api/message-files.router"
import { messagesRouter } from "@/features/messages/api/messages.router"
import { notarialBookRouter } from "@/features/notarial-book/api/notarial-book.router"
import { profileRouter } from "@/features/profile/api/profile.router"
import { quickMatchRouter } from "@/features/quick-match/api/quick-match.router"
import { requestsRouter } from "@/features/requests/api/requests.router"
// Import schedule router
import { scheduleRouter } from "@/features/schedule/api/schedule.router"
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
	thealthCheck: publicProcedure.query(() => {
		return { status: "ok" }
	}),
	auth: authRouter,
	consultations: consultationsRouter,
	enpProfile: enpProfileRouter,
	dashboard: dashboardRouter,
	envelopeLite: envelopeLiteRouter,
	appointments: appointmentsRouter,
	legalRegistration: legalRegistrationRouter,
	locationVerification: locationVerificationRouter,
	meetings: meetingsRouter,
	signatureRequests: signatureRequestsRouter,
	messageFiles: messageFilesRouter,
	messages: messagesRouter,
	notarialBook: notarialBookRouter,
	profile: profileRouter,
	quickMatch: quickMatchRouter,
	requests: requestsRouter,
	settings: settingsRouter,
	signatureLite: signatureLiteRouter,
	witnesses: witnessesRouter,
	userManagement: userManagementRouter,
	// Add schedule router
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
