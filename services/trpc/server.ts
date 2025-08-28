import "server-only"

import { headers } from "next/headers"
import { cache } from "react"
import { createHydrationHelpers } from "@trpc/react-query/rsc"

import { createTRPCContext } from "@/services/trpc/init"
import { makeQueryClient } from "@/services/trpc/query-client"
import { createCaller, type AppRouter } from "@/services/trpc/root"

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
	const heads = new Headers(await headers())
	heads.set("x-trpc-source", "rsc")

	return createTRPCContext({
		headers: heads
	})
})

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient)
const caller = createCaller(createContext)

export const { trpc, HydrateClient } = createHydrationHelpers<AppRouter>(
	caller,
	getQueryClient
)
