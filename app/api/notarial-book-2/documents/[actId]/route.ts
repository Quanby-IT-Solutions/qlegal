import { NextResponse, type NextRequest } from "next/server"
import { eq } from "drizzle-orm"

import { checkSigningStatus, downloadSignedDocument } from "@/services/doconchain"
import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { auth } from "@/services/next-auth"

/**
 * API Route for Notarial Book 2 - Programmatic Document Retrieval
 *
 * This route fetches signed documents with seal programmatically using downloadSignedDocument.
 * It's designed for testing programmatic retrieval of documents from DocoChain.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ actId: string }> }
) {
	try {
		const { actId } = await params
		const session = await auth()

		if (!session?.user?.id) {
			return new NextResponse("Unauthorized: Please log in to view documents.", {
				status: 401,
				headers: {
					"Content-Type": "text/plain",
				},
			})
		}

		// Verify user is an ENP
		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
		})

		if (user?.role !== "ENP") {
			return new NextResponse("Access denied: Only ENPs can access documents.", {
				status: 403,
				headers: {
					"Content-Type": "text/plain",
				},
			})
		}

		// Try to find act in database first
		let act = await db.query.notarialActs.findFirst({
			where: eq(notarialActs.id, actId),
		})

		let projectUuid: string | null = null
		let documentName = "document.pdf"

		if (act) {
			// Act found in database - verify it belongs to this ENP's notarial book
			const notarialBook = await db.query.notarialBooks.findFirst({
				where: eq(notarialBooks.id, act.notarialBookId),
			})

			if (notarialBook?.enpId !== session.user.id) {
				return new NextResponse("Access denied: You don't have access to this document.", {
					status: 403,
					headers: {
						"Content-Type": "text/plain",
					},
				})
			}

			projectUuid = act.docoChainProjectUuid
			documentName = act.documentName ?? "document.pdf"
		} else {
			// Act not in database - treat actId as project UUID (from API-based notarial book)
			// Verify the project exists and user has access
			try {
				const { getMyProjectDetails, getProjectDetails } = await import("@/services/doconchain")
				let projectDetails
				try {
					projectDetails = await getMyProjectDetails(actId, user.email ?? undefined)
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error)
					if (errorMessage.includes("not part of this project")) {
						// Try getProjectDetails as fallback
						projectDetails = await getProjectDetails(actId, user.email ?? undefined)
					} else {
						throw error
					}
				}

				const projectData = projectDetails?.data
				if (!projectData) {
					return new NextResponse("Project not found or you don't have access.", {
						status: 404,
						headers: {
							"Content-Type": "text/plain",
						},
					})
				}

				projectUuid = actId
				documentName = projectData.file_name ?? projectData.name ?? "document.pdf"
			} catch (error) {
				return new NextResponse(
					`Project not found: ${error instanceof Error ? error.message : "Unknown error"}`,
					{
						status: 404,
						headers: {
							"Content-Type": "text/plain",
						},
					}
				)
			}
		}

		if (!projectUuid) {
			return new NextResponse("Document URL not available. No DocoChain project UUID found.", {
				status: 404,
				headers: {
					"Content-Type": "text/plain",
				},
			})
		}

		// CRITICAL: Verify document is fully signed BEFORE attempting to retrieve signed version
		console.log("🔵 [Notarial Book 2] Verifying document signing status before retrieval...")
		try {
			const signingStatus = await checkSigningStatus(projectUuid, user.email ?? undefined)

			if (!signingStatus.isFullySigned) {
				console.warn("⚠️ [Notarial Book 2] Document is NOT fully signed:", {
					projectStatus: signingStatus.projectStatus,
					signedCount: signingStatus.signedCount,
					totalSigners: signingStatus.totalSigners,
				})

				return new NextResponse(
					`Document is not fully signed yet. Status: ${signingStatus.projectStatus}, Signed: ${signingStatus.signedCount}/${signingStatus.totalSigners} signer(s). Please wait for all signers to complete signing before viewing the signed document.`,
					{
						status: 400,
						headers: {
							"Content-Type": "text/plain",
						},
					}
				)
			}

			console.log(
				"✅ [Notarial Book 2] Document is fully signed, proceeding to retrieve signed version"
			)
		} catch (statusError) {
			console.error("⚠️ [Notarial Book 2] Error checking signing status:", statusError)
			const statusErrorMessage =
				statusError instanceof Error ? statusError.message : String(statusError)

			// If it's "not fully signed" error, fail early
			if (
				statusErrorMessage.includes("not fully signed") ||
				statusErrorMessage.includes("not fully signed yet")
			) {
				return new NextResponse(
					"Document is not fully signed yet. Please wait for all signers to complete signing before viewing the signed document.",
					{
						status: 400,
						headers: {
							"Content-Type": "text/plain",
						},
					}
				)
			}

			// For other errors, continue and try to download anyway
			console.warn(
				"⚠️ [Notarial Book 2] Status check failed but continuing (might be temporary API issue):",
				statusErrorMessage
			)
		}

		// PROGRAMMATIC RETRIEVAL: Use downloadSignedDocument to fetch the signed document with seal
		// This function:
		// 1. Uses Get Specific Project API (/my/projects/{uuid}) to get project details
		// 2. Looks for files with type "Signed" or "Completed" in the files array
		// 3. Downloads the signed document with seal and certificates
		console.log(
			"🔵 [Notarial Book 2] Programmatically downloading signed document with seal from DocoChain..."
		)
		console.log("   - Project UUID:", projectUuid)
		console.log("   - Using downloadSignedDocument API")

		try {
			const { buffer, fileName } = await downloadSignedDocument(
				projectUuid,
				user.email ?? undefined
			)

			console.log(
				"✅ [Notarial Book 2] Successfully downloaded signed document with seal from DocoChain"
			)
			console.log("   - Document size:", buffer.length, "bytes")
			console.log("   - File name:", fileName || documentName)

			// Use attachment disposition when ?download=1 to trigger browser download
			const isDownload = request.nextUrl.searchParams.get("download") === "1"
			const disposition = isDownload ? "attachment" : "inline"
			const safeFileName = (fileName || documentName).replace(/[^\w\s.-]/g, "_")

			// Return the PDF with appropriate headers
			// Convert Buffer to Uint8Array for NextResponse compatibility
			return new NextResponse(new Uint8Array(buffer), {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": `${disposition}; filename="${safeFileName}"`,
					"Cache-Control": "public, max-age=3600",
					"X-Document-Source": "programmatic-download", // Header to indicate programmatic retrieval
				},
			})
		} catch (downloadError) {
			console.error(
				"❌ [Notarial Book 2] Error downloading signed document from DocoChain:",
				downloadError
			)

			const errorMessage =
				downloadError instanceof Error ? downloadError.message : String(downloadError)

			// Check if error is because document is not fully signed
			if (
				errorMessage.includes("not fully signed") ||
				errorMessage.includes("not fully signed yet")
			) {
				return new NextResponse(
					"Document is not fully signed yet. All signers must complete signing before the signed document is available. Please wait for all signers to complete signing.",
					{
						status: 400,
						headers: {
							"Content-Type": "text/plain",
						},
					}
				)
			}

			// Return error message
			const statusCode =
				errorMessage.includes("404") || errorMessage.includes("not found") ? 404 : 503
			const userMessage =
				errorMessage.includes("404") || errorMessage.includes("not found")
					? "The signed document may not be available from DocoChain. Please ensure the document has been fully signed by all parties."
					: "DocoChain API is temporarily unavailable. Please try again later."

			return new NextResponse(`Failed to retrieve signed document: ${userMessage}`, {
				status: statusCode,
				headers: {
					"Content-Type": "text/plain",
				},
			})
		}
	} catch (error) {
		console.error("❌ [Notarial Book 2] Error in document route:", error)
		return new NextResponse(
			"Internal server error: An unexpected error occurred while retrieving the document.",
			{
				status: 500,
				headers: {
					"Content-Type": "text/plain",
				},
			}
		)
	}
}
