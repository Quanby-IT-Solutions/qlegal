import { defaultShouldDehydrateQuery, QueryClient } from "@tanstack/react-query"
import SuperJSON from "superjson"

export const makeQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching immediately on the client
				staleTime: 30 * 1000
				// gcTime: 60 * 1000 * 5,
				// retry: 1,
				// refetchOnWindowFocus: process.env.NODE_ENV === "production"
			},
			dehydrate: {
				serializeData: SuperJSON.serialize,
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) || query.state.status === "pending"
			},
			hydrate: {
				deserializeData: SuperJSON.deserialize
			}
		}
	})
