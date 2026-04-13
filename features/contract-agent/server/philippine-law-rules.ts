/**
 * Philippine contract-law rules reference.
 *
 * This file is the single source of truth for the statutes the Contract AI
 * checks against.  It feeds both the LLM prompts (via
 * `buildPhilippineLawPromptContext()`) and the local fallback engine (via
 * the `testPattern` regex on each rule).
 *
 * Covered statutes:
 *   - Civil Code of the Philippines, Book IV (Obligations & Contracts)
 *   - Republic Act No. 8792 (E-Commerce Act)
 *   - Republic Act No. 10173 (Data Privacy Act)
 *   - Republic Act No. 7394 (Consumer Act)
 */

interface PhilippineLawRule {
	/** Unique identifier, e.g. "civil-code-consent" */
	id: string
	/** Statute name */
	law: string
	/** Article / section reference */
	provision: string
	/** Short label shown in the compliance-check list */
	label: string
	/** What the provision requires */
	description: string
	/** Regex that, when matched, indicates the contract addresses this rule */
	testPattern: RegExp
	/** Copy shown when the contract does NOT satisfy the check */
	failDetail: string
	/** Copy shown when the contract appears to satisfy the check */
	passDetail: string
}

// ---------------------------------------------------------------------------
// Civil Code – Obligations & Contracts (Book IV)
// ---------------------------------------------------------------------------

const CIVIL_CODE_RULES: PhilippineLawRule[] = [
	{
		id: "civil-code-consent",
		law: "Civil Code of the Philippines",
		provision: "Articles 1318–1323",
		label: "Valid consent of contracting parties",
		description:
			"A contract requires the consent of the contracting parties, an object certain, and a cause of the obligation.",
		testPattern:
			/consent|agree(?:s|d|ment)|mutual(?:ly)?\s+accept|freely\s+enter|voluntar(?:y|ily)/i,
		failDetail:
			"The contract should contain explicit consent language showing both parties freely agree to the terms (Civil Code Art. 1318–1323).",
		passDetail:
			"Consent language detected — both parties appear to express agreement to the contract terms.",
	},
	{
		id: "civil-code-capacity",
		law: "Civil Code of the Philippines",
		provision: "Articles 1327–1329",
		label: "Capacity to contract",
		description:
			"Parties must be of legal age and have the legal capacity to bind themselves or their organizations.",
		testPattern:
			/legal\s+age|legal\s+capacity|duly\s+authorized|authorized\s+representative|capacity\s+to\s+contract|of\s+legal\s+age|corporate\s+authority/i,
		failDetail:
			"Add language confirming each party's legal capacity or authorized-representative status (Civil Code Art. 1327–1329).",
		passDetail: "The contract references party capacity or authorized-representative status.",
	},
	{
		id: "civil-code-lawful-cause",
		law: "Civil Code of the Philippines",
		provision: "Articles 1346–1355",
		label: "Lawful object and cause",
		description:
			"The object of the contract must be within the commerce of man, and the cause must be lawful.",
		testPattern:
			/lawful\s+purpose|legal\s+purpose|lawful\s+cause|legitimate\s+business|not\s+contrary\s+to\s+law|permitted\s+by\s+law/i,
		failDetail:
			"Consider stating that the contract's purpose is lawful and not contrary to public policy (Civil Code Art. 1346–1355).",
		passDetail: "The contract includes language indicating a lawful purpose or cause.",
	},
	{
		id: "civil-code-statute-of-frauds",
		law: "Civil Code of the Philippines",
		provision: "Article 1403",
		label: "Statute of Frauds compliance",
		description:
			"Certain agreements (sale of real property, guarantees, contracts not performable within one year) must be in writing to be enforceable.",
		testPattern:
			/in\s+writing|written\s+agreement|executed\s+in\s+writing|written\s+instrument|this\s+agreement/i,
		failDetail:
			"If this contract falls under the Statute of Frauds (Art. 1403), it must be evidenced by a written instrument signed by the parties.",
		passDetail:
			"The contract is evidenced in writing, satisfying the Statute of Frauds where applicable.",
	},
	{
		id: "civil-code-mutuality",
		law: "Civil Code of the Philippines",
		provision: "Article 1308",
		label: "Mutuality of contracts",
		description:
			"A contract must bind both parties; its validity or compliance cannot be left to the will of one party alone.",
		testPattern: /mutual(?:ly)?|both\s+parties|each\s+party|bilateral|reciprocal\s+obligation/i,
		failDetail:
			"Ensure the contract binds both parties equally — a contract whose validity depends on the will of only one party is void (Art. 1308).",
		passDetail: "Mutual obligations detected — the contract appears to bind both parties.",
	},
	{
		id: "civil-code-liquidated-damages",
		law: "Civil Code of the Philippines",
		provision: "Articles 2226–2228",
		label: "Liquidated damages reasonableness",
		description:
			"Liquidated damages must be reasonable; courts may reduce them if iniquitous or unconscionable.",
		testPattern:
			/liquidated\s+damages|pre-?determined\s+damages|agreed\s+damages|penalty\s+clause|stipulated\s+damages/i,
		failDetail:
			"If the contract includes liquidated damages, ensure the amount is reasonable — Philippine courts may reduce unconscionable penalties (Art. 2226–2228).",
		passDetail:
			"Liquidated damages language detected — verify the stipulated amount is proportionate to potential loss.",
	},
	{
		id: "civil-code-penalty-proportionality",
		law: "Civil Code of the Philippines",
		provision: "Articles 1229, 2227",
		label: "Penalty clause proportionality",
		description:
			"Penalty clauses are enforceable but may be equitably reduced by courts when they are iniquitous or unconscionable.",
		testPattern: /penalty|penalt(?:y|ies)\s+clause|penal\s+clause|forfeiture/i,
		failDetail:
			"If penalties are included, note that Philippine courts can reduce penalties deemed iniquitous or unconscionable (Art. 1229, 2227).",
		passDetail:
			"Penalty language found — ensure any stipulated penalty is proportionate to the obligation.",
	},
]

