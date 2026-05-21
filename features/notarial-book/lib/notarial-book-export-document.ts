import { format } from "date-fns"
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib"

export interface NotarialBookExportMeta {
	generatedAtIso: string
	bookId: string
	notaryPublicName: string
	notaryRollNumber: string | null
	notaryPublicNumber: string | null
	electronicNotarialFacility: string
	actCount: number
}

function titleCaseFromToken(token: string): string {
	return token
		.split(/\s+|_/g)
		.filter(Boolean)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ")
}

function formatActTypeLabel(actType: string | null | undefined): string {
	if (!actType) return "—"
	const normalized = String(actType).trim()
	if (!normalized) return "—"
	return titleCaseFromToken(normalized)
}

function formatWorkflowLabel(workflow: string | null | undefined): string {
	const w = (workflow ?? "").trim().toUpperCase()
	if (!w) return "—"
	if (w === "REN") return "Remote (REN)"
	if (w === "IEN") return "In-person (IEN)"
	return titleCaseFromToken(w)
}

function formatIdDocumentTypeLabel(documentType: string | null | undefined): string {
	const raw = (documentType ?? "").trim()
	if (!raw) return "—"
	const upper = raw.toUpperCase()
	const map: Record<string, string> = {
		NATIONAL_ID: "National ID",
		DRIVERS_LICENSE: "Driver's License",
		PASSPORT: "Passport",
		VOTERS_ID: "Voter's ID",
		UMID: "UMID",
		SSS_ID: "SSS ID",
		PHILHEALTH_ID: "PhilHealth ID",
		TIN_ID: "TIN ID",
		POSTAL_ID: "Postal ID",
		PRC_ID: "PRC ID",
		OTHER: "Other",
	}
	return map[upper] ?? titleCaseFromToken(raw)
}

function formatDateTime(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (value instanceof Date) return format(value, "yyyy-MM-dd HH:mm")
	if (typeof value === "string") {
		const d = new Date(value)
		return Number.isNaN(d.getTime()) ? value : format(d, "yyyy-MM-dd HH:mm")
	}
	if (typeof value === "number" || typeof value === "bigint") return String(value)
	if (typeof value === "boolean") return value ? "true" : "false"
	return JSON.stringify(value)
}

function unknownToDisplayString(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (typeof value === "string") return value
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
		return String(value)
	}
	return JSON.stringify(value)
}

function formatBoolean(value: unknown): string {
	if (value === true) return "Yes"
	if (value === false) return "No"
	return ""
}

/** Cell text for PDF / CSV cells */
function formatActFieldForExport(act: Record<string, unknown>, key: string): string {
	const raw = act[key]
	if (raw === null || raw === undefined) return ""
	if (key === "syncedToSupremeCourt") return formatBoolean(raw)
	if (
		key === "executedAt" ||
		key === "meetingEndedAt" ||
		key === "createdAt" ||
		key === "updatedAt" ||
		key === "syncedAt"
	) {
		return formatDateTime(raw)
	}
	if (key === "actType") return formatActTypeLabel(unknownToDisplayString(raw))
	if (key === "workflow") return formatWorkflowLabel(unknownToDisplayString(raw))
	if (key === "principalIdType") return formatIdDocumentTypeLabel(unknownToDisplayString(raw))
	if (typeof raw === "string") return raw
	if (typeof raw === "number" || typeof raw === "boolean" || typeof raw === "bigint")
		return String(raw)
	return JSON.stringify(raw)
}

function wrapTextToWidth(
	text: string,
	maxWidth: number,
	font: PDFFont,
	fontSize: number
): string[] {
	const normalized = String(text ?? "")
		.replace(/\s+/g, " ")
		.trim()
	if (!normalized) return [""]

	const words = normalized.split(" ")
	const lines: string[] = []
	let current = ""

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word
		if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
			current = candidate
			continue
		}
		if (current) {
			lines.push(current)
			current = ""
		}
		if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
			current = word
			continue
		}
		let rest = word
		while (rest.length > 0) {
			let len = rest.length
			while (len > 1 && font.widthOfTextAtSize(rest.slice(0, len), fontSize) > maxWidth) {
				len--
			}
			lines.push(rest.slice(0, len))
			rest = rest.slice(len)
		}
	}
	if (current) lines.push(current)
	return lines
}

