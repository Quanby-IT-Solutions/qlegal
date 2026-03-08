"use client"

import { useState } from "react"

import { QuanbyLogo } from "@/core/components/quanby-logo"
import { Button } from "@/core/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { cn } from "@/core/lib/utils"

import { OnboardingWizardContent } from "./onboarding-wizzard-content"

export function OnboardingWizard() {
	const [hasStarted, setHasStarted] = useState(false)
	const [isSummaryStep, setIsSummaryStep] = useState(false)
	const handleStart = () => setHasStarted(true)
	const handleRestartWelcome = () => {
		setIsSummaryStep(false)
		setHasStarted(false)
	}

	return (
		<Card
			className={cn(
				"w-full border shadow-lg transition-[max-width] duration-300 ease-in-out",
				isSummaryStep ? "max-w-md md:max-w-5xl" : "max-w-md"
			)}
		>
			{!hasStarted && (
				<CardHeader className="flex-col text-center">
					<div className="mb-2 flex justify-center">
						<QuanbyLogo className="size-14" />
					</div>
					<CardTitle className="text-2xl">Account Onboarding</CardTitle>
					<CardDescription>
						Let&apos;s set up your account. We&apos;ll walk you through a few quick steps to secure
						your account and personalise your profile.
					</CardDescription>
					<Button onClick={handleStart} className="mt-8 w-full" size="lg">
						Get started
					</Button>
				</CardHeader>
			)}

			{hasStarted && (
				<OnboardingWizardContent
					onRestartWelcome={handleRestartWelcome}
					onSummaryStepChange={setIsSummaryStep}
				/>
			)}
		</Card>
	)
}
