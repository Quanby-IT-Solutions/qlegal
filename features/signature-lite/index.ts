// Signature Lite - Simplified signature workflow components
export { EnvelopeBuilder } from "./components/envelope-builder"
export { DocumentUpload } from "./components/document-upload"
export {
	RecipientManager,
	type Recipient
} from "./components/recipient-manager"
export { SignaturePositioning } from "./components/signature-positioning"

// Document positioning components
export {
	PrePositioningPage,
	UpdatePositioningPage,
	type DocumentField
} from "./components/document-prepositioning"

// Enhanced PDF viewer
export { default as PDFViewerEnhanced } from "./components/pdf-viewer-enhanced"

// API exports
export * from "./api/new-signature.schemas"
