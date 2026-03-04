"use client"

import { SparklesIcon } from "lucide-react"

import { Button } from "@/core/components/ui/button"

interface WelcomeStepProps {
	onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
	return (
		<div className="text-center">
			<div className="bg-primary/10 mx-auto mb-5 flex size-14 items-center justify-center rounded-full">
				<SparklesIcon className="text-primary size-7" />
			</div>

			<h2 className="text-xl font-semibold">Welcome to Quanby Sign</h2>
			<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
				Let&apos;s set up your account. We&apos;ll walk you through a few quick steps to
				secure your account and personalise your profile.
			</p>

			<Button onClick={onNext} className="mt-8 w-full" size="lg">
				Get started
			</Button>
		</div>
	)
}
