"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Cookie as CookieIcon } from "lucide-react"

import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

const COOKIE_NAME = "cookie-consent"
const COOKIE_VALUE = "true"
const COOKIE_EXPIRES = "Fri, 31 Dec 9999 23:59:59 GMT"
const ANIMATION_DURATION_MS = 700

const DEFAULT_DESCRIPTION =
	"We collect cookies and personal data to operate and secure this service in line with the Philippine Data Privacy Act (R.A. 10173). Essential cookies run by default; optional ones run only if you accept."

const cookieConsentVariants = cva("fixed z-50 w-full transition-all duration-700 sm:w-auto", {
	variants: {
		variant: {
			default: "sm:max-w-md",
			small: "sm:max-w-md",
			mini: "sm:max-w-3xl",
		},
		position: {
			"top-left": "top-0 left-0 right-0 sm:top-4 sm:left-4 sm:right-auto",
			"top-center": "top-0 left-0 right-0 sm:top-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
			"top-right": "top-0 left-0 right-0 sm:top-4 sm:left-auto sm:right-4",
			"bottom-left": "bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto",
			"bottom-center":
				"bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
			"bottom-right": "bottom-0 left-0 right-0 sm:bottom-4 sm:left-auto sm:right-4",
		},
	},
	defaultVariants: {
		variant: "default",
		position: "bottom-left",
	},
})

interface CookieConsentProps
	extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cookieConsentVariants> {
	demo?: boolean
	glass?: boolean
	onAcceptCallback?: () => void
	onDeclineCallback?: () => void
	description?: string
	learnMoreHref?: string
}

const setCookieConsent = () => {
	document.cookie = `${COOKIE_NAME}=${COOKIE_VALUE}; expires=${COOKIE_EXPIRES}; path=/`
}

const hasCookieConsent = (): boolean => {
	if (typeof document === "undefined") return false
	try {
		return document.cookie.includes(`${COOKIE_NAME}=${COOKIE_VALUE}`)
	} catch {
		return false
	}
}

function getAnimationClasses(position: string | null | undefined, isOpen: boolean): string {
	const isTop = position?.startsWith("top")
	const isBottom = position?.startsWith("bottom")

	if (isBottom) {
		return isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
	}

	if (isTop) {
		return isOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
	}

	return isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95"
}

function getCardClasses(variant: string | null | undefined, glass: boolean): string {
	const baseClasses = variant === "mini" ? "mx-3 p-0 py-3" : "mx-3"
	const glassClasses = glass
		? "border bg-background/60 backdrop-blur-sm dark:bg-background/80"
		: "shadow-lg"

	return cn(baseClasses, glassClasses)
}

interface VariantContentProps {
	description: string
	onAccept: () => void
	onDecline: () => void
	learnMoreHref?: string
}

function DefaultVariantContent({
	description,
	learnMoreHref,
	onAccept,
	onDecline,
}: VariantContentProps & { learnMoreHref: string }) {
	return (
		<>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-lg">We use cookies</CardTitle>
				<CookieIcon className="size-5" />
			</CardHeader>
			<CardContent className="space-y-2">
				<CardDescription className="text-sm">{description}</CardDescription>
				<p className="text-muted-foreground text-sm">
					By clicking <span className="font-medium">"Accept"</span>, you consent to cookies and
					processing for service improvements consistent with R.A. 10173.
				</p>
				<a
					href={learnMoreHref}
					className="text-primary text-sm underline underline-offset-4 hover:no-underline"
				>
					Learn how we protect your data
				</a>
			</CardContent>
			<CardFooter className="flex gap-2 pt-2">
				<Button onClick={onDecline} variant="secondary" className="flex-1">
					Decline
				</Button>
				<Button onClick={onAccept} className="flex-1">
					Accept
				</Button>
			</CardFooter>
		</>
	)
}

