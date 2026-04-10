import { z } from "zod/v4"

export const contractTemplateValues = [
	"service-agreement",
	"non-disclosure-agreement",
	"employment-agreement",
	"lease-agreement",
	"purchase-agreement",
] as const

export const contractTemplateSchema = z.enum(contractTemplateValues)
export const contractRiskSeveritySchema = z.enum(["low", "medium", "high"])
export const contractComplianceStatusSchema = z.enum(["pass", "warning", "fail"])
export const contractMessageRoleSchema = z.enum(["user", "assistant"])
export const contractOverallRiskSchema = z.enum(["Low", "Moderate", "High"])

export const contractRiskFlagSchema = z.object({
	title: z.string(),
	severity: contractRiskSeveritySchema,
	detail: z.string(),
})

export const contractComplianceItemSchema = z.object({
	label: z.string(),
	status: contractComplianceStatusSchema,
	detail: z.string(),
})

export const contractAnalysisSchema = z.object({
	contractType: z.string(),
	summary: z.string(),
	parties: z.array(z.string()),
	keyDates: z.array(z.string()),
	paymentTerms: z.array(z.string()),
	obligations: z.array(z.string()),
	riskFlags: z.array(contractRiskFlagSchema),
	missingClauses: z.array(z.string()),
	complianceCheck: z.array(contractComplianceItemSchema),
	overallRisk: contractOverallRiskSchema,
	overallScore: z.number().min(0).max(100),
	recommendation: z.string(),
})

export const contractConversationMessageSchema = z.object({
	id: z.string(),
	role: contractMessageRoleSchema,
	content: z.string(),
	createdAt: z.date(),
})

export const contractAgentSessionAccessSchema = z.object({
	sessionId: z.string().trim().min(1),
	accessToken: z.string().trim().min(1),
})

export const contractAgentChatInputSchema = contractAgentSessionAccessSchema.extend({
	message: z.string().trim().min(1).max(4000),
	contractText: z.string().trim().min(1),
})

export const contractAgentGenerationInputSchema = contractAgentSessionAccessSchema.extend({
	templateType: contractTemplateSchema,
	parameters: z.record(z.string(), z.string()).default({}),
	contractText: z.string().trim().optional(),
})

export const contractAgentSessionSnapshotSchema = z.object({
	id: z.string(),
	sourceFileName: z.string().nullable(),
	sourceMimeType: z.string().nullable(),
	contractTitle: z.string().nullable(),
	analysis: contractAnalysisSchema.nullable(),
	generatedContract: z.string().nullable(),
	generatedContractType: z.string().nullable(),
	messages: z.array(contractConversationMessageSchema),
	createdAt: z.date(),
	updatedAt: z.date(),
	lastInteractionAt: z.date(),
})

export type ContractTemplate = z.infer<typeof contractTemplateSchema>
export type ContractRiskSeverity = z.infer<typeof contractRiskSeveritySchema>
export type ContractComplianceStatus = z.infer<typeof contractComplianceStatusSchema>
export type ContractOverallRisk = z.infer<typeof contractOverallRiskSchema>
export type ContractRiskFlag = z.infer<typeof contractRiskFlagSchema>
export type ContractComplianceItem = z.infer<typeof contractComplianceItemSchema>
export type ContractAnalysis = z.infer<typeof contractAnalysisSchema>
export type ContractConversationMessage = z.infer<typeof contractConversationMessageSchema>
export type ContractAgentSessionSnapshot = z.infer<typeof contractAgentSessionSnapshotSchema>
