import { NextResponse } from "next/server"

import { db } from "@/services/drizzle/db"
import { auth } from "@/services/next-auth"

import { analyzeContract } from "@/features/contract-agent/server/contract-agent-service"
import {
	appendContractAgentMessage,
	clearContractAgentMessages,
	ensureContractAgentSession,
} from "@/features/contract-agent/server/contract-agent-session"
import { extractContractText } from "@/features/contract-agent/server/contract-file-extractor"

export const runtime = "nodejs"

function inferContractTitle(fileName: string, contractText: string) {
	const firstMeaningfulLine = contractText
		.split(/\r?\n/)
		.map(line => line.trim())
		.find(line => line.length > 8 && line.length < 90)

	if (firstMeaningfulLine) {
		return firstMeaningfulLine
	}

	return fileName.replace(/\.[^.]+$/, "").trim() || "Uploaded contract"
}

export async function POST(request: Request) {
	const [session, formData] = await Promise.all([auth().catch(() => null), request.formData()])

	const sessionId = formData.get("sessionId")
	const accessToken = formData.get("accessToken")
	const file = formData.get("file")

	if (typeof sessionId !== "string" || typeof accessToken !== "string") {
		return NextResponse.json(
			{ error: "Missing session credentials for Contract AI upload." },
			{ status: 400 }
		)
	}

	if (!(file instanceof File)) {
		return NextResponse.json(
			{ error: "Please choose a contract file to analyze." },
			{ status: 400 }
		)
	}

	try {
		const contractText = await extractContractText(file)
		const analysis = await analyzeContract({ contractText, fileName: file.name })
		const savedSession = await ensureContractAgentSession(db, {
			sessionId,
			accessToken,
			userId: session?.user.id ?? null,
			sourceFileName: file.name,
			sourceMimeType: file.type || "application/octet-stream",
			contractTitle: inferContractTitle(file.name, contractText),
			analysis,
			generatedContract: null,
			generatedContractType: null,
		})

		if (!savedSession) {
			return NextResponse.json(
				{ error: "The provided session token is invalid for this Contract AI workspace." },
				{ status: 403 }
			)
		}

		await clearContractAgentMessages(db, sessionId)
		await appendContractAgentMessage(db, {
			sessionId,
			role: "assistant",
			content: `Analysis ready. ${analysis.summary}`,
		})

		return NextResponse.json({ analysis, contractText })
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Contract analysis failed." },
			{ status: 500 }
		)
	}
}
