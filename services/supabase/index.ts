import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/env"

let supabaseClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
	if (!supabaseClient) {
		const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseKey) {
			throw new Error("Missing Supabase environment variables")
		}

		supabaseClient = createClient(supabaseUrl, supabaseKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
			},
		})
	}

	return supabaseClient
}

// Admin client with service role key - bypasses RLS
export function getSupabaseAdminClient(): SupabaseClient {
	if (!supabaseAdminClient) {
		const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error("Missing Supabase admin environment variables")
		}

		supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		})
	}

	return supabaseAdminClient
}
