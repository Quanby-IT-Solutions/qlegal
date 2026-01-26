export function getLivenessFailureCopy(input: {
	message?: string | null
	qualityIssues?: string[] | null
}) {
	const text = [input.message, ...(input.qualityIssues ?? [])]
		.filter(Boolean)
		.join(" ")
		.toLowerCase()

	const prioritizedTips: string[] = []

	// Keep tips generic and user-safe, but prioritize relevant guidance.
	const mentions = (needle: string) => text.includes(needle)

	const mentionsMultipleFaces =
		(mentions("multiple") || mentions("more than one") || mentions("many")) && mentions("face")
	const mentionsNoFace = (mentions("no") || mentions("not")) && mentions("face") && mentions("detect")
	const mentionsOcclusion = mentions("occlusion") || mentions("cover") || mentions("mask")
	const mentionsLighting =
		mentions("lighting") || mentions("dark") || mentions("low light") || mentions("glare") || mentions("backlit")
	const mentionsBlur = mentions("blur") || mentions("blurry") || mentions("motion")

	if (mentionsMultipleFaces) {
		prioritizedTips.push("Ensure only one person is in the frame")
	}
	if (mentionsNoFace) {
		prioritizedTips.push("Make sure your face is fully visible and centered")
	}
	if (mentionsOcclusion) {
		prioritizedTips.push("Remove hats, masks, and anything covering your face")
	}
	if (mentionsLighting) {
		prioritizedTips.push("Use good lighting and avoid bright backlight")
	}
	if (mentionsBlur) {
		prioritizedTips.push("Hold still and keep the camera steady")
	}



	const tips = Array.from(new Set([...prioritizedTips])).slice(0, 4)

	return {
		title: "Verification failed",
		description: "We couldn’t confirm your liveness. Please retake your selfie and try again.",
		tips,
	}
}

