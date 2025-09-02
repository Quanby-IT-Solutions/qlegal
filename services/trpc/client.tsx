"use client"

import { useState } from "react"
import { isServer, QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import {
	httpBatchStreamLink,
	httpLink,
	httpSubscriptionLink,
	isNonJsonSerializable,
	loggerLink,
	splitLink,
} from "@trpc/client"
import { createTRPCReact, type inferReactQueryProcedureOptions } from "@trpc/react-query"
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import SuperJSON from "superjson"

import { getUrl } from "@/core/lib/get-url"

import { makeQueryClient } from "@/services/trpc/query-client"
import { type AppRouter } from "@/services/trpc/root"

import { env } from "@/env"

let clientQueryClientSingleton: QueryClient | undefined = undefined
export const getQueryClient = () => {
	// Server: always make a new query client
	if (isServer) {
		return makeQueryClient()
	}
	// Browser: use singleton pattern to keep the same query client
	clientQueryClientSingleton ??= makeQueryClient()
	// Return the query client
	return clientQueryClientSingleton
}

export function TRPCProvider(
	props: Readonly<{
		children: React.ReactNode
	}>
) {
	const queryClient = getQueryClient()

	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				loggerLink({
					enabled: op =>
						env.NODE_ENV === "development" ||
						(op.direction === "down" && op.result instanceof Error),
				}),
				splitLink({
					condition: op => op.type === "subscription",
					true: httpSubscriptionLink({
						url: `${getUrl()}/api/trpc`,
						transformer: SuperJSON,
					}),
					false: splitLink({
						condition: op => isNonJsonSerializable(op.input),
						true: httpLink({
							url: `${getUrl()}/api/trpc`,
							transformer: {
								serialize: (data: unknown) => data,
								deserialize: SuperJSON.deserialize,
							},
							headers: () => {
								const headers = new Headers()
								headers.set("x-trpc-source", "nextjs-react")
								return headers
							},
						}),
						false: httpBatchStreamLink({
							transformer: SuperJSON,
							url: `${getUrl()}/api/trpc`,
							headers: () => {
								const headers = new Headers()
								headers.set("x-trpc-source", "nextjs-react")
								return headers
							},
						}),
					}),
				}),
			],
		})
	)
	return (
		<QueryClientProvider client={queryClient}>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				{props.children}
				<ReactQueryDevtools initialIsOpen={false} />
			</trpc.Provider>
		</QueryClientProvider>
	)
}

/**
 * Inference helper for React Query options.
 *
 * @example type HelloQueryOptions = ReactQueryOptions['example']['hello']
 */
export type ReactQueryOptions = inferReactQueryProcedureOptions<AppRouter>
/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>
/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>

export const trpc = createTRPCReact<AppRouter>()
