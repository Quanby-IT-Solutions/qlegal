"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
	ArrowRight,
	Bot,
	Copy,
	FileText,
	Loader2,
	MessageSquareText,
	ShieldCheck,
	Sparkles,
	TriangleAlert,
	Upload,
	WandSparkles,
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Separator } from "@/core/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { Textarea } from "@/core/components/ui/textarea"
import { cn } from "@/core/lib/utils"

import { trpc, type RouterOutputs } from "@/services/trpc/client"

import { contractTemplateValues } from "@/features/contract-agent/api/contract-agent.schema"

const CONTRACT_AGENT_SESSION_STORAGE_KEY = "quanby-legal-contract-agent-session"
const SUPPORTED_UPLOAD_LABEL = "PDF, DOC, DOCX, TXT, or Markdown up to 15 MB"

type ContractAgentSessionSnapshot = RouterOutputs["contractAgent"]["getSession"]
type StoredContractAgentSession = {
	sessionId: string
	accessToken: string
}

type GenerationFormState = {
	templateType: (typeof contractTemplateValues)[number]
	parties: string
	effectiveDate: string
	term: string
	scope: string
	paymentTerms: string
	jurisdiction: string
	specialTerms: string
}

const TEMPLATE_LABELS: Record<(typeof contractTemplateValues)[number], string> = {
	"service-agreement": "Service Agreement",
	"non-disclosure-agreement": "Non-Disclosure Agreement",
	"employment-agreement": "Employment Agreement",
	"lease-agreement": "Lease Agreement",
	"purchase-agreement": "Purchase Agreement",
}

const INITIAL_GENERATION_FORM: GenerationFormState = {
	templateType: "service-agreement",
	parties: "",
	effectiveDate: "",
	term: "12 months",
	scope: "",
	paymentTerms: "",
	jurisdiction: "Republic of the Philippines",
	specialTerms: "",
}

function createSessionRef(): StoredContractAgentSession {
	const randomSegment = Math.random().toString(36).slice(2)
	const sessionId = globalThis.crypto?.randomUUID?.() ?? `qas-${Date.now()}-${randomSegment}`
	const accessToken = globalThis.crypto?.randomUUID?.() ?? `qat-${Date.now()}-${randomSegment}`
	return { sessionId, accessToken }
}

function readStoredSession(): StoredContractAgentSession | null {
	if (typeof window === "undefined") return null
	const rawValue = window.localStorage.getItem(CONTRACT_AGENT_SESSION_STORAGE_KEY)
	if (!rawValue) return null

	try {
		const parsed = JSON.parse(rawValue) as Partial<StoredContractAgentSession>
		if (parsed.sessionId && parsed.accessToken) {
			return {
				sessionId: parsed.sessionId,
				accessToken: parsed.accessToken,
			}
		}
	} catch {
		window.localStorage.removeItem(CONTRACT_AGENT_SESSION_STORAGE_KEY)
	}

	return null
}

function writeStoredSession(session: StoredContractAgentSession) {
	if (typeof window === "undefined") return
	window.localStorage.setItem(CONTRACT_AGENT_SESSION_STORAGE_KEY, JSON.stringify(session))
}

function SessionMeta({ session }: { session: Exclude<ContractAgentSessionSnapshot, null> }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div className="bg-background/75 rounded-xl border p-4">
				<p className="text-muted-foreground text-xs tracking-[0.24em] uppercase">Contract</p>
				<p className="mt-2 text-sm font-semibold">
					{session.contractTitle ?? session.sourceFileName ?? "Untitled contract"}
				</p>
			</div>
			<div className="bg-background/75 rounded-xl border p-4">
				<p className="text-muted-foreground text-xs tracking-[0.24em] uppercase">Risk band</p>
				<p className="mt-2 text-sm font-semibold">
					{session.analysis?.overallRisk ?? "Pending review"}
				</p>
			</div>
			<div className="bg-background/75 rounded-xl border p-4">
				<p className="text-muted-foreground text-xs tracking-[0.24em] uppercase">Score</p>
				<p className="mt-2 text-sm font-semibold">{session.analysis?.overallScore ?? "—"}</p>
			</div>
			<div className="bg-background/75 rounded-xl border p-4">
				<p className="text-muted-foreground text-xs tracking-[0.24em] uppercase">Messages</p>
				<p className="mt-2 text-sm font-semibold">{session.messages.length}</p>
			</div>
		</div>
	)
}

