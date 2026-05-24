"use client"

/** @deprecated `/onboarding` redirects to Profile; wizard not mounted in production routing. */
import { useEffect, useState } from "react"
import { CircleArrowRight, Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useSession } from "next-auth/react"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/core/components/ui/card"
import { handleLogout } from "@/core/lib/auth.utils"
import { cn } from "@/core/lib/utils"

import { OnboardingWizardContent } from "./onboarding-wizzard-content"

const ONBOARDING_WELCOME_DISMISSED_KEY = "quanby-onboarding-welcome-dismissed"

function readWelcomeDismissedFromStorage(): boolean {
	if (typeof window === "undefined") return false
	try {
		return window.sessionStorage.getItem(ONBOARDING_WELCOME_DISMISSED_KEY) === "1"
	} catch {
		return false
	}
}

function persistWelcomeDismissed() {
	try {
		window.sessionStorage.setItem(ONBOARDING_WELCOME_DISMISSED_KEY, "1")
	} catch {
		/* ignore quota / private mode */
	}
}

function clearWelcomeDismissedStorage() {
	try {
		window.sessionStorage.removeItem(ONBOARDING_WELCOME_DISMISSED_KEY)
	} catch {
		/* ignore */
	}
}

export function OnboardingWizard({
	skipWelcomeForKyc = false,
	kycReturnTo = null,
	autoStartKyc = false,
}: {
	skipWelcomeForKyc?: boolean
	/** When set (e.g. from `?returnTo=`), Back on the first step navigates here instead of the welcome screen. */
	kycReturnTo?: string | null
	/** From `?autoStart=1`: open the identity SDK immediately instead of stopping on the intro screen. */
	autoStartKyc?: boolean
} = {}) {
	const { data: session } = useSession()
	const [welcomeDismissedLocally, setWelcomeDismissedLocally] = useState(skipWelcomeForKyc)
	const [storageDismissed, setStorageDismissed] = useState(skipWelcomeForKyc)
	/** When true, show the welcome screen even if KYC is PENDING/VERIFIED (fixes Back on step 1 after cancel + return). */
	const [backToWelcome, setBackToWelcome] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)

	useEffect(() => {
		if (skipWelcomeForKyc) {
			persistWelcomeDismissed()
			return
		}
		setStorageDismissed(readWelcomeDismissedFromStorage())
	}, [skipWelcomeForKyc])

	useEffect(() => {
		const kyc = session?.user?.kycStatus
		if (typeof kyc === "string" && kyc !== "NOT_STARTED") {
			persistWelcomeDismissed()
			setStorageDismissed(true)
		}
	}, [session?.user?.kycStatus])

	const kycHasBegun =
		typeof session?.user?.kycStatus === "string" && session.user.kycStatus !== "NOT_STARTED"

	const showWizardFlow =
		!backToWelcome && (welcomeDismissedLocally || storageDismissed || kycHasBegun)

	const handleStart = () => {
		setBackToWelcome(false)
		persistWelcomeDismissed()
		setStorageDismissed(true)
		setWelcomeDismissedLocally(true)
	}

	const handleRestartWelcome = () => {
		setIsExpanded(false)
		clearWelcomeDismissedStorage()
		setStorageDismissed(false)
		setWelcomeDismissedLocally(false)
		setBackToWelcome(true)
	}

	const handleLogoutClick = () => {
		setIsExpanded(false)
		clearWelcomeDismissedStorage()
		setStorageDismissed(false)
		setWelcomeDismissedLocally(false)
		setBackToWelcome(false)
		void handleLogout("/login")
	}

	return (
		<Card
			className={cn(
				"w-full border shadow-lg transition-[max-width] duration-300 ease-in-out",
				isExpanded ? "max-w-md md:max-w-5xl" : "max-w-md"
			)}
		>
			{!showWizardFlow && (
				<CardHeader className="flex-col text-center">
					<div className="mb-2 flex justify-center">
						<QuanbyLogo className="size-14" />
					</div>
					<CardTitle className="text-xl">Account Onboarding</CardTitle>
					<CardDescription>
						Let&apos;s set up your account. We&apos;ll walk you through a few quick steps to secure
						your account and personalise your profile.
					</CardDescription>

					<CardFooter className="mt-8 flex justify-between px-0!">
						<Button onClick={handleLogoutClick} size="sm" variant="ghost">
							<HugeiconsIcon icon={Logout01Icon} />
							Log out
						</Button>
						<Button onClick={handleStart} size="sm">
							<HugeiconsIcon icon={CircleArrowRight} />
							Get started
						</Button>
					</CardFooter>
				</CardHeader>
			)}

			{showWizardFlow && (
				<OnboardingWizardContent
					onRestartWelcome={handleRestartWelcome}
					onExpandChange={setIsExpanded}
					kycReturnTo={kycReturnTo}
					autoStartKyc={autoStartKyc}
				/>
			)}
		</Card>
	)
}
