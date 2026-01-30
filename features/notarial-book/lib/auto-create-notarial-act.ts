import { and, eq } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

import { checkSigningStatus, getPassportDocument } from "@/services/doconchain"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { idCardDetails } from "@/services/drizzle/schema/id-card-details"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { meetings } from "@/services/drizzle/schema/meetings"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"

/**
 * Generate location statement for notarial act
 * Statement that the electronic notarial act was executed while all parties were
 * situated within the Philippines or in a Philippine embassy/consular office abroad
 */
function generateLocationStatement(location: string | undefined): string {
	const locationLower = (location ?? "Philippines").toLowerCase()

	// Check if location indicates Philippine embassy/consular office abroad
	const isPhilippineEmbassy =
		locationLower.includes("embassy") ||
		locationLower.includes("consular") ||
		locationLower.includes("consul") ||
		locationLower.includes("honorary consul")

	if (isPhilippineEmbassy) {
		return "I hereby certify that this electronic notarial act was executed while all parties concerned were situated within a Philippine embassy, consular office, or office of Philippine Honorary Consul abroad, in accordance with the limited extraterritorial performance of electronic notarial acts."
	}

	// Default statement for acts executed within the Philippines
	return "I hereby certify that this electronic notarial act was executed while all parties concerned were situated within the Philippines."
}

/**
 * Extract principal and witness information from passport data
 */
