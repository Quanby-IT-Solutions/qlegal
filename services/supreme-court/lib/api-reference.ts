/**
 * Supreme Court eNotarization API Reference (v1.4)
 *
 * Naming convention prefixes (system auto-prepends if not included):
 * - NPN: Notary Public Number (e.g. NPN-123)
 * - NFN: Notary Facility Number (e.g. NFN-123)
 * - RN: Roll Number (e.g. RN-123)
 * - NRID: Notarial Registry ID (e.g. NRID-123aBc)
 * - NRN: Notarial Registry Number (e.g. NRN-123AbC)
 *
 * Conditions:
 * - System rejects metadata creation if Commission Status or Accreditation Status is Inactive
 * - Commission Status and Accreditation Status accept only "Active" or "Inactive"
 */

export const SUPREME_COURT_ERROR_CODES = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const

export const SUPREME_COURT_ERROR_MESSAGES = {
	[400]: "Invalid input data",
	[401]: "Missing or invalid token",
	[404]: "Task not found",
	[500]: "Something went wrong on the server",
} as const
