// import { TRPCError } from "@trpc/server"
// import { z } from "zod/v4"

// import { getPublicClient } from "@/services/supabase"
// import { createTRPCRouter, publicProcedure } from "@/services/trpc/init"

// import {
// 	downloadSignedDocumentSchema,
// 	// getMySignedEnvelopeSchema,
// 	getSigningTimelineSchema,
// 	listMySignedEnvelopesSchema,
// } from "./my-signed.schemas"

// // Helper function to determine the correct bucket based on path format
// function getBucketName(path: string): string {
// 	// Legacy file upload: simple filename without slashes -> "documents" bucket
// 	// Envelope system: nested path with slashes -> "envelopes" bucket
// 	return path.includes("/") ? "envelopes" : "documents"
// }

// export const mySignedRouter = createTRPCRouter({
// 	// List all envelopes where the user has signed documents
// 	listMySignedEnvelopes: publicProcedure
// 		.input(listMySignedEnvelopesSchema)
// 		.query(async ({ ctx, input }) => {
// 			const { status, limit = 10, offset = 0, userId } = input

// 			if (!userId) {
// 				throw new TRPCError({
// 					code: "UNAUTHORIZED",
// 					message: "User ID is required",
// 				})
// 			}

// 			// Base query to find envelopes where user has signed documents
// 			const baseWhere = {
// 				documents: {
// 					some: {
// 						recipients: {
// 							some: {
// 								userId,
// 								role: "SIGNER" as const,
// 								status: "SIGNED" as const,
// 							},
// 						},
// 					},
// 				},
// 			}

// 			let where
// 			// Add status-specific filters
// 			if (status === "COMPLETED") {
// 				// Only completed envelopes
// 				where = {
// 					...baseWhere,
// 					status: "COMPLETED" as const,
// 				}
// 			} else if (status === "SIGNED") {
// 				// User has signed but envelope might not be completed yet
// 				where = baseWhere
// 			} else {
// 				// Default: all envelopes where user has signed documents
// 				where = baseWhere
// 			}

// 			const [envelopes, total] = await Promise.all([
// 				ctx.db.envelope.findMany({
// 					where,
// 					include: {
// 						documents: {
// 							include: {
// 								recipients: {
// 									include: {
// 										user: {
// 											select: {
// 												id: true,
// 												name: true,
// 												email: true,
// 											},
// 										},
// 									},
// 								},
// 								signedDoc: true, // Include signed version for URL generation
// 							},
// 						},
// 						createdBy: {
// 							select: {
// 								id: true,
// 								name: true,
// 								email: true,
// 							},
// 						},
// 					},
// 					orderBy: { updatedAt: "desc" }, // Most recently updated first
// 					take: limit,
// 					skip: offset,
// 				}),
// 				ctx.db.envelope.count({ where }),
// 			])

// 			// Transform to include only documents where this user signed
// 			const supabase = getPublicClient()
// 			const transformedEnvelopes = envelopes
// 				.map(envelope => ({
// 					...envelope,
// 					documents: envelope.documents
// 						.filter(doc => {
// 							// Only include documents where the user is a signed recipient
// 							return doc.recipients.some(
// 								r => r.userId === userId && r.role === "SIGNER" && r.status === "SIGNED"
// 							)
// 						})
// 						.map(doc => {
// 							// Use the signed version for URL (should exist since user signed)
// 							const displayDocument = doc.signedDoc ?? doc
// 							const {
// 								data: { publicUrl },
// 							} = supabase.storage
// 								.from(getBucketName(displayDocument.path))
// 								.getPublicUrl(displayDocument.path)

// 							return {
// 								...doc,
// 								url: publicUrl,
// 								displayPath: displayDocument.path,
// 								isSignedVersion: !!doc.signedDoc,
// 								recipients: doc.recipients.map(recipient => ({
// 									id: recipient.id,
// 									role: recipient.role,
// 									status: recipient.status,
// 									userId: recipient.userId,
// 									user: recipient.user
// 										? {
// 												id: recipient.user.id,
// 												name: recipient.user.name,
// 												email: recipient.user.email,
// 											}
// 										: null,
// 								})),
// 							}
// 						}),
// 				}))
// 				.filter(envelope => envelope.documents.length > 0) // Only include envelopes with signed documents

// 			return {
// 				envelopes: transformedEnvelopes,
// 				total,
// 				pagination: {
// 					limit,
// 					offset,
// 					hasMore: offset + limit < total,
// 				},
// 			}
// 		}),

// 	// Download a signed document
// 	downloadSignedDocument: publicProcedure
// 		.input(downloadSignedDocumentSchema)
// 		.query(async ({ ctx, input }) => {
// 			const { documentId, userId } = input

// 			if (!userId) {
// 				throw new TRPCError({
// 					code: "UNAUTHORIZED",
// 					message: "User ID is required",
// 				})
// 			}

// 			// Find the document and verify user access
// 			const document = await ctx.db.document.findUnique({
// 				where: { id: documentId },
// 				include: {
// 					recipients: {
// 						where: {
// 							userId,
// 							role: "SIGNER",
// 							status: "SIGNED",
// 						},
// 					},
// 					signedDoc: true,
// 					envelope: {
// 						select: {
// 							id: true,
// 							title: true,
// 							status: true,
// 						},
// 					},
// 				},
// 			})

// 			if (!document) {
// 				throw new TRPCError({
// 					code: "NOT_FOUND",
// 					message: "Document not found",
// 				})
// 			}