/** Shorter headers so Excel’s default column widths show full titles; order = logical read order. */
const CSV_COLUMNS: readonly { key: string; header: string }[] = [
	{ key: "executedAt", header: "Executed at (UTC)" },
	{ key: "actType", header: "Act type" },
	{ key: "workflow", header: "Mode (REN / IEN)" },
	{ key: "principalName", header: "Principal" },
	{ key: "documentName", header: "Document file" },
	{ key: "documentDescription", header: "Document notes" },
	{ key: "certificateNumber", header: "Certificate #" },
	{ key: "supremeCourtRegistryId", header: "NRID (SC)" },
	{ key: "principalIdType", header: "Principal ID type" },
	{ key: "principalIdNumber", header: "Principal ID #" },
	{ key: "principalAddress", header: "Principal address" },
	{ key: "witnessName", header: "Witness" },
	{ key: "witnessIdNumber", header: "Witness ID #" },
	{ key: "location", header: "Location" },
	{ key: "locationStatement", header: "Location statement" },
	{ key: "ipAddress", header: "Session IP" },
	{ key: "enpName", header: "Notary (recorded)" },
	{ key: "enpRollNumber", header: "Notary roll #" },
	{ key: "signerCount", header: "Signer count" },
	{ key: "meetingEndedAt", header: "Session ended (UTC)" },
	{ key: "syncedToSupremeCourt", header: "Synced to SC" },
	{ key: "createdAt", header: "Record created (UTC)" },
]

const CSV_LONG_TEXT_KEYS = new Set(["locationStatement", "documentDescription", "principalAddress"])

const MAX_CSV_TEXT_LEN = 400

/**
 * RFC 4180 field, always double-quoted. Leading zero-width space for values Excel
 * would otherwise treat as dates/numbers (avoids ####### and column shift).
 */
function csvQuotedField(raw: string): string {
	const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
	const excelNeedsTextGuard =
		normalized.length > 0 &&
		(/^[\d+\-=@]/.test(normalized) ||
			/^\d{4}-\d{2}-\d{2}/.test(normalized) ||
			/^\d{1,2}\/\d{1,2}\/\d{4}/.test(normalized))
	const body = excelNeedsTextGuard ? `\u200B${normalized}` : normalized
	return `"${body.replace(/"/g, '""')}"`
}

/** Datetimes spelled for CSV: month name reduces Excel auto-date parsing vs ISO digits. */
function formatDateTimeForCsv(value: unknown): string {
	if (value === null || value === undefined) return ""
	if (value instanceof Date) return format(value, "dd-MMM-yyyy HH:mm")
	if (typeof value === "string") {
		const d = new Date(value)
		return Number.isNaN(d.getTime()) ? value : format(d, "dd-MMM-yyyy HH:mm")
	}
	if (typeof value === "number" || typeof value === "bigint") return String(value)
	if (typeof value === "boolean") return value ? "true" : "false"
	return JSON.stringify(value)
}

function formatActFieldForCsv(act: Record<string, unknown>, key: string): string {
	let s: string
	if (
		key === "executedAt" ||
		key === "meetingEndedAt" ||
		key === "createdAt" ||
		key === "updatedAt" ||
		key === "syncedAt"
	) {
		s = formatDateTimeForCsv(act[key])
	} else {
		s = formatActFieldForExport(act, key)
	}
	if (CSV_LONG_TEXT_KEYS.has(key) && s.length > MAX_CSV_TEXT_LEN) {
		s = `${s.slice(0, MAX_CSV_TEXT_LEN - 1)}…`
	}
	return s
}

/**
 * UTF-8 CSV with BOM for Excel. Preamble is one column per row so Excel does not
 * misalign metadata with the wide data table. All fields quoted; dates formatted
 * to reduce ####### and wrong typing.
 */
export function buildNotarialBookCsv(
	meta: NotarialBookExportMeta,
	acts: Array<Record<string, unknown>>
): string {
	const headerLine = CSV_COLUMNS.map(c => csvQuotedField(c.header)).join(",")
	const rows = acts.map(act =>
		CSV_COLUMNS.map(col => csvQuotedField(formatActFieldForCsv(act, String(col.key)))).join(",")
	)
	const preambleLines = [
		`Report title: ${meta.electronicNotarialFacility} — Notarial book export`,
		`Generated (UTC): ${format(new Date(meta.generatedAtIso), "dd-MMM-yyyy HH:mm:ss")}`,
		`Book ID: ${meta.bookId}`,
		`Notary public: ${meta.notaryPublicName}`,
		`Roll number (profile): ${meta.notaryRollNumber ?? "—"}`,
		`Notary public number (profile): ${meta.notaryPublicNumber ?? "—"}`,
		`Total acts: ${meta.actCount}`,
	]
	const preamble = preambleLines.map(line => csvQuotedField(line)).join("\r\n")

	return `\ufeff${preamble}\r\n\r\n${headerLine}\r\n${rows.join("\r\n")}\r\n`
}

/**
 * Portrait cover + landscape register table, footer page numbers.
 */
