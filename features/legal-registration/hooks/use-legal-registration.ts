"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { toast } from "sonner"

import { usePresignedUrl } from "@/services/supabase/presigned-url"
import { getPublicUrl } from "@/services/supabase/signed-url"
import { useUploadFile } from "@/services/supabase/upload"
import { trpc, type RouterOutputs } from "@/services/trpc/client"

import type {
	LegalRegistrationForm,
	PersonalQualifications,
	UpdateApplicationStatus,
} from "../api/legal-registration.schemas"

// Type helpers for tRPC responses
type CreateApplicationOutput = RouterOutputs["legalRegistration"]["create"]
type UpdateApplicationOutput = RouterOutputs["legalRegistration"]["update"]
type SubmitApplicationOutput = RouterOutputs["legalRegistration"]["submit"]
type GetOrCreateDraftOutput = RouterOutputs["legalRegistration"]["getOrCreateDraft"]
type UpdateStatusOutput = RouterOutputs["legalRegistration"]["updateStatus"]

export function useLegalRegistration() {
	const utils = trpc.useUtils()
	const router = useRouter()

	// Get user's application
	 
	const {
		data: application,
		isLoading,
		error,
		refetch,
	} = trpc.legalRegistration.getMyApplication.useQuery()

	// Auto-create draft application if none exists
	 
	const autoCreateDraft = trpc.legalRegistration.getOrCreateDraft.useMutation({
		onSuccess: (data: GetOrCreateDraftOutput) => {
			console.log("Auto-created draft application:", data.id, data.message)
			 
			void utils.legalRegistration.getMyApplication.invalidate()
		},
		onError: (error: { message: string }) => {
			console.error("Failed to auto-create draft:", error.message)
			console.error("Full error:", error)

			// If it's a CORS or network error, provide helpful message
			if (error.message.includes("Failed to fetch") || error.message.includes("CORS")) {
				console.error(
					"This appears to be a network/CORS issue. Check if the development server is running properly."
				)
			}
		},
	})

	// Create application mutation
	 
	const createApplication = trpc.legalRegistration.create.useMutation({
		onSuccess: (data: CreateApplicationOutput) => {
			toast.success(data.message)
			 
			void utils.legalRegistration.getMyApplication.invalidate()
		},
		onError: (error: { message: string }) => {
			toast.error(error.message)
		},
	})

	// Update application mutation
	 
	const updateApplication = trpc.legalRegistration.update.useMutation({
		onSuccess: (data: UpdateApplicationOutput) => {
			console.log("Application updated successfully:", data.message)
			toast.success(data.message)
			 
			void utils.legalRegistration.getMyApplication.invalidate()
		},
		onError: (error: { message: string }) => {
			console.error("Application update failed:", error.message)
			console.error("Full update error:", error)
			toast.error(error.message)
		},
	})

	// Submit application mutation
	 
	const submitApplication = trpc.legalRegistration.submit.useMutation({
		onSuccess: (data: SubmitApplicationOutput) => {
			toast.success(data.message)
			 
			void utils.legalRegistration.getMyApplication.invalidate()
			// Redirect to landing page after successful submission
			router.push("/")
		},
		onError: (error: { message: string }) => {
			toast.error(error.message)
		},
	})

	// Helper functions
	const createNewApplication = useCallback(
		(data: LegalRegistrationForm) => {
			 
			createApplication.mutate(data)
		},
		[createApplication]
	)

	const updateExistingApplication = useCallback(
		(applicationId: string, data: Partial<LegalRegistrationForm>): Promise<{ message: string }> => {
			return new Promise((resolve, reject) => {
				 
				updateApplication.mutate(
					{ applicationId, data },
					{
						onSuccess: (result: UpdateApplicationOutput) => {
							resolve(result)
						},
						onError: (error: { message: string }) => {
							reject(new Error(error.message))
						},
					}
				)
			})
		},
		[updateApplication]
	)

	const submitForReview = useCallback(
		(applicationId: string, electronicSignatureUrl: string): Promise<{ message: string }> => {
			return new Promise((resolve, reject) => {
				 
				submitApplication.mutate(
					{ applicationId, electronicSignatureUrl },
					{
						onSuccess: (result: SubmitApplicationOutput) => {
							resolve(result)
						},
						onError: (error: { message: string }) => {
							reject(new Error(error.message))
						},
					}
				)
			})
		},
		[submitApplication]
	)

	// Auto-create draft with minimal data
	const createDraftIfNeeded = useCallback(() => {
		console.log("createDraftIfNeeded called - triggering mutation")
		 
		autoCreateDraft.mutate()
	}, [autoCreateDraft])

	return {
		// Data
		application,
		isLoading,
		error,

		// Actions
		createNewApplication,
		updateExistingApplication,
		submitForReview,
		createDraftIfNeeded,
		refetch,

		// States
		 
		isCreating: createApplication.isPending,
		 
		isUpdating: updateApplication.isPending,
		 
		isSubmitting: submitApplication.isPending,
		 
		isCreatingDraft: autoCreateDraft.isPending,

		// Status helpers
		 
		isDraft: application?.status === "DRAFT",
		 
		isSubmitted: application?.status === "PENDING",
		 
		isUnderReview: application?.status === "UNDER_REVIEW",
		 
		isApproved: application?.status === "APPROVED",
		 
		isRejected: application?.status === "REJECTED",

		// Permissions
		 
		canEdit: application?.status === "DRAFT",
		 
		canSubmit: application?.status === "DRAFT",
	}
}