// 			if (document.recipients.length === 0) {
// 				throw new TRPCError({
// 					code: "FORBIDDEN",
// 					message: "You do not have access to download this document",
// 				})
// 			}

// 			// Use the signed version if available
// 			const downloadDocument = document.signedDoc ?? document
// 			const supabase = getPublicClient()

// 			// Get download URL
// 			const {
// 				data: { publicUrl },
// 			} = supabase.storage
// 				.from(getBucketName(downloadDocument.path))
// 				.getPublicUrl(downloadDocument.path)

// 			return {
// 				downloadUrl: publicUrl,
// 				filename: downloadDocument.name,
// 				documentId: downloadDocument.id,
// 				isSignedVersion: !!document.signedDoc,
// 				envelope: document.envelope,
// 			}
// 		}),

// 	// Get statistics about user's signed documents
// 	getMySignedStats: publicProcedure
// 		.input(z.object({ userId: z.string() }))
// 		.query(async ({ ctx, input }) => {
// 			const { userId } = input

// 			if (!userId) {
// 				throw new TRPCError({
// 					code: "UNAUTHORIZED",
// 					message: "User ID is required",
// 				})
// 			}

// 			const [totalSigned, completedEnvelopes, pendingEnvelopes] = await Promise.all([
// 				// Count total documents signed by user
// 				ctx.db.recipient.count({
// 					where: {
// 						userId,
// 						role: "SIGNER",
// 						status: "SIGNED",
// 					},
// 				}),

// 				// Count completed envelopes where user signed
// 				ctx.db.envelope.count({
// 					where: {
// 						status: "COMPLETED",
// 						documents: {
// 							some: {
// 								recipients: {
// 									some: {
// 										userId,
// 										role: "SIGNER",
// 										status: "SIGNED",
// 									},
// 								},
// 							},
// 						},
// 					},
// 				}),

// 				// Count envelopes still pending where user has signed
// 				ctx.db.envelope.count({
// 					where: {
// 						status: {
// 							in: ["PUBLISHED", "PENDING_APPROVAL"],
// 						},
// 						documents: {
// 							some: {
// 								recipients: {
// 									some: {
// 										userId,
// 										role: "SIGNER",
// 										status: "SIGNED",
// 									},
// 								},
// 							},
// 						},
// 					},
// 				}),
// 			])

// 			return {
// 				totalDocumentsSigned: totalSigned,
// 				completedEnvelopes,
// 				pendingEnvelopes,
// 				totalEnvelopes: completedEnvelopes + pendingEnvelopes,
// 			}
// 		}),

// 	// Get signing timeline data for charts
// 	getSigningTimeline: publicProcedure
// 		.input(getSigningTimelineSchema)
// 		.query(async ({ ctx, input }) => {
// 			const { userId, period } = input

// 			if (!userId) {
// 				throw new TRPCError({
// 					code: "UNAUTHORIZED",
// 					message: "User ID is required",
// 				})
// 			}

// 			const now = new Date()
// 			let startDate: Date

// 			// Determine the time range based on period
// 			switch (period) {
// 				case "week":
// 					startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
// 					break
// 				case "month":
// 					startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
// 					break
// 				case "year":
// 					startDate = new Date(now.getFullYear() - 4, 0, 1)
// 					break
// 				default:
// 					startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
// 			}

// 			// Query for signed documents with timestamp
// 			const signedDocuments = await ctx.db.recipient.findMany({
// 				where: {
// 					userId,
// 					role: "SIGNER",
// 					status: "SIGNED",
// 					documentFields: {
// 						some: {
// 							signedAt: {
// 								gte: startDate,
// 							},
// 						},
// 					},
// 				},
// 				include: {
// 					documentFields: {
// 						where: {
// 							signedAt: {
// 								gte: startDate,
// 							},
// 						},
// 						orderBy: {
// 							signedAt: "asc",
// 						},
// 					},
// 				},
// 			})

// 			// Process data to create timeline
// 			const timelineData: Record<string, number> = {}

// 			signedDocuments.forEach(recipient => {
// 				recipient.documentFields.forEach(field => {
// 					if (field.signedAt) {
// 						let key: string
// 						const date = new Date(field.signedAt)

// 						switch (period) {
// 							case "week":
// 								key = date.toISOString().split("T")[0]!
// 								break
// 							case "month":
// 								key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
// 								break
// 							case "year":
// 								key = String(date.getFullYear())
// 								break
// 							default:
// 								key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
// 						}

// 						timelineData[key] = (timelineData[key] ?? 0) + 1
// 					}
// 				})
// 			})

// 			// Generate all possible keys for the period to ensure continuity
// 			const allKeys: string[] = []
// 			const current = new Date(startDate)

// 			while (current <= now) {
// 				let key: string
// 				switch (period) {
// 					case "week":
// 						key = current.toISOString().split("T")[0]!
// 						current.setDate(current.getDate() + 1)
// 						break
// 					case "month":
// 						key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
// 						current.setMonth(current.getMonth() + 1)
// 						break
// 					case "year":
// 						key = String(current.getFullYear())
// 						current.setFullYear(current.getFullYear() + 1)
// 						break
// 					default:
// 						key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
// 						current.setMonth(current.getMonth() + 1)
// 				}
// 				allKeys.push(key)
// 			}

// 			// Create final timeline with all periods included
// 			const timeline = allKeys.map(key => ({
// 				period: key,
// 				signed: timelineData[key] ?? 0,
// 			}))

// 			return {
// 				timeline,
// 				totalSigned: Object.values(timelineData).reduce((sum, count) => sum + count, 0),
// 				period,
// 			}
// 		}),
// })
