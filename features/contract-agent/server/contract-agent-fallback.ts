import type {
	ContractAnalysis,
	ContractComplianceItem,
	ContractConversationMessage,
	ContractRiskFlag,
	ContractTemplate,
} from "@/features/contract-agent/api/contract-agent.schema"

const COMMON_STOP_WORDS = new Set([
	"about",
	"after",
	"again",
	"also",
	"because",
	"being",
	"between",
	"could",
	"does",
	"from",
	"have",
	"into",
	"just",
	"must",
	"only",
	"over",
	"should",
	"that",
	"their",
	"there",
	"these",
	"this",
	"what",
	"when",
	"where",
	"which",
	"will",
	"with",
	"would",
])

const DATE_REGEX =
	/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},\s+\d{4})\b/gi
const PARTY_REGEX =
	/(?:between|among)\s+([^\n,.]{3,120}?)\s+(?:and|,\s*)\s+([^\n,.]{3,120}?)(?:\.|,|\n)/gi
const CLAUSE_BREAK_REGEX = /\n{2,}|(?<=[.!?])\s+(?=[A-Z])/g
const SPACE_REGEX = /\s+/g

const MISSING_CLAUSE_RULES = [
	{ label: "Termination rights", test: /termination|terminate|expiration|expiry/i },
	{
		label: "Confidentiality obligations",
		test: /confidential|non-disclosure|proprietary information/i,
	},
	{ label: "Payment timing", test: /payment|fees?|compensation|invoice|billing/i },
	{ label: "Liability allocation", test: /liability|limitation of liability|damages/i },
	{ label: "Indemnity protection", test: /indemnif/i },
	{ label: "Governing law", test: /governing law|laws of|jurisdiction/i },
	{ label: "Dispute resolution", test: /arbitration|dispute resolution|mediation|venue/i },
	{ label: "Signature mechanics", test: /signed|signature|executed/i },
] as const

