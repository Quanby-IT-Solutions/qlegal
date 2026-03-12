"use client"

import { useState } from "react"
import { CircleArrowRight, Logout01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/core/components/ui/card"
import { handleLogout } from "@/core/lib/auth.utils"
import { cn } from "@/core/lib/utils"

import { OnboardingWizardContent } from "./onboarding-wizzard-content"

export function OnboardingWizard() {
	const [hasStarted, setHasStarted] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)
	const handleStart = () => setHasStarted(true)
	const handleRestartWelcome = () => {
		setIsExpanded(false)
		setHasStarted(false)
	}

	const handleLogoutClick = () => {
		setIsExpanded(false)
		setHasStarted(false)
		void handleLogout("/login")
	}

	return (
		<Card
			className={cn(
				"w-full border shadow-lg transition-[max-width] duration-300 ease-in-out",
				isExpanded ? "max-w-md md:max-w-5xl" : "max-w-md"
			)}
		>
			{!hasStarted && (
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

			{hasStarted && (
				<OnboardingWizardContent
					onRestartWelcome={handleRestartWelcome}
					onExpandChange={setIsExpanded}
				/>
			)}
		</Card>
	)
}
