import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
	// Initialize with false (server-safe default) instead of undefined
	// This prevents hydration mismatch since server can't detect window size
	const [isMobile, setIsMobile] = React.useState(false)
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		}
		mql.addEventListener("change", onChange)
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		setMounted(true)
		return () => mql.removeEventListener("change", onChange)
	}, [])

	// Return false on server/initial render, actual value after hydration
	// This prevents hydration mismatch by ensuring initial server render matches initial client render
	return mounted && isMobile
}
