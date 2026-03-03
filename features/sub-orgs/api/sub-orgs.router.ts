import { TRPCError } from "@trpc/server"
import { desc, eq } from "drizzle-orm"

import { doconchainSubOrganizations } from "@/services/drizzle/schema/doconchain-sub-organizations"
import { env } from "@/env"
import { createDoconchainSubOrganization } from "@/services/doconchain/organization/create-sub-organization"
import { autoJoinMemberInDoconchainOrganization } from "@/services/doconchain/organization/auto-join-member"
import {
	findOrganizationMemberIdByEmail,
} from "@/services/doconchain/organization/get-parent-org-members"
import { getDoconchainSubOrgMembers } from "@/services/doconchain/organization/get-sub-org-members"
import { moveDoconchainMemberToSubOrg } from "@/services/doconchain/organization/move-member-to-sub-org"
import { transferDoconchainCreditsToSubOrg } from "@/services/doconchain/organization/transfer-credits"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	addMemberToSubOrgSchema,
	createSubOrgSchema,
	listSubOrgMembersSchema,
	transferCreditsToSubOrgSchema,
} from "./sub-orgs.schema"

const ADMIN_OR_ENA = ["ADMIN", "ENA"] as const

// Local typed wrappers to avoid `no-unsafe-*` lints if TS types are not picked up.
const doconchain = {
	createSubOrg: createDoconchainSubOrganization as (input: {
		name: string
		address: string
		subOrganizationTypeName?: string
	}) => Promise<{ id: string; name: string; subOrgNumericId?: number }>,
	autoJoin: autoJoinMemberInDoconchainOrganization as (input: {
		email: string
		name?: string
		role?: "Member" | "Admin"
		organizationIdOverride?: string
	}) => Promise<{ joined: boolean; alreadyMember: boolean }>,
	findMemberIdByEmail: findOrganizationMemberIdByEmail as (input: {
		organizationId: number
		email: string
		maxPages?: number
		perPage?: number
	}) => Promise<number | null>,
	moveMember: moveDoconchainMemberToSubOrg as (input: {
		memberId: number
		targetOrganizationId: number
		role?: string
	}) => Promise<unknown>,
	getSubOrgMembers: getDoconchainSubOrgMembers as (input: {
		subOrganizationUuid: string
	}) => Promise<
		Array<{
			email?: string
			name?: string
			first_name?: string
			last_name?: string
			role?: string
			access_level?: string
			status?: string
			added_date?: string
		}>
	>,
	transferCredits: transferDoconchainCreditsToSubOrg as (input: {
		subOrgUuid: string
		credits: number
	}) => Promise<{ success: boolean; transferredCredits: number; remainingCredits?: number }>,
}

function requireManagementRole(ctx: { session: { user: { role?: string } } }) {
	if (!ctx.session?.user?.role || !ADMIN_OR_ENA.includes(ctx.session.user.role as (typeof ADMIN_OR_ENA)[number])) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only admins or ENA can manage sub-organizations.",
		})
	}
}

