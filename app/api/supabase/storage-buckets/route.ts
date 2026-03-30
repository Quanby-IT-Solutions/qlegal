import { NextResponse, type NextRequest } from "next/server"
import { getServiceRoleClient } from "@/services/supabase"

export async function GET(_req: NextRequest) {
	try {
		const supabase = getServiceRoleClient()
		const { data, error } = await supabase.storage.listBuckets()

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		return NextResponse.json({
			buckets: (data ?? []).map(b => ({ id: b.id, name: b.name })),
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

