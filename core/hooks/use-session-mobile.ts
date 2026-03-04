import * as React from "react"

// Higher breakpoint (1024px instead of 768px) for session pages with 2 sidebars
const SESSION_MOBILE_BREAKPOINT = 1024

export function useSessionIsMobile() {
	const [isMobile, setIsMobile] = React.useState(false)
	const [mounted, setMounted] = React.useState(false)

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${SESSION_MOBILE_BREAKPOINT - 1}px)`)
		const onChange = () => {
			setIsMobile(window.innerWidth < SESSION_MOBILE_BREAKPOINT)
		}
		mql.addEventListener("change", onChange)
		setIsMobile(window.innerWidth < SESSION_MOBILE_BREAKPOINT)
		setMounted(true)
		return () => mql.removeEventListener("change", onChange)
	}, [])

	return mounted && isMobile
}
