import mammoth from "mammoth"
import { getData as getPdfParseWorkerData } from "pdf-parse/worker"
import { PDFParse } from "pdf-parse"

// pdf-parse needs an explicit worker in Next.js/Turbopack server runtimes.
PDFParse.setWorker(getPdfParseWorkerData())

export const MAX_CONTRACT_FILE_BYTES = 15 * 1024 * 1024
const SUPPORTED_MIME_TYPES = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
	"text/plain",
	"text/markdown",
])
const SUPPORTED_EXTENSIONS = new Set(["pdf", "docx", "doc", "txt", "md"])

function normalizeWhitespace(value: string) {
	return value
		.replace(/\r/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim()
}

function getFileExtension(fileName: string) {
	const segments = fileName.split(".")
	return segments.length > 1 ? (segments.at(-1)?.toLowerCase() ?? "") : ""
}

function assertSupportedFile(file: File) {
	if (file.size <= 0) {
		throw new Error("Please upload a non-empty contract file")
	}

	if (file.size > MAX_CONTRACT_FILE_BYTES) {
		throw new Error(
			`File too large. Maximum size is ${MAX_CONTRACT_FILE_BYTES / (1024 * 1024)} MB.`
		)
	}

	const extension = getFileExtension(file.name)
	if (!SUPPORTED_MIME_TYPES.has(file.type) && !SUPPORTED_EXTENSIONS.has(extension)) {
		throw new Error("Unsupported file format. Upload a PDF, DOC, DOCX, TXT, or Markdown contract.")
	}
}

async function extractPdfText(buffer: Buffer) {
	const parser = new PDFParse({ data: buffer })
	try {
		const result = await parser.getText()
		return normalizeWhitespace(result.text)
	} finally {
		await parser.destroy()
	}
}

async function extractWordText(buffer: Buffer) {
	const result = await mammoth.extractRawText({ buffer })
	return normalizeWhitespace(result.value)
}

async function extractPlainText(buffer: Buffer) {
	return normalizeWhitespace(new TextDecoder("utf-8").decode(buffer))
}

export async function extractContractText(file: File) {
	assertSupportedFile(file)

	const buffer = Buffer.from(await file.arrayBuffer())
	const extension = getFileExtension(file.name)

	const text =
		file.type === "application/pdf" || extension === "pdf"
			? await extractPdfText(buffer)
			: file.type === "application/msword" ||
				  file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
				  extension === "doc" ||
				  extension === "docx"
				? await extractWordText(buffer)
				: await extractPlainText(buffer)

	if (!text) {
		throw new Error("The uploaded file did not contain readable contract text")
	}

	return text
}
