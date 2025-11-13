import { createCallerFactory, createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import { authRouter } from "@/features/auth/api/auth.router"
import { consultationsRouter } from "@/features/consultations/api/consultations.router"
import { dashboardRouter } from "@/features/dashboard/api/dashboard.router"
import { enpProfileRouter } from "@/features/consultations/api/enp-profile.router"
import { envelopeLiteRouter } from "@/features/envelopes-lite/api/envelope-lite.router"
import { appointmentsRouter } from "@/features/lawyers/api/appointments.router"
import { lawyersRouter } from "@/features/lawyers/api/lawyers.router"
import { meetingsRouter } from "@/features/meetings/api/meetings.router"
import { signatureRequestsRouter } from "@/features/meetings/api/signature-requests.router"
import { messageFilesRouter } from "@/features/messages/api/message-files.router"
import { messagesRouter } from "@/features/messages/api/messages.router"
import { profileRouter } from "@/features/profile/api/profile.router"
import { settingsRouter } from "@/features/settings/api/settings.router"
import { signatureLiteRouter } from "@/features/signature-lite/api/new-signature.router"
import { witnessesRouter } from "@/features/witnesses/api/witnesses.router"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
// Create the root router with proper typing
export const appRouter = createTRPCRouter({
	healthCheck: publicProcedure.query(() => {
		return { status: "ok" }
	}),
	appointments: appointmentsRouter,
	auth: authRouter,
	consultations: consultationsRouter,
	dashboard: dashboardRouter,
	enpProfile: enpProfileRouter,
	envelopeLite: envelopeLiteRouter,
	lawyers: lawyersRouter,
	meetings: meetingsRouter,
	signatureRequests: signatureRequestsRouter,
	messages: messagesRouter,
	messageFiles: messageFilesRouter,
	profile: profileRouter,
	settings: settingsRouter,
	signatureLite: signatureLiteRouter,
	witnesses: witnessesRouter,
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
