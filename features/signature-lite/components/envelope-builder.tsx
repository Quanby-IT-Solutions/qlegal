// "use client"

// import { useState } from "react"
// import { CheckCircle, ChevronLeft, ChevronRight, FileText, Send, Users } from "lucide-react"
// import { toast } from "sonner"

// import { Button } from "@/core/components/ui/button"
// import {
// 	Card,
// 	CardContent,
// 	CardDescription,
// 	CardHeader,
// 	CardTitle,
// } from "@/core/components/ui/card"
// import { Progress } from "@/core/components/ui/progress"
// import { Separator } from "@/core/components/ui/separator"

// import { DocumentUpload } from "./document-upload"
// import { RecipientManager, type Recipient } from "./recipient-manager"
// import { SignaturePositioning } from "./signature-positioning"

// const STEPS = [
// 	{
// 		id: "document",
// 		title: "Upload Document",
// 		description: "Add the document that needs to be signed",
// 		icon: FileText,
// 	},
// 	{
// 		id: "recipients",
// 		title: "Add Recipients",
// 		description: "Specify who needs to sign or review",
// 		icon: Users,
// 	},
// 	{
// 		id: "positioning",
// 		title: "Position Fields",
// 		description: "Place signature and form fields on the document",
// 		icon: CheckCircle,
// 	},
// 	{
// 		id: "send",
// 		title: "Send for Signature",
// 		description: "Review and send the envelope",
// 		icon: Send,
// 	},
// ] as const

// type StepId = (typeof STEPS)[number]["id"]

// interface Document {
// 	name: string
// 	file: string // Base64
// 	mimeType: string
// 	size: number
// 	description?: string
// }

// interface DocumentField {
// 	id: string
// 	type: "SIGNATURE" | "INITIAL" | "NAME" | "DATE" | "TEXT" | "EMAIL" | "CHECKBOX" | "RADIO"
// 	label: string
// 	position: { x: number; y: number; pageNumber: number }
// 	size: { width: number; height: number }
// 	required: boolean
// 	recipientId: string
// 	placeholder?: string
// 	options?: string[]
// }

// interface EnvelopeBuilderState {
// 	document: Document | null
// 	recipients: Recipient[]
// 	documentFields: DocumentField[]
// 	envelopeTitle: string
// 	envelopeMessage: string
// }

// export function EnvelopeBuilder() {
// 	const [currentStep, setCurrentStep] = useState<StepId>("document")
// 	const [state, setState] = useState<EnvelopeBuilderState>({
// 		document: null,
// 		recipients: [],
// 		documentFields: [],
// 		envelopeTitle: "",
// 		envelopeMessage: "",
// 	})
// 	const [isSubmitting, setIsSubmitting] = useState(false)

// 	// Step navigation
// 	const currentStepIndex = STEPS.findIndex(step => step.id === currentStep)
// 	const progress = ((currentStepIndex + 1) / STEPS.length) * 100

// 	// Validation for each step
// 	const isStepValid = (stepId: StepId): boolean => {
// 		switch (stepId) {
// 			case "document":
// 				return state.document !== null
// 			case "recipients":
// 				return state.recipients.length > 0 && state.recipients.some(r => r.role === "SIGNER")
// 			case "positioning":
// 				return state.documentFields.length > 0
// 			case "send":
// 				return state.envelopeTitle.trim() !== ""
// 			default:
// 				return false
// 		}
// 	}

// 	const canProceed = isStepValid(currentStep)
// 	const canGoBack = currentStepIndex > 0

// 	// Navigation handlers
// 	const handleNext = () => {
// 		if (!canProceed) return

// 		const nextIndex = currentStepIndex + 1
// 		const nextStep = STEPS[nextIndex]
// 		if (nextStep) {
// 			setCurrentStep(nextStep.id)
// 		}
// 	}

// 	const handleBack = () => {
// 		if (!canGoBack) return

// 		const prevIndex = currentStepIndex - 1
// 		const prevStep = STEPS[prevIndex]
// 		if (prevStep) {
// 			setCurrentStep(prevStep.id)
// 		}
// 	}

// 	const handleStepClick = (stepId: StepId) => {
// 		const stepIndex = STEPS.findIndex(step => step.id === stepId)

// 		// Only allow going to previous steps or current step
// 		if (stepIndex <= currentStepIndex) {
// 			setCurrentStep(stepId)
// 		}
// 	}

// 	// State update handlers
// 	const handleDocumentUpload = (document: Document) => {
// 		setState(prev => ({ ...prev, document }))
// 		toast.success("Document uploaded successfully")
// 	}