function extractSignerInfo(passportData: unknown) {
	const signers: Array<{
		name: string
		email: string
		role: string
		signedAt?: string
		idNumber?: string
		address?: string
	}> = []

	if (!passportData || typeof passportData !== "object") {
		return { principal: undefined, witness: undefined, allSigners: signers }
	}

	const passportObj = passportData as {
		data?: {
			signers?: Array<unknown>
			history?: Array<unknown>
			completed_at?: string | number | Date
			location?: string
			ip_address?: string
		}
		signers?: Array<unknown>
		history?: Array<unknown>
		completed_at?: string | number | Date
		location?: string
		ip_address?: string
	}

	console.log("🔵 Extracting signer info from passport data...")
	console.log("   - Passport data structure:", passportObj ? Object.keys(passportObj) : "null")
	console.log(
		"   - Passport data.data structure:",
		passportObj?.data ? Object.keys(passportObj.data) : "null"
	)

	// Type guard for signer objects
	const isSigner = (
		signer: unknown
	): signer is {
		name?: string
		first_name?: string
		last_name?: string
		email?: string
		role?: string
		signer_role?: string
		type?: string
		signed_at?: string
		signedAt?: string
		timestamp?: string
		id_number?: string
		passport_number?: string
		idNumber?: string
		address?: string
	} => {
		return typeof signer === "object" && signer !== null
	}

	// Type guard for history event objects
	const isHistoryEvent = (
		event: unknown
	): event is {
		signer?: unknown
		user?: unknown
		action?: string
		timestamp?: string
		signed_at?: string
		created_at?: string
	} => {
		return typeof event === "object" && event !== null
	}

	// Try different possible structures from DocoChain Passport API
	if (Array.isArray(passportObj?.data?.signers)) {
		console.log(`   - Found ${passportObj.data.signers.length} signer(s) in data.signers`)
		for (const signer of passportObj.data.signers) {
			if (!isSigner(signer)) continue

			const firstName = signer.first_name ?? ""
			const lastName = signer.last_name ?? ""
			const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : ""

			const name = signer.name ?? fullName ?? signer.email?.split("@")[0] ?? "Unknown"
			const email = signer.email ?? ""
			const role = signer.role ?? signer.signer_role ?? signer.type ?? "SIGNER"
			const signedAt = signer.signed_at ?? signer.signedAt ?? signer.timestamp
			const idNumber = signer.id_number ?? signer.passport_number ?? signer.idNumber
			const address = signer.address

			signers.push({
				name,
				email,
				role,
				signedAt,
				idNumber,
				address,
			})
		}
	} else if (Array.isArray(passportObj?.signers)) {
		console.log(`   - Found ${passportObj.signers.length} signer(s) in signers`)
		for (const signer of passportObj.signers) {
			if (!isSigner(signer)) continue

			const firstName = signer.first_name ?? ""
			const lastName = signer.last_name ?? ""
			const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : ""

			const name = signer.name ?? fullName ?? signer.email?.split("@")[0] ?? "Unknown"
			const email = signer.email ?? ""
			const role = signer.role ?? signer.signer_role ?? signer.type ?? "SIGNER"
			const signedAt = signer.signed_at ?? signer.signedAt ?? signer.timestamp
			const idNumber = signer.id_number ?? signer.passport_number ?? signer.idNumber
			const address = signer.address

			signers.push({
				name,
				email,
				role,
				signedAt,
				idNumber,
				address,
			})
		}
	} else if (passportObj?.data?.history) {
		// Extract from history/audit trail
		console.log("   - Trying to extract from history...")
		const history = Array.isArray(passportObj.data.history)
			? passportObj.data.history
			: Array.isArray(passportObj.history)
				? passportObj.history
				: []

		console.log(`   - Found ${history.length} history event(s)`)
		for (const event of history) {
			if (!isHistoryEvent(event)) continue

			const signerData = event.signer ?? event.user ?? event

			if (!isSigner(signerData)) continue

			const action = event.action
			if (action !== "signed" && action !== "sign" && !event.signer && !event.user) {
				continue
			}

			const firstName = signerData.first_name ?? ""
			const lastName = signerData.last_name ?? ""
			const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : ""

			const name = signerData.name ?? fullName ?? signerData.email?.split("@")[0] ?? "Unknown"

			// Avoid duplicates
			const existingSigner = signers.find(s => s.email === signerData.email || s.name === name)

			if (!existingSigner) {
				const email = signerData.email ?? ""
				const role = signerData.role ?? signerData.signer_role ?? action ?? "SIGNER"
				const signedAt =
					event.timestamp ??
					event.signed_at ??
					event.created_at ??
					signerData.signed_at ??
					signerData.signedAt ??
					signerData.timestamp
				const idNumber = signerData.id_number ?? signerData.passport_number ?? signerData.idNumber
				const address = signerData.address

				signers.push({
					name,
					email,
					role,
					signedAt,
					idNumber,
					address,
				})
			}
		}
	}

	console.log(`   - Total unique signers found: ${signers.length}`)
	if (signers.length > 0) {
		console.log(
			"   - Signers:",
			signers.map(s => `${s.name} (${s.email}, ${s.role})`)
		)
	}

	// Identify principal (usually first signer or role "PRINCIPAL" or "SIGNER", excluding ENP/NOTARY)
	const principal =
		signers.find(s => {
			const roleUpper = s.role?.toUpperCase() ?? ""
			return (
				(roleUpper.includes("PRINCIPAL") ||
					roleUpper.includes("SIGNER") ||
					roleUpper === "SIGNER") &&
				!roleUpper.includes("ENP") &&
				!roleUpper.includes("NOTARY") &&
				!roleUpper.includes("WITNESS")
			)
		}) ??
		signers.find(s => {
			const roleUpper = s.role?.toUpperCase() ?? ""
			return (
				!roleUpper.includes("ENP") &&
				!roleUpper.includes("NOTARY") &&
				!roleUpper.includes("WITNESS")
			)
		}) ??
		signers[0]

	// Identify witness (role "WITNESS")
	const witness = signers.find(s => s.role?.toUpperCase().includes("WITNESS"))

	console.log(`   - Principal: ${principal?.name ?? "None"}`)
	console.log(`   - Witness: ${witness?.name ?? "None"}`)

	return { principal, witness, allSigners: signers }
}

/**
 * Determine act type from document or passport data
 */
function determineActType(
	documentName: string,
	documentDescription: string | null,
	_passportData: unknown
): "ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING" {
	const combinedText = `${documentName} ${documentDescription ?? ""}`.toLowerCase()

	// Check for keywords
	if (combinedText.includes("acknowledgment") || combinedText.includes("acknowledge")) {
		return "ACKNOWLEDGMENT"
	}
	if (combinedText.includes("affirmation") || combinedText.includes("affirm")) {
		return "AFFIRMATION"
	}
	if (combinedText.includes("jurat") || combinedText.includes("sworn")) {
		return "JURAT"
	}
	if (combinedText.includes("witness") || combinedText.includes("witnessing")) {
		return "SIGNATURE_WITNESSING"
	}

	// Default to acknowledgment (most common)
	return "ACKNOWLEDGMENT"
}