function normalizeWhitespace(value: string) {
	return value
		.replace(/\r/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

function splitIntoChunks(value: string) {
	return normalizeWhitespace(value)
		.split(CLAUSE_BREAK_REGEX)
		.map(chunk => chunk.trim())
		.filter(Boolean)
}

function toTitleCase(value: string) {
	return value
		.toLowerCase()
		.split(" ")
		.map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
		.join(" ")
}

function uniq<T>(items: T[]) {
	return [...new Set(items)]
}

function compactStrings(items: Array<string | null | undefined>) {
	return items.map(item => item?.trim()).filter((item): item is string => Boolean(item))
}

function summarizeText(value: string, maxLength = 300) {
	const summary = splitIntoChunks(value).slice(0, 2).join(" ")
	if (summary.length <= maxLength) return summary
	return `${summary.slice(0, maxLength - 1).trimEnd()}…`
}

function detectContractType(contractText: string) {
	const source = contractText.toLowerCase()
	if (/non-disclosure|confidentiality|nda/.test(source)) return "Non-disclosure agreement"
	if (/services|statement of work|scope of work|consulting/.test(source)) return "Service agreement"
	if (/employment|employee|employer/.test(source)) return "Employment agreement"
	if (/lease|rent|tenant|landlord/.test(source)) return "Lease agreement"
	if (/purchase|sale of goods|buyer|seller/.test(source)) return "Purchase agreement"
	return "General commercial contract"
}

function extractParties(contractText: string) {
	const matches: string[] = []
	for (const match of contractText.matchAll(PARTY_REGEX)) {
		matches.push(match[1] ?? "", match[2] ?? "")
	}

	if (matches.length > 0) {
		return uniq(compactStrings(matches).map(item => item.replace(SPACE_REGEX, " "))).slice(0, 6)
	}

	const uppercaseCandidates = contractText.match(
		/\b[A-Z][A-Za-z0-9&,.()'-]+(?:\s+[A-Z][A-Za-z0-9&,.()'-]+){0,4}\b/g
	)

	return uniq(
		compactStrings(uppercaseCandidates)
			.filter(candidate => candidate.length > 4)
			.filter(candidate => !/agreement|contract|party|clause|section/i.test(candidate))
	).slice(0, 6)
}

function extractKeyDates(contractText: string) {
	return uniq(Array.from(contractText.matchAll(DATE_REGEX), match => match[0] ?? "")).slice(0, 6)
}

function findRelevantClauses(contractText: string, pattern: RegExp, limit = 4) {
	return splitIntoChunks(contractText)
		.filter(chunk => pattern.test(chunk))
		.slice(0, limit)
}

function buildRiskFlags(contractText: string, missingClauses: string[]) {
	const riskFlags: ContractRiskFlag[] = []

	if (missingClauses.includes("Liability allocation")) {
		riskFlags.push({
			title: "No liability cap detected",
			severity: "high",
			detail:
				"The draft does not clearly allocate or cap liability, which can expose a party to open-ended damages.",
		})
	}

	if (missingClauses.includes("Termination rights")) {
		riskFlags.push({
			title: "Exit mechanics are unclear",
			severity: "medium",
			detail:
				"A missing termination clause makes it harder to end the relationship cleanly when performance or timing changes.",
		})
	}

	if (missingClauses.includes("Confidentiality obligations")) {
		riskFlags.push({
			title: "Sensitive information is not expressly protected",
			severity: "medium",
			detail:
				"If the agreement involves proprietary information, a confidentiality clause should normally be explicit.",
		})
	}

	if (/sole discretion|without notice|non-refundable|irrevocable/i.test(contractText)) {
		riskFlags.push({
			title: "Potentially one-sided drafting language detected",
			severity: "medium",
			detail:
				"The contract appears to include unilateral discretion or strict remedies that deserve closer review.",
		})
	}

	if (riskFlags.length === 0) {
		riskFlags.push({
			title: "No obvious red-flag language found in fallback review",
			severity: "low",
			detail:
				"The offline review did not find a severe issue, but a lawyer should still confirm commercial fit and enforceability.",
		})
	}

	return riskFlags
}

function buildComplianceChecks(contractText: string, parties: string[], keyDates: string[]) {
	const checks: ContractComplianceItem[] = [
		{
			label: "Parties are identifiable",
			status: parties.length > 0 ? "pass" : "warning",
			detail:
				parties.length > 0
					? `Detected ${parties.length} likely party reference${parties.length > 1 ? "s" : ""}.`
					: "The draft should clearly identify every contracting party by legal name.",
		},
		{
			label: "Effective or key dates are stated",
			status: keyDates.length > 0 ? "pass" : "warning",
			detail:
				keyDates.length > 0
					? `Detected date references such as ${keyDates.slice(0, 2).join(", ")}.`
					: "Consider making the effective date, term, and notice periods explicit.",
		},
		{
			label: "Dispute and governing-law language",
			status: /governing law|jurisdiction|arbitration|mediation|venue/i.test(contractText)
				? "pass"
				: "warning",
			detail: /governing law|jurisdiction|arbitration|mediation|venue/i.test(contractText)
				? "The draft appears to mention dispute or jurisdiction mechanics."
				: "Add governing-law and dispute-resolution language for operational clarity.",
		},
		{
			label: "Signature readiness",
			status: /signed|signature|executed|electronic signature/i.test(contractText)
				? "pass"
				: "warning",
			detail: /signed|signature|executed|electronic signature/i.test(contractText)
				? "Execution language appears to be present."
				: "Add signature blocks or execution language before finalization.",
		},
	]

	return checks
}

function scoreOverallRisk(riskFlags: ContractRiskFlag[], missingClauses: string[]) {
	const penalty =
		riskFlags.reduce((sum, item) => {
			if (item.severity === "high") return sum + 18
			if (item.severity === "medium") return sum + 10
			return sum + 4
		}, 0) +
		missingClauses.length * 3

	const overallScore = Math.max(35, Math.min(96, 92 - penalty))
	if (overallScore >= 78) {
		return { overallRisk: "Low" as const, overallScore }
	}
	if (overallScore >= 58) {
		return { overallRisk: "Moderate" as const, overallScore }
	}
	return { overallRisk: "High" as const, overallScore }
}

function buildRecommendation(
	overallRisk: ContractAnalysis["overallRisk"],
	missingClauses: string[]
) {
	if (overallRisk === "High") {
		return `Revise the draft before signature. Prioritize ${missingClauses.slice(0, 3).join(", ") || "the missing risk controls"} and have counsel review the liability position.`
	}
	if (overallRisk === "Moderate") {
		return `The contract is workable but should be tightened before execution. Address the missing or weak clauses and confirm commercial assumptions with the counterparty.`
	}
	return "The draft looks operationally usable in fallback review, but it still deserves a final legal review before execution."
}

export function analyzeContractFallback(input: {
	contractText: string
	fileName: string
}): ContractAnalysis {
	const parties = extractParties(input.contractText)
	const keyDates = extractKeyDates(input.contractText)
	const paymentTerms = findRelevantClauses(
		input.contractText,
		/payment|fees?|compensation|invoice|billing|price/i,
		4
	)
	const obligations = findRelevantClauses(
		input.contractText,
		/shall|must|responsible|obligation|deliver/i,
		5
	)
	const missingClauses = MISSING_CLAUSE_RULES.filter(
		rule => !rule.test.test(input.contractText)
	).map(rule => rule.label)
	const riskFlags = buildRiskFlags(input.contractText, missingClauses)
	const complianceCheck = buildComplianceChecks(input.contractText, parties, keyDates)
	const { overallRisk, overallScore } = scoreOverallRisk(riskFlags, missingClauses)
	const contractType = detectContractType(input.contractText)

	return {
		contractType,
		summary:
			summarizeText(input.contractText) ||
			`Fallback review of ${input.fileName} found a ${overallRisk.toLowerCase()}-risk ${contractType.toLowerCase()}.`,
		parties,
		keyDates,
		paymentTerms,
		obligations,
		riskFlags,
		missingClauses,
		complianceCheck,
		overallRisk,
		overallScore,
		recommendation: buildRecommendation(overallRisk, missingClauses),
	}
}

function tokenize(message: string) {
	return uniq(
		message
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter(token => token.length > 2)
			.filter(token => !COMMON_STOP_WORDS.has(token))
	)
}

function findRelevantSnippets(contractText: string, message: string) {
	const terms = tokenize(message)
	const chunks = splitIntoChunks(contractText)
	const scored = chunks
		.map(chunk => ({
			chunk,
			score: terms.reduce((sum, term) => (chunk.toLowerCase().includes(term) ? sum + 1 : sum), 0),
		}))
		.filter(item => item.score > 0)
		.sort((left, right) => right.score - left.score)
		.slice(0, 3)
		.map(item => item.chunk)

	return uniq(scored)
}

export function chatAboutContractFallback(input: {
	contractText: string
	analysis: ContractAnalysis | null
	history: ContractConversationMessage[]
	message: string
}) {
	const lowerMessage = input.message.toLowerCase()
	const snippets = findRelevantSnippets(input.contractText, input.message)

	if (/risk|red flag|issue|concern/.test(lowerMessage) && input.analysis?.riskFlags.length) {
		return [
			"Here are the biggest issues the fallback review surfaced:",
			...input.analysis.riskFlags
				.slice(0, 3)
				.map(flag => `- ${toTitleCase(flag.severity)} risk — ${flag.title}: ${flag.detail}`),
			"Treat this as operational guidance, not legal advice.",
		].join("\n")
	}

	if (/missing|clause/.test(lowerMessage) && input.analysis?.missingClauses.length) {
		return [
			"The draft may need these additional protections:",
			...input.analysis.missingClauses.slice(0, 5).map(clause => `- ${clause}`),
			"Add only the clauses that fit the commercial deal and governing law.",
		].join("\n")
	}

	if (snippets.length === 0) {
		return input.analysis
			? `${input.analysis.summary}\n\nTop recommendation: ${input.analysis.recommendation}`
			: "I could not find a strong text match for that question in the uploaded contract yet. Try asking about parties, payment, dates, termination, or liability."
	}

	return [
		"Based on the uploaded contract, the most relevant language I found is:",
		...snippets.map(snippet => `- ${snippet}`),
		input.analysis
			? `\nPractical read: ${input.analysis.recommendation}`
			: "\nPractical read: confirm the exact clause wording with counsel before relying on this interpretation.",
	].join("\n")
}

function buildSection(title: string, body: string) {
	return `${title.toUpperCase()}\n${body.trim()}`
}

function getParameterValue(parameters: Record<string, string>, key: string, fallback: string) {
	const value = parameters[key]?.trim()
	return value && value.length > 0 ? value : fallback
}

export function generateContractFallback(input: {
	templateType: ContractTemplate
	parameters: Record<string, string>
	referenceContractText?: string | null
}) {
	const parties = getParameterValue(input.parameters, "parties", "[Party A] and [Party B]")
	const effectiveDate = getParameterValue(input.parameters, "effectiveDate", "[Effective Date]")
	const term = getParameterValue(input.parameters, "term", "[Term]")
	const scope = getParameterValue(
		input.parameters,
		"scope",
		"[Describe the services, goods, or obligations]"
	)
	const paymentTerms = getParameterValue(input.parameters, "paymentTerms", "[Insert payment terms]")
	const jurisdiction = getParameterValue(
		input.parameters,
		"jurisdiction",
		"Republic of the Philippines"
	)
	const specialTerms = input.parameters.specialTerms?.trim()
	const referenceNote = input.referenceContractText?.trim()
		? `\n\nDrafting note: align commercial positions with the uploaded reference contract where appropriate.`
		: ""

	const intro = `This ${input.templateType.replace(/-/g, " ")} ("Agreement") is made effective as of ${effectiveDate} between ${parties}.`
	const baseSections = [
		buildSection("1. Parties", `The parties identified above agree to be bound by this Agreement.`),
		buildSection("2. Scope", scope),
		buildSection(
			"3. Term",
			`This Agreement starts on ${effectiveDate} and continues for ${term} unless ended earlier under this Agreement.`
		),
		buildSection("4. Payment", paymentTerms),
		buildSection(
			"5. Confidentiality",
			"Each party must protect the other party's non-public information and use it only for purposes connected with this Agreement."
		),
		buildSection(
			"6. Liability",
			"Each party remains responsible for direct losses caused by its breach, subject to any negotiated caps or exclusions inserted before signature."
		),
		buildSection(
			"7. Termination",
			"Either party may terminate for material breach after a reasonable cure period, or as otherwise expressly agreed in writing."
		),
		buildSection(
			"8. Governing Law",
			`This Agreement is governed by the laws of ${jurisdiction}, excluding conflict-of-law rules.`
		),
		buildSection(
			"9. Entire Agreement",
			"This Agreement contains the full understanding of the parties and can be amended only by written agreement."
		),
		buildSection(
			"10. Signatures",
			"The parties may sign in counterparts, including by electronic signature where legally permitted."
		),
	]

	const templateLead = {
		"service-agreement":
			"Use this draft as a commercial services baseline and add deliverables, service levels, and acceptance criteria before execution.",
		"non-disclosure-agreement":
			"Use this draft to protect confidential information shared during discussions, diligence, or implementation.",
		"employment-agreement":
			"Use this draft as an employment starting point and tailor benefits, policies, and mandatory labor-law terms.",
		"lease-agreement":
			"Use this draft as a lease framework and add premises details, deposit amounts, and property-specific obligations.",
		"purchase-agreement":
			"Use this draft as a purchase framework and add delivery, inspection, title-transfer, and warranty mechanics.",
	}[input.templateType]

	return [
		intro,
		templateLead,
		...baseSections,
		specialTerms ? buildSection("Special Terms", specialTerms) : null,
		referenceNote ? referenceNote.trim() : null,
	]
		.filter(Boolean)
		.join("\n\n")
}
