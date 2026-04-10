import { TRPCError } from "@trpc/server"

import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"

import {
	contractAgentChatInputSchema,
	contractAgentGenerationInputSchema,
	contractAgentSessionAccessSchema,
} from "@/features/contract-agent/api/contract-agent.schema"
import {
	answerContractQuestion,
	generateContractDraft,
} from "@/features/contract-agent/server/contract-agent-service"
import {
	appendContractAgentMessage,
	ensureContractAgentSession,
	getContractAgentSessionForChat,
	getContractAgentSessionSnapshot,
} from "@/features/contract-agent/server/contract-agent-session"

export const contractAgentRouter = createTRPCRouter({
	getSession: publicProcedure
		.input(contractAgentSessionAccessSchema)
		.query(async ({ ctx, input }) =>
			getContractAgentSessionSnapshot(ctx.db, {
				...input,
				userId: ctx.session?.user.id ?? null,
			})
		),

	chat: publicProcedure.input(contractAgentChatInputSchema).mutation(async ({ ctx, input }) => {
		const sessionState = await getContractAgentSessionForChat(ctx.db, {
			...input,
			userId: ctx.session?.user.id ?? null,
		})

		if (!sessionState) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Contract session not found. Upload a contract first.",
			})
		}

		await appendContractAgentMessage(ctx.db, {
			sessionId: input.sessionId,
			role: "user",
			content: input.message,
		})

		const answer = await answerContractQuestion({
			contractText: input.contractText,
			analysis: sessionState.analysis,
			history: [
				...sessionState.messages,
				{ id: "pending", role: "user", content: input.message, createdAt: new Date() },
			],
			message: input.message,
		})

		await appendContractAgentMessage(ctx.db, {
			sessionId: input.sessionId,
			role: "assistant",
			content: answer,
		})

		return { answer }
	}),

	generateContract: publicProcedure
		.input(contractAgentGenerationInputSchema)
		.mutation(async ({ ctx, input }) => {
			const session = await ensureContractAgentSession(ctx.db, {
				...input,
				userId: ctx.session?.user.id ?? null,
			})

			if (!session) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "The contract session token is invalid.",
				})
			}

			const generatedContract = await generateContractDraft({
				templateType: input.templateType,
				parameters: input.parameters,
				referenceContractText: input.contractText ?? null,
			})

			await ensureContractAgentSession(ctx.db, {
				sessionId: input.sessionId,
				accessToken: input.accessToken,
				userId: ctx.session?.user.id ?? null,
				generatedContract,
				generatedContractType: input.templateType,
			})

			await appendContractAgentMessage(ctx.db, {
				sessionId: input.sessionId,
				role: "assistant",
				content: `Generated a ${input.templateType.replace(/-/g, " ")} draft. Review and tailor it before sending or signing.`,
			})

			return { generatedContract }
		}),
})