// Admin hook for managing all applications
export function useLegalRegistrationAdmin() {
	const utils = trpc.useUtils()

	// List applications with pagination
	 
	const listApplications = trpc.legalRegistration.listApplications.useQuery({
		status: "ALL",
		page: 1,
		limit: 10,
	})

	// Update status mutation
	 
	const updateStatus = trpc.legalRegistration.updateStatus.useMutation({
		onSuccess: (data: UpdateStatusOutput) => {
			toast.success(data.message)
			 
			void utils.legalRegistration.listApplications.invalidate()
		},
		onError: (error: { message: string }) => {
			toast.error(error.message)
		},
	})

	const updateApplicationStatus = useCallback(
		(data: UpdateApplicationStatus) => {
			 
			updateStatus.mutate(data)
		},
		[updateStatus]
	)

	return {
		// Data
		 
		applications: listApplications.data?.applications ?? [],
		 
		pagination: listApplications.data?.pagination,
		 
		isLoading: listApplications.isLoading,
		 
		error: listApplications.error,

		// Actions
		updateApplicationStatus,
		 
		refetch: listApplications.refetch,

		// States
		 
		isUpdatingStatus: updateStatus.isPending,
	}
}

// File upload helper hook
export function useFileUpload() {
	const presignedUrl = usePresignedUrl()
	const upload = useUploadFile()

	const slugify = (s?: string) =>
		(s ?? "individual")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")

	const uploadFile = useCallback(
		async (
			file: File,
			params: { applicationId: string; organization?: string }
		): Promise<{
			fileName: string
			fileUrl: string
			fileSize: number
			mimeType: string
		}> => {
			// Store uploads under the existing `documents` bucket.
			// Folder structure matches the UI copy: legal-application/{applicationId}/{organization}/
			const folderPath = `legal-application/${params.applicationId}/${slugify(params.organization)}`
			console.log("Upload file called:", {
				fileName: file.name,
				folderPath,
				bucket: "documents",
			})

			try {
				// 1) Get signed upload URL
				console.log("Getting presigned URL...")
				const { signedUrl, path } = await presignedUrl.mutateAsync({
					file,
					bucket: "documents",
					folderPath,
					upsert: true,
				})
				console.log("Got presigned URL:", { signedUrl, path })

				// 2) Upload file to signed URL
				console.log("Uploading to signed URL...")
				await upload.mutateAsync({ signedUrl, file, contentType: file.type })
				console.log("Upload to signed URL completed")

				// 3) Get public URL (or keep storage path if you prefer signed URLs only)
				console.log("Getting public URL...")
				const publicUrl = await getPublicUrl("documents", path)
				console.log("Got public URL:", publicUrl)

				const result = {
					fileName: file.name,
					fileUrl: publicUrl,
					fileSize: file.size,
					mimeType: file.type,
				}
				console.log("Upload completed successfully:", result)
				return result
			} catch (error) {
				console.error("Upload error in uploadFile:", error)
				throw error
			}
		},
		[presignedUrl, upload]
	)

	return { uploadFile }
}

// Validation helpers
export function useValidation() {
	const validatePersonalQualifications = useCallback((data: PersonalQualifications) => {
		const errors: Partial<Record<keyof PersonalQualifications, string>> = {}

		// Citizenship validation
		if (!data.citizenship?.trim()) {
			errors.citizenship = "Citizenship is required"
		}

		// Date of birth validation
		if (!data.dateOfBirth) {
			errors.dateOfBirth = "Date of birth is required"
		} else {
			const birthDate = new Date(data.dateOfBirth)
			const today = new Date()
			const age = today.getFullYear() - birthDate.getFullYear()
			if (age < 18) {
				errors.dateOfBirth = "Must be at least 18 years old"
			}
		}

		// Address validation
		if (!data.residentialAddress?.trim() || data.residentialAddress.length < 10) {
			errors.residentialAddress = "Complete residential address is required"
		}

		if (!data.workOrBusinessAddress?.trim() || data.workOrBusinessAddress.length < 10) {
			errors.workOrBusinessAddress = "Complete work or business address is required"
		}

		// Contact validation
		if (!data.mobileNumber?.trim()) {
			errors.mobileNumber = "Mobile number is required"
		} else if (!/^(\+63|63|0)?[89]\d{9}$/.test(data.mobileNumber.replace(/[-\s]/g, ""))) {
			errors.mobileNumber = "Invalid Philippine mobile number format"
		}

		if (!data.emailAddress?.trim()) {
			errors.emailAddress = "Email address is required"
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.emailAddress)) {
			errors.emailAddress = "Invalid email format"
		}

		// Professional validation
		if (!data.professionalTaxReceiptNumber?.trim()) {
			errors.professionalTaxReceiptNumber = "Professional tax receipt number is required"
		}

		if (!data.rollOfAttorneysNumber?.trim()) {
			errors.rollOfAttorneysNumber = "Roll of Attorneys number is required"
		}

		if (!data.ibpMembershipNumber?.trim()) {
			errors.ibpMembershipNumber = "IBP membership number is required"
		}

		if (!data.mcleComplianceNumber?.trim()) {
			errors.mcleComplianceNumber = "MCLE compliance number is required"
		}

		if (!data.ulasComplianceNumber?.trim()) {
			errors.ulasComplianceNumber = "ULAS compliance number is required"
		}

		return {
			isValid: Object.keys(errors).length === 0,
			errors,
		}
	}, [])

	return {
		validatePersonalQualifications,
	}
}