export async function buildNotarialBookPdf(
	meta: NotarialBookExportMeta,
	acts: Array<Record<string, unknown>>
): Promise<Uint8Array> {
	const rollForCover = (() => {
		const t = meta.notaryRollNumber?.trim()
		return t && t.length > 0 ? t : "—"
	})()
	const npnForCover = (() => {
		const t = meta.notaryPublicNumber?.trim()
		return t && t.length > 0 ? t : "—"
	})()

	const doc = await PDFDocument.create()
	const font = await doc.embedFont(StandardFonts.Helvetica)
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
	const fontTimes = await doc.embedFont(StandardFonts.TimesRoman)
	const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold)

	const brandNavy = rgb(0.1, 0.22, 0.42)
	const headerBg = rgb(0.94, 0.95, 0.97)
	const borderColor = rgb(0.75, 0.78, 0.84)
	const mutedColor = rgb(0.38, 0.4, 0.45)
	const subtleLine = rgb(0.88, 0.89, 0.92)

	// —— Cover (A4 portrait) ——
	const coverW = 595
	const coverH = 842
	const cover = doc.addPage([coverW, coverH])
	cover.drawRectangle({ x: 0, y: coverH - 108, width: coverW, height: 108, color: brandNavy })
	cover.drawText(meta.electronicNotarialFacility, {
		x: 56,
		y: coverH - 48,
		size: 11,
		font,
		color: rgb(0.85, 0.88, 0.95),
	})
	cover.drawText("Electronic Notarial Book", {
		x: 56,
		y: coverH - 82,
		size: 26,
		font: fontTimesBold,
		color: rgb(1, 1, 1),
	})
	cover.drawText("Register of notarial acts", {
		x: 56,
		y: coverH - 96,
		size: 13,
		font: fontTimes,
		color: rgb(0.9, 0.92, 0.98),
	})

	let cy = coverH - 160
	const label = (text: string, value: string) => {
		cover.drawText(text, { x: 56, y: cy, size: 9, font: fontBold, color: mutedColor })
		cy -= 12
		const lines = wrapTextToWidth(value === "" ? "—" : value, coverW - 112, font, 11)
		for (const line of lines) {
			cover.drawText(line, { x: 56, y: cy, size: 11, font, color: rgb(0, 0, 0) })
			cy -= 14
		}
		cy -= 10
	}

	label("Notary public (exporter)", meta.notaryPublicName)
	label("Roll number (profile)", rollForCover)
	label("Notary public number (profile)", npnForCover)
	label("Book identifier", meta.bookId)
	label("Total entries in this export", String(meta.actCount))
	label("Generated", format(new Date(meta.generatedAtIso), "MMMM d, yyyy 'at' h:mm a"))

	cy -= 8
	cover.drawLine({
		start: { x: 56, y: cy },
		end: { x: coverW - 56, y: cy },
		thickness: 0.5,
		color: borderColor,
	})
	cy -= 22
	const notice = wrapTextToWidth(
		"This document is a system-generated copy of notarial act metadata maintained on the electronic notarial facility. " +
			"It does not replace the official notarial book where required by law. Retain according to your office retention policy.",
		coverW - 112,
		font,
		9
	)
	for (const line of notice) {
		cover.drawText(line, { x: 56, y: cy, size: 9, font, color: mutedColor })
		cy -= 11
	}

	// —— Table (A4 landscape) ——
	const pageWidth = 842
	const pageHeight = 595
	const margin = 44
	const contentWidth = pageWidth - margin * 2
	const gutter = 5

	// Column widths + gutters must fit within contentWidth (landscape A4 minus margins).
	const cols = [
		{ key: "index", label: "#", w: 24 },
		{ key: "executedAt", label: "Date / time", w: 68 },
		{ key: "actType", label: "Act type", w: 62 },
		{ key: "workflow", label: "Mode", w: 52 },
		{ key: "principalName", label: "Principal", w: 108 },
		{ key: "documentName", label: "Document", w: 128 },
		{ key: "certificateNumber", label: "Cert. #", w: 72 },
		{ key: "supremeCourtRegistryId", label: "NRID", w: 78 },
		{ key: "location", label: "Location", w: 78 },
	] as const

	const colXs: number[] = []
	let xCursor = margin
	for (let i = 0; i < cols.length; i++) {
		colXs.push(xCursor)
		xCursor += cols[i]!.w + (i < cols.length - 1 ? gutter : 0)
	}

	const titleSize = 13
	const metaSize = 8
	const headerFontSize = 7.5
	const bodyFontSize = 7.5
	const lineHeight = 9.5
	const headerRowHeight = 20
	const minBottom = margin + 26

	let page: PDFPage = doc.addPage([pageWidth, pageHeight])
	let yTop = pageHeight - margin

	const drawText = (
		p: PDFPage,
		text: string,
		x: number,
		baselineY: number,
		size: number,
		f: PDFFont,
		color = rgb(0, 0, 0)
	) => {
		p.drawText(text, { x, y: baselineY, size, font: f, color })
	}

	const drawColumnHeaders = (p: PDFPage, topY: number): number => {
		const bottomY = topY - headerRowHeight
		p.drawRectangle({
			x: margin,
			y: bottomY,
			width: contentWidth,
			height: headerRowHeight,
			color: headerBg,
			borderColor,
			borderWidth: 0.35,
		})
		const labelBaseline = topY - 13
		for (let i = 0; i < cols.length; i++) {
			const c = cols[i]!
			const lbl = c.label.length > 18 ? `${c.label.slice(0, 16)}…` : c.label
			drawText(p, lbl, colXs[i]!, labelBaseline, headerFontSize, fontBold, rgb(0.15, 0.17, 0.22))
		}
		p.drawLine({
			start: { x: margin, y: bottomY },
			end: { x: margin + contentWidth, y: bottomY },
			thickness: 0.45,
			color: brandNavy,
		})
		return bottomY
	}

	drawText(page, "Notarial acts — detailed register", margin, yTop, titleSize, fontBold, brandNavy)
	yTop -= titleSize + 4
	const metaLine = `${meta.notaryPublicName}  ·  ${meta.actCount} entr${meta.actCount === 1 ? "y" : "ies"}  ·  ${format(new Date(meta.generatedAtIso), "MMM d, yyyy HH:mm")}`
	drawText(page, metaLine, margin, yTop, metaSize, font, mutedColor)
	yTop -= metaSize + 14

	let tableBottom = drawColumnHeaders(page, yTop)
	yTop = tableBottom - 6

	const ensureSpace = (neededFromTop: number) => {
		if (yTop - neededFromTop >= minBottom) return
		page = doc.addPage([pageWidth, pageHeight])
		yTop = pageHeight - margin
		drawText(
			page,
			"Notarial acts — detailed register (continued)",
			margin,
			yTop,
			titleSize,
			fontBold,
			brandNavy
		)
		yTop -= titleSize + metaSize + 10
		drawText(page, `${meta.notaryPublicName} · continued`, margin, yTop, metaSize, font, mutedColor)
		yTop -= metaSize + 14
		tableBottom = drawColumnHeaders(page, yTop)
		yTop = tableBottom - 6
	}

	for (let rowIndex = 0; rowIndex < acts.length; rowIndex++) {
		const act = acts[rowIndex]!
		const displayIndex = String(rowIndex + 1)

		const cellLines = cols.map(c => {
			if (c.key === "index") return wrapTextToWidth(displayIndex, c.w, font, bodyFontSize)
			return wrapTextToWidth(formatActFieldForExport(act, c.key), c.w, font, bodyFontSize)
		})
		const maxLines = Math.max(1, ...cellLines.map(l => l.length))
		const rowBodyHeight = maxLines * lineHeight
		const rowPadding = 5
		const rowTotalHeight = rowBodyHeight + rowPadding

		ensureSpace(rowTotalHeight + 4)

		const rowTop = yTop
		const rowBottom = rowTop - rowTotalHeight

		if (rowIndex % 2 === 0) {
			page.drawRectangle({
				x: margin,
				y: rowBottom,
				width: contentWidth,
				height: rowTotalHeight,
				color: rgb(0.992, 0.993, 0.996),
			})
		}

		const firstBaseline = rowTop - 10
		for (let ci = 0; ci < cols.length; ci++) {
			const lines = cellLines[ci]!
			const colX = colXs[ci]!
			for (let li = 0; li < lines.length; li++) {
				const baseline = firstBaseline - li * lineHeight
				drawText(page, lines[li]!, colX, baseline, bodyFontSize, font)
			}
		}

		page.drawLine({
			start: { x: margin, y: rowBottom },
			end: { x: margin + contentWidth, y: rowBottom },
			thickness: 0.2,
			color: subtleLine,
		})

		yTop = rowBottom - 1.5
	}

	const pages = doc.getPages()
	const totalPages = pages.length
	for (let pi = 0; pi < totalPages; pi++) {
		const p = pages[pi]!
		const pw = p.getWidth()
		const footer = `${meta.electronicNotarialFacility}  ·  Page ${pi + 1} of ${totalPages}`
		const fs = 7.5
		const w = font.widthOfTextAtSize(footer, fs)
		drawText(p, footer, (pw - w) / 2, 22, fs, font, mutedColor)
		// Thin footer rule
		p.drawLine({
			start: { x: margin, y: 32 },
			end: { x: pw - margin, y: 32 },
			thickness: 0.25,
			color: subtleLine,
		})
	}

	return doc.save()
}
