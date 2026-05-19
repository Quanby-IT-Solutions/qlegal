import {
	contractAnalysisSchema,
	type ContractAnalysis,
	type ContractConversationMessage,
	type ContractTemplate,
} from "@/features/contract-agent/api/contract-agent.schema"
import {
	analyzeContractFallback,
	chatAboutContractFallback,
	generateContractFallback,
} from "@/features/contract-agent/server/contract-agent-fallback"
import {
	buildContractAnalysisPrompt,
	buildContractChatPrompt,
	buildContractGenerationPrompt,
	CONTRACT_AGENT_SYSTEM_PROMPT,
} from "@/features/contract-agent/server/contract-agent-prompts"

import { env } from "@/env"

const DEFAULT_XAI_BASE_URL = "https://api.x.ai/v1"
const DEFAULT_XAI_MODEL = "grok-3-fast-beta"
const MODEL_INPUT_LIMIT = 24_000

interface ModelMessage {
	role: "system" | "user" | "assistant"
	content: string
}

interface ChatCompletionResponse {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>
		}
	}>
}

function createContractExcerpt(contractText: string) {
	const normalized = contractText.trim()
	if (normalized.length <= MODEL_INPUT_LIMIT) return normalized

	const headLength = Math.floor(MODEL_INPUT_LIMIT * 0.65)
	const tailLength = MODEL_INPUT_LIMIT - headLength
	return `${normalized.slice(0, headLength).trimEnd()}\n\n[... middle of contract omitted for brevity ...]\n\n${normalized.slice(-tailLength).trimStart()}`
}

function normalizeModelContent(
	content: string | Array<{ type?: string; text?: string }> | undefined
) {
	if (!content) return ""
	if (typeof content === "string") return content.trim()
	return content
		.map(item => item.text?.trim() ?? "")
		.filter(Boolean)
		.join("\n")
}

function extractFirstJsonObject(value: string) {
	const start = value.indexOf("{")
	const end = value.lastIndexOf("}")
	if (start === -1 || end === -1 || end <= start) {
		throw new Error("The model response did not include a JSON object")
	}
	return value.slice(start, end + 1)
}

async function callContractModel(messages: ModelMessage[], temperature = 0.2) {
	if (!env.XAI_API_KEY) return null

	const response = await fetch(`${env.XAI_BASE_URL ?? DEFAULT_XAI_BASE_URL}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${env.XAI_API_KEY}`,
		},
		body: JSON.stringify({
			model: env.XAI_MODEL ?? DEFAULT_XAI_MODEL,
			messages,
			temperature,
			max_tokens: 2_000,
		}),
		cache: "no-store",
	})

	if (!response.ok) {
		const body = await response.text()
		throw new Error(`Contract AI request failed (${response.status}): ${body}`)
	}

	const payload = (await response.json()) as ChatCompletionResponse
	return normalizeModelContent(payload.choices?.[0]?.message?.content)
}

export async function analyzeContract(input: { contractText: string; fileName: string }) {
	const excerpt = createContractExcerpt(input.contractText)

	try {
		const response = await callContractModel(
			[
				{ role: "system", content: CONTRACT_AGENT_SYSTEM_PROMPT },
				{
					role: "user",
					content: buildContractAnalysisPrompt(excerpt, input.fileName),
				},
			],
			0.1
		)

		if (response) {
			const parsed = contractAnalysisSchema.parse(JSON.parse(extractFirstJsonObject(response)))
			return parsed
		}
	} catch (error) {
		console.warn(
			"Falling back to local contract analysis:",
			error instanceof Error ? error.message : "Unknown error"
		)
	}

	return analyzeContractFallback(input)
}

export async function answerContractQuestion(input: {
	contractText: string
	analysis: ContractAnalysis | null
	history: ContractConversationMessage[]
	message: string
}) {
	const excerpt = createContractExcerpt(input.contractText)
	const trimmedHistory = input.history.slice(-8)

	try {
		const response = await callContractModel(
			[
				{ role: "system", content: CONTRACT_AGENT_SYSTEM_PROMPT },
				{
					role: "assistant",
					content: input.analysis
						? `Known analysis summary:\n${JSON.stringify(input.analysis, null, 2)}`
						: "No prior analysis summary was saved.",
				},
				...trimmedHistory.map(entry => ({
					role: entry.role,
					content: entry.content,
				})),
				{
					role: "user",
					content: buildContractChatPrompt({
						contractText: excerpt,
						analysis: input.analysis,
						history: trimmedHistory,
						message: input.message,
					}),
				},
			],
			0.25
		)

		if (response) return response
	} catch (error) {
		console.warn(
			"Falling back to local contract Q&A:",
			error instanceof Error ? error.message : "Unknown error"
		)
	}

	return chatAboutContractFallback(input)
}

export async function generateContractDraft(input: {
	templateType: ContractTemplate
	parameters: Record<string, string>
	referenceContractText?: string | null
}) {
	const referenceExcerpt = input.referenceContractText
		? createContractExcerpt(input.referenceContractText)
		: undefined

	try {
		const response = await callContractModel(
			[
				{ role: "system", content: CONTRACT_AGENT_SYSTEM_PROMPT },
				{
					role: "user",
					content: buildContractGenerationPrompt({
						templateType: input.templateType,
						parameters: input.parameters,
						referenceContractText: referenceExcerpt,
					}),
				},
			],
			0.35
		)

		if (response) return response
	} catch (error) {
		console.warn(
			"Falling back to local contract drafting:",
			error instanceof Error ? error.message : "Unknown error"
		)
	}

	return generateContractFallback(input)
}
