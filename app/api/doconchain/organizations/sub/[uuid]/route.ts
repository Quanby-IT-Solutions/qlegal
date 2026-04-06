import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { updateDoconchainSubOrganization } from "@/services/doconchain/organization/update-sub-organization"
import { db } from "@/services/drizzle/db"
import { doconchainSubOrganizations } from "@/services/drizzle/schema/doconchain-sub-organizations"
import { auth } from "@/services/next-auth"

import { env } from "@/env"

export const runtime = "nodejs"

function getString(form: FormData, key: string): string {
	const v = form.get(key)
	return typeof v === "string" ? v.trim() : ""
}

export async function PUT(
	request: Request,
	context: {
		params: Promise<{ uuid: string }>
	}
) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}
		if (session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		const params = await context.params
		const subOrgUuid = (params.uuid ?? "").trim()
		if (!subOrgUuid) {
			return NextResponse.json({ error: "Missing sub-org uuid in path." }, { status: 400 })
		}

		const subOrg = await db.query.doconchainSubOrganizations.findFirst({
			where: eq(doconchainSubOrganizations.uuid, subOrgUuid),
		})
		if (!subOrg) {
			return NextResponse.json({ error: "Sub-organization not found." }, { status: 404 })
		}

		const form = await request.formData()
		const photo = form.get("photo")
		const photoFile = photo instanceof File && photo.size > 0 ? photo : null
		if (!photoFile) {
			return NextResponse.json(
				{ error: "Photo file is required. Choose an image to upload." },
				{ status: 400 }
			)
		}
		if (photoFile.size > 5 * 1024 * 1024) {
			return NextResponse.json({ error: "Photo too large (max 5MB)." }, { status: 400 })
		}

		// Photo-only update: use existing sub-org details + env contact email (DocOnChain API requires all fields).
		const name = getString(form, "name") || subOrg.name
		const address = getString(form, "address") || subOrg.address
		const subOrganizationTypeName =
			getString(form, "sub_organization_type_name") ||
			(subOrg.subOrganizationTypeName ?? "Department")
		const email =
			getString(form, "email") ||
			(env.DOCONCHAIN_EMAIL ?? "").trim() ||
			`suborg-${subOrgUuid.slice(0, 8)}@placeholder.local`

		const updated = await updateDoconchainSubOrganization({
			uuid: subOrgUuid,
			name,
			email,
			address,
			subOrganizationTypeName,
			photo: photoFile,
			photoFilename: photoFile.name,
		})

		await db
			.update(doconchainSubOrganizations)
			.set({
				name: updated.name,
				address: updated.address,
				subOrganizationTypeName: updated.subOrganizationTypeName ?? subOrg.subOrganizationTypeName,
				...(updated.photoUrl && { photoUrl: updated.photoUrl }),
			})
			.where(eq(doconchainSubOrganizations.id, subOrg.id))

		return NextResponse.json({
			success: updated.success,
			subOrgId: subOrg.id,
			subOrgUuid: updated.uuid,
			name: updated.name,
			email: updated.email,
			address: updated.address,
			photoUrl: updated.photoUrl,
			subOrganizationTypeName: updated.subOrganizationTypeName,
		})
	} catch (error) {
		console.error("DocOnChain update sub-org route error:", error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 }
		)
	}
}
