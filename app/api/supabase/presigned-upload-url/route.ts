import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod/v4"

import { getServiceRoleClient } from "@/services/supabase"

const bodySchema = z.object({
	fileName: z.string().min(1),
	bucket: z.enum(["documents"]),
	folderPath: z.string().optional(),
	upsert: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
	try {
		const json = await req.json()
		const { fileName, bucket, folderPath, upsert } = bodySchema.parse(json)

		const supabase = getServiceRoleClient()

		const normalizedFolder = folderPath ? folderPath.replace(/^\/+|\/+$/g, "") : ""
		const fullPath = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName

		const { data, error } = await supabase.storage
			.from(bucket)
			.createSignedUploadUrl(fullPath, { upsert: upsert ?? false })

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}

		return NextResponse.json({
			signedUrl: data.signedUrl,
			path: data.path,
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error"
		return NextResponse.json({ error: message }, { status: 400 })
	}
}
