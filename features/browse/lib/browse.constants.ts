// Filter options for Browse ENP page
export const SPECIALIZATION_OPTIONS = [
	"All",
	"Legal Documents",
	"Contracts",
	"Real Estate",
	"Affidavits",
	"Business Law",
	"General",
] as const

export const RATING_OPTIONS = [
	{ value: 0, label: "All Ratings" },
	{ value: 3, label: "3+ Stars" },
	{ value: 4, label: "4+ Stars" },
	{ value: 4.5, label: "4.5+ Stars" },
	{ value: 4.8, label: "4.8+ Stars" },
] as const

export const SORT_OPTIONS = [
	{ value: "RATING", label: "Highest Rated" },
	{ value: "EXPERIENCE", label: "Most Experienced" },
	{ value: "RECENT", label: "Recently Added" },
	{ value: "AVAILABILITY", label: "Most Available" },
] as const

// Badge threshold constants
export const BADGE_THRESHOLDS = {
	TOP_RATED_RATING: 4.8,
	VERIFIED_PROFESSIONAL_REVIEWS: 50,
	ELITE_REVIEWS: 100,
} as const

// Badge labels
export const BADGE_LABELS = {
	TOP_RATED: "Top Rated",
	VERIFIED_PROFESSIONAL: "Verified Professional",
	ELITE: "Elite",
} as const

// Default values for ENP fields
export const DEFAULT_ENP_VALUES = {
	EXPERIENCE: "Experienced",
	RESPONSE_TIME: "Within 24 hours",
	LOCATION: "Philippines",
	RATE: 500,
	LANGUAGES: ["English"],
	SPECIALIZATION: "General",
} as const

// Cache times in milliseconds
export const CACHE_TIMES = {
	ENPS: 60_000, // 1 minute
	PRINCIPAL_SCORE: 300_000, // 5 minutes
} as const

// Score calculation weights (percentages)
export const SCORE_WEIGHTS = {
	RATING: 25,
	SPEED: 20,
	EXPERIENCE: 20,
	SPECIALIZATION: 15,
	WORKLOAD: 20,
} as const

// Score boost values
export const SCORE_BOOSTS = {
	NEW_ENP: 10,
	SPECIALTY: 5,
	RETURNING: 0,
} as const

// New ENP threshold (days)
export const NEW_ENP_DAYS_THRESHOLD = 30