// ---------------------------------------------------------------------------
// E-Commerce Act (RA 8792)
// ---------------------------------------------------------------------------

const ECOMMERCE_RULES: PhilippineLawRule[] = [
	{
		id: "ecommerce-electronic-signatures",
		law: "E-Commerce Act (RA 8792)",
		provision: "Section 8",
		label: "Electronic signature recognition",
		description:
			"Electronic signatures have the same legal effect as handwritten signatures when parties consent to electronic transactions.",
		testPattern:
			/electronic\s+signature|e-?sign(?:ature|ed|ing)?|digital\s+signature|electronically\s+signed/i,
		failDetail:
			"If this contract will be signed electronically, add language recognizing electronic signatures per RA 8792 §8.",
		passDetail: "Electronic signature language detected — consistent with RA 8792 §8.",
	},
	{
		id: "ecommerce-electronic-documents",
		law: "E-Commerce Act (RA 8792)",
		provision: "Section 7",
		label: "Electronic document legal effect",
		description:
			"Electronic documents are not denied legal effect solely on the ground that they are in electronic form.",
		testPattern:
			/electronic\s+(?:document|form|copy|format|record|version)|digital\s+(?:document|copy|record)/i,
		failDetail:
			"Consider stating that the electronic form of this agreement is legally binding per RA 8792 §7.",
		passDetail:
			"The contract recognizes electronic documents or format — consistent with RA 8792 §7.",
	},
	{
		id: "ecommerce-electronic-contracting",
		law: "E-Commerce Act (RA 8792)",
		provision: "Section 16",
		label: "Electronic contracting requirements",
		description:
			"Contracts formed through electronic means are valid and enforceable, provided the requirements of consent and offer-acceptance are met.",
		testPattern:
			/electronic\s+means|online|digital\s+platform|electronic\s+transaction|electronic\s+commerce/i,
		failDetail:
			"If this contract is formed electronically, confirm that offer, acceptance, and consent requirements are met (RA 8792 §16).",
		passDetail: "Electronic contracting language detected — consistent with RA 8792 §16.",
	},
]

// ---------------------------------------------------------------------------
// Data Privacy Act (RA 10173)
// ---------------------------------------------------------------------------