function SmallVariantContent({
	description,
	learnMoreHref,
	onAccept,
	onDecline,
}: VariantContentProps) {
	return (
		<>
			<CardHeader className="flex h-0 flex-row items-center justify-between space-y-0 px-4 pb-2">
				<CardTitle className="text-base">We use cookies</CardTitle>
				<CookieIcon className="size-4" />
			</CardHeader>
			<CardContent className="px-4 pt-0 pb-2">
				<CardDescription className="text-sm">{description}</CardDescription>
				{learnMoreHref ? (
					<a
						href={learnMoreHref}
						className="text-primary mt-2 inline-block text-xs underline underline-offset-4 hover:no-underline"
					>
						Learn more about R.A. 10173
					</a>
				) : null}
			</CardContent>
			<CardFooter className="flex h-0 gap-2 px-4 py-2">
				<Button onClick={onDecline} variant="secondary" size="sm" className="flex-1 rounded-full">
					Decline
				</Button>
				<Button onClick={onAccept} size="sm" className="flex-1 rounded-full">
					Accept
				</Button>
			</CardFooter>
		</>
	)
}

function MiniVariantContent({
	description,
	learnMoreHref,
	onAccept,
	onDecline,
}: VariantContentProps) {
	return (
		<CardContent className="grid gap-4 p-0 px-3.5 sm:flex">
			<div className="flex-1 space-y-1">
				<CardDescription className="text-xs sm:text-sm">{description}</CardDescription>
				{learnMoreHref ? (
					<a
						href={learnMoreHref}
						className="text-primary inline-block text-[11px] underline underline-offset-4 hover:no-underline sm:text-xs"
					>
						Privacy notice (R.A. 10173)
					</a>
				) : null}
			</div>
			<div className="flex items-center justify-end gap-2 sm:gap-3">
				<Button onClick={onDecline} size="sm" variant="secondary" className="h-7 text-xs">
					Decline
				</Button>
				<Button onClick={onAccept} size="sm" className="h-7 text-xs">
					Accept
				</Button>
			</div>
		</CardContent>
	)
}

const CookieConsent = React.forwardRef<HTMLDivElement, CookieConsentProps>(
	(
		{
			variant = "default",
			position = "bottom-left",
			demo = false,
			glass = false,
			onAcceptCallback,
			onDeclineCallback,
			className,
			description = DEFAULT_DESCRIPTION,
			learnMoreHref = "/privacy-policy",
			...props
		},
		ref
	) => {
		const [isOpen, setIsOpen] = React.useState(false)
		const [hide, setHide] = React.useState(false)

		const closeAndHide = React.useCallback(() => {
			setIsOpen(false)
			setTimeout(() => {
				setHide(true)
			}, ANIMATION_DURATION_MS)
		}, [])

		const handleAccept = React.useCallback(() => {
			setCookieConsent()
			closeAndHide()
			onAcceptCallback?.()
		}, [closeAndHide, onAcceptCallback])

		const handleDecline = React.useCallback(() => {
			closeAndHide()
			onDeclineCallback?.()
		}, [closeAndHide, onDeclineCallback])

		React.useEffect(() => {
			try {
				setIsOpen(true)
				if (hasCookieConsent() && !demo) {
					closeAndHide()
				}
			} catch (error) {
				console.warn("Cookie consent error:", error)
			}
		}, [demo, closeAndHide])

		if (hide) return null

		const containerClasses = cn(
			cookieConsentVariants({ variant, position }),
			getAnimationClasses(position, isOpen),
			className
		)

		const cardClasses = getCardClasses(variant, glass)

		const variantProps = {
			description,
			onAccept: handleAccept,
			onDecline: handleDecline,
			learnMoreHref,
		}

		let content: React.ReactNode

		switch (variant) {
			case "default":
				content = <DefaultVariantContent {...variantProps} learnMoreHref={learnMoreHref} />
				break
			case "small":
				content = <SmallVariantContent {...variantProps} />
				break
			case "mini":
				content = <MiniVariantContent {...variantProps} />
				break
			default:
				return null
		}

		return (
			<div ref={ref} className={containerClasses} {...props}>
				<Card className={cardClasses}>{content}</Card>
			</div>
		)
	}
)

CookieConsent.displayName = "CookieConsent"

export { CookieConsent, cookieConsentVariants }
export default CookieConsent
