import { NextResponse, type NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"

import { env } from "@/env"
import { db } from "@/services/drizzle/db"
import { documents } from "@/services/drizzle/schema/document"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { users } from "@/services/drizzle/schema/auth"
import {
	interpretDoconchainWebhook,
	sanitizeWebhookPayloadForLog,
	timingSafeEqualString,
} from "@/services/doconchain/webhook"

function maskEmailForLog(email: string): string {
	const trimmed = email.trim()
	const at = trimmed.indexOf("@")
	if (at <= 0) return "***"
	const name = trimmed.slice(0, at)
	const domain = trimmed.slice(at + 1)
	const prefix = name.slice(0, 2)
	return `${prefix}${name.length > 2 ? "***" : "*"}@${domain}`
}

function getWebhookSecretFromRequest(request: NextRequest): string | null {
	// Support multiple common patterns.
	const header =
		request.headers.get("x-doconchain-webhook-secret") ??
		request.headers.get("x-webhook-secret") ??
		request.headers.get("x-webhook-token")
	if (header) return header.trim()

	const auth = request.headers.get("authorization")
	if (auth && auth.toLowerCase().startsWith("bearer ")) {
		return auth.slice("bearer ".length).trim()
	}

	// Last resort (sometimes providers only support query string secrets)
	const url = new URL(request.url)
	const qs = url.searchParams.get("secret") ?? url.searchParams.get("token")
	return qs ? qs.trim() : null
}

export async function POST(request: NextRequest) {
	try {
		const secret = env.DOCONCHAIN_WEBHOOK_SECRET
		const presented = getWebhookSecretFromRequest(request)

		if (secret) {
			if (!presented || !timingSafeEqualString(presented, secret)) {
				console.warn("🟣 [DocOnChain] webhook:unauthorized", {
					hasSecretConfigured: true,
					hasPresentedSecret: !!presented,
				})
				return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
			}
		} else {
			console.warn("🟣 [DocOnChain] webhook:secretNotConfigured (accepting request)")
		}

		const payload = (await request.json().catch(() => null)) as unknown
		console.log("🟣 [DocOnChain] webhook:received", sanitizeWebhookPayloadForLog(payload))

		const interpreted = interpretDoconchainWebhook(payload)
		if (!interpreted.ok) {
			console.warn("🟣 [DocOnChain] webhook:ignored", { reason: interpreted.reason })
			return NextResponse.json({ ok: true, ignored: true, reason: interpreted.reason })
		}

		if (interpreted.action !== "SIGNED" && interpreted.action !== "DECLINED") {
			console.log("🟣 [DocOnChain] webhook:ignoredUnknownAction", {
				projectUuid: interpreted.projectUuid,
				rawEvent: interpreted.rawEvent,
			})
			return NextResponse.json({ ok: true, ignored: true, reason: "Unknown action" })
		}

		if (!interpreted.signerEmail) {
			console.warn("🟣 [DocOnChain] webhook:missingSignerEmail", {
				projectUuid: interpreted.projectUuid,
				action: interpreted.action,
			})
			return NextResponse.json({ ok: true, ignored: true, reason: "Missing signer email" })
		}

		const signerEmail = interpreted.signerEmail.trim().toLowerCase()
		const doc = await db.query.documents.findFirst({
			where: eq(documents.docoChainProjectId, interpreted.projectUuid),
			columns: { id: true, meetingId: true, docoChainProjectId: true },
		})

		if (!doc?.id || !doc.meetingId) {
			console.warn("🟣 [DocOnChain] webhook:documentNotFound", {
				projectUuid: interpreted.projectUuid,
			})
			return NextResponse.json({ ok: true, ignored: true, reason: "Document not found" })
		}

		const user = await db.query.users.findFirst({
			where: eq(users.email, signerEmail),
			columns: { id: true, email: true },
		})

		if (!user?.id) {
			console.warn("🟣 [DocOnChain] webhook:userNotFound", { email: maskEmailForLog(signerEmail) })
			return NextResponse.json({ ok: true, ignored: true, reason: "Signer user not found" })
		}

		const nextStatus = interpreted.action === "SIGNED" ? "SIGNED" : "DECLINED"
		const signedAt = nextStatus === "SIGNED" ? new Date() : null

		const existing = await db.query.signatureRequests.findFirst({
			where: and(
				eq(signatureRequests.meetingId, doc.meetingId),
				eq(signatureRequests.documentId, doc.id),
				eq(signatureRequests.signerId, user.id)
			),
			columns: { id: true, status: true },
		})

		if (existing?.id) {
			await db
				.update(signatureRequests)
				.set({ status: nextStatus, signedAt, updatedAt: new Date() })
				.where(eq(signatureRequests.id, existing.id))
		} else {
			// Backfill if we didn't create the request earlier.
			await db.insert(signatureRequests).values({
				meetingId: doc.meetingId,
				documentId: doc.id,
				requesterId: user.id, // best-effort; not used for gating
				signerId: user.id,
				status: nextStatus,
				signedAt: signedAt ?? undefined,
			})
		}

		console.log("🟣 [DocOnChain] webhook:signatureRequestUpdated", {
			projectUuid: interpreted.projectUuid,
			documentId: doc.id,
			meetingId: doc.meetingId,
			email: maskEmailForLog(signerEmail),
			status: nextStatus,
		})

		return NextResponse.json({ ok: true })
	} catch (error) {
		console.error("🟣 [DocOnChain] webhook:error", error)
		// Return 200 to prevent provider retries storms; we log for investigation.
		return NextResponse.json(
			{ ok: false, error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 200 }
		)
	}
}

export async function GET() {
	return NextResponse.json({
		service: "DocOnChain Webhook",
		status: "active",
		timestamp: new Date().toISOString(),
	})
}