/**
 * Automatically create a notarial act entry when an electronic notarial act is completed
 * This implements the requirement: "automatically populated in chronological order, properly referenced, and indexed"
 *
 * @param db - Database instance
 * @param documentId - ID of the completed document
 * @param projectUuid - DocoChain project UUID
 * @param enpUserId - ID of the ENP who performed the notarial act
 * @param userEmail - Email of the ENP (for DocoChain API calls)
 * @returns The created notarial act entry, or null if it already exists or creation fails
 */
export async function autoCreateNotarialAct(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	db: PostgresJsDatabase<any>,
	documentId: string,
	projectUuid: string,
	enpUserId: string,
	userEmail?: string
): Promise<typeof notarialActs.$inferSelect | null> {
	try {
		// Get or create notarial book for this ENP
		// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		let notarialBook = await db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, enpUserId),
		})

		if (!notarialBook) {
			const [created] = await db
				.insert(notarialBooks)
				.values({
					enpId: enpUserId,
				})
				.returning()

			if (!created) {
				console.error("Failed to create notarial book for ENP:", enpUserId)
				return null
			}

			notarialBook = created
		}

		// Check if act already exists (prevent duplicates)
		const notarialBookId = (notarialBook as { id?: string }).id ?? ""
		// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const existingAct = await db.query.notarialActs.findFirst({
			where: and(
				eq(notarialActs.notarialBookId, notarialBookId),
				eq(notarialActs.docoChainProjectUuid, projectUuid)
			),
		})

		if (existingAct) {
			console.log("Notarial act already exists for project:", projectUuid)
			return existingAct as typeof notarialActs.$inferSelect
		}

		// Get document information
		// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const document = await db.query.documents.findFirst({
			where: eq(documents.id, documentId),
		})

		if (!document) {
			console.error("Document not found:", documentId)
			return null
		}

		// CRITICAL: Verify document is fully signed before creating notarial act entry
		// This ensures only fully signed documents appear in the Notarial Book
		try {
			console.log("🔵 Verifying document is fully signed before creating notarial act entry...")
			const signingStatus = await checkSigningStatus(projectUuid, userEmail)

			if (!signingStatus.isFullySigned) {
				console.warn("⚠️ Document is NOT fully signed - skipping notarial act creation:", {
					projectUuid,
					projectStatus: signingStatus.projectStatus,
					signedCount: signingStatus.signedCount,
					totalSigners: signingStatus.totalSigners,
				})
				console.warn("   - Only fully signed documents should be added to the Notarial Book")
				return null // Don't create entry for unsigned documents
			}

			console.log("✅ Document is fully signed, proceeding to create notarial act entry")
		} catch (statusError) {
			console.error("⚠️ Error checking signing status before creating notarial act:", statusError)
			const errorMessage = statusError instanceof Error ? statusError.message : String(statusError)

			// If it's clearly "not fully signed", don't create entry
			if (
				errorMessage.includes("not fully signed") ||
				errorMessage.includes("not fully signed yet")
			) {
				console.warn("⚠️ Document is not fully signed - skipping notarial act creation")
				return null
			}

			// For other errors (API issues), log but continue - might be temporary
			// The entry will be created but the document might not be available later
			console.warn(
				"⚠️ Could not verify signing status, but continuing with entry creation (might be temporary API issue)"
			)
		}

		// Get ENP user information
		// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const enpUser = await db.query.users.findFirst({
			where: eq(users.id, enpUserId),
		})

		if (!enpUser || (enpUser as { role?: string }).role !== "ENP") {
			console.error("User is not an ENP:", enpUserId)
			return null
		}

		// Get legal registration for roll number
		// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		const legalRegistration = await db.query.legalRegistrations.findFirst({
			where: eq(legalRegistrations.applicantId, enpUserId),
		})

		// Identify the principal (document uploader/signer)
		// Priority: 1) Passport data signers (actual signers), 2) Meeting participants (uploader)
		let principalName = "Unknown"
		let principalIdNumber: string | undefined
		let principalAddress: string | undefined
		let principalIdImageBase64: string | undefined
		let principalIdType: string | undefined
		let principalEmail: string | undefined

		// Fetch passport data from DocoChain FIRST to get actual signer information
		// Since the document is fully signed, passport data should have the signers
		let passportData: unknown = null
		let witnessName: string | null = null
		let witnessIdNumber: string | undefined
		let executedAt = new Date()
		let workflow: "REN" | "IEN" = "REN"
		let location = "Philippines"
		let ipAddress: string | undefined

		try {
			// Get history view for audit trail and complete information
			const enpUserEmail = (enpUser as { email?: string }).email
			passportData = await getPassportDocument(
				projectUuid,
				"history",
				userEmail ?? enpUserEmail ?? undefined
			)
			console.log("🔵 Fetched passport data for principal identification")

			// Extract signer information - passport data should have the actual signers
			const { principal, witness, allSigners } = extractSignerInfo(passportData)

			// Use passport data signers as the primary source (these are the actual document signers)
			if (principal) {
				principalName = principal.name ?? "Unknown"
				principalIdNumber = principal.idNumber
				principalAddress = principal.address
				principalEmail = principal.email
				console.log("✅ Found principal from passport data (actual signer):", principalName)
			} else if (allSigners && allSigners.length > 0) {
				// If no principal identified, use the first signer (excluding ENP if possible)
				const nonEnpSigner =
					allSigners.find(
						s =>
							s.role &&
							!s.role.toUpperCase().includes("ENP") &&
							!s.role.toUpperCase().includes("NOTARY")
					) ?? allSigners[0]

				if (nonEnpSigner) {
					principalName = nonEnpSigner.name ?? "Unknown"
					principalEmail = nonEnpSigner.email
					console.log("✅ Found principal from passport signers:", principalName)
				}
			}

			if (witness) {
				witnessName = witness.name ?? null
				witnessIdNumber = witness.idNumber
			}

			// Type guard for passport data
			const passportObj = passportData as {
				data?: {
					completed_at?: string | number | Date
					history?: Array<unknown>
					location?: string
					ip_address?: string
				}
				completed_at?: string | number | Date
				history?: Array<unknown>
				location?: string
				ip_address?: string
			} | null

			// Get execution time from passport data
			// Priority: 1) Principal signer's signed_at (actual signing time), 2) completed_at, 3) latest history event
			if (principal?.signedAt) {
				// Use the principal signer's actual signing time
				executedAt = new Date(principal.signedAt)
				console.log("✅ Using principal signer's signed_at timestamp:", principal.signedAt)
			} else if (allSigners && allSigners.length > 0) {
				// Find the earliest or latest signer's signed_at timestamp
				const signersWithTimestamp = allSigners
					.filter(s => s.signedAt)
					.map(s => ({ signedAt: s.signedAt!, timestamp: new Date(s.signedAt!).getTime() }))
					.sort((a, b) => a.timestamp - b.timestamp) // Sort by earliest first

				if (signersWithTimestamp.length > 0) {
					const first = signersWithTimestamp[0]!
					// Use the earliest signing time (when the document was first signed)
					executedAt = new Date(first.signedAt)
					console.log("✅ Using earliest signer's signed_at timestamp:", first.signedAt)
				}
			}

			// Fallback to completed_at if no signer timestamps available
			if (executedAt.getTime() === new Date().getTime() && passportObj?.data?.completed_at) {
				executedAt = new Date(passportObj.data.completed_at)
				console.log("✅ Using completed_at timestamp:", passportObj.data.completed_at)
			} else if (executedAt.getTime() === new Date().getTime() && passportObj?.completed_at) {
				executedAt = new Date(passportObj.completed_at)
				console.log("✅ Using completed_at timestamp:", passportObj.completed_at)
			} else if (
				executedAt.getTime() === new Date().getTime() &&
				Array.isArray(passportObj?.data?.history) &&
				passportObj.data.history.length > 0
			) {
				// Get the latest timestamp from history
				const lastEvent = passportObj.data.history[passportObj.data.history.length - 1]
				if (
					typeof lastEvent === "object" &&
					lastEvent !== null &&
					"timestamp" in lastEvent &&
					typeof lastEvent.timestamp === "string"
				) {
					executedAt = new Date(lastEvent.timestamp)
					console.log("✅ Using latest history event timestamp:", lastEvent.timestamp)
				}
			} else if (
				executedAt.getTime() === new Date().getTime() &&
				Array.isArray(passportObj?.history) &&
				passportObj.history.length > 0
			) {
				const lastEvent = passportObj.history[passportObj.history.length - 1]
				if (
					typeof lastEvent === "object" &&
					lastEvent !== null &&
					"timestamp" in lastEvent &&
					typeof lastEvent.timestamp === "string"
				) {
					executedAt = new Date(lastEvent.timestamp)
					console.log("✅ Using latest history event timestamp:", lastEvent.timestamp)
				}
			}

			// Determine workflow (REN if has video/remote indicators, IEN otherwise)
			const passportText = JSON.stringify(passportData).toLowerCase()
			if (
				passportText.includes("remote") ||
				passportText.includes("video") ||
				passportText.includes("ren")
			) {
				workflow = "REN"
			} else {
				workflow = "IEN"
			}

			// Extract location and IP if available
			if (passportObj?.data?.location) {
				location = passportObj.data.location
			} else if (passportObj?.location) {
				location = passportObj.location
			}

			if (passportObj?.data?.ip_address) {
				ipAddress = passportObj.data.ip_address
			} else if (passportObj?.ip_address) {
				ipAddress = passportObj.ip_address
			}
		} catch (error) {
			console.error("Error fetching passport data for notarial act:", error)
			// Continue with default values if passport fetch fails
		}

		// Fallback: If we still don't have a principal and document is linked to a meeting,
		// try to find the principal from meeting participants (document uploader)
		const documentMeetingId = (document as { meetingId?: string | null }).meetingId
		if (principalName === "Unknown" && documentMeetingId) {
			try {
				console.log("🔵 Fallback: Trying to find principal from meeting participants...")
				// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				const meeting = await db.query.meetings.findFirst({
					where: eq(meetings.id, documentMeetingId),
					with: {
						participants: {
							with: {
								user: {
									columns: {
										id: true,
										name: true,
										email: true,
										role: true,
									},
								},
							},
						},
					},
				})

				const meetingObj = meeting as
					| {
							participants?: Array<{
								user?: {
									id?: string
									name?: string
									email?: string
									role?: string
								}
							}>
					  }
					| null
					| undefined

				const meetingParticipants =
					meetingObj &&
					typeof meetingObj === "object" &&
					"participants" in meetingObj &&
					Array.isArray(meetingObj.participants)
						? meetingObj.participants
						: []

				if (meetingParticipants.length > 0) {
					console.log(`   - Found ${meetingParticipants.length} meeting participant(s)`)

					// Find the participant who is NOT the ENP (the principal/uploader)
					const principalParticipant = meetingParticipants.find(p => {
						if (
							typeof p === "object" &&
							p !== null &&
							"user" in p &&
							typeof p.user === "object" &&
							p.user !== null &&
							"id" in p.user &&
							"role" in p.user
						) {
							const user = p.user as { id?: string; role?: string }
							return user.id !== enpUserId && user.role !== "ENP"
						}
						return false
					})

					if (
						principalParticipant &&
						typeof principalParticipant === "object" &&
						principalParticipant !== null &&
						"user" in principalParticipant &&
						typeof principalParticipant.user === "object" &&
						principalParticipant.user !== null
					) {
						const user = principalParticipant.user as { name?: string; email?: string }
						principalName = user.name ?? user.email ?? "Unknown"
						console.log("✅ Found principal from meeting participants (uploader):", principalName)
					} else {
						console.log("   - No non-ENP participant found, principal remains Unknown")
					}
				} else {
					console.log("   - No meeting participants found")
				}
			} catch (error) {
				console.warn("Failed to get meeting participants for principal identification:", error)
			}
		}

		// Determine act type - use document's notarizationType if available, otherwise determine from name/description
		const documentName = (document as { name?: string }).name ?? ""
		const documentDescription = (document as { description?: string | null }).description ?? null
		const documentNotarizationType = (
			document as {
				notarizationType?:
					| "ACKNOWLEDGMENT"
					| "AFFIRMATION"
					| "JURAT"
					| "SIGNATURE_WITNESSING"
					| null
			}
		).notarizationType

		const actType =
			documentNotarizationType ?? determineActType(documentName, documentDescription, passportData)

		// Generate certificate number (unique reference)
		const certificateNumber = `NB-${notarialBookId.substring(0, 4).toUpperCase()}-${executedAt.getTime().toString().slice(-6)}`

		// Generate location statement
		const locationStatement = generateLocationStatement(location)

		const enpUserName = (enpUser as { name?: string }).name ?? "Unknown ENP"
		const enpRollNumber = (legalRegistration as { rollOfAttorneysNumber?: string } | undefined)
			?.rollOfAttorneysNumber

		// Fetch principal's ID image and details from id_card_details table if we have principal email
		if (principalEmail) {
			try {
				// First get user ID from email
				// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				const principalUser = (await db.query.users.findFirst({
					where: eq(users.email, principalEmail),
					columns: {
						id: true,
					},
				})) as { id?: string } | undefined

				if (principalUser?.id) {
					// Fetch ID card details
					// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					const idCardDetail = (await db.query.idCardDetails.findFirst({
						where: eq(idCardDetails.userId, principalUser.id),
						orderBy: (table, { desc }) => [desc(table.verifiedAt)],
					})) as
						| { faceImageUrl?: string | null; rawOcrData?: unknown; documentType?: string }
						| undefined

					if (idCardDetail?.faceImageUrl) {
						principalIdImageBase64 = String(idCardDetail.faceImageUrl)
						console.log(
							"✅ Found principal ID image from id_card_details table for:",
							principalEmail
						)
					} else {
						console.log("⚠️ No ID image found for principal:", principalEmail)
					}

					// Extract OCR document type from rawOcrData
					if (idCardDetail?.rawOcrData) {
						try {
							const ocrFields = idCardDetail.rawOcrData as Record<string, unknown>
							// Try to find document type in OCR fields
							// Priority: documentId (stored during KYC) > documentType > idType > module name > other fields
							const docType =
								ocrFields.documentId ?? // Stored during direct KYC
								ocrFields.documentType ??
								ocrFields.idType ??
								ocrFields.document_type ??
								ocrFields.id_type ??
								ocrFields.type ??
								ocrFields.module ?? // Module name from HyperVerge
								ocrFields.moduleName

							if (docType && typeof docType === "string") {
								// Map document ID codes to human-readable labels
								const documentTypeMap: Record<string, string> = {
									"dl": "Driver's License",
									"national_id": "National ID",
									"passport": "Passport",
									"voter_id": "Voter ID",
									"driver's license": "Driver's License",
									"national id": "National ID",
									"voter id": "Voter ID",
								}

								principalIdType =
									documentTypeMap[docType.toLowerCase()] ??
									docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, " ")
								console.log(
									"✅ Found principal ID type from OCR:",
									principalIdType,
									"from field:",
									docType
								)
							} else {
								console.log(
									"⚠️ No document type found in OCR fields. Available fields:",
									Object.keys(ocrFields)
								)
							}

							// Use documentType field directly if available
							if (!principalIdType && idCardDetail.documentType) {
								principalIdType = String(idCardDetail.documentType)
								console.log("✅ Found principal ID type from documentType field:", principalIdType)
							}
						} catch (error) {
							console.warn("Failed to parse OCR data:", error)
						}
					}
				} else {
					console.log("⚠️ No user found for principal email:", principalEmail)
				}
			} catch (error) {
				console.warn("Failed to fetch principal ID details:", error)
			}
		} else {
			// Try to get principal from documentSigners table as fallback
			try {
				// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				const signersList = (await db.query.documentSigners.findMany({
					where: eq(documentSigners.documentId, documentId),
					with: {
						user: {
							columns: {
								id: true,
								email: true,
								role: true,
							},
						},
					},
				})) as
					| Array<{
							user?: { id?: string; email?: string; role?: string } | null
					  }>
					| undefined

				// Find the principal (non-ENP signer)
				const principalSigner = signersList?.find(s => {
					return s?.user && typeof s.user === "object" && "role" in s.user && s.user.role !== "ENP"
				})

				// Fetch ID card details for principal signer
				if (principalSigner?.user?.id) {
					// @ts-expect-error - PostgresJsDatabase<any> doesn't provide proper types for query builder
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					const idCardDetail = (await db.query.idCardDetails.findFirst({
						where: eq(idCardDetails.userId, principalSigner.user.id),
						orderBy: (table, { desc }) => [desc(table.verifiedAt)],
					})) as
						| { faceImageUrl?: string | null; rawOcrData?: unknown; documentType?: string }
						| undefined

					if (idCardDetail?.faceImageUrl) {
						principalIdImageBase64 = String(idCardDetail.faceImageUrl)
						console.log("✅ Found principal ID image from documentSigners")
					}

					// Extract OCR document type
					if (idCardDetail?.rawOcrData) {
						try {
							const ocrFields = idCardDetail.rawOcrData as Record<string, unknown>
							const docType =
								ocrFields.documentType ??
								ocrFields.idType ??
								ocrFields.document_type ??
								ocrFields.id_type ??
								ocrFields.type ??
								ocrFields.documentId

							if (docType && typeof docType === "string") {
								const documentTypeMap: Record<string, string> = {
									"dl": "Driver's License",
									"national_id": "National ID",
									"passport": "Passport",
									"voter_id": "Voter ID",
									"driver's license": "Driver's License",
									"national id": "National ID",
									"voter id": "Voter ID",
								}

								principalIdType =
									documentTypeMap[docType.toLowerCase()] ??
									docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, " ")
								console.log("✅ Found principal ID type from documentSigners OCR:", principalIdType)
							}

							// Use documentType field directly if available
							if (!principalIdType && idCardDetail.documentType) {
								principalIdType = String(idCardDetail.documentType)
								console.log("✅ Found principal ID type from documentType field:", principalIdType)
							}
						} catch (error) {
							console.warn("Failed to parse OCR data from documentSigners:", error)
						}
					}
				}
			} catch (error) {
				console.warn("Failed to fetch principal ID from documentSigners:", error)
			}
		}

		// Create notarial act entry
		// This is automatically populated in chronological order (via executedAt timestamp)
		// Properly referenced (via certificateNumber, documentId, projectUuid)
		// Indexed (via database indexes we added)
		const [createdAct] = await db
			.insert(notarialActs)
			.values({
				notarialBookId,
				actType,
				documentId,
				docoChainProjectUuid: projectUuid,
				principalName,
				principalIdNumber,
				principalAddress,
				principalIdImageBase64,
				principalIdType,
				witnessName,
				witnessIdNumber,
				enpName: enpUserName,
				enpRollNumber,
				executedAt, // Used for chronological ordering
				location,
				ipAddress,
				workflow,
				locationStatement,
				documentName,
				documentDescription,
				passportData: passportData ? JSON.stringify(passportData) : null,
				certificateNumber, // Unique reference number
			})
			.returning()

		if (!createdAct) {
			console.error("Failed to create notarial act entry")
			return null
		}

		const actId =
			createdAct && typeof createdAct === "object" && "id" in createdAct
				? String(createdAct.id)
				: undefined
		const actCertNumber =
			createdAct && typeof createdAct === "object" && "certificateNumber" in createdAct
				? String(createdAct.certificateNumber)
				: undefined
		const actPrincipalName =
			createdAct && typeof createdAct === "object" && "principalName" in createdAct
				? String(createdAct.principalName)
				: undefined
		const actExecutedAt =
			createdAct &&
			typeof createdAct === "object" &&
			"executedAt" in createdAct &&
			createdAct.executedAt instanceof Date
				? createdAct.executedAt
				: undefined

		console.log("✅ Automatically created notarial act entry:", {
			id: actId,
			certificateNumber: actCertNumber,
			principalName: actPrincipalName,
			executedAt: actExecutedAt,
		})

		return createdAct
	} catch (error) {
		console.error("Error automatically creating notarial act:", error)
		return null
	}
}
