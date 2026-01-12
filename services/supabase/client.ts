"use client"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { env } from "@/env"

let supabaseClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
	if (supabaseClient) {
		return supabaseClient
	}

	const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

	console.log("Initializing Supabase client with URL:", supabaseUrl)

	if (!supabaseUrl || !supabaseKey) {
		throw new Error("Missing Supabase environment variables")
	}

	// Validate URL format
	try {
		new URL(supabaseUrl)
	} catch (error) {
		console.error("Invalid Supabase URL:", supabaseUrl)
		throw new Error(`Invalid Supabase URL format: ${supabaseUrl}`)
	}

	supabaseClient = createClient(supabaseUrl, supabaseKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
		},
	})

	return supabaseClient
}
