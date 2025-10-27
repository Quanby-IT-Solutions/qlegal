import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/env"

let publicClient: SupabaseClient | null = null
let serviceRoleClient: SupabaseClient | null = null

export function getPublicClient(): SupabaseClient {
	if (!publicClient) {
		const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseKey) {
			throw new Error("Missing Supabase environment variables")
		}

		publicClient = createClient(supabaseUrl, supabaseKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
			},
		})
	}

	return publicClient
}

// Admin client with service role key - bypasses RLS
export function getServiceRoleClient(): SupabaseClient {
	if (!serviceRoleClient) {
		const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error("Missing Supabase service role key environment variables")
		}

		serviceRoleClient = createClient(supabaseUrl, supabaseServiceKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		})
	}

	return serviceRoleClient
}
