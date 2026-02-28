"use client"

/**
 * Renders message content with URLs as clickable links (same-origin opens in same tab, external in new tab).
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g

export function MessageContent({
	content,
	className,
}: {
	content: string
	className?: string
}) {
	const parts = content.split(URL_REGEX)
	const isSameOrigin = (href: string) => {
		if (typeof window === "undefined") return false
		try {
			const url = new URL(href, window.location.origin)
			return url.origin === window.location.origin
		} catch {
			return false
		}
	}

	return (
		<p className={className}>
			{parts.map((part, i) => {
				const isUrl = /^https?:\/\//.test(part)
				if (isUrl) {
					const href = part
					const sameOrigin = isSameOrigin(href)
					return (
						<a
							key={i}
							href={href}
							className="underline break-all hover:opacity-90"
							{...(sameOrigin
								? {}
								: { target: "_blank", rel: "noopener noreferrer" })}
						>
							{part}
						</a>
					)
				}
				return <span key={i}>{part}</span>
			})}
		</p>
	)
}
