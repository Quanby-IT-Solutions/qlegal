import { createCallerFactory, createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import { authRouter } from "@/features/auth/api/auth.router"
import { profileRouter } from "@/features/profile/api/profile.router"

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
	auth: authRouter,
	profile: profileRouter,
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
