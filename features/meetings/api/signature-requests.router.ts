import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod/v4"

import {
	addSignerToProject,
	autoJoinOrganization,
	checkSigningStatus,
	downloadCertificate,
	downloadSignedDocument,
	generateEditDraftLink,
	generateSignLink,
	getPassportDocument,
	getProjectDetails,
	normalizeUrl,
	sendProject,
	updateProjectSigner,
} from "@/services/doconchain"
import {
	ensureMeetingToken,
	generateToken,
	getMeetingToken,
	getOrRefreshProjectToken,
	setProjectToken,
} from "@/services/doconchain/lib/token-cache"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { env } from "@/env"

function isEnpRole(role: unknown): boolean {
	if (typeof role !== "string") return false
	return role.trim().toUpperCase() === "ENP"
}

function asNonEmptyEmail(email: unknown): string | undefined {
	if (typeof email !== "string") return undefined
	const trimmed = email.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

function forceApiTruePreservingParams(urlStr: string): string {
	try {
		const url = new URL(urlStr)
		url.searchParams.set("api", "true")
		return url.toString()
	} catch {
		return urlStr
	}
}

/**
 * Helper function to determine if a signer has actually plotted/signed
 *
 * CRITICAL: "NEXT GROUP" status means they're next in line, NOT that they've plotted!
 * Only returns true if they have actually signed (status is SIGNED/COMPLETED or signed_at is set)
 *
 * @param signerStatus - The signer's status from DocoChain (e.g., "NEXT GROUP", "PENDING", "SIGNED")
 * @param signedAt - The signer's signed_at timestamp (null if not signed)
 * @returns true only if the signer has actually signed, false otherwise
 */
function hasSignerPlottedOrSigned(
	signerStatus: string | null | undefined,
	signedAt: string | null | undefined
): boolean {
	const status = (signerStatus ?? "").toUpperCase()

	// Signer has plotted/signed ONLY if:
	// 1. Status is SIGNED or COMPLETED (they've completed signing)
	// 2. signed_at is set (they have a signed timestamp)
	const hasSigned =
		status === "SIGNED" ||
		status === "COMPLETED" ||
		(signedAt !== null && signedAt !== undefined && signedAt !== "")

	// Safety check: If status is "NEXT GROUP" and we're saying they've signed, that's a logic error
	if (status === "NEXT GROUP" && hasSigned) {
		console.error("❌ LOGIC ERROR: Signer status is NEXT GROUP but hasSigned is true!")
		console.error("   NEXT GROUP means they're next in line, NOT that they've plotted/signed")
		return false // Force to false to prevent incorrect behavior
	}

	return hasSigned
}

export const signatureRequestsRouter = createTRPCRouter({
	// Create a signature request
	createRequest: protectedProcedure
		.input(
			z.object({
				meetingId: z.string(),
				documentId: z.string(),
				signerId: z.string(), // ENP user who needs to sign
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { meetingId, documentId, signerId } = input

			// Get the document to check for DocoChain project ID
			const document = await db.query.documents.findFirst({
				where: eq(documents.id, documentId),
				with: {
					meeting: {
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
							createdBy: {
								columns: {
									email: true,
									role: true,
								},
							},
						},
					},
				},
			})

			if (!document) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Document not found",
				})
			}

			// DocoChain auth MUST use the ENP (enterprise) owner email; principals often can't create/manage projects.
			let enpEmail: string | undefined
			if (document.meeting) {
				if (isEnpRole(document.meeting.createdBy?.role)) {
					enpEmail = asNonEmptyEmail(document.meeting.createdBy?.email)
				} else {
					const enpParticipant = document.meeting.participants.find(
						p => isEnpRole(p.user?.role) && !!p.user?.email
					)
					enpEmail = asNonEmptyEmail(enpParticipant?.user?.email)
				}
			}
			// Final fallback: current user is ENP
			if (!enpEmail && isEnpRole(ctx.session.user.role) && ctx.session.user.email) {
				enpEmail = asNonEmptyEmail(ctx.session.user.email)
			}

			if (!enpEmail) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"ENP email not found for signing. This meeting must include an ENP participant to create signature requests.",
				})
			}

			// Get the signer user details using Drizzle
			const signerUser = await db.query.users.findFirst({
				where: eq(users.id, signerId),
				columns: {
					id: true,
					name: true,
					email: true,
				},
			})

			if (!signerUser) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signer user not found",
				})
			}

			// Add signer to DocoChain project (keep as DRAFT so ENP can place signature fields)
			if (document.docoChainProjectId) {
				try {
					const nameParts = (signerUser.name ?? "").split(" ")
					const firstName = nameParts[0] ?? "Signer"
					const lastName = nameParts.slice(1).join(" ") || "User"

					// 🔑 First, auto-join the ENP to the organization
					// This makes them an organization member instead of a guest
					await autoJoinOrganization({
						email: signerUser.email ?? "",
						firstName,
						lastName,
						role: "Member",
						userEmail: enpEmail, // Use ENP email for token (required for DocoChain auth)
					})

					// const addSignerResponse = await addSignerToProject({
					// 	projectUuid: document.docoChainProjectId,
					// 	email: signerUser.email ?? "",
					// 	firstName,
					// 	lastName,
					// 	signerRole: "Signer",
					// 	userEmail: enpEmail, // Use ENP email for token (required for DocoChain auth)
					// })

					console.log("✅ Added signer to DocoChain project")

					console.log("📝 Project kept as DRAFT - ENP can place signature fields themselves")

					// NOTE: We DON'T add signature fields or deploy the project here
					// The project stays as DRAFT so the ENP can:
					// 1. Open the DocoChain project in DRAFT mode
					// 2. Use the "SIGNATURE" button to drag and place signature fields
					// 3. Click on the field to create their signature
					// 4. Click "SIGN NOW" when ready (DocoChain auto-deploys after signing)
				} catch (docoChainError) {
					console.error("❌ Failed to add signer to DocoChain:", docoChainError)
					// Continue anyway - user can still be notified
				}
			} else {
				console.warn("⚠️ No DocoChain project ID for document:", documentId)
			}

			// Create signature request in our database
			const [request] = await db
				.insert(signatureRequests)
				.values({
					meetingId,
					documentId,
					requesterId: ctx.session.user.id, // Principal who is requesting
					signerId,
					status: "PENDING",
				})
				.returning()

			return {
				success: true,
				request,
			}
		}),

	// Get pending signature requests for current user
	getPendingRequests: protectedProcedure
		.input(z.object({ meetingId: z.string() }).optional())
		.query(async ({ ctx, input }) => {
			const where = input?.meetingId
				? and(
						eq(signatureRequests.signerId, ctx.session.user.id),
						eq(signatureRequests.status, "PENDING"),
						eq(signatureRequests.meetingId, input.meetingId)
					)
				: and(
						eq(signatureRequests.signerId, ctx.session.user.id),
						eq(signatureRequests.status, "PENDING")
					)

			const requests = await db.query.signatureRequests.findMany({
				where,
				with: {
					document: true,
					requester: {
						columns: {
							id: true,
							name: true,
							email: true,
						},
					},
					meeting: {
						columns: {
							id: true,
							title: true,
						},
					},
				},
				orderBy: (signatureRequests, { desc }) => [desc(signatureRequests.createdAt)],
			})

			return requests
		}),

	// Update signature request status
	updateStatus: protectedProcedure
		.input(
			z.object({
				requestId: z.string(),
				status: z.enum(["SIGNED", "DECLINED"]),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { requestId, status } = input

			// Verify the request belongs to the current user
			const request = await db.query.signatureRequests.findFirst({
				where: eq(signatureRequests.id, requestId),
			})

			if (!request) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signature request not found",
				})
			}

			if (request.signerId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You don't have permission to update this request",
				})
			}

			// Update status
			const [updatedRequest] = await db
				.update(signatureRequests)
				.set({
					status,
					signedAt: status === "SIGNED" ? new Date() : null,
					updatedAt: new Date(),
				})
				.where(eq(signatureRequests.id, requestId))
				.returning()

			return {
				success: true,
				request: updatedRequest,
			}
		}),

	// ENP initiates signing - creates DocoChain project if needed, then adds signer and redirects
	initiateSigning: protectedProcedure
		.input(
			z
				.object({
					projectUuid: z.string().optional(), // Optional - will be created if not provided
					documentId: z.string().optional(), // Document ID to find/create project
					email: z.string().email("Valid email is required"),
					isPlotting: z.boolean().optional(), // True when ENP is plotting signature (must use Edit Draft Link)
				})
				.refine(data => !!(data.projectUuid ?? data.documentId), {
					message: "Either projectUuid or documentId must be provided",
				})
		)
		.mutation(async ({ input, ctx }) => {
			const { projectUuid, documentId, email, isPlotting } = input

			try {
				// Get document - either by projectUuid (existing project) or documentId (needs project creation)
				let document = null
				if (projectUuid) {
					document = await db.query.documents.findFirst({
						where: eq(documents.docoChainProjectId, projectUuid),
						with: {
							signers: { columns: { userId: true, signingOrder: true } },
							meeting: {
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
									createdBy: {
										columns: {
											email: true,
											role: true,
										},
									},
								},
							},
						},
					})
				} else if (documentId) {
					document = await db.query.documents.findFirst({
						where: eq(documents.id, documentId),
						with: {
							signers: { columns: { userId: true, signingOrder: true } },
							meeting: {
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
									createdBy: {
										columns: {
											email: true,
											role: true,
										},
									},
								},
							},
						},
					})
				}

				if (!document?.meeting) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Document or meeting not found",
					})
				}

				const meeting = document.meeting
				const allParticipants = meeting.participants ?? []

				// Get signers with their signing order
				const documentSigners = (document.signers ?? []).map(s => ({
					userId: s.userId,
					signingOrder: s.signingOrder ?? 999999, // nulls go last
				}))
				const signerUserIds = new Set(documentSigners.map(s => s.userId))

				// Create a map of userId -> signingOrder for quick lookup
				const signingOrderMap = new Map(documentSigners.map(s => [s.userId, s.signingOrder]))

				// Use only selected document signers when available; otherwise all participants (legacy).
				// Sort by signingOrder to maintain the order set by ENP
				const participantsToAdd =
					signerUserIds.size > 0
						? allParticipants
								.filter(p => signerUserIds.has(p.userId))
								.sort((a, b) => {
									const orderA = signingOrderMap.get(a.userId) ?? 999999
									const orderB = signingOrderMap.get(b.userId) ?? 999999
									return orderA - orderB
								})
						: allParticipants

				if (participantsToAdd.length === 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Please select at least one signer for this document before starting signing.",
					})
				}

				// CRITICAL: DocoChain auth MUST use an ENP (enterprise) token/email.
				let creatorEmail: string | undefined

				if (isEnpRole(meeting.createdBy?.role)) {
					creatorEmail = asNonEmptyEmail(meeting.createdBy?.email)
				}
				if (!creatorEmail) {
					const enpParticipant = allParticipants.find(
						p => isEnpRole(p.user?.role) && !!p.user?.email
					)
					creatorEmail = asNonEmptyEmail(enpParticipant?.user?.email)
				}
				if (!creatorEmail && isEnpRole(ctx.session.user.role) && ctx.session.user.email) {
					creatorEmail = asNonEmptyEmail(ctx.session.user.email)
				}

				if (!creatorEmail) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"ENP email not found for signing process. This meeting must include an ENP participant to sign documents.",
					})
				}

				console.log("🔵 Using ENP email for signing process:", creatorEmail)

				// Get user details (participant who is clicking "Start Signing")
				const nameParts = (ctx.session.user.name || "").split(" ")
				const userFirstName = nameParts[0] ?? "User"
				const userLastName = nameParts.slice(1).join(" ") || ""

				// Get project UUID - project must already exist (created via createDocoChainProject endpoint)
				const actualProjectUuid: string | null = projectUuid ?? document.docoChainProjectId ?? null

				if (!actualProjectUuid) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message:
							"DocoChain project not found. Please create the project first by clicking 'Create Project' after setting signers.",
					})
				}

				console.log("🔵 User initiating signing process...")
				console.log("   - Project UUID:", actualProjectUuid)
				console.log("   - Meeting ID:", meeting.id)
				console.log("   - Total participants:", allParticipants.length)
				console.log("   - Selected signers to add:", participantsToAdd.length)
				console.log("   - Creator Email (for project access):", creatorEmail)
				console.log("   - User Email (signer):", email)
				console.log("   - User Name:", userFirstName, userLastName)

				// Step 1: Check current signers and project status
				console.log("🔵 Step 1: Checking current signers in DocoChain project...")
				type CurrentSigner = {
					email?: string
					sequence?: number
					status?: string
					firstName?: string
					lastName?: string
				}
				let currentSigners: CurrentSigner[] = []
				let projectStatus = "Draft"

				if (!actualProjectUuid) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Project UUID is required",
					})
				}

				try {
					const projectDetails = await getProjectDetails(actualProjectUuid, creatorEmail)

					currentSigners = projectDetails?.data?.signers ?? []

					projectStatus = projectDetails?.data?.status ?? "Draft"
					console.log(`   - Total existing signers: ${currentSigners.length}`)
					console.log(`   - Project status: ${projectStatus}`)
					currentSigners.forEach((s, idx) => {
						console.log(
							`   - Signer ${idx + 1}: ${s.email} (sequence: ${s.sequence}, status: ${s.status})`
						)
					})
				} catch (error) {
					console.warn("⚠️ Failed to get project details:", error)
					// If project doesn't exist, throw a more helpful error
					if (
						error instanceof Error &&
						(error.message.includes("not found") || error.message.includes("Project not found"))
					) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: `DocoChain project not found. The project may have been deleted or the project UUID (${actualProjectUuid}) is incorrect.`,
						})
					}
					// If it's a "not part of project" error, we can still try to add signers
					// (maybe the creator email doesn't have access but we can try with session user)
					if (error instanceof Error && error.message.includes("not part of this project")) {
						console.warn(
							"⚠️ Creator doesn't have access to project, but continuing to try adding signers..."
						)
					}
					// For other errors, don't re-throw - we'll try to add signers anyway
					// The addSignerToProject call will handle the error if the project doesn't exist
				}

				// Step 2: Add only the selected document signers (not all meeting participants)
				console.log("🔵 Step 2: Adding selected signers to project...")
				console.log(`   - Signers to add: ${participantsToAdd.length}`)

				for (const participant of participantsToAdd) {
					const participantEmail = participant.user?.email
					if (!participantEmail) {
						console.warn(
							`   ⚠️ Skipping participant ${participant.user?.name ?? participant.userId} - no email`
						)
						continue
					}

					// Check if participant is already a signer
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const isAlreadySigner = currentSigners.some((s: any) => {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
						return s.email?.toLowerCase() === participantEmail.toLowerCase()
					})

					if (isAlreadySigner) {
						console.log(`   ℹ️ ${participantEmail} is already a signer, skipping...`)
						continue
					}

					// Add participant as signer
					const participantNameParts = (participant.user?.name ?? "").split(" ")
					const participantFirstName = participantNameParts[0] ?? "User"
					const participantLastName = participantNameParts.slice(1).join(" ") || ""

					console.log(`   🔵 Adding ${participantEmail} as signer...`)

					try {
						// Auto-join to organization (optional)
						try {
							await autoJoinOrganization({
								email: participantEmail,
								firstName: participantFirstName,
								lastName: participantLastName,
								role: "Member",
								userEmail: creatorEmail,
							})
							console.log(`   ✅ ${participantEmail} auto-joined to organization`)
						} catch {
							console.warn(
								`   ⚠️ Failed to auto-join ${participantEmail} to organization (continuing)`
							)
						}

						// Add as signer
						if (!actualProjectUuid) {
							throw new TRPCError({
								code: "BAD_REQUEST",
								message: "Project UUID is required",
							})
						}

						// Doconchain API only accepts "Signer" for signer_role (422 on "Witness").
						// We track witness in meeting participantRole and show it in the UI via enriched signer data.
						await addSignerToProject({
							projectUuid: actualProjectUuid,
							email: participantEmail,
							firstName: participantFirstName,
							lastName: participantLastName,
							signerRole: "Signer",
							userEmail: creatorEmail,
						})

						console.log(`   ✅ ${participantEmail} added as Signer`)

						// Update currentSigners list to include the newly added signer
						currentSigners.push({
							email: participantEmail,
							firstName: participantFirstName,
							lastName: participantLastName,
						})
					} catch (addError) {
						// If adding fails (e.g., project already sent), check if user can still access
						if (
							addError instanceof Error &&
							(addError.message.includes("already") ||
								addError.message.includes("already been added"))
						) {
							console.log(`   ℹ️ ${participantEmail} already exists as signer`)
						} else if (
							addError instanceof Error &&
							addError.message.includes("Project not found")
						) {
							// Project doesn't exist - this is a critical error
							console.error(
								`   ❌ Project not found when trying to add ${participantEmail} as signer`
							)
							throw new TRPCError({
								code: "NOT_FOUND",
								message: `DocoChain project not found. The project may have been deleted or the project UUID (${actualProjectUuid}) is incorrect. Please contact support if this issue persists.`,
							})
						} else {
							console.error(`   ❌ Failed to add ${participantEmail} as signer:`, addError)
							// Don't throw error for other participants - continue adding remaining ones
							// Only throw if it's the current user (the one clicking "Start Signing")
							if (participantEmail.toLowerCase() === email.toLowerCase()) {
								throw new TRPCError({
									code: "BAD_REQUEST",
									message: `Cannot add signer: ${addError instanceof Error ? addError.message : "Unknown error"}. The document may have already been sent.`,
								})
							}
						}
					}
				}

				console.log(`✅ Selected signers have been added to project`)
				console.log(`   - Total signers: ${currentSigners.length}`)

				// Step 2.5: Update signer sequences based on signingOrder
				// IMPORTANT: Do NOT attempt to update signer sequences once the project is already sent/to-sign.
				// DocoChain may reject updates or error (we've observed 500s from their side: CredentialsDecryption "salt").
				const shouldUpdateSequences =
					isPlotting === true || (typeof projectStatus === "string" && projectStatus === "Draft")

				if (signerUserIds.size > 0 && actualProjectUuid && shouldUpdateSequences) {
					console.log("🔵 Step 2.5: Updating signer sequences based on signing order...")
					try {
						// Fetch current project details to get signer IDs
						const projectDetails = await getProjectDetails(actualProjectUuid, creatorEmail)
						const projectSigners =
							(projectDetails?.data?.signers as Array<{
								id?: number
								email?: string
								first_name?: string
								last_name?: string
								signer_role?: string
							}>) ?? []

						// Update each signer's sequence based on their signingOrder
						for (const participant of participantsToAdd) {
							const participantEmail = participant.user?.email
							if (!participantEmail) continue

							const projectSigner = projectSigners.find(
								s => s.email?.toLowerCase() === participantEmail.toLowerCase()
							)
							if (!projectSigner?.id) continue

							const signingOrder = signingOrderMap.get(participant.userId) ?? 999999
							if (signingOrder === 999999) continue // Skip if no order set

							const participantNameParts = (participant.user?.name ?? "").split(" ")
							const participantFirstName = participantNameParts[0] ?? "User"
							const participantLastName = participantNameParts.slice(1).join(" ") || ""

							try {
								await updateProjectSigner({
									projectUuid: actualProjectUuid,
									signerId: projectSigner.id,
									firstName: participantFirstName,
									lastName: participantLastName,
									sequence: signingOrder,
									signerRole: "Signer",
									userEmail: creatorEmail,
								})
								console.log(`   ✅ Updated ${participantEmail} sequence to ${signingOrder}`)
							} catch (updateError) {
								console.warn(
									`   ⚠️ Failed to update sequence for ${participantEmail}:`,
									updateError
								)
								// Continue - don't fail the whole operation
							}
						}
					} catch (sequenceError) {
						console.warn("⚠️ Failed to update signer sequences:", sequenceError)
						// Continue - don't fail the whole operation if sequence update fails
					}
				} else if (signerUserIds.size > 0 && actualProjectUuid) {
					console.log(
						"ℹ️ Skipping signer sequence updates (project is not Draft / not plotting).",
						{
							projectStatus,
							isPlotting: isPlotting ?? false,
						}
					)
				}

				const normalizePlotLinkForUi = (raw: string): string => {
					// Plot Signature must open a sanitized short link (never token/api_token/email/signer_role/etc).
					// This prevents leaking staging hosts and credentials into the address bar.
					const cleaned = String(raw ?? "").trim()
					try {
						const url = new URL(cleaned)
						if (url.hostname.includes("stg-app.doconchain.com") || url.hostname.includes("app.doconchain.com")) {
							url.hostname = "link.doconchain.com"
						}
						url.searchParams.delete("token")
						url.searchParams.delete("api_token")
						url.searchParams.delete("email")
						url.searchParams.delete("signer_role")
						url.searchParams.delete("page")
						url.searchParams.delete("user_type")
						url.searchParams.set("api", "true")
						if (url.searchParams.get("status") === "Deleted") url.searchParams.delete("status")
						return url.toString()
					} catch {
						// Best-effort fallback: strip the most problematic params.
						let next = cleaned
						next = next.replace(/[?&]token=[^&]*/g, "")
						next = next.replace(/[?&]api_token=[^&]*/g, "")
						next = next.replace(/[?&]email=[^&]*/g, "")
						next = next.replace(/[?&]signer_role=[^&]*/g, "")
						next = next.replace(/[?&]page=[^&]*/g, "")
						next = next.replace(/[?&]user_type=[^&]*/g, "")
						next = next.replace(
							/https?:\/\/(stg-)?app\.doconchain\.com\//g,
							"https://link.doconchain.com/"
						)
						const separator = next.includes("?") ? "&" : "?"
						if (!/([?&])api=/.test(next)) next = `${next}${separator}api=true`
						// Clean up separators
						while (next.includes("&&")) next = next.replace(/&&/g, "&")
						if (next.includes("?&")) next = next.replace(/\?&/g, "?")
						return next.replace(/\?$/, "")
					}
				}

				// Step 3: Get signing link for user
				// Strategy:
				// - If project is Draft: Use Edit Draft Link or stored redirect URL
				// - If project is Sent: Use Generate Sign Link API (requires project to be sent)
				console.log("🔵 Step 3: Getting signing link for user...")
				console.log("   - Project UUID:", actualProjectUuid)
				console.log("   - User Email (signer):", email)

				let signingLink = ""

				// Use project status from earlier check to determine which link type to use
				if (!actualProjectUuid) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Project UUID is required",
					})
				}

				let isProjectSent = false
				let signerHasPlotted = false

				// CRITICAL: For newly created projects, the status check might fail because the project
				// isn't fully initialized in DocoChain yet. Add retry logic with exponential backoff.
				let projectDetails = null
				const maxRetries = 3
				let retryDelay = 500 // Start with 500ms delay

				for (let attempt = 0; attempt < maxRetries; attempt++) {
					try {
						projectDetails = await getProjectDetails(actualProjectUuid, creatorEmail)
						// Success - break out of retry loop
						break
					} catch (retryError) {
						if (attempt === maxRetries - 1) {
							// Last attempt failed - will be handled by outer catch block
							throw retryError
						}
						// Wait before retrying (exponential backoff)
						console.log(
							`⚠️ Project status check failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${retryDelay}ms...`
						)
						await new Promise(resolve => setTimeout(resolve, retryDelay))
						retryDelay *= 2 // Exponential backoff: 500ms, 1000ms, 2000ms
					}
				}

				try {
					projectStatus = projectDetails?.data?.status ?? "Draft"
					// Check if project has been sent (sent_at field exists) or status indicates it's sent

					isProjectSent =
						!!projectDetails?.data?.sent_at ||
						projectStatus === "Sent" ||
						projectStatus === "Completed" ||
						projectStatus === "In Progress" ||
						projectStatus === "View Only" // "View Only" means project was sent

					// Check if the signer has already plotted (placed signature marks) or signed
					// CRITICAL: "NEXT GROUP" status means they're next in line to sign, NOT that they've plotted
					// Only consider them as having plotted if they have ACTUALLY SIGNED
					// Note: getProjectDetails doesn't return signature mark fields, so we can only check if they've signed
					const signers =
						(projectDetails?.data?.signers as Array<{
							email?: string
							status?: string
							signed_at?: string | null
						}>) ?? []
					const currentSigner = signers.find(s => s.email?.toLowerCase() === email.toLowerCase())
					const signerStatus = (currentSigner?.status ?? "").toUpperCase()

					// Use helper function to determine if signer has plotted/signed
					// This ensures consistent logic and prevents treating "NEXT GROUP" as "plotted"
					signerHasPlotted = hasSignerPlottedOrSigned(
						currentSigner?.status,
						currentSigner?.signed_at
					)

					console.log("   - Project Status:", projectStatus)
					console.log("   - Project Sent At:", projectDetails?.data?.sent_at ?? "not sent")
					console.log("   - Is Project Sent:", isProjectSent)
					console.log("   - Signer Status:", currentSigner?.status ?? "not found")
					console.log("   - Signer Signed At:", currentSigner?.signed_at ?? "not signed")
					console.log("   - Signer Has Plotted:", signerHasPlotted)

					// Additional validation: Log if status is NEXT GROUP but we're saying they've plotted
					if (signerStatus === "NEXT GROUP" && signerHasPlotted) {
						console.error("❌ ERROR: Signer status is NEXT GROUP but signerHasPlotted is true!")
						console.error(
							"   This indicates a logic error - NEXT GROUP means they haven't plotted yet"
						)
						// Force to false to prevent incorrect behavior
						signerHasPlotted = false
					}
				} catch (statusError) {
					// If all retries failed, default to Draft (new projects are always Draft)
					console.warn(
						"⚠️ Failed to get project status after retries, assuming Draft:",
						statusError
					)
					console.warn(
						"   - This is normal for newly created projects that aren't fully initialized yet"
					)
					projectStatus = "Draft"
					isProjectSent = false // Default to Draft, which uses Edit Draft Link
				}

				// CRITICAL: If user is plotting (isPlotting=true), ALWAYS use Edit Draft Link regardless of status
				// Plotting requires a draft project, so we must force Edit Draft Link even if status check says "Sent"
				// This prevents ENPs from being redirected to generate sign link when clicking "Plot Signature"
				if (isPlotting === true) {
					console.log("🔵 User is plotting - FORCING Edit Draft Link (ignoring project status)...")
					console.log("   - Is Plotting:", true)
					console.log("   - Project Status (ignored):", projectStatus)
					// Skip project status check and go straight to Edit Draft Link generation
					isProjectSent = false // Force to Draft to use Edit Draft Link
				}

				// Use Generate Sign Link API ONLY for sent projects (required for sent projects)
				// For ALL Draft projects (regardless of plotting status), use Edit Draft Link for plotting/signing
				// Use explicit check: only use generateSignLink if project is sent AND we're explicitly NOT plotting
				if (isProjectSent && isPlotting !== true) {
					// Project is sent - must use Generate Sign Link API
					console.log(
						"🔵 Project is sent - using Generate Sign Link API (required for sent projects)..."
					)
					console.log("   - Is Plotting:", isPlotting ?? false)
					console.log("   - Project Status:", projectStatus)
					try {
						// CRITICAL: Pass ENP's email (creatorEmail) for token generation
						// The 'email' parameter is for the signer, but auth token must be ENP's
						const signLinkResult = await generateSignLink({
							projectUuid: actualProjectUuid,
							email, // Signer's email - this generates a personalized link for them
							userEmail: creatorEmail, // ENP's email - for API token generation
						})
						signingLink = signLinkResult.link
						// Ensure api=true without stripping signer token params
						signingLink = forceApiTruePreservingParams(signingLink)
						console.log("✅ Signing link generated successfully")
					} catch (signLinkError) {
						console.error("❌ Failed to generate signing link:", signLinkError)
						// Use link.doconchain.com (never stg-app) so the URL is not exposed with staging domain
						const linkDomain =
							env.DOCONCHAIN_API_URL.includes("stg") ? "https://link.doconchain.com" : "https://link.doconchain.com"
						signingLink = `${linkDomain}/${actualProjectUuid}?api=true`
					}
				} else {
					// Project is Draft OR user is plotting.
					// - Plotting MUST use Edit Draft Link (draft editor).
					// - Signing SHOULD use per-recipient signing link (token=...) so DocOnChain shows the "close tab" completion screen.
					//   If project is still Draft, we attempt to send/deploy first (ENP token required), then generate sign link.

					if (isPlotting === true) {
						console.log(
							"🔵 User is plotting - generating Edit Draft Link (for plotting only)..."
						)
						console.log("   - Project Status:", projectStatus)

						let editDraftResult: { link: string } | null = null
						let editDraftError: unknown = null

						// CRITICAL: Use the SAME token that was used to CREATE this project when generating
						// the Edit Draft link. Otherwise (e.g. first meeting on a different server instance)
						// we can get a meeting token from another instance and the link points to the wrong
						// DocoChain session. Prefer project token (set at createDocoChainProject), fall back
						// to meeting token when project token is not in this instance's cache.
						let tokenForLink: string | undefined =
							await getOrRefreshProjectToken(actualProjectUuid, creatorEmail)
						if (!tokenForLink) {
							tokenForLink = await ensureMeetingToken(meeting.id, creatorEmail)
							console.log("   - Using meeting-scoped token (no project token in cache)")
						} else {
							console.log("   - Using project-scoped token (same as project creation)")
						}

						const maxLinkAttempts = 4
						let linkRetryDelayMs = 600
						for (let attempt = 0; attempt < maxLinkAttempts; attempt++) {
							if (attempt > 0) {
								console.log(
									`🔵 Retrying Edit Draft Link generation (attempt ${attempt + 1}/${maxLinkAttempts}) after ${linkRetryDelayMs}ms...`
								)
								await new Promise(resolve => setTimeout(resolve, linkRetryDelayMs))
								linkRetryDelayMs *= 2
							}
							try {
								editDraftResult = await generateEditDraftLink(
									actualProjectUuid,
									creatorEmail,
									tokenForLink,
									true
								)
								signingLink = editDraftResult.link
								console.log(
									`✅ Edit Draft Project Link generated successfully (attempt ${attempt + 1}/${maxLinkAttempts})`
								)
								break
							} catch (err) {
								editDraftError = err
								const is401 =
									err instanceof Error &&
									(err.message.includes("401") ||
										err.message.includes("Token expired or unauthorized"))
								if (is401 && tokenForLink !== undefined) {
									console.log(
										"🔄 Token expired (401) – generating fresh token and retrying..."
									)
									const freshToken = await generateToken(creatorEmail, true)
									setProjectToken(actualProjectUuid, freshToken)
									tokenForLink = freshToken
								}
								console.error(
									`❌ Attempt ${attempt + 1}/${maxLinkAttempts} to generate Edit Draft Link failed:`,
									err
								)
							}
						}

						if (!editDraftResult) {
							console.error("❌ Failed to generate Edit Draft Link after retry:", editDraftError)
							throw new Error("Unable to open plotting platform yet. Please try again in a moment.")
						}
					} else {
						console.log(
							"🔵 User is signing - ensuring project is sent, then generating per-recipient signing link..."
						)
						console.log("   - Project Status:", projectStatus)

						// If Draft, send/deploy so Generate Sign Link is available and signer sees correct completion screen.
						try {
							await sendProject(actualProjectUuid, creatorEmail)
						} catch {
							// Best-effort: if already sent or DocoChain rejects, we'll still try generateSignLink.
						}

						try {
							const signLinkResult = await generateSignLink({
								projectUuid: actualProjectUuid,
								email,
								userEmail: creatorEmail,
							})
							signingLink = forceApiTruePreservingParams(signLinkResult.link)
							console.log("✅ Per-recipient signing link generated successfully")
						} catch (err) {
							console.error("❌ Failed to generate per-recipient signing link:", err)
							// Last resort: fall back to Edit Draft link (may show "ready for signing" screen).
							const editDraftResult = await generateEditDraftLink(
								actualProjectUuid,
								creatorEmail,
								undefined,
								false
							)
							signingLink = forceApiTruePreservingParams(editDraftResult.link)
						}
					}
				}

				if (signingLink) {
					// For plotting: keep as-is (enterprise draft plotting URL).
					// For signing: DO NOT strip recipient `token=` param; it drives the correct signing completion UX ("close tab").
					if (isPlotting !== true) signingLink = forceApiTruePreservingParams(signingLink)
				}

				// For plotting, ALWAYS return sanitized short UI link. For signing, preserve parameters and ensure api=true.
				const finalNormalizedLink =
					isPlotting === true
						? normalizePlotLinkForUi(signingLink)
						: forceApiTruePreservingParams(signingLink)

				// SAFETY: When plotting, never allow a per-recipient signing link (has `token` param)
				// and never allow app/stg-app hostnames. Plotting must open a sanitized short link.
				if (isPlotting === true) {
					try {
						const url = new URL(finalNormalizedLink)
						const hasSignerTokenParam = url.searchParams.has("token")
						const isBadHost =
							url.hostname.includes("stg-app.doconchain.com") || url.hostname.includes("app.doconchain.com")

						if (hasSignerTokenParam || isBadHost) {
							console.error(
								"❌ Plot Signature attempted to return a signing link (token param). Blocking for safety.",
								{ host: url.hostname }
							)
							throw new Error(
								"Plot Signature must open the draft plotting platform. Please click Plot Signature again."
							)
						}
					} catch (err) {
						if (err instanceof Error && err.message.includes("Plot Signature must open"))
							throw err
						// If URL parsing fails, fall through (client will validate before opening).
					}
				}

				return {
					success: true,
					link: finalNormalizedLink,
					projectUuid: actualProjectUuid, // Return project UUID for reference
				}
			} catch (error) {
				console.error("❌ Failed to initiate signing:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to initiate signing process",
				})
			}
		}),

	// Generate a signing link for a DocoChain project (legacy - kept for compatibility)
	generateSigningLink: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
				email: z.string().email("Valid email is required"),
				firstName: z.string().optional(),
				lastName: z.string().optional(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { projectUuid, email, firstName, lastName } = input

			try {
				// Get document to find ENP from meeting
				const document = await db.query.documents.findFirst({
					where: eq(documents.docoChainProjectId, projectUuid),
					with: {
						meeting: {
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
								createdBy: {
									columns: {
										email: true,
										role: true,
									},
								},
							},
						},
					},
				})

				// CRITICAL: Find ENP email for token generation
				let enpEmail: string | undefined
				if (document?.meeting) {
					// First, check if creator is ENP
					if (document.meeting.createdBy?.role === "ENP" && document.meeting.createdBy?.email) {
						enpEmail = document.meeting.createdBy.email
					} else {
						// Find ENP from participants
						const enpParticipant = document.meeting.participants.find(p => p.user?.role === "ENP")
						if (enpParticipant?.user?.email) {
							enpEmail = enpParticipant.user.email
						}
					}
				}
				// Fallback to current user if they're ENP
				if (!enpEmail && ctx.session.user.role === "ENP" && ctx.session.user.email) {
					enpEmail = ctx.session.user.email
				}

				if (!enpEmail) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "ENP email not found for token generation",
					})
				}

				console.log(`🔵 Using ENP email for token generation: ${enpEmail}`)

				// Get user details if not provided
				const userFirstName = firstName ?? ctx.session.user.name?.split(" ")[0] ?? "User"
				const userLastName = lastName ?? ctx.session.user.name?.split(" ").slice(1).join(" ") ?? ""

				// Step 1: Auto-join the ENP to the organization (makes them organization member instead of guest)
				console.log("🔵 Auto-joining ENP to organization...")
				await autoJoinOrganization({
					email,
					firstName: userFirstName,
					lastName: userLastName,
					role: "Member",
					userEmail: enpEmail, // Use ENP's email for token
				})

				// Step 2: Add the ENP as a signer to the project (if not already added)
				console.log("🔵 Ensuring ENP is added as signer to project...")
				await addSignerToProject({
					projectUuid,
					email,
					firstName: userFirstName,
					lastName: userLastName,
					signerRole: "Signer",
					userEmail: enpEmail, // Use ENP's email for token
				})

				// Step 3: Send/deploy the project so it's ready for signing
				try {
					await sendProject(projectUuid, enpEmail)
				} catch {
					// Continue anyway - project might already be sent
				}

				// Step 4: Generate the signing link for this ENP
				const result = await generateSignLink({
					projectUuid,
					email,
					userEmail: enpEmail,
				})

				let finalLink = result.link
				if (finalLink) {
					try {
						const url = new URL(finalLink)
						const currentApiValue = url.searchParams.get("api")
						if (currentApiValue !== "true") {
							url.searchParams.set("api", "true")
							finalLink = url.toString()
						}
					} catch {
						finalLink = finalLink
							.replace(/\?api=null(&|$)/, "?api=true$1")
							.replace(/&api=null(&|$)/, "&api=true$1")
						if (!finalLink.includes("api=")) {
							const separator = finalLink.includes("?") ? "&" : "?"
							finalLink = `${finalLink}${separator}api=true`
						}
					}
				}

				const finalNormalizedLink = normalizeUrl(finalLink) ?? finalLink

				return {
					success: true,
					link: finalNormalizedLink,
				}
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to generate signing link",
				})
			}
		}),

	// Check if current user is a signer in a DocoChain project
	isSignerInProject: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
			})
		)
		.query(async ({ input, ctx }) => {
			const { projectUuid } = input
			const userEmail = ctx.session.user.email

			if (!userEmail) {
				return { isSigner: false }
			}

			try {
				// Get project details from DocoChain

				const projectDetails = await getProjectDetails(projectUuid)

				// Check if user's email is in the signers list

				const signers = projectDetails?.data?.signers ?? []
				const isSigner = signers.some(signer => {
					return signer.email?.toLowerCase() === userEmail.toLowerCase()
				})

				console.log(
					`🔵 Checking if ${userEmail} is a signer in project ${projectUuid}: ${isSigner}`
				)

				return { isSigner }
			} catch (error) {
				console.error("❌ Error checking if user is signer:", error)
				// Return false on error to be safe
				return { isSigner: false }
			}
		}),

	// Check if a document is fully signed
	checkSigningStatus: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
			})
		)
		.query(async ({ input }) => {
			const { projectUuid } = input

			try {
				// Get the document to find the creator (could be from meeting or envelope)
				const document = await db.query.documents.findFirst({
					where: eq(documents.docoChainProjectId, projectUuid),
					columns: {
						id: true,
						meetingId: true,
						envelopeId: true,
					},
					with: {
						meeting: {
							columns: {
								createdById: true,
							},
							with: {
								createdBy: {
									columns: {
										email: true,
										role: true,
									},
								},
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
						},
						envelope: {
							columns: {
								userId: true,
							},
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

				if (!document) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: `Document not found for project UUID: ${projectUuid}`,
					})
				}

				// Collect all possible emails that might have access to the project
				// IMPORTANT: Prefer enterprise/admin tokens first, then ENP participants, then others
				// NOTE: DOCOCHAIN_EMAIL (org owner) is NOT included - it's not part of the signing process
				const possibleEmails: (string | undefined)[] = []

				// 1. FIRST: Try undefined (uses static DOCOCHAIN_API_TOKEN if available - has enterprise access)
				possibleEmails.push(undefined)

				// 2. Add ENP participants (they have enterprise access)
				if (document.meeting?.participants) {
					for (const participant of document.meeting.participants) {
						const user = participant.user as { email: string | null; role: string | null } | null
						if (user?.email && isEnpRole(user.role) && !possibleEmails.includes(user.email)) {
							possibleEmails.push(user.email)
						}
					}
				}

				// 4. Add meeting creator email ONLY if they're ENP (Principals don't have enterprise access)
				const createdBy = document.meeting?.createdBy as
					| { email: string | null; role: string | null }
					| null
					| undefined
				if (
					createdBy?.email &&
					isEnpRole(createdBy.role) &&
					!possibleEmails.includes(createdBy.email)
				) {
					possibleEmails.push(createdBy.email)
				}

				// 5. Add envelope creator email (if ENP)
				const envelopeUser = document.envelope?.user as
					| { email: string | null; role: string | null }
					| null
					| undefined
				if (
					envelopeUser?.email &&
					isEnpRole(envelopeUser.role) &&
					!possibleEmails.includes(envelopeUser.email)
				) {
					possibleEmails.push(envelopeUser.email)
				}

				// 6. Add all other meeting participants' emails as fallback
				if (document.meeting?.participants) {
					for (const participant of document.meeting.participants) {
						const user = participant.user as { email: string | null; role: string | null } | null
						if (user?.email && !isEnpRole(user.role) && !possibleEmails.includes(user.email)) {
							possibleEmails.push(user.email)
						}
					}
				}

				// Try meeting-scoped token first when available (ENP joined). Avoids 401s from email-based token.
				if (document.meetingId) {
					const meetingEntry = getMeetingToken(document.meetingId)
					if (meetingEntry?.token) {
						try {
							const status = await checkSigningStatus(projectUuid, undefined, meetingEntry.token)
							return status
						} catch {
							// Fall through to possibleEmails loop
						}
					}
				}

				// Try each email (or undefined for static token) until one works
				let lastError: Error | null = null

				for (const email of possibleEmails) {
					try {
						const status = await checkSigningStatus(projectUuid, email)
						// Only log success if we had to try multiple emails
						if (possibleEmails.length > 1 && email !== possibleEmails[0]) {
							console.log(`✅ Successfully checked status with email: ${email ?? "static token"}`)
						}
						return status
					} catch (error) {
						lastError = error instanceof Error ? error : new Error(String(error))

						// Check if it's a network timeout error
						const isNetworkError =
							error instanceof Error &&
							(error.message.includes("timeout") ||
								error.message.includes("Timeout") ||
								error.message.includes("fetch failed") ||
								error.message.includes("ECONNRESET") ||
								error.message.includes("ENOTFOUND") ||
								error.message.includes("ECONNREFUSED") ||
								(error as { code?: string }).code === "UND_ERR_CONNECT_TIMEOUT")

						// Only log failures that are unexpected (not "not part of project" errors or network errors)
						const isExpectedFailure =
							error instanceof Error &&
							(error.message.includes("not part of this project") ||
								error.message.includes("Project not found") ||
								error.message.includes("not found"))

						if (!isExpectedFailure && !isNetworkError) {
							console.warn(
								`⚠️ Failed to check status with ${email ?? "static token"}:`,
								error instanceof Error ? error.message : String(error)
							)
						}

						if (isNetworkError) {
							console.warn(
								`⚠️ Network timeout when checking status with ${email ?? "static token"} - will try next email or return error`
							)
							// For network errors, try next email (might be a temporary network issue)
							continue
						}

						// If it's an access/auth error, try next email
						// This includes: 401 Unauthorized, 403 Forbidden, "not part of project", etc.
						if (
							error instanceof Error &&
							(error.message.includes("not part of this project") ||
								error.message.includes("Project not found") ||
								error.message.includes("not found") ||
								error.message.includes("401") ||
								error.message.includes("Unauthorized") ||
								error.message.includes("403") ||
								error.message.includes("Forbidden"))
						) {
							continue // Try next email
						}
						// For other errors, re-throw immediately
						throw error
					}
				}

				// If all emails failed, throw a helpful error
				if (lastError) {
					if (
						lastError.message.includes("Project not found") ||
						lastError.message.includes("not found")
					) {
						throw new TRPCError({
							code: "NOT_FOUND",
							message: `DocoChain project not found. The project may have been deleted or the project UUID (${projectUuid}) is incorrect. Please contact support if this issue persists.`,
						})
					}
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"You don't have access to check the status of this project. The project may have been created by a different user.",
					})
				}

				// Should never reach here, but just in case
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Unable to determine user email for checking project status",
				})
			} catch (error) {
				console.error("❌ Error checking signing status:", error)
				// If it's a "not part of project" error, return a more user-friendly message
				if (error instanceof Error && error.message.includes("not part of this project")) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"You don't have access to check the status of this project. The project may have been created by a different user.",
					})
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to check signing status",
				})
			}
		}),

	// Download the signed document from DocoChain
	downloadSignedDocument: protectedProcedure
		.input(z.string().min(1, "Project UUID is required"))
		.query(async ({ input: projectUuid, ctx }) => {
			try {
				// Get the document to find the meeting creator
				const document = await db.query.documents.findFirst({
					where: eq(documents.docoChainProjectId, projectUuid),
					columns: {
						id: true,
						meetingId: true,
					},
					with: {
						meeting: {
							columns: {
								createdById: true,
							},
							with: {
								createdBy: {
									columns: {
										email: true,
									},
								},
							},
						},
					},
				})

				// Get creator's email from the meeting

				const creatorEmail =
					document?.meeting?.createdBy?.email ?? ctx.session.user.email ?? undefined

				// First check if document is fully signed
				const status = await checkSigningStatus(projectUuid, creatorEmail)

				if (!status.isFullySigned) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Document is not fully signed yet. Status: ${status.projectStatus}, Signed: ${status.signedCount}/${status.totalSigners}`,
					})
				}

				// Download the signed document
				const { buffer, fileName, url } = await downloadSignedDocument(projectUuid, creatorEmail)

				// Convert buffer to base64 for transmission
				const base64 = buffer.toString("base64")

				return {
					success: true,
					fileName,
					documentUrl: url,
					base64,
					size: buffer.length,
				}
			} catch (error) {
				console.error("❌ Error downloading signed document:", error)
				if (error instanceof TRPCError) {
					throw error
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to download signed document",
				})
			}
		}),

	// Download the certificate of completion from DocoChain
	downloadCertificate: protectedProcedure
		.input(z.string().min(1, "Project UUID is required"))
		.query(async ({ input: projectUuid, ctx }) => {
			try {
				// Get the document to find the meeting creator
				const document = await db.query.documents.findFirst({
					where: eq(documents.docoChainProjectId, projectUuid),
					columns: {
						id: true,
						meetingId: true,
					},
					with: {
						meeting: {
							columns: {
								createdById: true,
							},
							with: {
								createdBy: {
									columns: {
										email: true,
									},
								},
							},
						},
					},
				})

				// Get creator's email from the meeting

				const creatorEmail =
					document?.meeting?.createdBy?.email ?? ctx.session.user.email ?? undefined

				// First check if document is fully signed
				const status = await checkSigningStatus(projectUuid, creatorEmail)

				if (!status.isFullySigned) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Document is not fully signed yet. Status: ${status.projectStatus}, Signed: ${status.signedCount}/${status.totalSigners}`,
					})
				}

				// Download the certificate
				const { buffer, fileName, url } = await downloadCertificate(projectUuid, creatorEmail)

				// Convert buffer to base64 for transmission
				const base64 = buffer.toString("base64")

				return {
					success: true,
					fileName,
					certificateUrl: url,
					base64,
					size: buffer.length,
				}
			} catch (error) {
				console.error("❌ Error downloading certificate:", error)
				if (error instanceof TRPCError) {
					throw error
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to download certificate",
				})
			}
		}),

	// NOTE:
	// We intentionally do NOT return DocoChain `api_token` in URLs (security risk).
	// For viewing the signed document, use our server-streaming API route:
	// `/api/doconchain/projects/:projectUuid/signed`

	// Get Passport Document
	getPassportDocument: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string(),
				view: z
					.enum([
						"blockchain",
						"history",
						"user_data",
						"verifiable_presentation",
						"certificate_url",
					])
					.optional()
					.default("blockchain"),
			})
		)
		.query(async ({ ctx, input }) => {
			const { projectUuid, view } = input

			try {
				// Get the document to find the creator's email
				const document = await db.query.documents.findFirst({
					where: eq(documents.docoChainProjectId, projectUuid),
					columns: {
						id: true,
						meetingId: true,
					},
					with: {
						meeting: {
							columns: {
								createdById: true,
							},
							with: {
								createdBy: {
									columns: {
										email: true,
									},
								},
							},
						},
					},
				})

				// Get creator's email from the meeting

				const creatorEmail =
					document?.meeting?.createdBy?.email ?? ctx.session.user.email ?? undefined

				// Get the passport document

				const passportData = await getPassportDocument(projectUuid, view, creatorEmail)

				return {
					success: true,
					view,

					data: passportData,
				}
			} catch (error) {
				console.error("❌ Error getting passport document:", error)
				if (error instanceof TRPCError) {
					throw error
				}
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: error instanceof Error ? error.message : "Failed to get passport document",
				})
			}
		}),
})