export function ContractAgentSection() {
	const [sessionRef, setSessionRef] = useState<StoredContractAgentSession | null>(null)
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [chatMessage, setChatMessage] = useState("")
	const [generationForm, setGenerationForm] = useState<GenerationFormState>(INITIAL_GENERATION_FORM)
	const [lastUploadedFileName, setLastUploadedFileName] = useState<string | null>(null)
	const [contractText, setContractText] = useState<string | null>(null)
	const utils = trpc.useUtils()

	useEffect(() => {
		const existingSession = readStoredSession()
		if (existingSession) {
			setSessionRef(existingSession)
			return
		}

		const nextSession = createSessionRef()
		writeStoredSession(nextSession)
		setSessionRef(nextSession)
	}, [])

	const ensureSessionRef = useCallback(() => {
		if (sessionRef) return sessionRef
		const nextSession = createSessionRef()
		writeStoredSession(nextSession)
		setSessionRef(nextSession)
		return nextSession
	}, [sessionRef])

	const sessionQuery = trpc.contractAgent.getSession.useQuery(
		sessionRef ?? { sessionId: "pending", accessToken: "pending" },
		{
			enabled: Boolean(sessionRef),
			refetchOnWindowFocus: false,
			staleTime: 30_000,
		}
	)

	const chatMutation = trpc.contractAgent.chat.useMutation({
		onSuccess: async () => {
			setChatMessage("")
			if (sessionRef) {
				await utils.contractAgent.getSession.invalidate(sessionRef)
			}
		},
		onError: error => toast.error(error.message),
	})

	const generateMutation = trpc.contractAgent.generateContract.useMutation({
		onSuccess: async () => {
			toast.success("Draft generated")
			if (sessionRef) {
				await utils.contractAgent.getSession.invalidate(sessionRef)
			}
		},
		onError: error => toast.error(error.message),
	})

	const handleAnalyzeFile = useCallback(
		async (file: File) => {
			const activeSession = ensureSessionRef()
			const formData = new FormData()
			formData.append("sessionId", activeSession.sessionId)
			formData.append("accessToken", activeSession.accessToken)
			formData.append("file", file)

			setIsAnalyzing(true)
			try {
				const response = await fetch("/api/contract-agent/upload", {
					method: "POST",
					body: formData,
				})
				const payload = (await response.json()) as { error?: string; contractText?: string }
				if (!response.ok) {
					throw new Error(payload.error ?? "Contract analysis failed")
				}

				if (payload.contractText) {
					setContractText(payload.contractText)
				}
				setLastUploadedFileName(file.name)
				toast.success("Contract analyzed")
				await utils.contractAgent.getSession.invalidate(activeSession)
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Contract analysis failed")
			} finally {
				setIsAnalyzing(false)
			}
		},
		[ensureSessionRef, utils.contractAgent.getSession]
	)

	const onDrop = useCallback(
		(files: File[]) => {
			const [firstFile] = files
			if (firstFile) {
				void handleAnalyzeFile(firstFile)
			}
		},
		[handleAnalyzeFile]
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		multiple: false,
		accept: {
			"application/pdf": [".pdf"],
			"application/msword": [".doc"],
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
			"text/plain": [".txt"],
			"text/markdown": [".md"],
		},
		disabled: isAnalyzing,
	})

	const session = sessionQuery.data
	const analysis = session?.analysis ?? null
	const generatedContract = session?.generatedContract ?? null
	const canChat = Boolean(contractText)
	const canGenerate = Boolean(sessionRef)

	const statusCopy = useMemo(() => {
		if (isAnalyzing) return "Reviewing your contract now…"
		if (sessionQuery.isLoading) return "Restoring your last contract workspace…"
		if (analysis) return "Analysis is ready. Ask follow-up questions or generate a draft."
		return "Upload a contract to get a grounded risk review, then ask questions or generate a first draft."
	}, [analysis, isAnalyzing, sessionQuery.isLoading])

	const submitChatMessage = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			if (!sessionRef || !chatMessage.trim() || !contractText) return
			await chatMutation.mutateAsync({
				sessionId: sessionRef.sessionId,
				accessToken: sessionRef.accessToken,
				message: chatMessage.trim(),
				contractText,
			})
		},
		[chatMessage, chatMutation, contractText, sessionRef]
	)

	const submitGeneration = useCallback(
		async (event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			const activeSession = ensureSessionRef()
			await generateMutation.mutateAsync({
				sessionId: activeSession.sessionId,
				accessToken: activeSession.accessToken,
				templateType: generationForm.templateType,
				...(contractText ? { contractText } : {}),
				parameters: {
					parties: generationForm.parties,
					effectiveDate: generationForm.effectiveDate,
					term: generationForm.term,
					scope: generationForm.scope,
					paymentTerms: generationForm.paymentTerms,
					jurisdiction: generationForm.jurisdiction,
					specialTerms: generationForm.specialTerms,
				},
			})
		},
		[ensureSessionRef, generateMutation, generationForm, contractText]
	)

	const copyGeneratedDraft = useCallback(async () => {
		if (!generatedContract) return
		await navigator.clipboard.writeText(generatedContract)
		toast.success("Draft copied")
	}, [generatedContract])

	return (
		<section id="contract-ai" className="scroll-mt-28">
			<Card className="border-primary/20 from-background via-background to-primary/5 shadow-primary/5 overflow-hidden bg-linear-to-br shadow-xl">
				<CardHeader className="bg-background/90 gap-4 border-b backdrop-blur">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="space-y-3">
							<Badge
								variant="outline"
								className="border-primary/30 bg-primary/5 gap-1.5 px-3 py-1 text-[11px] tracking-[0.24em] uppercase"
							>
								<Sparkles className="text-primary size-3.5" />
								Contract AI workspace
							</Badge>
							<div>
								<CardTitle className="text-3xl tracking-tight sm:text-4xl">
									Analyze, ask, and generate in one flow
								</CardTitle>
								<CardDescription className="mt-3 max-w-3xl text-sm leading-6 sm:text-base">
									Upload a contract, review the risk posture, question the draft in plain English,
									then generate your next version without leaving Quanby Legal.
								</CardDescription>
							</div>
						</div>
						<div className="bg-background/75 rounded-2xl border px-4 py-3 text-sm shadow-sm lg:max-w-sm">
							<p className="font-medium">{statusCopy}</p>
							<p className="text-muted-foreground mt-2 text-xs leading-5">
								Grounded by your uploaded contract text, with a built-in offline fallback so the
								workflow still behaves when no external model is configured.
							</p>
						</div>
					</div>
					{session ? <SessionMeta session={session} /> : null}
				</CardHeader>
				<CardContent className="p-0">
					<Tabs defaultValue="analyze" className="gap-0">
						<div className="border-b px-4 py-3 sm:px-6">
							<TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0 md:w-auto md:grid-cols-3">
								<TabsTrigger
									value="analyze"
									className="bg-background data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 border px-4 py-2"
								>
									<FileText className="size-4" />
									Analyze
								</TabsTrigger>
								<TabsTrigger
									value="ask"
									className="bg-background data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 border px-4 py-2"
								>
									<MessageSquareText className="size-4" />
									Ask AI
								</TabsTrigger>
								<TabsTrigger
									value="generate"
									className="bg-background data-[state=active]:border-primary/40 data-[state=active]:bg-primary/5 border px-4 py-2"
								>
									<WandSparkles className="size-4" />
									Generate
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="analyze" className="space-y-6 p-4 sm:p-6">
							<div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
								<div
									{...getRootProps()}
									className={cn(
										"bg-background/70 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-all",
										isDragActive && "border-primary bg-primary/5",
										isAnalyzing && "pointer-events-none opacity-70"
									)}
								>
									<input {...getInputProps()} />
									<div className="bg-background rounded-full border p-3 shadow-sm">
										{isAnalyzing ? (
											<Loader2 className="text-primary size-6 animate-spin" />
										) : (
											<Upload className="text-primary size-6" />
										)}
									</div>
									<p className="mt-4 text-lg font-semibold">
										{isAnalyzing
											? "Analyzing contract…"
											: isDragActive
												? "Drop the contract here"
												: "Drop in a contract"}
									</p>
									<p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
										{SUPPORTED_UPLOAD_LABEL}. Your contract stays in your browser session only — it
										is never stored on our servers.
									</p>
									{lastUploadedFileName ? (
										<p className="text-primary mt-4 text-xs font-medium tracking-[0.2em] uppercase">
											Latest file: {lastUploadedFileName}
										</p>
									) : null}
								</div>

								<Card className="bg-background/70">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-xl">
											<ShieldCheck className="text-primary size-5" />
											What the review covers
										</CardTitle>
										<CardDescription>
											Commercial clarity, obvious legal gaps, operational risk, and draft readiness.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										<div className="bg-background rounded-xl border p-4">
											<p className="text-sm font-semibold">Grounded review</p>
											<p className="text-muted-foreground mt-2 text-sm leading-6">
												The analysis stays anchored to the uploaded text, then keeps that context
												available for follow-up questions and drafting.
											</p>
										</div>
										<div className="bg-background rounded-xl border p-4">
											<p className="text-sm font-semibold">Fast handoff</p>
											<p className="text-muted-foreground mt-2 text-sm leading-6">
												Once you have a solid draft, route the next step into Quanby Legal’s broader
												execution and notarization workflows.
											</p>
										</div>
									</CardContent>
								</Card>
							</div>

							{analysis ? (
								<div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
									<Card className="bg-background/75">
										<CardHeader>
											<div className="flex flex-wrap items-center gap-3">
												<CardTitle className="text-xl">{analysis.contractType}</CardTitle>
												<Badge
													variant={
														analysis.overallRisk === "High"
															? "destructive"
															: analysis.overallRisk === "Moderate"
																? "secondary"
																: "default"
													}
												>
													{analysis.overallRisk} risk · {analysis.overallScore}/100
												</Badge>
											</div>
											<CardDescription>{analysis.summary}</CardDescription>
										</CardHeader>
										<CardContent className="grid gap-4 md:grid-cols-2">
											<div className="bg-background rounded-xl border p-4">
												<p className="text-sm font-semibold">Likely parties</p>
												<ul className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
													{analysis.parties.length > 0 ? (
														analysis.parties.map(party => <li key={party}>• {party}</li>)
													) : (
														<li>• No clear parties detected in the fallback parse.</li>
													)}
												</ul>
											</div>
											<div className="bg-background rounded-xl border p-4">
												<p className="text-sm font-semibold">Key dates</p>
												<ul className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
													{analysis.keyDates.length > 0 ? (
														analysis.keyDates.map(date => <li key={date}>• {date}</li>)
													) : (
														<li>• Add effective dates, renewal triggers, and notice periods.</li>
													)}
												</ul>
											</div>
											<div className="bg-background rounded-xl border p-4 md:col-span-2">
												<p className="text-sm font-semibold">Recommendation</p>
												<p className="text-muted-foreground mt-3 text-sm leading-6">
													{analysis.recommendation}
												</p>
											</div>
										</CardContent>
									</Card>

									<Card className="bg-background/75">
										<CardHeader>
											<CardTitle className="text-xl">Risk flags and clause gaps</CardTitle>
											<CardDescription>
												Use this as a triage layer before you negotiate or route the contract
												onward.
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="space-y-3">
												{analysis.riskFlags.map(flag => (
													<div
														key={`${flag.title}-${flag.detail}`}
														className="bg-background rounded-xl border p-4"
													>
														<div className="flex items-center gap-2 text-sm font-semibold">
															<TriangleAlert
																className={cn(
																	"size-4",
																	flag.severity === "high"
																		? "text-destructive"
																		: flag.severity === "medium"
																			? "text-amber-500"
																			: "text-emerald-500"
																)}
															/>
															{flag.title}
														</div>
														<p className="text-muted-foreground mt-2 text-sm leading-6">
															{flag.detail}
														</p>
													</div>
												))}
											</div>
											<Separator />
											<div>
												<p className="text-sm font-semibold">Missing or weak clauses</p>
												<ul className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
													{analysis.missingClauses.length > 0 ? (
														analysis.missingClauses.map(clause => <li key={clause}>• {clause}</li>)
													) : (
														<li>• No obvious clause gaps detected in the current pass.</li>
													)}
												</ul>
											</div>
										</CardContent>
									</Card>
								</div>
							) : null}
						</TabsContent>

						<TabsContent value="ask" className="p-4 sm:p-6">
							<div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
								<Card className="bg-background/75">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-xl">
											<Bot className="text-primary size-5" />
											Ask grounded follow-up questions
										</CardTitle>
										<CardDescription>
											Ask about liability, payment, dates, missing protections, or anything else
											already in the uploaded text.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<form className="space-y-4" onSubmit={submitChatMessage}>
											<Textarea
												placeholder={
													canChat
														? "What are the main obligations on each party?"
														: "Upload and analyze a contract first to unlock grounded Q&A."
												}
												value={chatMessage}
												onChange={event => setChatMessage(event.target.value)}
												className="min-h-36"
												disabled={!canChat || chatMutation.isPending}
											/>
											<Button
												type="submit"
												disabled={!canChat || !chatMessage.trim() || chatMutation.isPending}
											>
												{chatMutation.isPending ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													<MessageSquareText className="size-4" />
												)}
												Ask about this contract
											</Button>
										</form>
									</CardContent>
								</Card>

								<Card className="bg-background/75">
									<CardHeader>
										<CardTitle className="text-xl">Conversation</CardTitle>
										<CardDescription>
											The assistant keeps the uploaded contract context in memory for this browser
											session.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="max-h-112 space-y-3 overflow-y-auto pr-1">
											{session?.messages.length ? (
												session.messages.map(message => (
													<div
														key={message.id}
														className={cn(
															"rounded-2xl border px-4 py-3 text-sm leading-6",
															message.role === "assistant" ? "bg-primary/5" : "bg-background"
														)}
													>
														<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.2em] uppercase">
															{message.role === "assistant" ? "Assistant" : "You"}
														</p>
														<p className="whitespace-pre-wrap">{message.content}</p>
													</div>
												))
											) : (
												<div className="text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-sm">
													Once a contract is analyzed, your Q&A history will appear here.
												</div>
											)}
										</div>
									</CardContent>
								</Card>
							</div>
						</TabsContent>

						<TabsContent value="generate" className="p-4 sm:p-6">
							<div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
								<Card className="bg-background/75">
									<CardHeader>
										<CardTitle className="flex items-center gap-2 text-xl">
											<WandSparkles className="text-primary size-5" />
											Generate a working first draft
										</CardTitle>
										<CardDescription>
											Start from structured inputs, and optionally let the uploaded contract
											influence the next version.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<form className="space-y-4" onSubmit={submitGeneration}>
											<div className="space-y-2">
												<label className="text-sm font-medium" htmlFor="contract-template-type">
													Template
												</label>
												<select
													id="contract-template-type"
													className="border-input h-10 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
													value={generationForm.templateType}
													onChange={event =>
														setGenerationForm(current => ({
															...current,
															templateType: event.target
																.value as GenerationFormState["templateType"],
														}))
													}
												>
													{contractTemplateValues.map(value => (
														<option key={value} value={value}>
															{TEMPLATE_LABELS[value]}
														</option>
													))}
												</select>
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<div className="space-y-2 sm:col-span-2">
													<label className="text-sm font-medium" htmlFor="contract-parties">
														Parties
													</label>
													<Input
														id="contract-parties"
														value={generationForm.parties}
														onChange={event =>
															setGenerationForm(current => ({
																...current,
																parties: event.target.value,
															}))
														}
														placeholder="Quanby Legal and Client Name"
													/>
												</div>
												<div className="space-y-2">
													<label className="text-sm font-medium" htmlFor="contract-effective-date">
														Effective date
													</label>
													<Input
														id="contract-effective-date"
														type="date"
														value={generationForm.effectiveDate}
														onChange={event =>
															setGenerationForm(current => ({
																...current,
																effectiveDate: event.target.value,
															}))
														}
													/>
												</div>
												<div className="space-y-2">
													<label className="text-sm font-medium" htmlFor="contract-term">
														Term
													</label>
													<Input
														id="contract-term"
														value={generationForm.term}
														onChange={event =>
															setGenerationForm(current => ({
																...current,
																term: event.target.value,
															}))
														}
														placeholder="12 months"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<label className="text-sm font-medium" htmlFor="contract-scope">
													Scope
												</label>
												<Textarea
													id="contract-scope"
													value={generationForm.scope}
													onChange={event =>
														setGenerationForm(current => ({
															...current,
															scope: event.target.value,
														}))
													}
													className="min-h-24"
													placeholder="Describe the work, deliverables, or obligations."
												/>
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<div className="space-y-2">
													<label className="text-sm font-medium" htmlFor="contract-payment-terms">
														Payment terms
													</label>
													<Textarea
														id="contract-payment-terms"
														value={generationForm.paymentTerms}
														onChange={event =>
															setGenerationForm(current => ({
																...current,
																paymentTerms: event.target.value,
															}))
														}
														className="min-h-24"
														placeholder="Milestones, invoice timing, and due dates."
													/>
												</div>
												<div className="space-y-2">
													<label className="text-sm font-medium" htmlFor="contract-jurisdiction">
														Jurisdiction
													</label>
													<Textarea
														id="contract-jurisdiction"
														value={generationForm.jurisdiction}
														onChange={event =>
															setGenerationForm(current => ({
																...current,
																jurisdiction: event.target.value,
															}))
														}
														className="min-h-24"
														placeholder="Republic of the Philippines"
													/>
												</div>
											</div>
											<div className="space-y-2">
												<label className="text-sm font-medium" htmlFor="contract-special-terms">
													Special terms
												</label>
												<Textarea
													id="contract-special-terms"
													value={generationForm.specialTerms}
													onChange={event =>
														setGenerationForm(current => ({
															...current,
															specialTerms: event.target.value,
														}))
													}
													className="min-h-24"
													placeholder="Any bespoke warranties, deliverables, approvals, or commercial points."
												/>
											</div>
											<Button type="submit" disabled={!canGenerate || generateMutation.isPending}>
												{generateMutation.isPending ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													<ArrowRight className="size-4" />
												)}
												Generate draft
											</Button>
										</form>
									</CardContent>
								</Card>

								<Card className="bg-background/75">
									<CardHeader>
										<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<CardTitle className="text-xl">Generated contract draft</CardTitle>
												<CardDescription>
													Review, tailor, and pass it into your signing or notarization flow when it
													is ready.
												</CardDescription>
											</div>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={!generatedContract}
												onClick={() => void copyGeneratedDraft()}
											>
												<Copy className="size-4" />
												Copy draft
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										<Textarea
											value={
												generatedContract ??
												"Your generated contract draft will appear here after you submit the form."
											}
											readOnly
											className="min-h-136 font-mono text-sm leading-6"
										/>
									</CardContent>
								</Card>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</section>
	)
}
