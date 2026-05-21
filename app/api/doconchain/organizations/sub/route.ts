import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getFullName } from "@/core/lib/utils"

import { autoJoinMemberInDoconchainOrganization } from "@/services/doconchain/organization/auto-join-member"
import { createDoconchainSubOrganization } from "@/services/doconchain/organization/create-sub-organization"
import {
	findParentOrgMemberIdByEmail,
	getParentOrgMembers,
} from "@/services/doconchain/organization/get-parent-org-members"
import { moveDoconchainMemberToSubOrg } from "@/services/doconchain/organization/move-member-to-sub-org"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { auth } from "@/services/next-auth"

export const runtime = "nodejs"

function getString(form: FormData, key: string): string {
	const v = form.get(key)
	return typeof v === "string" ? v.trim() : ""
}

export async function POST(request: Request) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}
		if (session.user.role !== "ADMIN") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 })
		}

		const form = await request.formData()
		const enpId = getString(form, "enpId")
		const name = getString(form, "name")
		const address = getString(form, "address")
		const subOrganizationTypeName = getString(form, "subOrganizationTypeName") || "Department"

		const photo = form.get("photo")
		const photoFile = photo instanceof File && photo.size > 0 ? photo : null
		if (photoFile && photoFile.size > 5 * 1024 * 1024) {
			return NextResponse.json({ error: "Photo too large (max 5MB)." }, { status: 400 })
		}

		if (!enpId || !name || !address) {
			return NextResponse.json(
				{ error: "Missing required fields: enpId, name, address." },
				{ status: 400 }
			)
		}

		const targetUser = await db.query.users.findFirst({
			where: eq(users.id, enpId),
			columns: {
				id: true,
				role: true,
				email: true,
				firstName: true,
				middleName: true,
				lastName: true,
			},
		})
		if (!targetUser) {
			return NextResponse.json({ error: "User not found." }, { status: 404 })
		}
		if (targetUser.role !== "ENP") {
			return NextResponse.json({ error: "Target user is not an ENP." }, { status: 400 })
		}
		if (!targetUser.email) {
			return NextResponse.json({ error: "ENP is missing an email address." }, { status: 400 })
		}

		const profile = await db.query.enpProfiles.findFirst({
			where: eq(enpProfiles.userId, enpId),
			columns: { userId: true, doconchainSubOrgId: true },
		})
		if (!profile) {
			return NextResponse.json({ error: "ENP profile not found." }, { status: 404 })
		}
		if (profile.doconchainSubOrgId) {
			return NextResponse.json(
				{
					error: "ENP already has a DocOnChain sub-organization.",
					subOrgId: profile.doconchainSubOrgId,
				},
				{ status: 409 }
			)
		}

		const created = await createDoconchainSubOrganization({
			name,
			address,
			subOrganizationTypeName: subOrganizationTypeName,
			photo: photoFile ?? undefined,
			photoFilename: photoFile?.name,
		})

		try {
			await autoJoinMemberInDoconchainOrganization({
				email: targetUser.email,
				name: getFullName(targetUser) || undefined,
				role: "Member",
				organizationIdOverride: created.id,
			})
		} catch (autoJoinErr) {
			const msg = autoJoinErr instanceof Error ? autoJoinErr.message : String(autoJoinErr)
			// ENP already in parent org: move them to the new sub-org instead
			if (
				(msg.includes("already exist") || msg.includes("already exists")) &&
				created.subOrgNumericId
			) {
				try {
					const members = await getParentOrgMembers()
					const memberId = findParentOrgMemberIdByEmail(members, targetUser.email)
					if (memberId != null) {
						await moveDoconchainMemberToSubOrg({
							memberId,
							targetOrganizationId: created.subOrgNumericId,
							role: "Member",
						})
					}
				} catch {
					// Move failed; sub-org still created and saved below
				}
			} else if (!msg.includes("already exist") && !msg.includes("already exists")) {
				throw autoJoinErr
			}
		}

		const createdAtIso =
			created.raw.data?.sub_org_data?.created_at ?? created.raw.created_at ?? null
		await db
			.update(enpProfiles)
			.set({
				doconchainSubOrgId: created.id,
				doconchainSubOrgName: created.name,
				doconchainSubOrgAddress: address,
				doconchainSubOrgCreatedAt: createdAtIso ? new Date(createdAtIso) : new Date(),
				updatedAt: new Date(),
			})
			.where(eq(enpProfiles.userId, enpId))

		return NextResponse.json({
			created: true,
			subOrgId: created.id,
			subOrgName: created.name,
			photoUrl: created.raw.photo_url ?? null,
		})
	} catch (error) {
		console.error("DocOnChain create sub-org route error:", error)
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 }
		)
	}
}