export const subOrgsRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		requireManagementRole(ctx)
		try {
			const rows = await ctx.db
				.select()
				.from(doconchainSubOrganizations)
				.orderBy(desc(doconchainSubOrganizations.createdAt))
			return rows
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			// Most common local-dev failure: migration/table hasn't been applied yet.
			if (
				message.toLowerCase().includes("doconchain_sub_organization") &&
				message.toLowerCase().includes("does not exist")
			) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"Sub-Orgs table is missing in the database. Run `pnpm db:push` (or `pnpm db:migrate`) then refresh.",
				})
			}
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to load sub-organizations.",
				cause: err,
			})
		}
	}),

	members: protectedProcedure.input(listSubOrgMembersSchema).query(async ({ ctx, input }) => {
		requireManagementRole(ctx)

		const subOrgId = (input as { subOrgId: string }).subOrgId
		const subOrg = await ctx.db.query.doconchainSubOrganizations.findFirst({
			where: eq(doconchainSubOrganizations.id, subOrgId),
		})

		if (!subOrg) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Sub-organization not found.",
			})
		}

		const members = await doconchain.getSubOrgMembers({ subOrganizationUuid: subOrg.uuid })
		const excludeEmail = env.DOCONCHAIN_EMAIL.trim().toLowerCase()

		const cleaned = members
			.map(m => {
				const email = (m.email ?? "").trim()
				if (!email) return null
				if (excludeEmail && email.toLowerCase() === excludeEmail) return null

				const first = (m.first_name ?? "").trim()
				const last = (m.last_name ?? "").trim()
				const fullName = (m.name ?? `${first} ${last}`.trim()).trim()

				return {
					key: email,
					email,
					name: fullName || email,
					role: ((m.access_level ?? m.role) ?? "").trim() || "Member",
					status: (m.status ?? "").trim() || "",
				}
			})
			.filter((m): m is NonNullable<typeof m> => m !== null)
			.sort((a, b) => a.email.localeCompare(b.email))

		return cleaned
	}),

	create: protectedProcedure.input(createSubOrgSchema).mutation(async ({ ctx, input }) => {
		requireManagementRole(ctx)

		const created = await doconchain.createSubOrg({
			name: input.name.trim(),
			address: input.address.trim(),
			subOrganizationTypeName: input.subOrganizationTypeName || "Department",
		})
		const numericId = created.subOrgNumericId ?? (Number.parseInt(String(created.id), 10) || 0)
		if (!numericId) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "DocOnChain did not return a numeric sub-org id.",
			})
		}

		const [row] = await ctx.db
			.insert(doconchainSubOrganizations)
			.values({
				uuid: created.id,
				numericId,
				name: created.name,
				address: input.address.trim(),
				subOrganizationTypeName: input.subOrganizationTypeName || "Department",
			})
			.returning()

		if (!row) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Failed to save sub-organization.",
			})
		}

		return {
			id: row.id,
			uuid: row.uuid,
			numericId: row.numericId,
			name: row.name,
			address: row.address,
			createdAt: row.createdAt.toISOString(),
		}
	}),

	addMember: protectedProcedure.input(addMemberToSubOrgSchema).mutation(async ({ ctx, input }) => {
		requireManagementRole(ctx)

		const subOrg = await ctx.db.query.doconchainSubOrganizations.findFirst({
			where: eq(doconchainSubOrganizations.id, input.subOrgId),
		})

		if (!subOrg) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Sub-organization not found.",
			})
		}

		// Parent org: from env for now; can later come from subOrg.parentOrgId or input
		const parentOrgId = env.DOCONCHAIN_ORGANIZATION_ID
		let clientId: number | null = await doconchain.findMemberIdByEmail({
			organizationId: parentOrgId,
			email: input.email,
		})

		if (clientId === null) {
			try {
				await doconchain.autoJoin({
					email: input.email,
					role: "Member",
					organizationIdOverride: String(parentOrgId),
				})
			} catch (err: unknown) {
				// If they already exist somewhere, auto-join can fail; we still proceed with lookup+move
				const msg = err instanceof Error ? err.message : String(err)
				if (!msg.toLowerCase().includes("already exist")) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: msg,
						cause: err instanceof Error ? err : undefined,
					})
				}
			}

			clientId = await doconchain.findMemberIdByEmail({
				organizationId: parentOrgId,
				email: input.email,
			})
		}

		if (clientId === null) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found in parent organization. Add them to the parent org first.",
			})
		}

		await doconchain.moveMember({
			memberId: clientId,
			targetOrganizationId: subOrg.numericId,
			role: "Member",
		})

		return {
			success: true,
			subOrgId: subOrg.id,
			subOrgName: subOrg.name,
			email: input.email,
		}
	}),

	transferCredits: protectedProcedure
		.input(transferCreditsToSubOrgSchema)
		.mutation(async ({ ctx, input }) => {
			requireManagementRole(ctx)

			const { subOrgId: inputSubOrgId, credits: inputCredits } = input as {
				subOrgId: string
				credits: number
			}

			const subOrg = await ctx.db.query.doconchainSubOrganizations.findFirst({
				where: eq(doconchainSubOrganizations.id, inputSubOrgId),
			})

			if (!subOrg) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sub-organization not found.",
				})
			}

			const result = await doconchain.transferCredits({
				subOrgUuid: subOrg.uuid,
				credits: inputCredits,
			})

			return {
				success: result.success,
				transferredCredits: result.transferredCredits,
				remainingCredits: result.remainingCredits,
				subOrgId: subOrg.id,
				subOrgName: subOrg.name,
			}
		}),
})