// 	const handleRecipientsChange = (recipients: Recipient[]) => {
// 		setState(prev => ({ ...prev, recipients }))
// 	}

// 	const handleDocumentFieldsChange = (documentFields: DocumentField[]) => {
// 		setState(prev => ({ ...prev, documentFields }))
// 	}

// 	// Field management handlers
// 	const handleFieldAdd = (field: Omit<DocumentField, "id">) => {
// 		const newField: DocumentField = {
// 			...field,
// 			id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
// 		}
// 		setState(prev => ({
// 			...prev,
// 			documentFields: [...prev.documentFields, newField],
// 		}))
// 	}

// 	const handleFieldUpdate = (fieldId: string, updates: Partial<DocumentField>) => {
// 		setState(prev => ({
// 			...prev,
// 			documentFields: prev.documentFields.map(field =>
// 				field.id === fieldId ? { ...field, ...updates } : field
// 			),
// 		}))
// 	}

// 	const handleFieldDelete = (fieldId: string) => {
// 		setState(prev => ({
// 			...prev,
// 			documentFields: prev.documentFields.filter(field => field.id !== fieldId),
// 		}))
// 	}

// 	// Final submission
// 	const handleSendEnvelope = async () => {
// 		if (!state.document || state.recipients.length === 0 || state.documentFields.length === 0) {
// 			toast.error("Please complete all required steps")
// 			return
// 		}

// 		setIsSubmitting(true)
// 		try {
// 			// TODO: Implement envelope sending logic via tRPC
// 			await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call

// 			toast.success("Envelope sent successfully!")

// 			// Reset state for new envelope
// 			setState({
// 				document: null,
// 				recipients: [],
// 				documentFields: [],
// 				envelopeTitle: "",
// 				envelopeMessage: "",
// 			})
// 			setCurrentStep("document")
// 		} catch (error) {
// 			console.error("Failed to send envelope:", error)
// 			toast.error("Failed to send envelope. Please try again.")
// 		} finally {
// 			setIsSubmitting(false)
// 		}
// 	}

// 	// Render step content
// 	const renderStepContent = () => {
// 		switch (currentStep) {
// 			case "document":
// 				return <DocumentUpload onDocumentUpload={handleDocumentUpload} />

// 			case "recipients":
// 				return (
// 					<RecipientManager
// 						recipients={state.recipients}
// 						onRecipientsChange={handleRecipientsChange}
// 					/>
// 				)

// 			case "positioning":
// 				if (!state.document) {
// 					return (
// 						<Card>
// 							<CardContent className="pt-6">
// 								<p className="text-center text-gray-500">Please upload a document first</p>
// 							</CardContent>
// 						</Card>
// 					)
// 				}

// 				return (
// 					<SignaturePositioning
// 						documentUrl={state.document.file}
// 						recipients={state.recipients}
// 						fields={state.documentFields}
// 						onFieldsChange={handleDocumentFieldsChange}
// 						onFieldAdd={handleFieldAdd}
// 						onFieldUpdate={handleFieldUpdate}
// 						onFieldDelete={handleFieldDelete}
// 					/>
// 				)

// 			case "send":
// 				return (
// 					<Card>
// 						<CardHeader>
// 							<CardTitle>Review & Send</CardTitle>
// 							<CardDescription>Review your envelope details before sending</CardDescription>
// 						</CardHeader>
// 						<CardContent className="space-y-6">
// 							{/* Envelope Summary */}
// 							<div className="space-y-4">
// 								<div>
// 									<label className="text-sm font-medium text-gray-700">Envelope Title</label>
// 									<input
// 										type="text"
// 										value={state.envelopeTitle}
// 										onChange={e =>
// 											setState(prev => ({
// 												...prev,
// 												envelopeTitle: e.target.value,
// 											}))
// 										}
// 										placeholder="Enter envelope title"
// 										className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
// 									/>
// 								</div>

// 								<div>
// 									<label className="text-sm font-medium text-gray-700">Message (Optional)</label>
// 									<textarea
// 										value={state.envelopeMessage}
// 										onChange={e =>
// 											setState(prev => ({
// 												...prev,
// 												envelopeMessage: e.target.value,
// 											}))
// 										}
// 										placeholder="Add a message for recipients..."
// 										rows={3}
// 										className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
// 									/>
// 								</div>
// 							</div>

// 							<Separator />

// 							{/* Summary Cards */}
// 							<div className="grid gap-4 md:grid-cols-3">
// 								<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
// 									<h4 className="font-medium text-blue-900">Document</h4>
// 									<p className="mt-1 text-sm text-blue-700">{state.document?.name}</p>
// 									<p className="mt-1 text-xs text-blue-600">
// 										{state.documentFields.length} fields positioned
// 									</p>
// 								</div>

