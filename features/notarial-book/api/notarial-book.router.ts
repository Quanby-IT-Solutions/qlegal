import { TRPCError } from "@trpc/server"
import { and, count, desc, eq, isNotNull } from "drizzle-orm"
import { z } from "zod/v4"

import {
	checkSigningStatus,
	downloadCertificate,
	getMyProjectDetails,
	getPassportDocument,
	getProcessingCompletedProjects,
	getProjectDetails,
} from "@/services/doconchain"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { documentSigners } from "@/services/drizzle/schema/document-signers"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { meetings } from "@/services/drizzle/schema/meetings"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { autoCreateNotarialAct } from "@/features/notarial-book/lib/auto-create-notarial-act"

const getNotarialBookSchema = z.object({
	page: z.number().min(1).default(1),
	perPage: z.number().min(1).max(100).default(50),
	search: z.string().optional(),
	actType: z
		.enum(["ALL", "ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"])
		.default("ALL"),
	workflow: z.enum(["ALL", "REN", "IEN"]).default("ALL"),
})

const syncDocumentToNotarialBookSchema = z.object({
	documentId: z.string().min(1),
	projectUuid: z.string().min(1),
	actType: z.enum(["ACKNOWLEDGMENT", "AFFIRMATION", "JURAT", "SIGNATURE_WITNESSING"]),
})

/**
 * Generate location statement for notarial act
 * Statement that the electronic notarial act was executed while all parties were
 * situated within the Philippines or in a Philippine embassy/consular office abroad
 */
function generateLocationStatement(location: string | undefined | null): string {
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
	}> = []

	if (!passportData || typeof passportData !== "object") {
		return { principal: undefined, witness: undefined, allSigners: signers }
	}

	const passportObj = passportData as {
		data?: {
			signers?: Array<unknown>
			history?: Array<unknown>
		}
		signers?: Array<unknown>
		history?: Array<unknown>
	}

	// Try different possible structures from DocoChain Passport API
	if (passportObj.data?.signers && Array.isArray(passportObj.data.signers)) {
		for (const signer of passportObj.data.signers) {
			if (signer && typeof signer === "object") {
				const s = signer as {
					name?: unknown
					email?: unknown
					role?: unknown
					signedAt?: unknown
					idNumber?: unknown
				}
				if (
					typeof s.name === "string" &&
					typeof s.email === "string" &&
					typeof s.role === "string"
				) {
					signers.push({
						name: s.name,
						email: s.email,
						role: s.role,
						signedAt: typeof s.signedAt === "string" ? s.signedAt : undefined,
						idNumber: typeof s.idNumber === "string" ? s.idNumber : undefined,
					})
				}
			}
		}
	} else if (passportObj.signers && Array.isArray(passportObj.signers)) {
		for (const signer of passportObj.signers) {
			if (signer && typeof signer === "object") {
				const s = signer as {
					name?: unknown
					email?: unknown
					role?: unknown
					signedAt?: unknown
					idNumber?: unknown
				}
				if (
					typeof s.name === "string" &&
					typeof s.email === "string" &&
					typeof s.role === "string"
				) {
					signers.push({
						name: s.name,
						email: s.email,
						role: s.role,
						signedAt: typeof s.signedAt === "string" ? s.signedAt : undefined,
						idNumber: typeof s.idNumber === "string" ? s.idNumber : undefined,
					})
				}
			}
		}
	} else if (passportObj.data?.history || passportObj.history) {
		// Extract from history/audit trail
		const history = Array.isArray(passportObj.data?.history)
			? passportObj.data.history
			: Array.isArray(passportObj.history)
				? passportObj.history
				: []

		for (const event of history) {
			if (event && typeof event === "object" && "signer" in event) {
				const evt = event as { signer?: unknown; timestamp?: unknown; signed_at?: unknown }
				const signer = evt.signer
				if (signer && typeof signer === "object") {
					const sig = signer as {
						name?: unknown
						first_name?: unknown
						last_name?: unknown
						email?: unknown
						role?: unknown
						signer_role?: unknown
					}
					const name =
						typeof sig.name === "string"
							? sig.name
							: typeof sig.first_name === "string" && typeof sig.last_name === "string"
								? `${sig.first_name} ${sig.last_name}`.trim()
								: "Unknown"
					const email = typeof sig.email === "string" ? sig.email : ""
					const role =
						typeof sig.role === "string"
							? sig.role
							: typeof sig.signer_role === "string"
								? sig.signer_role
								: "SIGNER"
					const signedAt =
						typeof evt.timestamp === "string"
							? evt.timestamp
							: typeof evt.signed_at === "string"
								? evt.signed_at
								: undefined

					if (name && email) {
						signers.push({
							name,
							email,
							role,
							signedAt,
						})
					}
				}
			}
		}
	}

	// Identify principal (usually first signer or role "PRINCIPAL")
	const principal =
		signers.find(
			s => s.role?.toUpperCase().includes("PRINCIPAL") || s.role?.toUpperCase().includes("SIGNER")
		) ?? signers[0]

	// Identify witness (role "WITNESS")
	const witness = signers.find(s => s.role?.toUpperCase().includes("WITNESS"))

	return { principal, witness, allSigners: signers }
}

