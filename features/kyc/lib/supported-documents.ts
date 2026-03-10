/**
 * HyperVerge supported countries and document types.
 *
 * Data sourced from https://hyperverge.co/supported-documents/
 * Country codes follow ISO 3166-1 alpha-3.
 * Document IDs follow HyperVerge readId API conventions.
 */

interface DocumentType {
	value: string
	label: string
}

interface CountryEntry {
	label: string
	/**
	 * ISO 3166-1 alpha-2 code for flag rendering (e.g. \"ph\" for Philippines).
	 * Not all entries need to specify this; when omitted we fall back to a lookup map.
	 */
	code2?: string
	documents: DocumentType[]
}

const SUPPORTED_DOCUMENTS: Record<string, CountryEntry> = {
	afg: {
		label: "Afghanistan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "diplomatic_passport", label: "Diplomatic Passport" },
			{ value: "national_id", label: "ID Card (Tazkira)" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ala: {
		label: "Aland Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	alb: {
		label: "Albania",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "professional_dl", label: "Professional Driving License" },
			{ value: "driver_card", label: "Driver Card" },
		],
	},
	dza: {
		label: "Algeria",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "vehicle_registration", label: "Carte d'Immatriculation" },
			{ value: "military_id", label: "Military ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	asm: {
		label: "American Samoa",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "immigration_id", label: "Immigration ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	and: {
		label: "Andorra",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ago: {
		label: "Angola",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	aia: {
		label: "Anguilla",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ata: {
		label: "Antarctica",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	atg: {
		label: "Antigua and Barbuda",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	arg: {
		label: "Argentina",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "alien_id", label: "Alien ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	arm: {
		label: "Armenia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	abw: {
		label: "Aruba",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	aus: {
		label: "Australia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National ID Card" },
			{ value: "proof_of_age", label: "Proof of Age Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	aut: {
		label: "Austria",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	aze: {
		label: "Azerbaijan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	bhs: {
		label: "Bahamas",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
		],
	},
	bhr: {
		label: "Bahrain",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	bgd: {
		label: "Bangladesh",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
		],
	},
	brb: {
		label: "Barbados",
		documents: [{ value: "passport", label: "Passport" }],
	},
	blr: {
		label: "Belarus",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	bel: {
		label: "Belgium",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "minors_id", label: "Minors ID" },
			{ value: "resident_id", label: "Resident ID" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	blz: {
		label: "Belize",
		documents: [{ value: "passport", label: "Passport" }],
	},
	ben: {
		label: "Benin",
		documents: [{ value: "passport", label: "Passport" }],
	},
	bmu: {
		label: "Bermuda",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	btn: {
		label: "Bhutan",
		documents: [{ value: "passport", label: "Passport" }],
	},
	bol: {
		label: "Bolivia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "minors_id", label: "Minors ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	bes: {
		label: "Bonaire, Sint Eustatius and Saba",
		documents: [{ value: "passport", label: "Passport" }],
	},
	bih: {
		label: "Bosnia and Herzegovina",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	bwa: {
		label: "Botswana",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
		],
	},
	bvt: {
		label: "Bouvet Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	bra: {
		label: "Brazil",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "military_id", label: "Military ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	iot: {
		label: "British Indian Ocean Territory",
		documents: [{ value: "passport", label: "Passport" }],
	},
	vgb: {
		label: "British Virgin Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	brn: {
		label: "Brunei Darussalam",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "military_id", label: "Military ID" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	bgr: {
		label: "Bulgaria",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	bfa: {
		label: "Burkina Faso",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
		],
	},
	bdi: {
		label: "Burundi",
		documents: [{ value: "passport", label: "Passport" }],
	},
	khm: {
		label: "Cambodia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	cmr: {
		label: "Cameroon",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	can: {
		label: "Canada",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "minors_id", label: "Minors ID" },
			{ value: "dl", label: "Driver's License" },
			{ value: "credit_card", label: "Credit Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "tribal_id", label: "Tribal ID" },
			{ value: "firearms_licence", label: "Firearms Licence" },
			{ value: "public_services_card", label: "Public Services Card" },
		],
	},
	cpv: {
		label: "Cape Verde",
		documents: [{ value: "passport", label: "Passport" }],
	},
	cym: {
		label: "Cayman Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	caf: {
		label: "Central African Republic",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tcd: {
		label: "Chad",
		documents: [{ value: "passport", label: "Passport" }],
	},
	chl: {
		label: "Chile",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "alien_id", label: "Alien ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	chn: {
		label: "China",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "alien_id", label: "Alien ID" },
		],
	},
	cxr: {
		label: "Christmas Island",
		documents: [{ value: "passport", label: "Passport" }],
	},
	cck: {
		label: "Cocos (Keeling) Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	col: {
		label: "Colombia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "minors_id", label: "Minors ID" },
			{ value: "alien_id", label: "Alien ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	com: {
		label: "Comoros",
		documents: [{ value: "passport", label: "Passport" }],
	},
	cok: {
		label: "Cook Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	cri: {
		label: "Costa Rica",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	civ: {
		label: "Cote d'Ivoire",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	hrv: {
		label: "Croatia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	cub: {
		label: "Cuba",
		documents: [{ value: "passport", label: "Passport" }],
	},
	cuw: {
		label: "Curacao",
		documents: [{ value: "passport", label: "Passport" }],
	},
	cyp: {
		label: "Cyprus",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	cze: {
		label: "Czechia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	dnk: {
		label: "Denmark",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	dji: {
		label: "Djibouti",
		documents: [{ value: "passport", label: "Passport" }],
	},
	dma: {
		label: "Dominica",
		documents: [{ value: "passport", label: "Passport" }],
	},
	dom: {
		label: "Dominican Republic",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	cod: {
		label: "DR Congo",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ecu: {
		label: "Ecuador",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	egy: {
		label: "Egypt",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	slv: {
		label: "El Salvador",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	gnq: {
		label: "Equatorial Guinea",
		documents: [{ value: "passport", label: "Passport" }],
	},
	eri: {
		label: "Eritrea",
		documents: [{ value: "passport", label: "Passport" }],
	},
	est: {
		label: "Estonia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	swz: {
		label: "Eswatini",
		documents: [{ value: "passport", label: "Passport" }],
	},
	eth: {
		label: "Ethiopia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	flk: {
		label: "Falkland Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	fro: {
		label: "Faroe Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	fji: {
		label: "Fiji",
		documents: [{ value: "passport", label: "Passport" }],
	},
	fin: {
		label: "Finland",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "alien_id", label: "Alien ID" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	fra: {
		label: "France",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	guf: {
		label: "French Guiana",
		documents: [{ value: "passport", label: "Passport" }],
	},
	pyf: {
		label: "French Polynesia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	atf: {
		label: "French Southern Territories",
		documents: [{ value: "passport", label: "Passport" }],
	},
	gab: {
		label: "Gabon",
		documents: [{ value: "passport", label: "Passport" }],
	},
	gmb: {
		label: "Gambia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	geo: {
		label: "Georgia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	deu: {
		label: "Germany",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	gha: {
		label: "Ghana",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	gib: {
		label: "Gibraltar",
		documents: [{ value: "passport", label: "Passport" }],
	},
	grc: {
		label: "Greece",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	grl: {
		label: "Greenland",
		documents: [{ value: "passport", label: "Passport" }],
	},
	grd: {
		label: "Grenada",
		documents: [{ value: "passport", label: "Passport" }],
	},
	glp: {
		label: "Guadeloupe",
		documents: [{ value: "passport", label: "Passport" }],
	},
	gum: {
		label: "Guam",
		documents: [{ value: "passport", label: "Passport" }],
	},
	gtm: {
		label: "Guatemala",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "consular_id", label: "Consular ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ggy: {
		label: "Guernsey",
		documents: [{ value: "passport", label: "Passport" }],
	},
	gin: {
		label: "Guinea",
		documents: [{ value: "passport", label: "Passport" }],
	},
	gnb: {
		label: "Guinea Bissau",
		documents: [{ value: "passport", label: "Passport" }],
	},
	guy: {
		label: "Guyana",
		documents: [{ value: "passport", label: "Passport" }],
	},
	hti: {
		label: "Haiti",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	hmd: {
		label: "Heard and McDonald Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	hnd: {
		label: "Honduras",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	hkg: {
		label: "Hong Kong",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	hun: {
		label: "Hungary",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "address_card", label: "Address Card" },
			{ value: "residence_permit", label: "Residence Permit" },
			{ value: "dl", label: "Driving License" },
		],
	},
	isl: {
		label: "Iceland",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ind: {
		label: "India",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
			{ value: "aadhaar", label: "Aadhaar Card" },
			{ value: "pan", label: "PAN Card" },
			{ value: "voter_id", label: "Voter ID" },
			{ value: "form_60", label: "Form 60" },
			{ value: "gstin", label: "GSTIN" },
			{ value: "credit_card", label: "Credit Card" },
			{ value: "other", label: "Other Document" },
		],
	},
	idn: {
		label: "Indonesia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Resident ID (KTP)" },
			{ value: "dl", label: "Driving License" },
		],
	},
	irn: {
		label: "Iran",
		documents: [{ value: "passport", label: "Passport" }],
	},
	irq: {
		label: "Iraq",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	irl: {
		label: "Ireland",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "public_services_card", label: "Public Service Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	imn: {
		label: "Isle of Man",
		documents: [{ value: "passport", label: "Passport" }],
	},
	isr: {
		label: "Israel",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	ita: {
		label: "Italy",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	jam: {
		label: "Jamaica",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	jpn: {
		label: "Japan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	jey: {
		label: "Jersey",
		documents: [{ value: "passport", label: "Passport" }],
	},
	jor: {
		label: "Jordan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "ID Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	kaz: {
		label: "Kazakhstan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	ken: {
		label: "Kenya",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National ID" },
		],
	},
	kir: {
		label: "Kiribati",
		documents: [{ value: "passport", label: "Passport" }],
	},
	xkx: {
		label: "Kosovo",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	kwt: {
		label: "Kuwait",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "resident_id", label: "Resident ID" },
		],
	},
	kgz: {
		label: "Kyrgyzstan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	lao: {
		label: "Lao",
		documents: [{ value: "passport", label: "Passport" }],
	},
	lva: {
		label: "Latvia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "alien_id", label: "Alien ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	lbn: {
		label: "Lebanon",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	lso: {
		label: "Lesotho",
		documents: [{ value: "passport", label: "Passport" }],
	},
	lbr: {
		label: "Liberia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	lby: {
		label: "Libya",
		documents: [{ value: "passport", label: "Passport" }],
	},
	lie: {
		label: "Liechtenstein",
		documents: [{ value: "passport", label: "Passport" }],
	},
	ltu: {
		label: "Lithuania",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	lux: {
		label: "Luxembourg",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	mac: {
		label: "Macau SAR",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mdg: {
		label: "Madagascar",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mwi: {
		label: "Malawi",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mys: {
		label: "Malaysia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
			{ value: "mykas", label: "MyKAS" },
			{ value: "mykad", label: "MyKad" },
			{ value: "mykid", label: "MyKid" },
			{ value: "mypr", label: "MyPR" },
			{ value: "mypolis", label: "MyPolis" },
			{ value: "mytentera", label: "MyTentera" },
			{ value: "refugee_id", label: "Refugee ID" },
			{ value: "ikad", label: "i-Kad" },
		],
	},
	mdv: {
		label: "Maldives",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	mli: {
		label: "Mali",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mlt: {
		label: "Malta",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	mhl: {
		label: "Marshall Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mtq: {
		label: "Martinique",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mrt: {
		label: "Mauritania",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mus: {
		label: "Mauritius",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	myt: {
		label: "Mayotte",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mex: {
		label: "Mexico",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "voter_id", label: "Voter ID" },
			{ value: "dl", label: "Driving License" },
			{ value: "professional_dl", label: "Professional Driving License" },
			{ value: "residence_permit", label: "Residente Permanente" },
			{ value: "consular_id", label: "Consular ID Card" },
		],
	},
	fsm: {
		label: "Micronesia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mco: {
		label: "Monaco",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mng: {
		label: "Mongolia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mne: {
		label: "Montenegro",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	msr: {
		label: "Montserrat",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mar: {
		label: "Morocco",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	moz: {
		label: "Mozambique",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	mmr: {
		label: "Myanmar",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	nam: {
		label: "Namibia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	nru: {
		label: "Nauru",
		documents: [{ value: "passport", label: "Passport" }],
	},
	npl: {
		label: "Nepal",
		documents: [{ value: "passport", label: "Passport" }],
	},
	nld: {
		label: "Netherlands",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	ncl: {
		label: "New Caledonia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	nzl: {
		label: "New Zealand",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	nic: {
		label: "Nicaragua",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	ner: {
		label: "Niger",
		documents: [{ value: "passport", label: "Passport" }],
	},
	nga: {
		label: "Nigeria",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National ID" },
			{ value: "voter_id", label: "Voter's Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	niu: {
		label: "Niue",
		documents: [{ value: "passport", label: "Passport" }],
	},
	nfk: {
		label: "Norfolk Island",
		documents: [{ value: "passport", label: "Passport" }],
	},
	prk: {
		label: "North Korea",
		documents: [{ value: "passport", label: "Passport" }],
	},
	mkd: {
		label: "North Macedonia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	mnp: {
		label: "Northern Mariana Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	nor: {
		label: "Norway",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	omn: {
		label: "Oman",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "resident_id", label: "Resident ID" },
		],
	},
	pak: {
		label: "Pakistan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "consular_id", label: "Consular ID Card" },
		],
	},
	plw: {
		label: "Palau",
		documents: [{ value: "passport", label: "Passport" }],
	},
	pse: {
		label: "Palestine",
		documents: [{ value: "passport", label: "Passport" }],
	},
	pan: {
		label: "Panama",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	png: {
		label: "Papua New Guinea",
		documents: [{ value: "passport", label: "Passport" }],
	},
	pry: {
		label: "Paraguay",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	per: {
		label: "Peru",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "minors_id", label: "Minors ID" },
			{ value: "dl", label: "Driving License" },
		],
	},
	phl: {
		label: "Philippines",
		code2: "ph",
		documents: [
			{ value: "dl", label: "LTO Driver's License" },
			{ value: "passport", label: "Philippine Passport" },
			{ value: "umid", label: "Unified Multi-purpose ID (UMID)" },
			{ value: "tin", label: "BIR/Tax ID (TIN)" },
			{ value: "national_id", label: "Philippine National ID/Phil ID" },
			{ value: "ephil", label: "ePhilId" },
			{ value: "philhealth", label: "PhilHealth ID" },
			{ value: "postalid", label: "Philippine Postal ID" },
			{ value: "sss", label: "Philippine SSS ID" },
			{ value: "nbi", label: "NBI Clearance" },
			{ value: "alien_residency", label: "Alien Residency Card" },
		],
	},
	pcn: {
		label: "Pitcairn",
		documents: [{ value: "passport", label: "Passport" }],
	},
	pol: {
		label: "Poland",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	prt: {
		label: "Portugal",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Citizen Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	pri: {
		label: "Puerto Rico",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
			{ value: "voter_id", label: "Voter ID" },
		],
	},
	qat: {
		label: "Qatar",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	kor: {
		label: "Republic of Korea",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	mda: {
		label: "Republic of Moldova",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	cog: {
		label: "Republic of the Congo",
		documents: [{ value: "passport", label: "Passport" }],
	},
	reu: {
		label: "Reunion",
		documents: [{ value: "passport", label: "Passport" }],
	},
	rou: {
		label: "Romania",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	rus: {
		label: "Russian Federation",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	rwa: {
		label: "Rwanda",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	blm: {
		label: "Saint Barthelemy",
		documents: [{ value: "passport", label: "Passport" }],
	},
	shn: {
		label: "Saint Helena",
		documents: [{ value: "passport", label: "Passport" }],
	},
	kna: {
		label: "Saint Kitts and Nevis",
		documents: [{ value: "passport", label: "Passport" }],
	},
	lca: {
		label: "Saint Lucia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	maf: {
		label: "Saint Martin (French part)",
		documents: [{ value: "passport", label: "Passport" }],
	},
	spm: {
		label: "Saint Pierre and Miquelon",
		documents: [{ value: "passport", label: "Passport" }],
	},
	vct: {
		label: "Saint Vincent and the Grenadines",
		documents: [{ value: "passport", label: "Passport" }],
	},
	wsm: {
		label: "Samoa",
		documents: [{ value: "passport", label: "Passport" }],
	},
	smr: {
		label: "San Marino",
		documents: [{ value: "passport", label: "Passport" }],
	},
	stp: {
		label: "Sao Tome and Principe",
		documents: [{ value: "passport", label: "Passport" }],
	},
	sau: {
		label: "Saudi Arabia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	sen: {
		label: "Senegal",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	srb: {
		label: "Serbia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "resident_id", label: "Resident ID" },
		],
	},
	syc: {
		label: "Seychelles",
		documents: [{ value: "passport", label: "Passport" }],
	},
	sle: {
		label: "Sierra Leone",
		documents: [{ value: "passport", label: "Passport" }],
	},
	sgp: {
		label: "Singapore",
		documents: [
			{ value: "dl", label: "Driving License" },
			{ value: "national_id", label: "National ID" },
			{ value: "passport", label: "Passport" },
			{ value: "employment_pass", label: "Employment Pass" },
			{ value: "fin_card", label: "FIN Card" },
			{ value: "resident_id", label: "Resident ID" },
			{ value: "spass", label: "S Pass" },
			{ value: "work_permit", label: "Work Permit" },
		],
	},
	sxm: {
		label: "Sint Maarten (Dutch part)",
		documents: [{ value: "passport", label: "Passport" }],
	},
	svk: {
		label: "Slovakia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	svn: {
		label: "Slovenia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	slb: {
		label: "Solomon Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	som: {
		label: "Somalia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	zaf: {
		label: "South Africa",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	sgs: {
		label: "South Georgia and South Sandwich Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	ssd: {
		label: "South Sudan",
		documents: [{ value: "passport", label: "Passport" }],
	},
	esp: {
		label: "Spain",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "alien_id", label: "Alien ID" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	lka: {
		label: "Sri Lanka",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	sdn: {
		label: "Sudan",
		documents: [{ value: "passport", label: "Passport" }],
	},
	sur: {
		label: "Suriname",
		documents: [{ value: "passport", label: "Passport" }],
	},
	sjm: {
		label: "Svalbard and Jan Mayen",
		documents: [{ value: "passport", label: "Passport" }],
	},
	syr: {
		label: "Syrian Arab Republic",
		documents: [{ value: "passport", label: "Passport" }],
	},
	swe: {
		label: "Sweden",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "social_security", label: "Social Security Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	che: {
		label: "Switzerland",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	twn: {
		label: "Taiwan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	tjk: {
		label: "Tajikistan",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tza: {
		label: "Tanzania",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "voter_id", label: "Voter ID" },
		],
	},
	tha: {
		label: "Thailand",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Thai Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "alien_id", label: "Alien ID" },
		],
	},
	tls: {
		label: "Timor-Leste",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tgo: {
		label: "Togo",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tkl: {
		label: "Tokelau",
		documents: [{ value: "passport", label: "Passport" }],
	},
	ton: {
		label: "Tonga",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tto: {
		label: "Trinidad and Tobago",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driver's Permit" },
		],
	},
	tun: {
		label: "Tunisia",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	tur: {
		label: "Turkey",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	tkm: {
		label: "Turkmenistan",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tca: {
		label: "Turks and Caicos Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	tuv: {
		label: "Tuvalu",
		documents: [{ value: "passport", label: "Passport" }],
	},
	uga: {
		label: "Uganda",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving Permit" },
			{ value: "national_id", label: "National Identity Card" },
		],
	},
	ukr: {
		label: "Ukraine",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	are: {
		label: "United Arab Emirates",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving Permit" },
			{ value: "national_id", label: "National Identity Card" },
			{ value: "resident_id", label: "Resident ID" },
		],
	},
	gbr: {
		label: "United Kingdom",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
			{ value: "residence_permit", label: "Residence Permit" },
		],
	},
	usa: {
		label: "United States of America",
		code2: "us",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "state_id", label: "State ID Card" },
			{ value: "social_security", label: "Social Security" },
			{ value: "dl", label: "Driver's License" },
			{ value: "border_crossing", label: "Border Crossing Card" },
			{ value: "global_entry", label: "Global Entry Card" },
			{ value: "residence_permit", label: "Permanent Resident" },
			{ value: "minors_id", label: "Minor ID" },
			{ value: "nexus", label: "NEXUS" },
			{ value: "veteran_id", label: "Veteran ID" },
			{ value: "employment_auth", label: "Employment Authorization Card" },
		],
	},
	ury: {
		label: "Uruguay",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "Identity Card" },
		],
	},
	umi: {
		label: "US Minor Outlying Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	vir: {
		label: "US Virgin Islands",
		documents: [{ value: "passport", label: "Passport" }],
	},
	uzb: {
		label: "Uzbekistan",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "dl", label: "Driving License" },
		],
	},
	vut: {
		label: "Vanuatu",
		documents: [{ value: "passport", label: "Passport" }],
	},
	vat: {
		label: "Vatican City",
		documents: [{ value: "passport", label: "Passport" }],
	},
	ven: {
		label: "Venezuela",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "employment_auth", label: "Employment Authorization Card" },
			{ value: "dl", label: "Driving License" },
		],
	},
	vnm: {
		label: "Vietnam",
		documents: [
			{ value: "passport", label: "Passport" },
			{ value: "national_id", label: "National ID (CMND/CCCD)" },
			{ value: "dl", label: "Driving License" },
		],
	},
	wlf: {
		label: "Wallis and Futuna",
		documents: [{ value: "passport", label: "Passport" }],
	},
	esh: {
		label: "Western Sahara",
		documents: [{ value: "passport", label: "Passport" }],
	},
	yem: {
		label: "Yemen",
		documents: [{ value: "passport", label: "Passport" }],
	},
	zmb: {
		label: "Zambia",
		documents: [{ value: "passport", label: "Passport" }],
	},
	zwe: {
		label: "Zimbabwe",
		documents: [{ value: "passport", label: "Passport" }],
	},
}

// Minimal ISO 3166-1 alpha-3 -> alpha-2 mapping for flag rendering.
// For entries without an explicit code2, we fall back to this map.
const ISO3_TO_ISO2: Record<string, string> = {
	afg: "af",
	ala: "ax",
	alb: "al",
	dza: "dz",
	asm: "as",
	and: "ad",
	ago: "ao",
	aia: "ai",
	arg: "ar",
	aus: "au",
	aut: "at",
	bgd: "bd",
	bel: "be",
	ben: "bj",
	bol: "bo",
	bra: "br",
	can: "ca",
	chl: "cl",
	chn: "cn",
	col: "co",
	cri: "cr",
	cze: "cz",
	deu: "de",
	ind: "in",
	idn: "id",
	irn: "ir",
	irq: "iq",
	irl: "ie",
	isr: "il",
	ita: "it",
	jam: "jm",
	jpn: "jp",
	jor: "jo",
	ken: "ke",
	lao: "la",
	lva: "lv",
	lbn: "lb",
	lux: "lu",
	mex: "mx",
	nld: "nl",
	nzl: "nz",
	nor: "no",
	omn: "om",
	pan: "pa",
	per: "pe",
	phl: "ph",
	pol: "pl",
	prt: "pt",
	qat: "qa",
	reu: "re",
	rou: "ro",
	rus: "ru",
	zaf: "za",
	esp: "es",
	swe: "se",
	che: "ch",
	tha: "th",
	tur: "tr",
	uga: "ug",
	ukr: "ua",
	are: "ae",
	gbr: "gb",
	usa: "us",
	ven: "ve",
	vnm: "vn",
}

const countriesSorted = Object.entries(SUPPORTED_DOCUMENTS)
	.map(([value, entry]) => ({
		value,
		label: entry.label,
		code: (entry.code2 ?? ISO3_TO_ISO2[value] ?? value.slice(0, 2)).toLowerCase(),
	}))
	.sort((a, b) => a.label.localeCompare(b.label))

export function getCountries() {
	return countriesSorted
}

export function getDocumentTypes(countryId: string) {
	return SUPPORTED_DOCUMENTS[countryId]?.documents ?? [{ value: "passport", label: "Passport" }]
}
