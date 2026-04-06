/**
 * Upload a local PDF file to an existing Supreme Court notarial act.
 * Run: pnpm test:supreme-court-upload-file <NRN> <path-to.pdf>
 *
 * Example:
 *   pnpm test:supreme-court-upload-file NRN-698bed177039a3a0d1146537 "C:\Users\You\Documents\document.pdf"
 *
 * Get an NRN from: pnpm test:supreme-court-consolidated (or from a sync)
 */
import "dotenv/config"
import fs from "node:fs"
import path from "node:path"

import {
	getPresignedUrl,
	registerFileMetadata,
	uploadFileToS3,
} from "@/services/supreme-court/api/file-upload"
import { isConfigured } from "@/services/supreme-court/lib/token-cache"

async function main() {
	const nrn = process.argv[2]
	const filePath = process.argv[3]

	if (!nrn?.startsWith("NRN-") || !filePath) {
		console.error("❌ Usage: pnpm test:supreme-court-upload-file <NRN> <path-to.pdf>")
		console.error("   Example: pnpm test:supreme-court-upload-file NRN-698bed177039a3a0d1146537 ./document.pdf")
		console.error("   Get an NRN from: pnpm test:supreme-court-consolidated")
		process.exit(1)
	}

	if (!isConfigured()) {
		console.error("❌ Supreme Court API not configured. Add credentials to .env")
		process.exit(1)
	}

	const resolvedPath = path.resolve(filePath)
	if (!fs.existsSync(resolvedPath)) {
		console.error(`❌ File not found: ${resolvedPath}`)
		process.exit(1)
	}

	const fileName = path.basename(resolvedPath)
	if (!fileName.toLowerCase().endsWith(".pdf")) {
		console.error("❌ File must be a PDF (.pdf)")
		process.exit(1)
	}

	console.log("🔵 Supreme Court file upload (from local file)\n")
	console.log(`   NRN: ${nrn}`)
	console.log(`   File: ${resolvedPath}`)
	console.log(`   Name: ${fileName}`)
	console.log()

	try {
		const stat = fs.statSync(resolvedPath)
		console.log(`   Size: ${stat.size} bytes\n`)

		const fileBuffer = fs.readFileSync(resolvedPath)

		console.log("🔵 Step 1: Get presigned URL...")
		const { url, fileName: registeredFileName } = await getPresignedUrl(nrn, fileName)
		console.log(`   ✅ Got URL for: ${registeredFileName}`)

		console.log("🔵 Step 2: Upload file to S3...")
		await uploadFileToS3(url, fileBuffer, "application/pdf")
		console.log("   ✅ Uploaded")

		console.log("🔵 Step 3: Register file metadata...")
		await registerFileMetadata(nrn, [registeredFileName])
		console.log("   ✅ Registered")

		console.log("\n✅ Done. File is attached to the notarial act in Supreme Court.")
	} catch (error) {
		console.error("\n❌ Failed:", error instanceof Error ? error.message : error)
		process.exit(1)
	}
}

void main()