export const notarialBookRouter = createTRPCRouter({
	/**
	 * Get notarial book entries directly from DocoChain API (no database sync required)
	 * Fetches completed projects using Get Specific Project API
	 */
	getNotarialBookFromAPI: protectedProcedure
		.input(getNotarialBookSchema)
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { page, perPage, search, actType, workflow } = input

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access the notarial book",
				})
			}

			if (!user.email) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "User email is required to fetch projects from DocoChain",
				})
			}

			try {
				// Fetch completed projects directly from DocoChain API
				console.log("🔵 Fetching completed projects from DocoChain API...")
				const projectsResponse = await getProcessingCompletedProjects(user.email, {
					page,
					perPage,
					status: "completed",
					apiIntegratedProjectsOnly: true,
				})

				const projects = projectsResponse.data ?? []
				console.log(`✅ Found ${projects.length} completed project(s) from DocoChain API`)

				// Fetch details for each project and transform to notarial book format
				const acts = await Promise.all(
					projects.map(async project => {
						const projectUuid = project.uuid || project.project_uuid
						if (!projectUuid) {
							console.warn(`⚠️ Project ${project.id} has no UUID, skipping`)
							return null
						}

						try {
							// Try getMyProjectDetails first, fall back to getProjectDetails
							let projectDetails
							try {
								projectDetails = await getMyProjectDetails(projectUuid, user.email ?? undefined)
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error)
								if (errorMessage.includes("not part of this project")) {
									console.log(
										`⚠️ User not part of project ${projectUuid}, using getProjectDetails...`
									)
									projectDetails = await getProjectDetails(projectUuid, user.email ?? undefined)
								} else {
									throw error
								}
							}

							const projectData = projectDetails?.data
							if (!projectData) {
								console.warn(`⚠️ No project data for ${projectUuid}`)
								return null
							}

							// Extract signer information from documentSigners table (most reliable source)
							// First, find the document that has this project UUID
							const document = await ctx.db.query.documents.findFirst({
								where: eq(documents.docoChainProjectId, projectUuid),
								with: {
									signers: {
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

							let principals: Array<{ name: string; signedAt?: string; idNumber?: string }> = []
							let witness: { name: string; signedAt?: string } | undefined
							let allSigners: Array<{ name: string; email: string; role: string; signedAt?: string; idNumber?: string }> = []

							// Extract from documentSigners table (most reliable - stored in our database)
							// Also get signed_at timestamps from projectData.signers
							const projectSignersMap = new Map<string, { signed_at?: string | null; signer_role?: string }>()
							const projectSigners = (projectData.signers as Array<{
								email?: string
								first_name?: string | null
								last_name?: string | null
								status?: string
								signed_at?: string | null
								signer_role?: string
							}>) ?? []

							// Create a map of email -> signer data for quick lookup
							for (const signer of projectSigners) {
								if (signer.email) {
									projectSignersMap.set(signer.email.toLowerCase(), {
										signed_at: signer.signed_at,
										signer_role: signer.signer_role,
									})
								}
							}

							if (document?.signers && document.signers.length > 0) {
								console.log(
									`✅ Found ${document.signers.length} signer(s) in documentSigners table`
								)
								for (const docSigner of document.signers) {
									if (!docSigner.user?.email) continue

									const signerUser = docSigner.user
									const email = signerUser.email! // guarded above
									// Use signerName from documentSigners if available, otherwise use user name
									const name =
										docSigner.signerName ?? signerUser.name ?? email.split("@")[0] ?? "Unknown"
									const role = signerUser.role ?? "SIGNER"

									// Get signed_at timestamp from project signers if available
									const projectSignerData = projectSignersMap.get(email.toLowerCase())
									const signedAt = projectSignerData?.signed_at ?? undefined

									allSigners.push({
										name,
										email,
										role,
										signedAt,
										idNumber: undefined, // Can be enhanced if we store ID number in documentSigners
									})
								}

								// Identify ALL principals (non-ENP, non-NOTARY, non-WITNESS signers)
								principals = allSigners
								.filter(s => {
									const roleUpper = s.role.toUpperCase()
									return (
										!roleUpper.includes("ENP") &&
										!roleUpper.includes("NOTARY") &&
										!roleUpper.includes("WITNESS")
									)
								})
								.map(s => ({
									name: s.name,
									signedAt: s.signedAt,
									idNumber: s.idNumber,
								}))

							// If no principals found, use first signer as fallback
							if (principals.length === 0 && allSigners.length > 0 && allSigners[0]) {
								principals = [
									{
										name: allSigners[0].name,
										signedAt: allSigners[0].signedAt,
										idNumber: allSigners[0].idNumber,
									},
								]
							}
						}

						// Fallback 1: Try projectData.signers if documentSigners didn't work
							if (allSigners.length === 0 && projectSigners.length > 0) {
								console.log(`✅ Found ${projectSigners.length} signer(s) in project details`)
								for (const signer of projectSigners) {
									if (!signer.email) continue

									const firstName = signer.first_name ?? ""
									const lastName = signer.last_name ?? ""
									const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : ""
									const name = fullName || (signer.email?.split("@")[0] ?? "Unknown")
									const role = signer.signer_role ?? "SIGNER"
									const signedAt = signer.signed_at ?? undefined

									allSigners.push({
										name,
										email: signer.email,
										role,
										signedAt,
									})
								}

								// Identify ALL principals (non-ENP, non-NOTARY, non-WITNESS signers)
								principals = allSigners
									.filter(s => {
										const roleUpper = s.role.toUpperCase()
										return (
											!roleUpper.includes("ENP") &&
											!roleUpper.includes("NOTARY") &&
											!roleUpper.includes("WITNESS")
										)
									})
									.map(s => ({
										name: s.name,
										signedAt: s.signedAt,
										idNumber: s.idNumber,
									}))

								// If no principals found, use first signer as fallback
								if (principals.length === 0 && allSigners.length > 0 && allSigners[0]) {
									principals = [
										{
											name: allSigners[0].name,
											signedAt: allSigners[0].signedAt,
											idNumber: allSigners[0].idNumber,
										},
									]
								}
							}

							// Identify witness
							witness = allSigners.find(s => s.role.toUpperCase().includes("WITNESS"))

						// Fallback 2: Try passport data if both documentSigners and project signers didn't work
						let passportData: unknown = null;
						if (allSigners.length === 0) {
							try {
								passportData = await getPassportDocument(projectUuid, "history", user.email ?? undefined)
								const passportSigners = extractSignerInfo(passportData)
								if (passportSigners.allSigners.length > 0) {
									allSigners = passportSigners.allSigners
									// Extract all principals from passport data
									principals = allSigners
										.filter(s => {
											const roleUpper = s.role.toUpperCase()
											return (
												!roleUpper.includes("ENP") &&
												!roleUpper.includes("NOTARY") &&
												!roleUpper.includes("WITNESS")
											)
										})
										.map(s => ({
											name: s.name,
											signedAt: s.signedAt,
											idNumber: s.idNumber,
										}))
									// Fallback to single principal if available
									if (principals.length === 0 && passportSigners.principal) {
										principals = [
											{
												name: passportSigners.principal.name,
												signedAt: passportSigners.principal.signedAt,
												idNumber: passportSigners.principal.idNumber,
											},
										]
									}
									witness = passportSigners.witness
									console.log(`✅ Found ${allSigners.length} signer(s) from passport data, ${principals.length} principal(s)`)
								}
							} catch (error) {
								console.warn(`⚠️ Could not fetch passport data for ${projectUuid}:`, error)
								// Continue with empty signers - will use "Unknown" as principal
							}
						}

						// Determine executedAt timestamp (priority: signer's signed_at > completed_at > created_at)
						let executedAt = new Date(project.created_at)
						// Use the earliest principal's signed_at if available
						const principalWithTimestamp = principals
							.filter(p => p.signedAt)
							.map(p => ({ signedAt: p.signedAt!, timestamp: new Date(p.signedAt!).getTime() }))
							.sort((a, b) => a.timestamp - b.timestamp)[0]
						if (principalWithTimestamp) {
							executedAt = new Date(principalWithTimestamp.signedAt)
						} else if (allSigners && allSigners.length > 0) {
							const signersWithTimestamp = allSigners
								.filter(s => s.signedAt)
								.map(s => ({ signedAt: s.signedAt!, timestamp: new Date(s.signedAt!).getTime() }))
								.sort((a, b) => a.timestamp - b.timestamp)

							if (signersWithTimestamp.length > 0 && signersWithTimestamp[0]) {
								executedAt = new Date(signersWithTimestamp[0].signedAt)
							}
						} else if (projectData.completed_at) {
							executedAt = new Date(projectData.completed_at)
						}

						// Determine workflow (default to IEN, can be enhanced with passport data)
						let workflowType: "REN" | "IEN" = "IEN"
						if (passportData && typeof passportData === "object") {
							const passportText = JSON.stringify(passportData).toLowerCase()
							if (
								passportText.includes("remote") ||
								passportText.includes("video") ||
								passportText.includes("ren")
							) {
								workflowType = "REN"
							}
						}

						// Determine act type from document.notarizationType (stored in database)
						let actTypeValue:
							| "ACKNOWLEDGMENT"
							| "AFFIRMATION"
							| "JURAT"
							| "SIGNATURE_WITNESSING" = "ACKNOWLEDGMENT"

						// Use notarizationType from document table if available
						if (document?.notarizationType) {
							actTypeValue = document.notarizationType as typeof actTypeValue
							console.log(`✅ Using notarizationType from document: ${actTypeValue}`)
						} else if (document) {
							// Fallback: Try to determine from document name/description
							const docName = (
								document?.name ??
								projectData.file_name ??
								projectData.name ??
								""
							).toLowerCase()
							const docDesc = (document?.description ?? null)?.toLowerCase() ?? ""
							const combined = `${docName} ${docDesc}`

							if (combined.includes("affirmation") || combined.includes("affirm")) {
								actTypeValue = "AFFIRMATION"
							} else if (combined.includes("jurat")) {
								actTypeValue = "JURAT"
							} else if (combined.includes("signature") && combined.includes("witness")) {
								actTypeValue = "SIGNATURE_WITNESSING"
							} else if (
								combined.includes("acknowledgment") ||
								combined.includes("acknowledge")
							) {
								actTypeValue = "ACKNOWLEDGMENT"
							}
							// Default remains ACKNOWLEDGMENT if nothing matches
						}

						// Apply filters
						if (actType !== "ALL" && actTypeValue !== actType) {
							return null
						}
						if (workflow !== "ALL" && workflowType !== workflow) {
							return null
						}

						// Apply search filter
						if (search) {
							const searchLower = search.toLowerCase()
							// Search across all principal names
							const allPrincipalNames = principals.map(p => p.name).join(" ")
							const principalNamesLower = allPrincipalNames.toLowerCase()
							const documentName = projectData.file_name ?? projectData.name ?? project.name ?? ""
							const matchesPrincipal = principalNamesLower.includes(searchLower)
							const matchesDocument = documentName.toLowerCase().includes(searchLower)
							if (!matchesPrincipal && !matchesDocument) {
								return null
							}
						}

						// Generate certificate number (using project UUID for uniqueness)
						const certificateNumber = `NB-${projectUuid.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`

						// Join all principal names with comma and space
						const principalNames = principals.length > 0
							? principals.map(p => p.name).join(", ")
							: "Unknown"
						// Use first principal's ID number (or combine if needed)
						const principalIdNumber = principals.length > 0 && principals[0]?.idNumber
							? principals[0].idNumber
							: null

						// Fetch principal's ID image and type from users table
						let principalIdImageBase64: string | null = null
						let principalIdType: string | null = null
						if (principals.length > 0 && allSigners.length > 0) {
							// Try to find the principal's email from signers
							// Match by name first, then by role
							const principalSigner = allSigners.find(s => {
								const roleUpper = s.role.toUpperCase()
								const isPrincipal = !roleUpper.includes("ENP") &&
									!roleUpper.includes("NOTARY") &&
									!roleUpper.includes("WITNESS")
								
								// Try to match by name if we have principal names
								if (principals.length > 0 && principals[0]?.name) {
									return isPrincipal && s.name === principals[0].name
								}
								return isPrincipal
							}) ?? allSigners.find(s => {
								const roleUpper = s.role.toUpperCase()
								return (
									!roleUpper.includes("ENP") &&
									!roleUpper.includes("NOTARY") &&
									!roleUpper.includes("WITNESS")
								)
							})

							if (principalSigner?.email) {
								try {
									const principalUser = await ctx.db.query.users.findFirst({
										where: eq(users.email, principalSigner.email),
										columns: {
											kycReferenceIdImageBase64: true,
											kycOcrExtractedFieldsJson: true,
										},
									})

									if (principalUser?.kycReferenceIdImageBase64) {
										principalIdImageBase64 = String(principalUser.kycReferenceIdImageBase64)
									}

									// Extract OCR document type
									const ocrJson = principalUser?.kycOcrExtractedFieldsJson
									if (ocrJson && typeof ocrJson === "string") {
										try {
											const ocrFields = JSON.parse(ocrJson) as Record<string, unknown>
											// Priority: documentId (stored during KYC) > documentType > idType > module name
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
												const documentTypeMap: Record<string, string> = {
													dl: "Driver's License",
													national_id: "National ID",
													passport: "Passport",
													voter_id: "Voter ID",
													"driver's license": "Driver's License",
													"national id": "National ID",
													"voter id": "Voter ID",
												}

												principalIdType =
													documentTypeMap[docType.toLowerCase()] ??
													docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, " ")
											}
										} catch (error) {
											console.warn("Failed to parse OCR JSON:", error)
										}
									}
								} catch (error) {
									console.warn("Failed to fetch principal ID image:", error)
								}
							}
						}

						// Generate location statement
						const locationValue = "Philippines" // Default for API-based entries
						const locationStatement = generateLocationStatement(locationValue)

						return {
							id: projectUuid, // Use project UUID as ID
							notarialBookId: "", // Not needed for API-based entries
							actType: actTypeValue,
							documentId: null,
							docoChainProjectUuid: projectUuid,
							principalName: principalNames,
							principalIdNumber,
							principalIdImageBase64,
							principalIdType,
							witnessName: witness?.name ?? null,
							enpName: user.name ?? "Unknown ENP",
							enpRollNumber: null,
							executedAt,
							location: locationValue,
							workflow: workflowType,
							locationStatement,
							documentName: projectData.file_name ?? projectData.name ?? project.name ?? "Untitled Document",
							documentDescription: document?.description ?? null,
							passportData: passportData ? JSON.stringify(passportData) : null,
							certificateNumber,
							certificateUrl: null,
							createdAt: new Date(project.created_at),
							updatedAt: new Date(project.updated_at),
						};
					} catch (error) {
						console.error(`❌ Error fetching details for project ${projectUuid}:`, error)
						return null
					}
				})
			);

				// Filter out null entries
				const validActs = acts.filter((act): act is NonNullable<typeof act> => act !== null)

				// Sort by executedAt descending
				validActs.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())

				// Get total from API response
				const total = projectsResponse.meta?.total ?? validActs.length

				return {
					acts: validActs,
					total,
					page,
					perPage,
					totalPages: projectsResponse.meta?.last_page ?? Math.ceil(total / perPage),
				}
			} catch (error) {
				console.error("❌ Error fetching notarial book from DocoChain API:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Failed to fetch projects from DocoChain: ${error instanceof Error ? error.message : "Unknown error"}`,
				})
			}
		}),

	/**
	 * Get notarial book entries for the current ENP
	 * Uses Doc On Chain Passport API to fetch document history
	 */
	getNotarialBook: protectedProcedure.input(getNotarialBookSchema).query(async ({ ctx, input }) => {
		const userId = ctx.session.user.id
		const { page, perPage, search, actType, workflow } = input

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can access the notarial book",
			})
		}

		// Get or create notarial book for this ENP
		let notarialBook = await ctx.db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, userId),
		})

		if (!notarialBook) {
			// Create notarial book if it doesn't exist
			const [created] = await ctx.db
				.insert(notarialBooks)
				.values({
					enpId: userId,
				})
				.returning()

			notarialBook = created!
		}

		// Build query filters
		const filters = [eq(notarialActs.notarialBookId, notarialBook.id)]

		if (actType !== "ALL") {
			filters.push(eq(notarialActs.actType, actType))
		}

		if (workflow !== "ALL") {
			filters.push(eq(notarialActs.workflow, workflow))
		}

		// Get notarial acts with pagination
		const acts = await ctx.db
			.select()
			.from(notarialActs)
			.where(and(...filters))
			.orderBy(desc(notarialActs.executedAt))
			.limit(perPage)
			.offset((page - 1) * perPage)

		// Get total count using proper count function
		const [totalResult] = await ctx.db
			.select({ count: count() })
			.from(notarialActs)
			.where(and(...filters))

		const total = totalResult?.count ?? 0

		// Filter by search term if provided
		let filteredActs = acts
		if (search) {
			const searchLower = search.toLowerCase()
			filteredActs = acts.filter(
				act =>
					act.principalName.toLowerCase().includes(searchLower) ||
					(act.documentName?.toLowerCase().includes(searchLower) ?? false) ||
					(act.certificateNumber?.toLowerCase().includes(searchLower) ?? false)
			)
		}

		return {
			acts: filteredActs,
			total,
			page,
			perPage,
			totalPages: Math.ceil(total / perPage),
		}
	}),

	/**
	 * Sync a completed document to the notarial book
	 * Fetches passport data from Doc On Chain and creates/updates notarial act entry
	 */
	syncDocumentToNotarialBook: protectedProcedure
		.input(syncDocumentToNotarialBookSchema)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id
			const { documentId, projectUuid, actType } = input

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can sync documents to notarial book",
				})
			}

			// Get document
			const document = await ctx.db.query.documents.findFirst({
				where: eq(documents.id, documentId),
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			// Get or create notarial book
			let notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.enpId, userId),
			})

			if (!notarialBook) {
				const [created] = await ctx.db
					.insert(notarialBooks)
					.values({
						enpId: userId,
					})
					.returning()

				notarialBook = created!
			}

			// Check if act already exists for this document
			const existingAct = await ctx.db.query.notarialActs.findFirst({
				where: and(
					eq(notarialActs.notarialBookId, notarialBook.id),
					eq(notarialActs.documentId, documentId)
				),
			})

			// Identify the principal (document uploader)
			// The principal is the person who uploaded the document, typically a non-ENP participant in the meeting
			let principalName = "Unknown"
			let principalIdNumber = ""

			// If document is linked to a meeting, try to find the principal from meeting participants
			if (document.meetingId) {
				try {
					const meeting = await ctx.db.query.meetings.findFirst({
						where: eq(meetings.id, document.meetingId),
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

					if (meeting?.participants) {
						// Find the participant who is NOT the ENP (the principal/uploader)
						const principalParticipant = meeting.participants.find(
							p => p.user.id !== userId && p.user.role !== "ENP"
						)

						if (principalParticipant?.user) {
							principalName =
								principalParticipant.user.name ?? principalParticipant.user.email ?? "Unknown"
							console.log("✅ Found principal from meeting participants:", principalName)
						}
					}
				} catch (error) {
					console.warn("Failed to get meeting participants for principal identification:", error)
				}
			}

			// Fetch passport data from Doc On Chain
			let passportData: unknown = null
			let witnessName: string | null = null
			let executedAt = new Date()
			const location = "Philippines"
			let workflow: "REN" | "IEN" = "REN"

			try {
				// Get history view for audit trail
				passportData = await getPassportDocument(projectUuid, "history", user.email ?? undefined)

				// Extract signer information for witness and additional principal details
				const { principal, witness, allSigners } = extractSignerInfo(passportData)

				// Only use passport data for principal if we didn't find one from meeting participants
				// This ensures the uploader (from meeting) takes precedence
				if (principalName === "Unknown" && principal) {
					principalName = principal.name ?? "Unknown"
					principalIdNumber = principal.idNumber ?? ""
				} else if (principal) {
					// If we already have principal name, still try to get ID from passport
					if (!principalIdNumber && principal.idNumber) {
						principalIdNumber = principal.idNumber
					}
				}

				if (witness) {
					witnessName = witness.name ?? null
				}

				// Get execution time from passport data
				// Priority: 1) Principal signer's signed_at (actual signing time), 2) completed_at, 3) latest history event
				if (principal?.signedAt) {
					// Use the principal signer's actual signing time
					executedAt = new Date(principal.signedAt)
					console.log("✅ Using principal signer's signed_at timestamp:", principal.signedAt)
				} else if (allSigners && allSigners.length > 0) {
					// Find the earliest signer's signed_at timestamp
					const signersWithTimestamp = allSigners
						.filter(s => s.signedAt)
						.map(s => ({ signedAt: s.signedAt!, timestamp: new Date(s.signedAt!).getTime() }))
						.sort((a, b) => a.timestamp - b.timestamp) // Sort by earliest first

					if (signersWithTimestamp.length > 0 && signersWithTimestamp[0]) {
						// Use the earliest signing time (when the document was first signed)
						executedAt = new Date(signersWithTimestamp[0].signedAt)
						console.log(
							"✅ Using earliest signer's signed_at timestamp:",
							signersWithTimestamp[0].signedAt
						)
					}
				}

				// Fallback to completed_at if no signer timestamps available
				if (
					executedAt.getTime() === new Date().getTime() &&
					passportData &&
					typeof passportData === "object"
				) {
					const passportObj = passportData as {
						data?: { completed_at?: unknown }
						completed_at?: unknown
					}
					if (passportObj.data?.completed_at) {
						const completedAt = passportObj.data.completed_at
						if (
							typeof completedAt === "string" ||
							typeof completedAt === "number" ||
							completedAt instanceof Date
						) {
							executedAt = new Date(completedAt)
							console.log("✅ Using completed_at timestamp:", completedAt)
						}
					} else if (passportObj.completed_at) {
						const completedAt = passportObj.completed_at
						if (
							typeof completedAt === "string" ||
							typeof completedAt === "number" ||
							completedAt instanceof Date
						) {
							executedAt = new Date(completedAt)
							console.log("✅ Using completed_at timestamp:", completedAt)
						}
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
			} catch (error) {
				console.error("Error fetching passport data:", error)
				// Continue with default values if passport fetch fails
			}

			// Get legal registration for roll number
			const legalRegistration = await ctx.db.query.legalRegistrations.findFirst({
				where: eq(legalRegistrations.applicantId, userId),
			})

			const enpName = user.name ?? "Unknown ENP"
			const enpRollNumber = legalRegistration?.rollOfAttorneysNumber ?? null

			// Generate certificate number
			const certificateNumber = `NB-${notarialBook.id.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`

			// Generate location statement
			const locationStatement = generateLocationStatement(location)

			// Fetch principal's ID type from OCR if available
			// Try to get principal email from passport data or meeting participants
			let principalEmailForOcr: string | undefined
			if (principal && principal.email) {
				principalEmailForOcr = principal.email
			} else if (document.meetingId) {
				try {
					const meeting = await ctx.db.query.meetings.findFirst({
						where: eq(meetings.id, document.meetingId),
						with: {
							participants: {
								with: {
									user: {
										columns: {
											email: true,
											role: true,
										},
									},
								},
							},
						},
					})

					const principalParticipant = meeting?.participants.find(
						p => p.user.id !== userId && p.user.role !== "ENP"
					)
					if (principalParticipant?.user?.email) {
						principalEmailForOcr = principalParticipant.user.email
					}
				} catch (error) {
					console.warn("Failed to get principal email from meeting:", error)
				}
			}

			let principalIdType: string | undefined
			if (principalEmailForOcr) {
				try {
					const principalUser = await ctx.db.query.users.findFirst({
						where: eq(users.email, principalEmailForOcr),
						columns: {
							kycOcrExtractedFieldsJson: true,
						},
					})

					const ocrJson = principalUser?.kycOcrExtractedFieldsJson
					if (ocrJson && typeof ocrJson === "string") {
						try {
							const ocrFields = JSON.parse(ocrJson) as Record<string, unknown>
											// Priority: documentId (stored during KYC) > documentType > idType > module name
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
								const documentTypeMap: Record<string, string> = {
									dl: "Driver's License",
									national_id: "National ID",
									passport: "Passport",
									voter_id: "Voter ID",
									"driver's license": "Driver's License",
									"national id": "National ID",
									"voter id": "Voter ID",
								}

								principalIdType =
									documentTypeMap[docType.toLowerCase()] ??
									docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, " ")
							}
						} catch (parseError) {
							console.warn("Failed to parse OCR JSON:", parseError)
						}
					}
				} catch (fetchError) {
					console.warn("Failed to fetch principal ID type:", fetchError)
				}
			}

			const actData = {
				notarialBookId: notarialBook.id,
				actType,
				documentId,
				docoChainProjectUuid: projectUuid,
				principalName,
				principalIdNumber,
				principalIdType,
				witnessName,
				enpName,
				enpRollNumber: enpRollNumber ?? undefined,
				executedAt,
				location,
				workflow,
				locationStatement,
				documentName: document.name,
				documentDescription: document.description ?? null,
				passportData: passportData ? JSON.stringify(passportData) : null,
				certificateNumber,
			}

			if (existingAct) {
				// Update existing act
				const [updated] = await ctx.db
					.update(notarialActs)
					.set({
						...actData,
						updatedAt: new Date(),
					})
					.where(eq(notarialActs.id, existingAct.id))
					.returning()

				return updated
			} else {
				// Create new act
				const [created] = await ctx.db.insert(notarialActs).values(actData).returning()

				return created
			}
		}),

	/**
	 * Auto-sync all completed documents for the ENP
	 * Finds all completed documents with DocoChain project UUIDs and syncs them
	 */
	autoSyncAllDocuments: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can sync documents",
			})
		}

		// Find all documents with DocoChain project UUIDs
		// Documents with docoChainProjectId have been signed/notarized via Doc On Chain
		// Documents are linked to ENPs via envelopes (envelope.userId) or meetings
		const completedDocuments = await ctx.db
			.select({
				id: documents.id,
				name: documents.name,
				description: documents.description,
				docoChainProjectId: documents.docoChainProjectId,
				envelopeId: documents.envelopeId,
				meetingId: documents.meetingId,
			})
			.from(documents)
			.where(
				// Only documents with DocoChain project UUIDs (these have been signed/notarized)
				isNotNull(documents.docoChainProjectId)
			)

		// Filter to documents where ENP is involved
		// For now, we'll sync all completed documents with DocoChain UUIDs
		// In the future, we can filter by envelope.userId or meeting participants
		const enpDocuments = completedDocuments.filter(doc => doc.docoChainProjectId)

		let syncedCount = 0
		const errors: string[] = []

		// Get or create notarial book
		let notarialBook = await ctx.db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, userId),
		})

		if (!notarialBook) {
			const [created] = await ctx.db
				.insert(notarialBooks)
				.values({
					enpId: userId,
				})
				.returning()

			notarialBook = created!
		}

		// Sync each document using autoCreateNotarialAct for consistency
		// IMPORTANT: Only sync documents that are FULLY SIGNED
		for (const doc of enpDocuments) {
			if (!doc.docoChainProjectId) continue

			try {
				// First, verify the document is fully signed before syncing
				// This ensures only fully signed documents appear in the Notarial Book
				try {
					const signingStatus = await checkSigningStatus(
						doc.docoChainProjectId,
						user.email ?? undefined
					)

					if (!signingStatus.isFullySigned) {
						console.log(
							`⏭️ Skipping ${doc.name} - not fully signed yet (${signingStatus.signedCount}/${signingStatus.totalSigners} signers)`
						)
						// Don't add to errors - this is expected behavior
						continue
					}

					console.log(`✅ Document ${doc.name} is fully signed, proceeding to sync...`)
				} catch (statusError) {
					const errorMessage =
						statusError instanceof Error ? statusError.message : String(statusError)

					// If it's "not fully signed" error, skip silently
					if (
						errorMessage.includes("not fully signed") ||
						errorMessage.includes("not fully signed yet")
					) {
						console.log(`⏭️ Skipping ${doc.name} - not fully signed yet`)
						continue
					}

					// For other errors (API issues), log but try to sync anyway
					// autoCreateNotarialAct will also check signing status as a safeguard
					console.warn(
						`⚠️ Could not verify signing status for ${doc.name}, but continuing (might be temporary API issue):`,
						errorMessage
					)
				}

				// Use autoCreateNotarialAct which handles principal identification from meeting participants
				// and all other logic consistently (it also checks signing status internally as a safeguard)
				const createdAct = await autoCreateNotarialAct(
					ctx.db,
					doc.id,
					doc.docoChainProjectId,
					userId,
					user.email ?? undefined
				)

				if (createdAct) {
					syncedCount++
				} else {
					// Act already exists or creation failed (already logged in autoCreateNotarialAct)
					// Check if it already exists to provide better feedback
					const existingAct = await ctx.db.query.notarialActs.findFirst({
						where: and(
							eq(notarialActs.notarialBookId, notarialBook.id),
							eq(notarialActs.docoChainProjectUuid, doc.docoChainProjectId)
						),
					})

					if (existingAct) {
						// Already synced, skip silently
						continue
					} else {
						// Creation failed for another reason (likely not fully signed, which is expected)
						// Don't add to errors - this is handled gracefully
						console.log(
							`⏭️ Could not create notarial act for ${doc.name} (document may not be fully signed)`
						)
					}
				}
			} catch (error) {
				console.error(`Error syncing document ${doc.id}:`, error)
				errors.push(
					`Failed to sync ${doc.name}: ${error instanceof Error ? error.message : "Unknown error"}`
				)
			}
		}

		return {
			success: true,
			syncedCount,
			totalDocuments: enpDocuments.length,
			errors: errors.length > 0 ? errors : undefined,
		}
	}),

	/**
	 * Get document URL for viewing/downloading
	 */
	getDocumentUrl: protectedProcedure
		.input(z.object({ actId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access documents",
				})
			}

			// Get notarial act
			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			// Verify it belongs to this ENP's notarial book
			const notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this document",
				})
			}

			// Use proxy endpoint to serve the document with proper authentication
			// This ensures the PDF is fetched with backend authentication and served to the frontend
			// The proxy endpoint handles all the complexity of fetching from DocoChain Vault/APIs
			if (act.documentId || act.docoChainProjectUuid) {
				// Return proxy URL that will handle fetching from DocoChain with authentication
				const proxyUrl = `/api/notarial-book/documents/${act.id}`
				console.log("✅ Using proxy endpoint for document:", proxyUrl)
				return {
					url: proxyUrl,
					fileName: act.documentName ?? "document.pdf",
					type: "document",
				}
			}

			// If we reach here, neither DocoChain nor Supabase had the document
			let errorMessage = "Document URL not available."

			if (act.docoChainProjectUuid) {
				errorMessage +=
					" The document may not have been fully signed in DocoChain, or the project may have been deleted."
			} else if (act.documentId) {
				errorMessage += " The document file may not have been uploaded to storage."
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: errorMessage,
			})
		}),

	/**
	 * Get document URL for viewing/downloading (Notarial Book 2 - Programmatic)
	 * Uses the new API route that fetches documents programmatically with downloadSignedDocument
	 * Supports both database-stored acts and API-fetched acts (where actId is a project UUID)
	 */
	getDocumentUrl2: protectedProcedure
		.input(z.object({ actId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access documents",
				})
			}

			// Try to find act in database first
			// Check if actId looks like a DocoChain project UUID (typically alphanumeric, 15+ chars)
			// Database IDs are typically shorter UUIDs or different format
			const looksLikeProjectUuid = input.actId.length >= 15 && /^[A-Za-z0-9]+$/.test(input.actId)
			
			let act = null
			if (!looksLikeProjectUuid) {
				// Only query database if it doesn't look like a project UUID
				try {
					act = await ctx.db.query.notarialActs.findFirst({
						where: eq(notarialActs.id, input.actId),
					})
				} catch (error) {
					console.warn("Failed to query notarial act from database:", error)
					// Continue to treat as project UUID
				}
			}

			let projectUuid: string | null = null
			let documentName = "document.pdf"

			if (act) {
				// Act found in database - verify it belongs to this ENP's notarial book
				const notarialBook = await ctx.db.query.notarialBooks.findFirst({
					where: eq(notarialBooks.id, act.notarialBookId),
				})

				if (notarialBook?.enpId !== userId) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You don't have access to this document",
					})
				}

				projectUuid = act.docoChainProjectUuid
				documentName = act.documentName ?? "document.pdf"
			} else {
				// Act not in database - treat actId as project UUID (from API-based notarial book)
				// Verify the project exists and user has access
				try {
					let projectDetails
					try {
						projectDetails = await getMyProjectDetails(input.actId, user.email ?? undefined)
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : String(error)
						if (errorMessage.includes("not part of this project")) {
							// Try getProjectDetails as fallback
							projectDetails = await getProjectDetails(input.actId, user.email ?? undefined)
						} else {
							throw error
						}
					}

					const projectData = projectDetails?.data
					if (!projectData) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: "Project not found or you don't have access",
						})
					}

					projectUuid = input.actId
					documentName = projectData.file_name ?? projectData.name ?? "document.pdf"
				} catch (error) {
					if (error instanceof TRPCError) {
						throw error
					}
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Project not found: ${error instanceof Error ? error.message : "Unknown error"}`,
					})
				}
			}

			if (!projectUuid) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document URL not available. No DocoChain project UUID found.",
				})
			}

			// Use new API route for programmatic document retrieval
			const proxyUrl = `/api/notarial-book-2/documents/${projectUuid}`
			console.log("✅ [Notarial Book 2] Using programmatic endpoint for document:", proxyUrl)
			return {
				url: proxyUrl,
				fileName: documentName,
				type: "document",
			}
		}),

	/**
	 * Get certificate URL for viewing/downloading
	 */
	getCertificateUrl: protectedProcedure
		.input(z.object({ actId: z.string() }))
		.query(async ({ ctx, input }) => {
			const userId = ctx.session.user.id

			// Verify user is an ENP
			const user = await ctx.db.query.users.findFirst({
				where: eq(users.id, userId),
			})

			if (user?.role !== "ENP") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only ENPs can access certificates",
				})
			}

			// Get notarial act
			const act = await ctx.db.query.notarialActs.findFirst({
				where: eq(notarialActs.id, input.actId),
			})

			if (!act) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Notarial act not found",
				})
			}

			// Verify it belongs to this ENP's notarial book
			const notarialBook = await ctx.db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== userId) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have access to this certificate",
				})
			}

			// If we have a stored certificate URL, use it
			if (act.certificateUrl) {
				return {
					url: act.certificateUrl,
					fileName: `certificate-${act.certificateNumber ?? act.id}.pdf`,
					type: "certificate",
				}
			}

			// If we have a DocoChain project UUID, download certificate from DocoChain
			if (act.docoChainProjectUuid) {
				try {
					const certificate = await downloadCertificate(
						act.docoChainProjectUuid,
						user.email ?? undefined
					)

					// Update the act with the certificate URL for future use
					await ctx.db
						.update(notarialActs)
						.set({
							certificateUrl: certificate.url,
						})
						.where(eq(notarialActs.id, act.id))

					return {
						url: certificate.url,
						fileName: certificate.fileName,
						type: "certificate",
					}
				} catch (error) {
					console.error("Error downloading certificate from DocoChain:", error)
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: `Failed to get certificate: ${error instanceof Error ? error.message : "Unknown error"}`,
					})
				}
			}

			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Certificate not available",
			})
		}),

	/**
	 * Export notarial book as PDF/PDFA for Supreme Court submission
	 */
	exportNotarialBook: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = ctx.session.user.id

		// Verify user is an ENP
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, userId),
		})

		if (user?.role !== "ENP") {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Only ENPs can export notarial book",
			})
		}

		// Get notarial book
		const notarialBook = await ctx.db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.enpId, userId),
		})

		if (!notarialBook) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Notarial book not found",
			})
		}

		// Get all acts
		// Data is stored chronologically via executedAt timestamp
		// For export, we use ASC order to export in chronological sequence (oldest to newest)
		const acts = await ctx.db
			.select()
			.from(notarialActs)
			.where(eq(notarialActs.notarialBookId, notarialBook.id))
			.orderBy(notarialActs.executedAt) // Export: chronological order (oldest to newest)

		// TODO: Generate PDF/PDFA from acts
		// For now, return the data structure
		return {
			notarialBook,
			acts,
			exportFormat: "PDF", // Will be PDFA when implemented
			generatedAt: new Date(),
		}
	}),
})