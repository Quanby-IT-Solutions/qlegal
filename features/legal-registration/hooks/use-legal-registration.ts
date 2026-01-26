"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import { toast } from "sonner"

import { usePresignedUrl } from "@/services/supabase/presigned-url"
import { getPublicUrl } from "@/services/supabase/signed-url"
import { useUploadFile } from "@/services/supabase/upload"
import { trpc } from "@/services/trpc/client"

import type {
	LegalRegistrationForm,
	PersonalQualifications,
	UpdateApplicationStatus,
} from "../api/legal-registration.schemas"

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
	const autoCreateDraft = trpc.legalRegistrations.getOrCreateDraft.useMutation({
		onSuccess: data => {
			console.log("Auto-created draft application:", data.id, data.message)
			void utils.legalRegistrations.getMyApplication.invalidate()
		},
		onError: error => {
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
	const createApplication = trpc.legalRegistrations.create.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			void utils.legalRegistrations.getMyApplication.invalidate()
		},
		onError: error => {
			toast.error(error.message)
		},
	})

	// Update application mutation
	const updateApplication = trpc.legalRegistrations.update.useMutation({
		onSuccess: data => {
			console.log("Application updated successfully:", data.message)
			toast.success(data.message)
			void utils.legalRegistrations.getMyApplication.invalidate()
		},
		onError: error => {
			console.error("Application update failed:", error.message)
			console.error("Full update error:", error)
			toast.error(error.message)
		},
	})

	// Submit application mutation
	const submitApplication = trpc.legalRegistrations.submit.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			void utils.legalRegistrations.getMyApplication.invalidate()
			// Redirect to landing page after successful submission
			router.push("/")
		},
		onError: error => {
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
						onSuccess: result => {
							resolve(result)
						},
						onError: error => {
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
						onSuccess: result => {
							resolve(result)
						},
						onError: error => {
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
	const listApplications = trpc.legalRegistrations.listApplications.useQuery({
		status: "ALL",
		page: 1,
		limit: 10,
	})

	// Update status mutation
	const updateStatus = trpc.legalRegistrations.updateStatus.useMutation({
		onSuccess: data => {
			toast.success(data.message)
			void utils.legalRegistrations.listApplications.invalidate()
		},
		onError: error => {
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
			const folderPath = `${params.applicationId}/${slugify(params.organization)}`
			console.log("Upload file called:", {
				fileName: file.name,
				folderPath,
				bucket: "legal-application",
			})

			try {
				// 1) Get signed upload URL
				console.log("Getting presigned URL...")
				const { signedUrl, path } = await presignedUrl.mutateAsync({
					file,
					bucket: "legal-application",
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
				const publicUrl = await getPublicUrl("legal-application", path)
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
