import { type NextRequest } from "next/server"
import { fetchRequestHandler } from "@trpc/server/adapters/fetch"

import { createTRPCContext } from "@/services/trpc/init"
import { appRouter } from "@/services/trpc/root"

import { env } from "@/env"

const handler = (req: NextRequest) =>
	fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: () => createTRPCContext({ headers: req.headers }),
		onError:
			env.NODE_ENV === "development"
				? ({ path, error }) => {
						// eslint-disable-next-line no-console
						console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`)
					}
				: undefined,
	})

export { handler as GET, handler as POST }
