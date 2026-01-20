import { TRPCError } from "@trpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod/v4"

import {
	addSignerToProject,
	autoJoinOrganization,
	checkSigningStatus,
	deleteSigner,
	downloadCertificate,
	downloadSignedDocument,
	generateEditDraftLink,
	generateSignLink,
	getDocoChainToken,
	getPassportDocument,
	getProjectDetails,
	sendDocoChainProject,
} from "@/services/docochain"
import { normalizeDocoChainUrl } from "@/services/docochain/url-normalizer"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { signatureRequests } from "@/services/drizzle/schema/signature-requests"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import { env } from "@/env"

const DOCOCHAIN_API_BASE = env.DOCOCHAIN_API_URL ?? "https://stg-api2.doconchain.com"

function isEnpRole(role: unknown): boolean {
	if (typeof role !== "string") return false
	return role.trim().toUpperCase() === "ENP"
}

function asNonEmptyEmail(email: unknown): string | undefined {
	if (typeof email !== "string") return undefined
	const trimmed = email.trim()
	return trimmed.length > 0 ? trimmed : undefined
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

					const addSignerResponse = await addSignerToProject({
						projectUuid: document.docoChainProjectId,
						email: signerUser.email ?? "",
						firstName,
						lastName,
						signerRole: "Signer",
						userEmail: enpEmail, // Use ENP email for token (required for DocoChain auth)
					})

					console.log("✅ Added signer to DocoChain project")

					// 🔥 WORKAROUND: DocoChain ignores creator_as_viewer=false
					// So we manually DELETE the creator from the signers list
					try {
						console.log("🔥 Removing creator from signers list...")

						// The addSignerResponse contains ALL signers, including the creator
						// Find the creator (type: 'ME') or by email
						const signersArray = Array.isArray(addSignerResponse.data) ? addSignerResponse.data : []
						const creatorSigner = signersArray.find(
							signer => signer.type === "ME" || signer.email === ctx.session.user.email
						)

						if (creatorSigner) {
							console.log(
								`🗑️ Found creator signer: ${creatorSigner.email} (ID: ${creatorSigner.id})`
							)
							const signerId =
								typeof creatorSigner.id === "number" ? creatorSigner.id : Number(creatorSigner.id)
							await deleteSigner({
								projectUuid: document.docoChainProjectId,
								signerId,
								userEmail: enpEmail, // Use ENP email for token (required for DocoChain auth)
							})
							console.log("✅ Creator DELETED! Only ENP remains in the document! 🎉")
						} else {
							console.log("ℹ️ Creator not found in signers list (already removed or not added)")
						}
					} catch (deleteError) {
						console.error("⚠️ Failed to remove creator (non-critical):", deleteError)
						// Continue anyway - not critical
					}

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

	// ENP initiates signing - adds them as signer and redirects to signing page
	initiateSigning: protectedProcedure
		.input(
			z.object({
				projectUuid: z.string().min(1, "Project UUID is required"),
				email: z.string().email("Valid email is required"),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const { projectUuid, email } = input

			try {
				// Get document to check for stored redirect URL (has auth token) and get meeting
				const document = await db.query.documents.findFirst({
					where: eq(documents.docoChainProjectId, projectUuid),
					with: {
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

				if (!document?.meeting) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Document or meeting not found",
					})
				}

				const meeting = document.meeting
				const participants = meeting.participants || []

				// CRITICAL: DocoChain auth MUST use an ENP (enterprise) token/email.
				let creatorEmail: string | undefined

				if (isEnpRole(meeting.createdBy?.role)) {
					creatorEmail = asNonEmptyEmail(meeting.createdBy?.email)
				}
				if (!creatorEmail) {
					const enpParticipant = participants.find(p => isEnpRole(p.user?.role) && !!p.user?.email)
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

				console.log("🔵 User initiating signing process...")
				console.log("   - Project UUID:", projectUuid)
				console.log("   - Meeting ID:", meeting.id)
				console.log("   - Total participants:", participants.length)
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

				try {
					const projectDetails = await getProjectDetails(projectUuid, creatorEmail)

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
							message: `DocoChain project not found. The project may have been deleted or the project UUID (${projectUuid}) is incorrect.`,
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

				// Step 2: Add ALL meeting participants as signers if not already added
				// This ensures all participants (principal + ENPs) are visible in DocoChain
				console.log("🔵 Step 2: Ensuring all meeting participants are added as signers...")

				for (const participant of participants) {
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
						await addSignerToProject({
							projectUuid,
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
								message: `DocoChain project not found. The project may have been deleted or the project UUID (${projectUuid}) is incorrect. Please contact support if this issue persists.`,
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

				console.log(`✅ All meeting participants have been ensured as signers`)
				console.log(`   - Total signers after update: ${currentSigners.length}`)

				// Step 3: Get signing link for user
				// Strategy:
				// - If project is Draft: Use Edit Draft Link or stored redirect URL
				// - If project is Sent: Use Generate Sign Link API (requires project to be sent)
				console.log("🔵 Step 3: Getting signing link for user...")
				console.log("   - Project UUID:", projectUuid)
				console.log("   - User Email (signer):", email)

				let signingLink: string

				// Use project status from earlier check to determine which link type to use
				let isProjectSent = false
				try {
					const projectDetails = await getProjectDetails(projectUuid, creatorEmail)

					projectStatus = projectDetails?.data?.status ?? "Draft"
					// Check if project has been sent (sent_at field exists) or status indicates it's sent

					isProjectSent =
						!!projectDetails?.data?.sent_at ||
						projectStatus === "Sent" ||
						projectStatus === "Completed" ||
						projectStatus === "In Progress" ||
						projectStatus === "View Only" // "View Only" means project was sent
					console.log("   - Project Status:", projectStatus)

					console.log("   - Project Sent At:", projectDetails?.data?.sent_at ?? "not sent")
					console.log("   - Is Project Sent:", isProjectSent)
				} catch (statusError) {
					console.warn("⚠️ Failed to get project status, assuming Draft:", statusError)
				}

				// If project is Sent or Completed, use Generate Sign Link API
				// This generates a personalized link for the specific signer
				// IMPORTANT: Do NOT use stored redirect URL or Edit Draft Link for sent projects
				if (isProjectSent) {
					console.log(
						"🔵 Project is sent - using Generate Sign Link API (required for sent projects)..."
					)
					try {
						// CRITICAL: Pass ENP's email (creatorEmail) for token generation
						// The 'email' parameter is for the signer, but auth token must be ENP's
						const signLinkResult = await generateSignLink({
							projectUuid,
							email, // Signer's email - this generates a personalized link for them
							userEmail: creatorEmail, // ENP's email - for API token generation
						})
						signingLink = signLinkResult.link
						console.log("✅ Signing link generated successfully for sent project:", signingLink)
					} catch (signLinkError) {
						console.error("❌ Failed to generate signing link for sent project:", signLinkError)
						// Fallback: Use direct project URL with email parameter
						const appBaseUrl = DOCOCHAIN_API_BASE.includes("stg")
							? "https://stg-app.doconchain.com"
							: "https://app.doconchain.com"
						signingLink = `${appBaseUrl}/${projectUuid}?email=${encodeURIComponent(email)}&api=true`
						console.log("⚠️ Using fallback direct project URL with email:", signingLink)
					}
				} else {
					// Project is still Draft - use Edit Draft Link or stored redirect URL (for plotting)
					// This is for the FIRST time clicking "Start Signing" to plot signature fields
					console.log(
						"🔵 Project is Draft - using Edit Draft Link or stored redirect URL (for plotting)..."
					)

					// First, try to use the stored redirect_url from Create Project (has auth token)
					// Only use this for Draft projects (for plotting signature fields)
					if (document?.docoChainRedirectUrl && projectStatus === "Draft") {
						// ALWAYS normalize the stored redirect URL - ensure api=true is set
						signingLink =
							normalizeDocoChainUrl(document.docoChainRedirectUrl) ?? document.docoChainRedirectUrl

						// Fix api_token if needed
						try {
							const url = new URL(signingLink)
							// CRITICAL: ALWAYS set api=true FIRST - this ensures api=null is never in the final URL
							url.searchParams.set("api", "true")
							// Fix api_token if it's undefined or empty - ALWAYS use ENP's token
							// ENP is the project creator/owner, so their token is required
							if (
								url.searchParams.has("api_token") &&
								(url.searchParams.get("api_token") === "undefined" ||
									url.searchParams.get("api_token") === "")
							) {
								if (creatorEmail) {
									const apiToken = await getDocoChainToken(creatorEmail)
									url.searchParams.set("api_token", apiToken)
									console.log(`✅ Fixed api_token parameter using ENP email: ${creatorEmail}`)
								} else {
									url.searchParams.delete("api_token")
									console.log("⚠️ Removed invalid api_token (no ENP email)")
								}
							} else if (!url.searchParams.has("api_token") && creatorEmail) {
								// Add api_token if not present - ALWAYS use ENP's token
								const apiToken = await getDocoChainToken(creatorEmail)
								url.searchParams.set("api_token", apiToken)
								console.log(`✅ Added api_token parameter using ENP email: ${creatorEmail}`)
							}
							signingLink = url.toString()
							console.log(
								"✅ Using stored redirect URL from Create Project (for plotting):",
								signingLink
							)
						} catch {
							// If URL parsing fails, signingLink is already normalized
							console.log("✅ Using normalized stored redirect URL")
						}
					} else {
						// Generate Edit Draft Project Link (allows plotting/editing/signing in draft)
						// POST /api/v2/projects/{uuid}/link?user_type=ENTERPRISE_API
						// Use creator's token to generate the link
						try {
							const editDraftResult = await generateEditDraftLink(projectUuid, creatorEmail)
							signingLink = editDraftResult.link
							console.log(
								"✅ Edit Draft Project Link generated successfully (for plotting):",
								signingLink
							)
						} catch (editDraftError) {
							console.error("❌ Failed to generate Edit Draft Link:", editDraftError)
							// Final fallback: Use direct project URL
							const appBaseUrl = DOCOCHAIN_API_BASE.includes("stg")
								? "https://stg-app.doconchain.com"
								: "https://app.doconchain.com"
							signingLink = `${appBaseUrl}/${projectUuid}?api=true`
							console.log("⚠️ Using fallback direct project URL:", signingLink)
						}
					}
				}

				// FINAL FIX: ALWAYS normalize the URL before returning
				// This ensures api=true is ALWAYS set, no matter what
				if (signingLink) {
					// Normalize the URL - this ALWAYS sets api=true
					signingLink = normalizeDocoChainUrl(signingLink) ?? signingLink

					// Handle api_token if needed
					try {
						const url = new URL(signingLink)
						// CRITICAL: ALWAYS set api=true FIRST - this ensures api=null is never in the final URL
						url.searchParams.set("api", "true")
						// Fix api_token if it's undefined or empty
						// CRITICAL: ALWAYS use ENP's email (creatorEmail) for token generation
						// ENP is the project owner, so their token is required for API access
						if (
							url.searchParams.has("api_token") &&
							(url.searchParams.get("api_token") === "undefined" ||
								url.searchParams.get("api_token") === "")
						) {
							if (creatorEmail) {
								try {
									const apiToken = await getDocoChainToken(creatorEmail)
									url.searchParams.set("api_token", apiToken)
									console.log(`✅ FINAL FIX: Fixed api_token=undefined using ENP email: ${creatorEmail}`)
								} catch (tokenError) {
									console.warn("⚠️ Failed to get token for api_token fix:", tokenError)
									url.searchParams.delete("api_token")
									console.log("⚠️ Removed invalid api_token (token generation failed)")
								}
							} else {
								url.searchParams.delete("api_token")
								console.log("⚠️ Removed invalid api_token (no ENP email)")
							}
						} else if (!url.searchParams.has("api_token")) {
							// Add api_token if not present - ALWAYS use ENP's token
							if (creatorEmail) {
								try {
									const apiToken = await getDocoChainToken(creatorEmail)
									url.searchParams.set("api_token", apiToken)
									console.log(`✅ FINAL FIX: Added api_token using ENP email: ${creatorEmail}`)
								} catch (tokenError) {
									console.warn("⚠️ Failed to add api_token:", tokenError)
								}
							}
						}
						signingLink = url.toString()
					} catch {
						// If URL parsing fails, signingLink is already normalized
						console.log("✅ FINAL FIX: URL already normalized")
					}

					// FINAL safety check - normalize one more time to be absolutely sure
					signingLink = normalizeDocoChainUrl(signingLink) ?? signingLink
				}

				// ABSOLUTE FINAL CHECK: Normalize one last time before returning
				const finalNormalizedLink = normalizeDocoChainUrl(signingLink) ?? signingLink
				
				return {
					success: true,
					link: finalNormalizedLink,
					projectUuid, // Return project UUID for reference
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
						const enpParticipant = document.meeting.participants.find(
							p => p.user?.role === "ENP"
						)
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
				// The Generate Sign Link API requires the project to be sent/deployed
				console.log("🔵 Sending DocoChain project to enable signing...")
				try {
					await sendDocoChainProject(projectUuid, enpEmail)
					console.log("✅ Project sent successfully")
				} catch (sendError) {
					console.warn("⚠️ Failed to send project (may already be sent):", sendError)
					// Continue anyway - project might already be sent
				}

				// Step 4: Generate the signing link for this ENP
				// This must be done AFTER sending the project
				console.log("🔵 Generating signing link for ENP...")
				// CRITICAL: Pass ENP's email (enpEmail) for token generation
				// The 'email' parameter is for the signer, but auth token must be ENP's
				const result = await generateSignLink({
					projectUuid,
					email, // Signer's email (ENP in this case)
					userEmail: enpEmail, // ENP's email - for API token generation
				})

				// FINAL FIX: Ensure api=null is ALWAYS replaced with api=true before returning
				let finalLink = result.link
				if (finalLink) {
					try {
						const url = new URL(finalLink)
						// CRITICAL: ALWAYS set api=true - replace any value (null, undefined, false, etc.)
						const currentApiValue = url.searchParams.get("api")
						if (currentApiValue !== "true") {
							url.searchParams.set("api", "true")
							finalLink = url.toString()
							console.log(
								`✅ FINAL FIX: Set api=true in generateSigningLink (was: ${currentApiValue ?? "missing"})`
							)
						}
					} catch {
						// If URL parsing fails, use string replacement
						finalLink = finalLink
							.replace(/\?api=null(&|$)/, "?api=true$1")
							.replace(/&api=null(&|$)/, "&api=true$1")
						if (!finalLink.includes("api=")) {
							const separator = finalLink.includes("?") ? "&" : "?"
							finalLink = `${finalLink}${separator}api=true`
						}
						console.log(
							"✅ FINAL FIX: Fixed api parameter in generateSigningLink using string replacement"
						)
					}
				}

				// ABSOLUTE FINAL CHECK: Normalize one last time before returning
				const finalNormalizedLink = normalizeDocoChainUrl(finalLink) ?? finalLink
				
				return {
					success: true,
					link: finalNormalizedLink,
				}
			} catch (error) {
				console.error("❌ Failed to generate signing link:", error)
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const isSigner = signers.some((signer: any) => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
		.query(async ({ input, ctx }) => {
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
									},
								},
								participants: {
									with: {
										user: {
											columns: {
												email: true,
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

				// Collect all possible emails that might have created the project
				// This handles cases where documents were uploaded by different users
				const possibleEmails = new Set<string>()

				// Add session user email (the person checking status)
				if (ctx.session.user.email) {
					possibleEmails.add(ctx.session.user.email)
				}

				// Add meeting creator email
				if (document.meeting?.createdBy?.email) {
					possibleEmails.add(document.meeting.createdBy.email)
				}

				// Add all meeting participants' emails (any of them could have uploaded)
				if (document.meeting?.participants) {
					for (const participant of document.meeting.participants) {
						if (participant.user?.email) {
							possibleEmails.add(participant.user.email)
						}
					}
				}

				// Add envelope creator email
				if (document.envelope?.user?.email) {
					possibleEmails.add(document.envelope.user.email)
				}

				// Try each email until one works
				const emailArray = Array.from(possibleEmails)
				let lastError: Error | null = null

				for (const email of emailArray) {
					try {
						console.log(`🔵 Trying to check status with email: ${email}`)
						const status = await checkSigningStatus(projectUuid, email)
						console.log(`✅ Successfully checked status with email: ${email}`)
						return status
					} catch (error) {
						console.warn(
							`⚠️ Failed to check status with email ${email}:`,
							error instanceof Error ? error.message : String(error)
						)
						lastError = error instanceof Error ? error : new Error(String(error))

						// If it's a "not part of project" error, try next email
						// If it's a "project not found" error, also try next email (might be wrong creator)
						if (
							error instanceof Error &&
							(error.message.includes("not part of this project") ||
								error.message.includes("Project not found") ||
								error.message.includes("not found"))
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
	// `/api/docochain/projects/:projectUuid/signed`

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
