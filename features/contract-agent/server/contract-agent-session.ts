import { asc, eq } from "drizzle-orm"

import type { db as drizzleDb } from "@/services/drizzle/db"
import {
	contractAgentMessages,
	contractAgentSessions,
} from "@/services/drizzle/schema/contract-agent"

import {
	contractAgentSessionSnapshotSchema,
	contractAnalysisSchema,
	contractMessageRoleSchema,
	type ContractAgentSessionSnapshot,
	type ContractAnalysis,
	type ContractConversationMessage,
} from "@/features/contract-agent/api/contract-agent.schema"

interface ContractAgentSessionAccess {
	sessionId: string
	accessToken: string
	userId?: string | null
}

interface EnsureContractAgentSessionInput extends ContractAgentSessionAccess {
	sourceFileName?: string | null
	sourceMimeType?: string | null
	contractTitle?: string | null
	analysis?: ContractAnalysis | null
	generatedContract?: string | null
	generatedContractType?: string | null
}

interface ContractAgentMessageInput {
	sessionId: string
	role: ContractConversationMessage["role"]
	content: string
}

type Database = typeof drizzleDb

type SessionRecord = typeof contractAgentSessions.$inferSelect

function parseAnalysis(analysis: SessionRecord["analysis"]): ContractAnalysis | null {
	const result = contractAnalysisSchema.safeParse(analysis)
	return result.success ? result.data : null
}

function parseMessageRole(role: string): ContractConversationMessage["role"] {
	const result = contractMessageRoleSchema.safeParse(role)
	return result.success ? result.data : "assistant"
}

async function fetchSessionRecord(database: Database, sessionId: string) {
	const [session] = await database
		.select()
		.from(contractAgentSessions)
		.where(eq(contractAgentSessions.id, sessionId))
		.limit(1)

	return session ?? null
}

async function syncSessionOwner(
	database: Database,
	session: SessionRecord,
	userId?: string | null
) {
	if (!userId || session.userId) return session

	await database
		.update(contractAgentSessions)
		.set({ userId, updatedAt: new Date(), lastInteractionAt: new Date() })
		.where(eq(contractAgentSessions.id, session.id))

	return {
		...session,
		userId,
		updatedAt: new Date(),
		lastInteractionAt: new Date(),
	}
}

export async function getValidatedContractAgentSession(
	database: Database,
	input: ContractAgentSessionAccess
) {
	const session = await fetchSessionRecord(database, input.sessionId)
	if (session?.accessToken !== input.accessToken) {
		return null
	}
	return syncSessionOwner(database, session, input.userId)
}

export async function ensureContractAgentSession(
	database: Database,
	input: EnsureContractAgentSessionInput
) {
	const existing = await fetchSessionRecord(database, input.sessionId)
	const now = new Date()

	if (!existing) {
		await database.insert(contractAgentSessions).values({
			id: input.sessionId,
			accessToken: input.accessToken,
			userId: input.userId ?? null,
			sourceFileName: input.sourceFileName ?? null,
			sourceMimeType: input.sourceMimeType ?? null,
			contractTitle: input.contractTitle ?? null,
			analysis: input.analysis ?? null,
			generatedContract: input.generatedContract ?? null,
			generatedContractType: input.generatedContractType ?? null,
			updatedAt: now,
			lastInteractionAt: now,
		})

		return fetchSessionRecord(database, input.sessionId)
	}

	if (existing.accessToken !== input.accessToken) {
		return null
	}

	const updateValues: Partial<typeof contractAgentSessions.$inferInsert> = {
		updatedAt: now,
		lastInteractionAt: now,
	}

	if (!existing.userId && input.userId) {
		updateValues.userId = input.userId
	}
	if (input.sourceFileName !== undefined) {
		updateValues.sourceFileName = input.sourceFileName
	}
	if (input.sourceMimeType !== undefined) {
		updateValues.sourceMimeType = input.sourceMimeType
	}
	if (input.contractTitle !== undefined) {
		updateValues.contractTitle = input.contractTitle
	}
	if (input.analysis !== undefined) {
		updateValues.analysis = input.analysis
	}
	if (input.generatedContract !== undefined) {
		updateValues.generatedContract = input.generatedContract
	}
	if (input.generatedContractType !== undefined) {
		updateValues.generatedContractType = input.generatedContractType
	}

	await database
		.update(contractAgentSessions)
		.set(updateValues)
		.where(eq(contractAgentSessions.id, existing.id))

	return fetchSessionRecord(database, input.sessionId)
}

export async function listContractAgentMessages(database: Database, sessionId: string) {
	const rows = await database
		.select()
		.from(contractAgentMessages)
		.where(eq(contractAgentMessages.sessionId, sessionId))
		.orderBy(asc(contractAgentMessages.createdAt))

	return rows.map(
		row =>
			({
				id: row.id,
				role: parseMessageRole(row.role),
				content: row.content,
				createdAt: row.createdAt,
			}) satisfies ContractConversationMessage
	)
}

export async function clearContractAgentMessages(database: Database, sessionId: string) {
	await database.delete(contractAgentMessages).where(eq(contractAgentMessages.sessionId, sessionId))
}

export async function appendContractAgentMessage(
	database: Database,
	input: ContractAgentMessageInput
) {
	const now = new Date()
	const [message] = await database
		.insert(contractAgentMessages)
		.values({
			sessionId: input.sessionId,
			role: input.role,
			content: input.content,
			createdAt: now,
		})
		.returning({
			id: contractAgentMessages.id,
			role: contractAgentMessages.role,
			content: contractAgentMessages.content,
			createdAt: contractAgentMessages.createdAt,
		})

	await database
		.update(contractAgentSessions)
		.set({ updatedAt: now, lastInteractionAt: now })
		.where(eq(contractAgentSessions.id, input.sessionId))

	return {
		id: message?.id ?? `${input.sessionId}-message`,
		role: parseMessageRole(message?.role ?? input.role),
		content: message?.content ?? input.content,
		createdAt: message?.createdAt ?? now,
	} satisfies ContractConversationMessage
}

export async function getContractAgentSessionSnapshot(
	database: Database,
	input: ContractAgentSessionAccess
): Promise<ContractAgentSessionSnapshot | null> {
	const session = await getValidatedContractAgentSession(database, input)
	if (!session) {
		return null
	}

	const messages = await listContractAgentMessages(database, session.id)
	return contractAgentSessionSnapshotSchema.parse({
		id: session.id,
		sourceFileName: session.sourceFileName,
		sourceMimeType: session.sourceMimeType,
		contractTitle: session.contractTitle,
		analysis: parseAnalysis(session.analysis),
		generatedContract: session.generatedContract,
		generatedContractType: session.generatedContractType,
		messages,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		lastInteractionAt: session.lastInteractionAt,
	})
}

export async function getContractAgentAnalysis(
	database: Database,
	input: ContractAgentSessionAccess
) {
	const session = await getValidatedContractAgentSession(database, input)
	if (!session) return null
	return parseAnalysis(session.analysis)
}

export async function getContractAgentSessionForChat(
	database: Database,
	input: ContractAgentSessionAccess
) {
	const session = await getValidatedContractAgentSession(database, input)
	if (!session) return null

	return {
		session,
		analysis: parseAnalysis(session.analysis),
		messages: await listContractAgentMessages(database, input.sessionId),
	}
}
