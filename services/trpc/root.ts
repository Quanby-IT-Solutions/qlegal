import { createCallerFactory, createTRPCRouter, publicProcedure } from "@/services/trpc/init"
import { signatureLiteRouter } from "@/features/signature-lite/api/new-signature.router"
import { envelopeLiteRouter } from "@/features/envelopes-lite/api/envelope-lite.router"
// import { mySignedRouter } from "@/features/my-signed/api/my-signed.router"
// import { userManagementRouter } from "@/features/user-management/api/user-management.router"

import { authRouter } from "@/features/auth/api/auth.router"

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
  signatureLite: signatureLiteRouter,
  envelopeLite: envelopeLiteRouter,
  // mySigned: mySignedRouter,
  // userManagement: userManagementRouter,
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
