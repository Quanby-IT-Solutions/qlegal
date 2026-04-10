import type {
	ContractAnalysis,
	ContractConversationMessage,
	ContractTemplate,
} from "@/features/contract-agent/api/contract-agent.schema"

export const CONTRACT_AGENT_SYSTEM_PROMPT = `You are Quanby Legal's contract review and drafting copilot.
You help users understand contract risk, answer grounded questions, and generate legally structured first drafts.
Stay practical, precise, and business-friendly.
Never claim legal certainty. When context is missing, say so clearly and recommend legal review.`

const ANALYSIS_OUTPUT_GUIDE = `Return JSON only with the following keys:
{
  "contractType": string,
  "summary": string,
  "parties": string[],
  "keyDates": string[],
  "paymentTerms": string[],
  "obligations": string[],
  "riskFlags": [{ "title": string, "severity": "low" | "medium" | "high", "detail": string }],
  "missingClauses": string[],
  "complianceCheck": [{ "label": string, "status": "pass" | "warning" | "fail", "detail": string }],
  "overallRisk": "Low" | "Moderate" | "High",
  "overallScore": number,
  "recommendation": string
}`

export function buildContractAnalysisPrompt(contractText: string, fileName: string) {
	return `Analyze the uploaded contract named "${fileName}".
Focus on commercial clarity, obvious legal gaps, operational risk, and missing protections.
Be concise but useful. ${ANALYSIS_OUTPUT_GUIDE}

Contract text:
${contractText}`
}

export function buildContractChatPrompt(input: {
	contractText: string
	analysis: ContractAnalysis | null
	history: ContractConversationMessage[]
	message: string
}) {
	const historyText = input.history
		.slice(-8)
		.map(entry => `${entry.role.toUpperCase()}: ${entry.content}`)
		.join("\n")

	return `Answer the user's question using the uploaded contract as the primary source of truth.
If the contract does not say something explicitly, say that plainly.
Prefer short paragraphs or bullet points.

Known analysis summary:
${input.analysis ? JSON.stringify(input.analysis, null, 2) : "No prior analysis available."}

Conversation history:
${historyText.length > 0 ? historyText : "No previous messages."}

Contract text:
${input.contractText}

User question:
${input.message}`
}

export function buildContractGenerationPrompt(input: {
	templateType: ContractTemplate
	parameters: Record<string, string>
	referenceContractText?: string | null
}) {
	const parameterLines = Object.entries(input.parameters)
		.filter(([, value]) => value.trim().length > 0)
		.map(([key, value]) => `- ${key}: ${value}`)
		.join("\n")

	return `Draft a polished ${input.templateType} for a Philippines-focused legal workflow.
Use clear clause headings and practical legal language. Do not include markdown fences.
When details are missing, insert bracketed placeholders instead of inventing facts.

Known drafting inputs:
${parameterLines.length > 0 ? parameterLines : "- No structured inputs were supplied."}

Reference contract context (optional):
${input.referenceContractText?.trim().length ? input.referenceContractText.trim() : "No reference contract provided."}`
}
