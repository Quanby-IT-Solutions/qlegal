export interface CaptureState {
	isCapturing: boolean
	hasCameraAccess: boolean
	error: string | null
	capturedImage: string | null
	isProcessing: boolean
}
