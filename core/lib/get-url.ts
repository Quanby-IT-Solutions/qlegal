import { env } from "@/env"

export function getUrl() {
	// Browser: use relative URL so it respects the current origin
	if (typeof window !== "undefined") {
		return ""
	}

	// Server/build: prefer explicit host
	const { AUTH_URL, PORT } = env

	if (AUTH_URL) {
		return AUTH_URL.replace(/\/$/, "")
	}

	return `http://localhost:${PORT ?? 3000}`
}
