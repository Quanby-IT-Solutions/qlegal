import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Singleton pattern for client-side Supabase client
let supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
	if (!supabaseClient) {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

		if (!supabaseUrl || !supabaseKey) {
			throw new Error("Missing Supabase environment variables")
		}

		supabaseClient = createClient(supabaseUrl, supabaseKey, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true
			}
		})
	}

	return supabaseClient
}

// For server-side usage where you need a fresh client
export function createSupabaseClient(): SupabaseClient {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseKey) {
		throw new Error("Missing Supabase environment variables")
	}

	return createClient(supabaseUrl, supabaseKey)
}
