// Token management
export { generateToken, getCachedToken, getToken, invalidateToken } from "./lib/token-cache"

// HTTP client
export { apiCall } from "./lib/http-client"

// Utils
export { normalizeUrl, normalizeUrlRequired, splitName } from "./lib/utils"

// Schemas
export type {
	CreateProjectResponse,
	ProjectData,
	ProjectDetailsResponse,
	Signer,
	VaultFile,
	VaultItem,
	VaultItemDetail,
	VaultItemsResponse,
} from "./lib/schemas"

// API - Project
export { addSignatureMark, createProject, getProjectDetails, sendProject } from "./api/project"

// API - Signer
export { addSignerToProject, deleteSigner, updateProjectSigner } from "./api/signer"

// API - Organization
export { autoJoinOrganization, ensureJoinedToOrganization, provisionUser } from "./api/organization"

// API - Document
export {
	checkSigningStatus,
	downloadCertificate,
	downloadSignedDocument,
	getProcessingCompletedProjects,
} from "./api/document"

// API - Link
export { generateEditDraftLink, generateSignLink, getSigningUrl } from "./api/link"

// API - Vault
export { getVaultItem, getVaultItems } from "./api/vault"

// API - Passport
export { getPassportDocument } from "./api/passport"
