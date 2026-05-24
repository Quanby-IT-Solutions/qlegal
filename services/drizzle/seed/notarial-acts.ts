import { faker } from "@faker-js/faker"
import { eq } from "drizzle-orm"

import { getFullName } from "@/core/lib/utils"

import { db } from "@/services/drizzle/db"
import { users } from "@/services/drizzle/schema/auth"
import { documents } from "@/services/drizzle/schema/document"
import { notarialActs, notarialBooks } from "@/services/drizzle/schema/notarial-book"
import { SEED_CONFIG } from "@/services/drizzle/seed/config"

/**
 * Seed notarial acts and related documents
 *
 * IMPORTANT: Understanding the data model:
 * - The `documents` table contains UNSIGNED documents (uploaded files before notarization)
 * - The `notarial_act` table contains SIGNED/notarized document references
 * - When a document is notarized, a record is created in `notarial_act` that:
 *   - References the original unsigned document via `documentId`
 *   - Stores the signed document reference via `docoChainProjectUuid` (DocoChain project UUID)
 *   - Contains notarization details (principal, ENP, certificate, etc.)
 *
 * For principals viewing their documents, they should see only signed documents from `notarial_act`,
 * not the unsigned documents from `documents`.
 */
export async function createNotarialActs() {
	console.log("🌱 Seeding notarial acts...")

	const principalEmail = SEED_CONFIG.testAccounts.find(a => a.role === "PRINCIPAL")?.email
	const enpEmail = SEED_CONFIG.testAccounts.find(a => a.role === "ENP")?.email

	if (!principalEmail || !enpEmail) {
		console.log("⚠️  Principal or ENP not in SEED_CONFIG. Skipping notarial acts.")
		return
	}

	const principalUser = await db.query.users.findFirst({
		where: eq(users.email, principalEmail),
	})

	const enpUser = await db.query.users.findFirst({
		where: eq(users.email, enpEmail),
	})

	if (!principalUser || !enpUser) {
		console.log("⚠️  Test users not found. Please run user seed first.")
		return
	}

	// Clean up existing notarial acts and books for this ENP first
	const existingBook = await db.query.notarialBooks.findFirst({
		where: eq(notarialBooks.enpId, enpUser.id),
	})

	if (existingBook) {
		// Delete existing notarial acts first (they reference the book)
		await db.delete(notarialActs).where(eq(notarialActs.notarialBookId, existingBook.id))
		console.log("🧹 Cleaned up existing notarial acts")

		// Delete the existing book
		await db.delete(notarialBooks).where(eq(notarialBooks.id, existingBook.id))
		console.log("🧹 Cleaned up existing notarial book")
	}

	// Create notarial book for ENP
	const [createdBook] = await db
		.insert(notarialBooks)
		.values({
			enpId: enpUser.id,
			enfId: null,
			syncedToSupremeCourt: false,
		})
		.returning()

	if (!createdBook) {
		console.log("❌ Failed to create notarial book")
		return
	}

	const notarialBook = createdBook
	console.log("✅ Created notarial book for ENP")

	// Create test documents (UNSIGNED - these are the original uploaded documents)
	const documentNames = [
		"Power of Attorney",
		"Affidavit of Loss",
		"Deed of Sale",
		"Certificate of No Marriage",
		"Special Power of Attorney",
	]

	const actTypes: Array<"ACKNOWLEDGMENT" | "AFFIRMATION" | "JURAT" | "SIGNATURE_WITNESSING"> = [
		"ACKNOWLEDGMENT",
		"AFFIRMATION",
		"JURAT",
		"SIGNATURE_WITNESSING",
		"ACKNOWLEDGMENT",
	]

	const createdDocuments = []
	for (let i = 0; i < documentNames.length; i++) {
		const documentName = documentNames[i]
		if (!documentName) continue
		const [doc] = await db
			.insert(documents)
			.values({
				name: documentName,
				description: `Test document: ${documentName}`,
				type: "application/pdf",
				size: faker.number.int({ min: 10000, max: 500000 }),
				path: `/documents/test-${i + 1}.pdf`,
				status: "READY", // UNSIGNED document status
				notarizationType: actTypes[i] ?? "ACKNOWLEDGMENT",
			})
			.returning()

		if (doc) {
			createdDocuments.push(doc)
		}
	}

	console.log(`✅ Created ${createdDocuments.length} test documents (unsigned)`)

	// Create notarial acts (SIGNED - these reference the signed documents)
	const principalName = (getFullName(principalUser) || principalUser.email) ?? "Principal User"
	const enpName = getFullName(enpUser) || "ENP User"
	const enpRollNumber = "ENP-12345"

	const notarialActsData = createdDocuments.map((doc, index) => {
		const executedAt = new Date()
		executedAt.setDate(executedAt.getDate() - index) // Make them different dates

		// Generate a mock DocoChain project UUID for testing
		// In production, this would come from the actual DocoChain project creation
		const mockProjectUuid = `test-project-${doc.id.substring(0, 8)}-${Date.now()}-${index}`

		return {
			notarialBookId: notarialBook.id,
			actType: actTypes[index] ?? "ACKNOWLEDGMENT",
			documentId: doc.id, // Reference to the unsigned document
			docoChainProjectUuid: mockProjectUuid, // Reference to the signed document in DocoChain
			principalName: principalName, // Match against user's name
			principalIdNumber: faker.string.numeric(12),
			principalAddress: faker.location.streetAddress(),
			enpName: enpName,
			enpRollNumber: enpRollNumber,
			documentName: doc.name,
			documentDescription: doc.description,
			executedAt: executedAt,
			location: faker.location.city(),
			workflow: index % 2 === 0 ? "IEN" : "REN",
			certificateNumber: `NB-${notarialBook.id.substring(0, 4).toUpperCase()}-${executedAt.getTime().toString().slice(-6)}`,
			// Note: certificateUrl would be set when the signed document is available from DocoChain
		}
	})

	// Also create one with email as principalName to test email matching
	const emailAct = {
		notarialBookId: notarialBook.id,
		actType: "ACKNOWLEDGMENT" as const,
		documentId: createdDocuments[0]?.id ?? null,
		docoChainProjectUuid: `test-project-email-${Date.now()}`, // Mock project UUID
		principalName: principalUser.email ?? principalName, // Match against user's email
		principalIdNumber: faker.string.numeric(12),
		principalAddress: faker.location.streetAddress(),
		enpName: enpName,
		enpRollNumber: enpRollNumber,
		documentName: "Email Matched Document",
		documentDescription: "Test document matched by email",
		executedAt: new Date(),
		location: faker.location.city(),
		workflow: "IEN" as const,
		certificateNumber: `NB-${notarialBook.id.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`,
	}

	const allActs = [...notarialActsData, emailAct]

	const insertedActs = await db.insert(notarialActs).values(allActs).returning()

	console.log(
		`✅ Created ${insertedActs.length} notarial acts (signed documents) for principal: ${principalName}`
	)
	console.log(`   - Acts matched by name: ${notarialActsData.length}`)
	console.log(`   - Acts matched by email: 1`)
	console.log(`   - All acts include docoChainProjectUuid for signed document access`)

	return {
		principalUser,
		enpUser,
		notarialBook,
		documents: createdDocuments,
		acts: insertedActs,
	}
}
