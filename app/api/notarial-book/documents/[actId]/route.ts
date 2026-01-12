import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/services/next-auth"
import { db } from "@/services/drizzle/db"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { documents } from "@/services/drizzle/schema/document"
import { users } from "@/services/drizzle/schema/auth"
import { eq, and } from "drizzle-orm"
import { downloadSignedDocument, getVaultItem, getProjectDetails, checkSigningStatus } from "@/services/docochain"
import { getPublicClient, getServiceRoleClient } from "@/services/supabase"

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ actId: string }> }
) {
	try {
		const { actId } = await params
		const session = await auth()

		if (!session?.user?.id) {
			// Return plain text error for PDF viewer compatibility
			return new NextResponse(
				"Unauthorized: Please log in to view documents.",
				{ 
					status: 401,
					headers: {
						"Content-Type": "text/plain",
					},
				}
			)
		}

		// Verify user is an ENP
		const user = await db.query.users.findFirst({
			where: eq(users.id, session.user.id),
		})

		if (user?.role !== "ENP") {
			return new NextResponse(
				"Access denied: Only ENPs can access documents.",
				{ 
					status: 403,
					headers: {
						"Content-Type": "text/plain",
					},
				}
			)
		}

		// Get notarial act
		const act = await db.query.notarialActs.findFirst({
			where: eq(notarialActs.id, actId),
		})

		if (!act) {
			return new NextResponse(
				"Notarial act not found.",
				{ 
					status: 404,
					headers: {
						"Content-Type": "text/plain",
					},
				}
			)
		}

		// Verify it belongs to this ENP's notarial book
		const notarialBook = await db.query.notarialBooks.findFirst({
			where: eq(notarialBooks.id, act.notarialBookId),
		})

		if (notarialBook?.enpId !== session.user.id) {
			return new NextResponse(
				"Access denied: You don't have access to this document.",
				{ 
					status: 403,
					headers: {
						"Content-Type": "text/plain",
					},
				}
			)
		}

		// Get document to find project UUID
		let projectUuid: string | null = null
		let documentName = act.documentName ?? "document.pdf"

		if (act.documentId) {
			const document = await db.query.documents.findFirst({
				where: eq(documents.id, act.documentId),
			})

			if (document?.docoChainProjectId) {
				projectUuid = document.docoChainProjectId
				documentName = document.name || documentName
			}
		}

		// Fallback to docoChainProjectUuid from act
		if (!projectUuid && act.docoChainProjectUuid) {
			projectUuid = act.docoChainProjectUuid
		}

		// CRITICAL: Verify document is fully signed BEFORE attempting to retrieve signed version
		// This prevents showing unsigned documents when DocoChain API fails
		if (projectUuid) {
			try {
				console.log("🔵 Verifying document signing status before retrieval...")
				const signingStatus = await checkSigningStatus(projectUuid, user.email ?? undefined)
				
				if (!signingStatus.isFullySigned) {
					console.warn("⚠️ Document is NOT fully signed:", {
						projectStatus: signingStatus.projectStatus,
						signedCount: signingStatus.signedCount,
						totalSigners: signingStatus.totalSigners,
					})
					
					// Don't serve unsigned document - return error instead
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
				
				console.log("✅ Document is fully signed, proceeding to retrieve signed version")
			} catch (statusError) {
				console.error("⚠️ Error checking signing status:", statusError)
				const statusErrorMessage = statusError instanceof Error ? statusError.message : String(statusError)
				
				// If it's "not fully signed" error, fail early
				if (statusErrorMessage.includes("not fully signed") || statusErrorMessage.includes("not fully signed yet")) {
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
				
				// For other errors (like 502, 503, not found), continue and try to download anyway
				// The downloadSignedDocument will handle the error if it can't download
				console.warn("⚠️ Status check failed but continuing (might be temporary API issue):", statusErrorMessage)
			}
		}

		if (!projectUuid) {
			// Try to get from Supabase storage if document exists
			if (act.documentId) {
				const document = await db.query.documents.findFirst({
					where: eq(documents.id, act.documentId),
				})

				if (document?.path) {
					const supabase = getServiceRoleClient()
					const bucketName = document.path.includes("envelopes") ? "envelopes" : "documents"
					
					console.log("🔄 No DocoChain project UUID, trying Supabase storage")
					console.log("   - Path:", document.path)
					console.log("   - Bucket:", bucketName)
					
					// Try with original path first
					const { data: fileData, error: downloadError } = await supabase.storage
						.from(bucketName)
						.download(document.path.trim())
					
					if (fileData && !downloadError) {
						const arrayBuffer = await fileData.arrayBuffer()
						const buffer = Buffer.from(arrayBuffer)
						
						console.log("✅ Successfully fetched PDF from Supabase storage, size:", buffer.length, "bytes")
						
						return new NextResponse(buffer, {
							headers: {
								"Content-Type": "application/pdf",
								"Content-Disposition": `inline; filename="${document.name || documentName}"`,
								"Cache-Control": "public, max-age=3600",
							},
						})
					}
					
					// If original path fails, try cleaned path (remove :1 suffix)
					if (downloadError) {
						console.warn("⚠️ Original path failed, trying cleaned path...")
						const cleanPath = document.path.trim().replace(/:\d+$/, "")
						if (cleanPath !== document.path.trim()) {
							const { data: fileData2, error: downloadError2 } = await supabase.storage
								.from(bucketName)
								.download(cleanPath)
							
							if (fileData2 && !downloadError2) {
								const arrayBuffer = await fileData2.arrayBuffer()
								const buffer = Buffer.from(arrayBuffer)
								
								console.log("✅ Successfully fetched PDF from Supabase with cleaned path, size:", buffer.length, "bytes")
								
								return new NextResponse(buffer, {
									headers: {
										"Content-Type": "application/pdf",
										"Content-Disposition": `inline; filename="${document.name || documentName}"`,
										"Cache-Control": "public, max-age=3600",
									},
								})
							}
						}
					}
				}
			}

			// Return plain text error instead of JSON so react-pdf can handle it properly
			return new NextResponse(
				"Document URL not available. No DocoChain project UUID found and Supabase storage lookup failed.",
				{ 
					status: 404,
					headers: {
						"Content-Type": "text/plain",
					},
				}
			)
		}

		// Method 1: Try Vault API first (best source for completed signed documents)
		try {
			console.log("🔵 Attempting to fetch from DocoChain Vault for project:", projectUuid)
			const vaultItem = await getVaultItem(projectUuid, user.email ?? undefined)
			const vaultData = vaultItem?.data
			
			if (vaultData?.files && vaultData.files.length > 0 && vaultData.files[0]?.file_url) {
				const fileUrl = vaultData.files[0].file_url
				console.log("✅ Found file URL from Vault, fetching PDF...")
				console.log("   - File URL:", fileUrl)
				
				// Fetch the PDF from the vault file URL (should be publicly accessible)
				// If it requires authentication, we'll fall through to downloadSignedDocument
				try {
					const fileResponse = await fetch(fileUrl, {
						method: "GET",
						headers: {
							"Accept": "application/pdf",
						},
					})
					
					if (fileResponse.ok) {
						const contentType = fileResponse.headers.get("content-type")
						console.log("   - Content-Type:", contentType)
						
						// Verify it's actually a PDF (not an error page)
						if (contentType?.includes("application/pdf") || contentType?.includes("application/octet-stream")) {
							const arrayBuffer = await fileResponse.arrayBuffer()
							const buffer = Buffer.from(arrayBuffer)
							
							console.log("✅ Successfully fetched PDF from Vault, size:", buffer.length, "bytes")
							
							// Return the PDF with appropriate headers
							return new NextResponse(buffer, {
								headers: {
									"Content-Type": "application/pdf",
									"Content-Disposition": `inline; filename="${vaultData.file_name ?? vaultData.name ?? documentName}"`,
									"Cache-Control": "public, max-age=3600",
								},
							})
						} else {
							console.warn("⚠️ Vault file URL did not return a PDF (Content-Type:", contentType, "), trying downloadSignedDocument...")
						}
					} else {
						console.warn("⚠️ Vault file URL returned status:", fileResponse.status, fileResponse.statusText, ", trying downloadSignedDocument...")
					}
				} catch (fetchError) {
					console.warn("⚠️ Failed to fetch PDF from Vault file URL:", fetchError, ", trying downloadSignedDocument...")
				}
			}
		} catch (vaultError) {
			const errorMessage = vaultError instanceof Error ? vaultError.message : String(vaultError)
			if (errorMessage.includes("404") || errorMessage.includes("not found") || errorMessage.includes("not_found")) {
				console.log("ℹ️ Project not found in vault, trying downloadSignedDocument...")
			} else if (errorMessage.includes("502") || errorMessage.includes("Bad Gateway")) {
				console.warn("⚠️ DocoChain API returned 502 Bad Gateway, trying downloadSignedDocument...")
			} else {
				console.warn("⚠️ Vault API failed, trying downloadSignedDocument:", vaultError)
			}
		}

		// Method 2: Try downloadSignedDocument (downloads PDF as buffer with authentication)
		// NOTE: downloadSignedDocument already checks if document is fully signed internally
		// If it's not fully signed, it will throw an error which we handle below
		try {
			console.log("🔵 Downloading signed document from DocoChain for project:", projectUuid)
			const { buffer, fileName } = await downloadSignedDocument(projectUuid, user.email ?? undefined)

			console.log("✅ Successfully downloaded signed document from DocoChain, size:", buffer.length, "bytes")

			// Return the PDF with appropriate headers
			// Convert Buffer to Uint8Array for NextResponse compatibility
			return new NextResponse(new Uint8Array(buffer), {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": `inline; filename="${fileName || documentName}"`,
					"Cache-Control": "public, max-age=3600",
				},
			})
		} catch (downloadError) {
			console.error("❌ Error downloading signed document from DocoChain:", downloadError)
			
			const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError)
			
			// Check if error is because document is not fully signed
			if (errorMessage.includes("not fully signed") || errorMessage.includes("not fully signed yet")) {
				console.warn("⚠️ Document is not fully signed - refusing to serve unsigned document from Supabase")
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
			
			// Check if it's a temporary API issue (502, 503) vs. permanent (404, 403)
			const isTemporaryError = errorMessage.includes("502") || 
				errorMessage.includes("503") || 
				errorMessage.includes("Bad Gateway") ||
				errorMessage.includes("Service Unavailable") ||
				errorMessage.includes("temporarily unavailable")
			
			// For temporary errors ONLY, try Supabase as a last resort
			// BUT: Only if we've already verified the document is fully signed (above check passed)
			// NOTE: Supabase will contain the ORIGINAL unsigned document, so this is not ideal
			// but better than showing an error during temporary DocoChain outages
			if (isTemporaryError && act.documentId) {
				console.warn("⚠️ DocoChain temporary error - trying Supabase fallback (NOTE: may be unsigned original document)")
				try {
					const document = await db.query.documents.findFirst({
						where: eq(documents.id, act.documentId),
					})

					if (document?.path) {
						const supabase = getServiceRoleClient()
						const bucketName = document.path.includes("envelopes") ? "envelopes" : "documents"
						
						console.log("⚠️ Using Supabase storage as temporary fallback during DocoChain outage")
						console.log("   - WARNING: This may be the original unsigned document")
						console.log("   - Path:", document.path)
						console.log("   - Bucket:", bucketName)
						
						// Try with original path first
						const { data: fileData, error: supabaseError } = await supabase.storage
							.from(bucketName)
							.download(document.path.trim())
						
						if (fileData && !supabaseError) {
							const arrayBuffer = await fileData.arrayBuffer()
							const buffer = Buffer.from(arrayBuffer)
							
							console.warn("⚠️ Serving document from Supabase storage - NOTE: This may be the original unsigned document, not the signed version")
							
							return new NextResponse(buffer, {
								headers: {
									"Content-Type": "application/pdf",
									"Content-Disposition": `inline; filename="${document.name || documentName}"`,
									"Cache-Control": "public, max-age=3600",
									"X-Document-Source": "supabase-fallback", // Header to indicate this is a fallback
								},
							})
						}
						
						// If original path fails, try cleaned path (remove :1, :2, etc. suffix if present)
						if (supabaseError) {
							console.warn("⚠️ Original path failed:", supabaseError?.message, "- trying cleaned path...")
							const cleanPath = document.path.trim().replace(/:\d+$/, "")
							if (cleanPath !== document.path.trim()) {
								const { data: fileData2, error: supabaseError2 } = await supabase.storage
									.from(bucketName)
									.download(cleanPath)
								
								if (fileData2 && !supabaseError2) {
									const arrayBuffer = await fileData2.arrayBuffer()
									const buffer = Buffer.from(arrayBuffer)
									
									console.warn("⚠️ Serving document from Supabase with cleaned path - NOTE: This may be the original unsigned document")
									
									return new NextResponse(buffer, {
										headers: {
											"Content-Type": "application/pdf",
											"Content-Disposition": `inline; filename="${document.name || documentName}"`,
											"Cache-Control": "public, max-age=3600",
											"X-Document-Source": "supabase-fallback",
										},
									})
								}
								console.warn("⚠️ Cleaned path also failed:", supabaseError2?.message)
							}
						}
					}
				} catch (supabaseError) {
					console.error("❌ Supabase fallback also failed:", supabaseError)
				}
			}
			
			// If all methods fail, return an error
			const statusCode = isTemporaryError ? 503 : 404
			const userMessage = isTemporaryError 
				? "DocoChain API is temporarily unavailable. Please try again later."
				: "The signed document may not be available from DocoChain. Please ensure the document has been fully signed by all parties."
			
			return new NextResponse(
				`Failed to retrieve signed document: ${userMessage}`,
				{ 
					status: statusCode,
					headers: {
						"Content-Type": "text/plain",
					},
				}
			)
		}
	} catch (error) {
		console.error("❌ Error in document proxy route:", error)
		// Return plain text error for PDF viewer compatibility
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
