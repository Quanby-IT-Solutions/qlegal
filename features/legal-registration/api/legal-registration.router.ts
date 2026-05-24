import { TRPCError } from "@trpc/server"
import { and, count, desc, eq } from "drizzle-orm"
import { z } from "zod/v4"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { enpProfiles } from "@/services/drizzle/schema/enp-profiles"
import { legalRegistrations } from "@/services/drizzle/schema/legal-registration"
import { createTRPCRouter, protectedProcedure } from "@/services/trpc/init"

import {
	applicationResponseSchema,
	legalRegistrationFormSchema,
	updateApplicationStatusSchema,
} from "./legal-registration.schemas"

export const legalRegistrationRouter = createTRPCRouter({
	// Create a new legal registration application
	create: protectedProcedure
		.input(legalRegistrationFormSchema)
		.output(
			z.object({
				id: z.string(),
				message: z.string(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			try {
				// Check if user already has an application
				const existingApplication = await db.query.legalRegistrations.findFirst({
					where: eq(legalRegistrations.applicantId, ctx.session.user.id),
				})

				if (existingApplication) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "You already have a legal registration application",
					})
				}

				// Create new application
				const [application] = await db
					.insert(legalRegistrations)
					.values({
						applicantId: ctx.session.user.id,

						// Personal Qualifications
						citizenship: input.personalQualifications.citizenship,
						dateOfBirth: new Date(input.personalQualifications.dateOfBirth),
						residentialAddress: input.personalQualifications.residentialAddress,
						workOrBusinessAddress: input.personalQualifications.workOrBusinessAddress,
						telephoneNumber: input.personalQualifications.telephoneNumber ?? null,
						mobileNumber: input.personalQualifications.mobileNumber,
						emailAddress: input.personalQualifications.emailAddress,
						professionalTaxReceiptNumber: input.personalQualifications.professionalTaxReceiptNumber,
						rollOfAttorneysNumber: input.personalQualifications.rollOfAttorneysNumber,
						ibpMembershipNumber: input.personalQualifications.ibpMembershipNumber,
						mcleComplianceNumber: input.personalQualifications.mcleComplianceNumber,
						ulasComplianceNumber: input.personalQualifications.ulasComplianceNumber,

						// Document URLs
						obcCertificationUrl: input.obcCertification?.fileUrl ?? "",
						ibpCertificationUrl: input.ibpCertification?.fileUrl ?? "",
						passportPhotoUrl: input.passportPhoto?.fileUrl ?? "",
						paymentProofUrl: input.paymentProof?.fileUrl ?? "",
						enfProviderCertificationUrl: input.enfProviderCertification?.fileUrl ?? "",

						// Undertakings
						undertakingElectronicNotarialActs: input.undertakingElectronicNotarialActs,
						undertakingDataSharingGuidelines: input.undertakingDataSharingGuidelines,

						// Status
						status: "DRAFT",
					})
					.returning()

				return {
					id: application!.id,
					message: "Legal registration application created successfully",
				}
			} catch (error) {
				console.error("Legal registration creation error:", error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create legal registration application",
				})
			}
		}),

	// Submit application for review
	submit: protectedProcedure
		.input(
			z.object({
				applicationId: z.string(),
				electronicSignatureUrl: z.string().url(),
			})
		)
		.output(z.object({ message: z.string() }))
		.mutation(async ({ ctx, input }) => {
			try {
				const application = await db.query.legalRegistrations.findFirst({
					where: and(
						eq(legalRegistrations.id, input.applicationId),
						eq(legalRegistrations.applicantId, ctx.session.user.id)
					),
				})

				if (!application) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Legal registration application not found",
					})
				}

				if (application.status !== "DRAFT") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Application has already been submitted",
					})
				}

				await db
					.update(legalRegistrations)
					.set({
						status: "PENDING",
						electronicSignatureApplied: true,
						electronicSignatureUrl: input.electronicSignatureUrl,
						submittedAt: new Date(),
					})
					.where(eq(legalRegistrations.id, input.applicationId))

				return { message: "Application submitted successfully for review" }
			} catch (error) {
				console.error("Legal registration submission error:", error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to submit legal registration application",
				})
			}
		}),

	// Get user's application
	getMyApplication: protectedProcedure
		.output(applicationResponseSchema.nullable())
		.query(async ({ ctx }) => {
			try {
				const application = await db.query.legalRegistrations.findFirst({
					where: eq(legalRegistrations.applicantId, ctx.session.user.id),
					with: {
						applicant: {
							columns: {
								name: true,
								email: true,
							},
						},
					},
				})

				if (!application) {
					return null
				}

				return {
					id: application.id,
					applicantId: application.applicantId,
					status: application.status,
					submittedAt: application.submittedAt ?? null,
					reviewedAt: application.reviewedAt ?? null,
					approvedAt: application.approvedAt ?? null,
					rejectedAt: application.rejectedAt ?? null,
					remarks: application.remarks ?? null,
					personalQualifications: {
						citizenship: application.citizenship,
						dateOfBirth: application.dateOfBirth.toISOString().slice(0, 10),
						residentialAddress: application.residentialAddress,
						workOrBusinessAddress: application.workOrBusinessAddress,
						telephoneNumber: application.telephoneNumber ?? undefined,
						mobileNumber: application.mobileNumber,
						emailAddress: application.emailAddress,
						professionalTaxReceiptNumber: application.professionalTaxReceiptNumber,
						rollOfAttorneysNumber: application.rollOfAttorneysNumber,
						ibpMembershipNumber: application.ibpMembershipNumber,
						mcleComplianceNumber: application.mcleComplianceNumber,
						ulasComplianceNumber: application.ulasComplianceNumber,
					},
					createdAt: application.createdAt,
					updatedAt: application.updatedAt,
				}
			} catch (error) {
				console.error("Get legal registration error:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to retrieve legal registration application",
				})
			}
		}),

	/**
	 * Step 2 (`completedAt`) = initial LMS / certificate placeholder. All modules (`allModulesCompletedAt`) = optional 5/5 telemetry.
	 * Sessions and booking require commissionStatus ACTIVE (admin approval).
	 */
	getMyEnpLmsCompletion: protectedProcedure
		.output(
			z.object({
				completedAt: z.string().nullable(),
				allModulesCompletedAt: z.string().nullable(),
			})
		)
		.query(async ({ ctx }) => {
			const row = await db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
				columns: { enpLmsCourseCompletedAt: true, enpLmsAllModulesCompletedAt: true },
			})
			const step2 = row?.enpLmsCourseCompletedAt
			const all = row?.enpLmsAllModulesCompletedAt
			return {
				completedAt: step2 ? step2.toISOString() : null,
				allModulesCompletedAt: all ? all.toISOString() : null,
			}
		}),

	recordEnpLmsCourseCompletion: protectedProcedure
		.input(z.object({ completedAtIso: z.string().optional() }))
		.output(
			z.object({
				completedAt: z.string(),
				promotedToEnp: z.boolean(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const nextAt = input.completedAtIso ? new Date(input.completedAtIso) : new Date()
			if (Number.isNaN(nextAt.getTime())) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid completion timestamp" })
			}

			const row = await db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
				columns: { enpLmsCourseCompletedAt: true, role: true },
			})
			const existing = row?.enpLmsCourseCompletedAt
			const chosen = existing && existing.getTime() >= nextAt.getTime() ? existing : nextAt

			const promoteToEnp = row?.role === "PRINCIPAL"

			await db
				.update(users)
				.set({
					enpLmsCourseCompletedAt: chosen,
					...(promoteToEnp
						? {
								role: "ENP",
								commissionStatus: "PENDING",
							}
						: {}),
				})
				.where(eq(users.id, ctx.session.user.id))

			if (promoteToEnp) {
				const hasProfile = await db.query.enpProfiles.findFirst({
					where: eq(enpProfiles.userId, ctx.session.user.id),
					columns: { id: true },
				})
				if (!hasProfile) {
					await db.insert(enpProfiles).values({
						userId: ctx.session.user.id,
						isAvailable: true,
					})
				}
			}

			return { completedAt: chosen.toISOString(), promotedToEnp: promoteToEnp }
		}),

	/** Record completion of all five ENP training modules (progress only; commission ACTIVE still required for sessions/booking). */
	recordEnpLmsAllModulesCompletion: protectedProcedure
		.output(z.object({ completedAt: z.string() }))
		.mutation(async ({ ctx }) => {
			const row = await db.query.users.findFirst({
				where: eq(users.id, ctx.session.user.id),
				columns: {
					role: true,
					enpLmsCourseCompletedAt: true,
					enpLmsAllModulesCompletedAt: true,
				},
			})
			if (row?.role !== "ENP") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"Complete step 2 of the ENP course (certificate) first. That step upgrades your account to ENP.",
				})
			}
			if (!row.enpLmsCourseCompletedAt) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message:
						"Finish the initial LMS step and download your certificate before marking all modules complete.",
				})
			}
			const existingFull = row.enpLmsAllModulesCompletedAt
			if (existingFull) {
				return { completedAt: existingFull.toISOString() }
			}
			const now = new Date()
			await db
				.update(users)
				.set({ enpLmsAllModulesCompletedAt: now })
				.where(eq(users.id, ctx.session.user.id))
			return { completedAt: now.toISOString() }
		}),

	// Update application (only in DRAFT status)
	update: protectedProcedure
		.input(
			z.object({
				applicationId: z.string(),
				data: legalRegistrationFormSchema.partial(),
			})
		)
		.output(z.object({ message: z.string() }))
		.mutation(async ({ ctx, input }) => {
			try {
				console.log("Update request received:", {
					applicationId: input.applicationId,
					userId: ctx.session.user.id,
					dataKeys: Object.keys(input.data),
				})

				const application = await db.query.legalRegistrations.findFirst({
					where: and(
						eq(legalRegistrations.id, input.applicationId),
						eq(legalRegistrations.applicantId, ctx.session.user.id)
					),
				})

				if (!application) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Legal registration application not found",
					})
				}

				if (application.status !== "DRAFT") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot update submitted application",
					})
				}

				// Build update data
				const updateData: Partial<typeof legalRegistrations.$inferInsert> = {}

				if (input.data.personalQualifications) {
					console.log("Updating personal qualifications")
					const pq = input.data.personalQualifications
					if (pq.citizenship) updateData.citizenship = pq.citizenship
					if (pq.dateOfBirth) updateData.dateOfBirth = new Date(pq.dateOfBirth)
					if (pq.residentialAddress) updateData.residentialAddress = pq.residentialAddress
					if (pq.workOrBusinessAddress) updateData.workOrBusinessAddress = pq.workOrBusinessAddress
					if (pq.telephoneNumber !== undefined)
						updateData.telephoneNumber = pq.telephoneNumber || null
					if (pq.mobileNumber) updateData.mobileNumber = pq.mobileNumber
					if (pq.emailAddress) updateData.emailAddress = pq.emailAddress
					if (pq.professionalTaxReceiptNumber)
						updateData.professionalTaxReceiptNumber = pq.professionalTaxReceiptNumber
					if (pq.rollOfAttorneysNumber) updateData.rollOfAttorneysNumber = pq.rollOfAttorneysNumber
					if (pq.ibpMembershipNumber) updateData.ibpMembershipNumber = pq.ibpMembershipNumber
					if (pq.mcleComplianceNumber) updateData.mcleComplianceNumber = pq.mcleComplianceNumber
					if (pq.ulasComplianceNumber) updateData.ulasComplianceNumber = pq.ulasComplianceNumber
				}

				if (input.data.obcCertification) {
					console.log("Updating OBC certification URL:", input.data.obcCertification.fileUrl)
					updateData.obcCertificationUrl = input.data.obcCertification.fileUrl
				}

				if (input.data.ibpCertification) {
					console.log("Updating IBP certification URL:", input.data.ibpCertification.fileUrl)
					updateData.ibpCertificationUrl = input.data.ibpCertification.fileUrl
				}

				if (input.data.passportPhoto) {
					console.log("Updating passport photo URL:", input.data.passportPhoto.fileUrl)
					updateData.passportPhotoUrl = input.data.passportPhoto.fileUrl
				}

				if (input.data.paymentProof) {
					console.log("Updating payment proof URL:", input.data.paymentProof.fileUrl)
					updateData.paymentProofUrl = input.data.paymentProof.fileUrl
				}

				if (input.data.enfProviderCertification) {
					console.log(
						"Updating ENF provider certification URL:",
						input.data.enfProviderCertification.fileUrl
					)
					updateData.enfProviderCertificationUrl = input.data.enfProviderCertification.fileUrl
				}

				if (input.data.undertakingElectronicNotarialActs !== undefined) {
					console.log(
						"Updating electronic notarial acts undertaking:",
						input.data.undertakingElectronicNotarialActs
					)
					updateData.undertakingElectronicNotarialActs =
						input.data.undertakingElectronicNotarialActs
				}

				if (input.data.undertakingDataSharingGuidelines !== undefined) {
					console.log(
						"Updating data sharing guidelines undertaking:",
						input.data.undertakingDataSharingGuidelines
					)
					updateData.undertakingDataSharingGuidelines = input.data.undertakingDataSharingGuidelines
				}

				console.log("Final update data:", updateData)

				await db
					.update(legalRegistrations)
					.set(updateData)
					.where(eq(legalRegistrations.id, input.applicationId))

				console.log("Application updated successfully in database")

				return { message: "Application updated successfully" }
			} catch (error) {
				console.error("Legal registration update error:", error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update legal registration application",
				})
			}
		}),

	// Admin: List all applications
	listApplications: protectedProcedure
		.input(
			z.object({
				status: z
					.enum(["ALL", "DRAFT", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"])
					.default("ALL"),
				page: z.number().min(1).default(1),
				limit: z.number().min(1).max(50).default(10),
			})
		)
		.query(async ({ ctx, input }) => {
			// Check if user is admin
			if (ctx.session.user.role !== "ADMIN") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only administrators can view all applications",
				})
			}

			try {
				const skip = (input.page - 1) * input.limit

				const whereCondition =
					input.status === "ALL" ? undefined : eq(legalRegistrations.status, input.status)

				const [applications, totalResult] = await Promise.all([
					db.query.legalRegistrations.findMany({
						where: whereCondition,
						limit: input.limit,
						offset: skip,
						with: {
							applicant: {
								columns: {
									name: true,
									email: true,
								},
							},
						},
						orderBy: desc(legalRegistrations.createdAt),
					}),
					db.select({ count: count() }).from(legalRegistrations).where(whereCondition),
				])

				const total = totalResult[0]?.count ?? 0

				return {
					applications,
					pagination: {
						page: input.page,
						limit: input.limit,
						total,
						pages: Math.ceil(total / input.limit),
					},
				}
			} catch (error) {
				console.error("List applications error:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to retrieve applications",
				})
			}
		}),

	// Admin: Update application status
	updateStatus: protectedProcedure
		.input(updateApplicationStatusSchema)
		.output(z.object({ message: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Check if user is admin
			if (ctx.session.user.role !== "ADMIN") {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only administrators can update application status",
				})
			}

			try {
				const application = await db.query.legalRegistrations.findFirst({
					where: eq(legalRegistrations.id, input.applicationId),
				})

				if (!application) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Legal registration application not found",
					})
				}

				const updateData: Partial<typeof legalRegistrations.$inferInsert> = {
					status: input.status,
					reviewedBy: ctx.session.user.id,
					reviewedAt: new Date(),
					remarks: input.remarks,
				}

				if (input.status === "APPROVED") {
					updateData.approvedAt = new Date()
				} else if (input.status === "REJECTED") {
					updateData.rejectedAt = new Date()
				}

				await db
					.update(legalRegistrations)
					.set(updateData)
					.where(eq(legalRegistrations.id, input.applicationId))

				return {
					message: `Application ${input.status.toLowerCase()} successfully`,
				}
			} catch (error) {
				console.error("Update application status error:", error)

				if (error instanceof TRPCError) {
					throw error
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update application status",
				})
			}
		}),

	// Get or create draft application (auto-draft creation)
	getOrCreateDraft: protectedProcedure
		.output(
			z.object({
				id: z.string(),
				message: z.string(),
			})
		)
		.mutation(async ({ ctx }) => {
			try {
				console.log("getOrCreateDraft called for user:", ctx.session.user.id)

				// Check if user already has an application
				const existingApplication = await db.query.legalRegistrations.findFirst({
					where: eq(legalRegistrations.applicantId, ctx.session.user.id),
				})

				if (existingApplication) {
					console.log("Found existing application:", existingApplication.id)
					return {
						id: existingApplication.id,
						message: "Existing application found",
					}
				}

				console.log("No existing application found, creating new draft...")

				// Create new draft application with minimal data
				const [application] = await db
					.insert(legalRegistrations)
					.values({
						applicantId: ctx.session.user.id,

						// Personal Qualifications - minimal defaults
						citizenship: "Filipino",
						dateOfBirth: new Date("2000-01-01"), // Default date that will be updated
						residentialAddress: "",
						workOrBusinessAddress: "",
						telephoneNumber: null,
						mobileNumber: "",
						emailAddress: ctx.session.user.email ?? "", // Pre-fill from user account
						professionalTaxReceiptNumber: "",
						rollOfAttorneysNumber: "",
						ibpMembershipNumber: "",
						mcleComplianceNumber: "",
						ulasComplianceNumber: "",

						// File uploads - all empty strings initially
						obcCertificationUrl: "",
						ibpCertificationUrl: "",
						passportPhotoUrl: "",
						paymentProofUrl: "",
						enfProviderCertificationUrl: "",

						// Undertakings - false initially
						undertakingElectronicNotarialActs: false,
						undertakingDataSharingGuidelines: false,

						// Electronic signature
						electronicSignatureApplied: false,

						// Set as draft
						status: "DRAFT",
					})
					.returning()

				console.log("Draft application created successfully:", application!.id)

				return {
					id: application!.id,
					message: "Draft application created successfully",
				}
			} catch (error) {
				console.error("Error in getOrCreateDraft:", error)
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create draft application",
				})
			}
		}),
})