// 								<div className="rounded-lg border border-green-200 bg-green-50 p-4">
// 									<h4 className="font-medium text-green-900">Recipients</h4>
// 									<p className="mt-1 text-sm text-green-700">
// 										{state.recipients.filter(r => r.role === "SIGNER").length} signer(s)
// 									</p>
// 									<p className="mt-1 text-xs text-green-600">
// 										{state.recipients.filter(r => r.role === "APPROVER").length} approver(s)
// 									</p>
// 								</div>

// 								<div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
// 									<h4 className="font-medium text-purple-900">Fields</h4>
// 									<p className="mt-1 text-sm text-purple-700">
// 										{state.documentFields.filter(f => f.type === "SIGNATURE").length} signature(s)
// 									</p>
// 									<p className="mt-1 text-xs text-purple-600">
// 										{state.documentFields.filter(f => f.type !== "SIGNATURE").length} other field(s)
// 									</p>
// 								</div>
// 							</div>

// 							{/* Send Button */}
// 							<Button
// 								onClick={handleSendEnvelope}
// 								disabled={!canProceed || isSubmitting}
// 								className="w-full"
// 								size="lg"
// 							>
// 								{isSubmitting ? (
// 									<>
// 										<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
// 										Sending Envelope...
// 									</>
// 								) : (
// 									<>
// 										<Send className="mr-2 h-4 w-4" />
// 										Send Envelope
// 									</>
// 								)}
// 							</Button>
// 						</CardContent>
// 					</Card>
// 				)

// 			default:
// 				return null
// 		}
// 	}

// 	return (
// 		<div className="mx-auto max-w-6xl space-y-6 p-6">
// 			{/* Header */}
// 			<div className="space-y-2 text-center">
// 				<h1 className="text-3xl font-bold text-gray-900">Create Signature Envelope</h1>
// 				<p className="text-gray-600">Upload, assign, and send documents for digital signature</p>
// 			</div>

// 			{/* Progress */}
// 			<div className="space-y-4">
// 				<div className="flex items-center justify-between">
// 					<span className="text-sm font-medium text-gray-700">
// 						Step {currentStepIndex + 1} of {STEPS.length}
// 					</span>
// 					<span className="text-sm text-gray-500">{Math.round(progress)}% Complete</span>
// 				</div>
// 				<Progress value={progress} className="h-2" />
// 			</div>

// 			{/* Step Navigation */}
// 			<div className="flex items-center justify-between">
// 				{STEPS.map((step, index) => {
// 					const Icon = step.icon
// 					const isActive = step.id === currentStep
// 					const isCompleted = index < currentStepIndex
// 					const isClickable = index <= currentStepIndex

// 					return (
// 						<button
// 							key={step.id}
// 							onClick={() => isClickable && handleStepClick(step.id)}
// 							disabled={!isClickable}
// 							className={`flex flex-1 flex-col items-center rounded-lg p-4 transition-colors ${
// 								isActive
// 									? "border border-blue-200 bg-blue-50 text-blue-700"
// 									: isCompleted
// 										? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
// 										: isClickable
// 											? "border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
// 											: "cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400"
// 							}`}
// 						>
// 							<Icon
// 								className={`mb-2 h-6 w-6 ${
// 									isCompleted ? "text-green-600" : isActive ? "text-blue-600" : "text-gray-400"
// 								}`}
// 							/>
// 							<span className="text-sm font-medium">{step.title}</span>
// 							<span className="mt-1 text-center text-xs opacity-70">{step.description}</span>
// 						</button>
// 					)
// 				})}
// 			</div>

// 			{/* Step Content */}
// 			<div className="min-h-[600px]">{renderStepContent()}</div>

// 			{/* Navigation Buttons */}
// 			<div className="flex items-center justify-between border-t pt-6">
// 				<Button variant="outline" onClick={handleBack} disabled={!canGoBack}>
// 					<ChevronLeft className="mr-2 h-4 w-4" />
// 					Back
// 				</Button>

// 				<div className="text-sm text-gray-500">
// 					{currentStep === "send"
// 						? "Review and send your envelope"
// 						: !canProceed
// 							? "Please complete this step to continue"
// 							: "Click Next to continue"}
// 				</div>

// 				{currentStep !== "send" && (
// 					<Button onClick={handleNext} disabled={!canProceed}>
// 						Next
// 						<ChevronRight className="ml-2 h-4 w-4" />
// 					</Button>
// 				)}

// 				{currentStep === "send" && (
// 					<div /> // Empty div for spacing
// 				)}
// 			</div>
// 		</div>
// 	)
// }
