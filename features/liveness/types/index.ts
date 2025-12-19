// Liveness Validation Types based on API documentation

export interface LivenessConfig {
	showCaptureInstructions: boolean
	disableLiveness: boolean
}

export interface QualityCheck {
	value: "yes" | "no"
	confidence: "high" | "medium" | "low"
}

export interface LivenessDetails {
	liveFace: {
		value: "yes" | "no"
	}
	qualityChecks: {
		eyesClosed: QualityCheck
		occlusion: QualityCheck
		multipleFaces: QualityCheck
	}
}

export interface LivenessSummary {
	action: "pass" | "fail"
	details: string[]
}

export interface LivenessApiResponse {
	status: "success" | "error"
	statusCode: number
	metadata: {
		requestId: string
		transactionId: string
	}
	result: {
		details: LivenessDetails[]
		summary: LivenessSummary
	}
}

export interface LivenessValidationRequest {
	module: string
	moduleId: string
	selfieImageUrl: string
	attempts: number
	apiResponse?: LivenessApiResponse
	previousAttempts: any[]
}

export interface CaptureState {
	isCapturing: boolean
	hasCameraAccess: boolean
	error: string | null
	capturedImage: string | null
	isProcessing: boolean
}
