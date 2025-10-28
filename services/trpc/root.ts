import { createCallerFactory, createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import { authRouter } from "@/features/auth/api/auth.router"
import { envelopeLiteRouter } from "@/features/envelopes-lite/api/envelope-lite.router"
import { appointmentsRouter } from "@/features/lawyers/api/appointments.router"
import { lawyersRouter } from "@/features/lawyers/api/lawyers.router"
import { meetingsRouter } from "@/features/meetings/api/meetings.router"
import { messagesRouter } from "@/features/messages/api/messages.router"
import { profileRouter } from "@/features/profile/api/profile.router"
import { settingsRouter } from "@/features/settings/api/settings.router"
import { signatureLiteRouter } from "@/features/signature-lite/api/new-signature.router"

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
	envelopeLite: envelopeLiteRouter,
	lawyers: lawyersRouter,
	meetings: meetingsRouter,
	messages: messagesRouter,
	profile: profileRouter,
	settings: settingsRouter,
	signatureLite: signatureLiteRouter,
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