const DATA_PRIVACY_RULES: PhilippineLawRule[] = [
	{
		id: "dpa-personal-data-consent",
		law: "Data Privacy Act (RA 10173)",
		provision: "Sections 12, 20",
		label: "Personal data processing consent",
		description:
			"Processing of personal information requires the data subject's consent unless an exception under the Act applies.",
		testPattern:
			/personal\s+(?:data|information)|data\s+(?:subject|protection|privacy|processing)|consent\s+to\s+(?:process|collect|use)|privacy\s+(?:policy|notice)/i,
		failDetail:
			"If this contract involves personal data, include consent or a lawful basis for processing under RA 10173 §12/20.",
		passDetail:
			"Personal data or privacy language detected — verify it meets RA 10173 consent requirements.",
	},
	{
		id: "dpa-data-sharing",
		law: "Data Privacy Act (RA 10173)",
		provision: "Section 21",
		label: "Data sharing agreement provisions",
		description:
			"Data sharing between parties must be covered by a data sharing agreement specifying purpose, scope, and safeguards.",
		testPattern:
			/data\s+sharing|share\s+(?:personal\s+)?(?:data|information)|transfer\s+(?:of\s+)?(?:personal\s+)?data|data\s+transfer/i,
		failDetail:
			"If personal data is shared between parties, a compliant data sharing agreement is required (RA 10173 §21).",
		passDetail:
			"Data sharing language detected — verify the agreement covers purpose, scope, and safeguards per RA 10173 §21.",
	},
	{
		id: "dpa-breach-notification",
		law: "Data Privacy Act (RA 10173)",
		provision: "Section 20(f)",
		label: "Data breach notification obligation",
		description:
			"Personal information controllers must notify the National Privacy Commission and affected data subjects of a personal data breach.",
		testPattern:
			/(?:data\s+)?breach\s+notif|breach\s+report|notify\s+(?:the\s+)?(?:commission|NPC|privacy)|incident\s+response|security\s+incident/i,
		failDetail:
			"If personal data is involved, consider adding breach notification obligations per RA 10173 §20(f).",
		passDetail:
			"Breach notification or incident response language detected — consistent with RA 10173 §20(f).",
	},
]

// ---------------------------------------------------------------------------
// Consumer Act (RA 7394)
// ---------------------------------------------------------------------------

const CONSUMER_RULES: PhilippineLawRule[] = [
	{
		id: "consumer-unconscionable-practices",
		law: "Consumer Act (RA 7394)",
		provision: "Articles 50–52",
		label: "No unconscionable contract terms",
		description:
			"Sales practices or contract terms that are grossly unfair or one-sided may be deemed unconscionable and unenforceable.",
		testPattern:
			/unconscionable|grossly\s+unfair|one-?sided|adhesion|take\s+it\s+or\s+leave\s+it|waive\s+all\s+rights/i,
		failDetail:
			"Review for potentially unconscionable terms — grossly one-sided clauses may be unenforceable under RA 7394 Art. 50–52.",
		passDetail: "No obviously unconscionable language detected in this pass.",
	},
	{
		id: "consumer-warranty",
		law: "Consumer Act (RA 7394)",
		provision: "Articles 67–68",
		label: "Consumer warranty obligations",
		description:
			"Consumer transactions involving goods or services must honor implied warranties of merchantability and fitness.",
		testPattern:
			/warrant(?:y|ies)|merchantab(?:le|ility)|fit(?:ness)?\s+for\s+(?:a\s+)?particular\s+purpose|as-?is|without\s+warranty/i,
		failDetail:
			"If this is a consumer contract, verify that warranty provisions comply with RA 7394 Art. 67–68.",
		passDetail:
			"Warranty language detected — verify compliance with implied warranty requirements under RA 7394.",
	},
]

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const PHILIPPINE_LAW_RULES: PhilippineLawRule[] = [
	...CIVIL_CODE_RULES,
	...ECOMMERCE_RULES,
	...DATA_PRIVACY_RULES,
	...CONSUMER_RULES,
]

/**
 * Returns a compact text summary of all Philippine law rules suitable for
 * injecting into an LLM prompt.  Keeps token cost low by only including the
 * label, provision, and description.
 */
export function buildPhilippineLawPromptContext() {
	const lines = PHILIPPINE_LAW_RULES.map(
		rule => `- [${rule.provision}] ${rule.label}: ${rule.description}`
	)

	return `Philippine Contract-Law Compliance Rules
The contract MUST be evaluated against each of the following Philippine statutes.
Include a complianceCheck item for every rule that is relevant to the contract.

${lines.join("\n")}`
}
