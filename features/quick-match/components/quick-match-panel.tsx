"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Star, Zap } from "lucide-react"

import { Alert, AlertDescription } from "@/core/components/ui/alert"
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { Progress } from "@/core/components/ui/progress"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"

import { trpc } from "@/services/trpc/client"

import { SessionModeSelector } from "@/features/booking/components/session-mode-selector"
import { SessionTypeSelector } from "@/features/booking/components/session-type-selector"

export function QuickMatchPanel() {
	const [sessionMode, setSessionMode] = useState<"REN" | "IEN">("REN")
	const [sessionType, setSessionType] = useState<"CONSULTATION" | "NOTARIZATION">("NOTARIZATION")
	const [documentType, setDocumentType] = useState<string>("any")
	const [timeWindow, setTimeWindow] = useState<string>("ASAP")

	const [isSearching, setIsSearching] = useState(false)
	const [matchedENP, setMatchedENP] = useState<Record<string, unknown> | null>(null)
	const [timeRemaining, setTimeRemaining] = useState<number>(0)
	const [rematches, setRematches] = useState(2)
	const [cooldownActive, setCooldownActive] = useState(false)
	const [matchParams, setMatchParams] = useState<{
		serviceType: "CONSULTATION" | "NOTARIZATION"
		sessionMode: "REN" | "IEN"
		documentType?: string
		preferredTimeWindow?: string
		maxRematches?: number
	} | null>(null)

	// Auto-decrement timer
	useEffect(() => {
		if (timeRemaining <= 0) return

		const timer = setInterval(() => {
			setTimeRemaining(prev => {
				if (prev <= 1) {
					// Time expired - auto-decline
					handleAutoDecline()
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(timer)
	}, [timeRemaining])

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { data: matchData, isPending } = trpc.quickMatch.findBestMatch.useQuery(
		matchParams ?? {
			serviceType: "CONSULTATION" as const,
			sessionMode: "REN" as const,
		},
		{
			enabled: !!matchParams,
		}
	)

	// Handle successful match
	useEffect(() => {
		if (matchData && matchParams) {
			setMatchedENP(matchData as Record<string, unknown>)
			setTimeRemaining(60) // 60 seconds to respond
			setIsSearching(false)
			setMatchParams(null)
		}
	}, [matchData, matchParams])

	const handleFindMatch = () => {
		setIsSearching(true)
		setMatchParams({
			serviceType: sessionType,
			sessionMode,
			documentType: documentType || undefined,
			preferredTimeWindow: timeWindow,
		})
	}

	const handleConfirm = () => {
		// TODO: Create session request with matched ENP
		setMatchedENP(null)
		setTimeRemaining(0)
	}

	const handleFindAnother = () => {
		if (rematches <= 0) {
			// Cooldown: 10 minutes
			setCooldownActive(true)
			setTimeout(() => setCooldownActive(false), 600000) // 10 minutes
			return
		}

		setRematches(prev => prev - 1)
		handleFindMatch()
	}

	const handleAutoDecline = () => {
		setMatchedENP(null)
		setTimeRemaining(0)
	}

	const progressPercent = (timeRemaining / 60) * 100

	return (
		<div className="space-y-6">
			{/* Info Alert */}
			<Alert className="border-blue-200 bg-blue-50">
				<Zap className="h-4 w-4 text-blue-600" />
				<AlertDescription className="ml-2 text-blue-900">
					Quick Match uses a fair algorithm to pair you with the best available notary. The system
					will notify your matched notary, who has 60 seconds to accept. No commitment until both
					parties agree.
				</AlertDescription>
			</Alert>

			{/* Setup Section */}
			{!matchedENP && (
				<Card>
					<CardHeader>
						<CardTitle>Quick Match Setup</CardTitle>
						<CardDescription>
							Tell us what you need and we'll find the best notary for you
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Session Type */}
						<SessionTypeSelector
							value={sessionType}
							onChange={setSessionType}
							disabled={isSearching}
						/>

						<div className="border-t pt-6" />

						{/* Session Mode */}
						<SessionModeSelector
							value={sessionMode}
							onChange={setSessionMode}
							disabled={isSearching}
						/>

						<div className="border-t pt-6" />

						{/* Additional Options */}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="doc-type">Document Type (optional)</Label>
								<Select value={documentType} onValueChange={setDocumentType} disabled={isSearching}>
									<SelectTrigger id="doc-type">
										<SelectValue placeholder="Any document type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="any">Any document type</SelectItem>
										<SelectItem value="DEED_OF_SALE">Deed of Sale</SelectItem>
										<SelectItem value="POA">Power of Attorney</SelectItem>
										<SelectItem value="AFFIDAVIT">Affidavit</SelectItem>
										<SelectItem value="LOAN">Loan Documents</SelectItem>
										<SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="time-window">Preferred Time</Label>
								<Select value={timeWindow} onValueChange={setTimeWindow} disabled={isSearching}>
									<SelectTrigger id="time-window">
										<SelectValue placeholder="ASAP" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ASAP">ASAP</SelectItem>
										<SelectItem value="TODAY">Today</SelectItem>
										<SelectItem value="THIS_WEEK">This Week</SelectItem>
										<SelectItem value="THIS_MONTH">This Month</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<Button onClick={handleFindMatch} disabled={isSearching} size="lg" className="w-full">
							{isSearching ? "Searching..." : "Find Best Match"}
						</Button>

						{cooldownActive && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription className="ml-2">
									You've used all re-matches. Please wait 10 minutes before trying again.
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}

			{/* Match Found Section */}
			{matchedENP && (
				<Card className="border-2 border-green-200 bg-green-50">
					<CardHeader className="rounded-t-lg bg-green-100">
						<CardTitle className="text-green-900">🎯 Best Match Found!</CardTitle>
						<CardDescription className="text-green-800">
							Waiting for confirmation - {timeRemaining} seconds remaining
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6 pt-6">
						{/* Timer Progress Bar */}
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-semibold">Response Time</span>
								<span className="text-muted-foreground text-xs">{timeRemaining}s</span>
							</div>
							<Progress value={progressPercent} className="h-2" />
						</div>

						{/* ENP Profile Card */}
						<div className="space-y-3 rounded-lg border bg-white p-4">
							{/* Header */}
							<div className="flex items-start gap-4">
								<Avatar className="h-16 w-16">
									<AvatarFallback>
										{typeof matchedENP?.enpName === "string" ? matchedENP.enpName[0] : "?"}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1">
									<h3 className="text-lg font-bold">
										{typeof matchedENP?.enpName === "string"
											? matchedENP.enpName
											: "Unknown Notary"}
									</h3>
									<div className="mt-1 flex items-center gap-2">
										<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
										<span className="font-semibold">{Number(matchedENP?.rating) || 0}</span>
										<span className="text-muted-foreground text-sm">
											({Number(matchedENP?.totalSessions) || 0} sessions)
										</span>
									</div>
								</div>
							</div>

							{/* Badges */}
							<div className="flex flex-wrap gap-2">
								{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.newENPBoost ?? 0) >
									0 && (
									<Badge variant="outline" className="bg-amber-50">
										🌟 Rising Star
									</Badge>
								)}
								{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.ratingScore ?? 0) >=
									25 && (
									<Badge variant="outline" className="bg-purple-50">
										🏆 Top Rated
									</Badge>
								)}
								{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.speedScore ?? 0) >=
									20 && (
									<Badge variant="outline" className="bg-blue-50">
										⚡ Fast Responder
									</Badge>
								)}
							</div>

							{/* Specializations */}
							<div>
								<p className="text-muted-foreground mb-1 text-xs font-semibold">Specializations</p>
								<p className="text-sm">
									{Array.isArray(matchedENP?.specializations)
										? (matchedENP.specializations as string[]).join(", ")
										: "General"}
								</p>
							</div>

							{/* Available Time */}
							<div className="rounded bg-blue-50 p-2 text-sm">
								<strong>Available:</strong>{" "}
								{typeof matchedENP?.availableTime === "string"
									? matchedENP.availableTime
									: "Check availability"}
							</div>
						</div>

						{/* Score Breakdown */}
						<details className="cursor-pointer rounded border p-3 hover:bg-gray-50">
							<summary className="text-sm font-semibold">Why this match?</summary>
							<div className="text-muted-foreground mt-3 space-y-1 pl-4 text-xs">
								<p>
									📊 Rating:{" "}
									{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.ratingScore) || 0}
									%
								</p>
								<p>
									⚡ Speed:{" "}
									{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.speedScore) || 0}%
								</p>
								<p>
									🏆 Experience:{" "}
									{Number(
										(matchedENP?.scoreBreakdown as Record<string, number>)?.experienceScore
									) || 0}
									%
								</p>
								<p>
									🎯 Specialization:{" "}
									{Number(
										(matchedENP?.scoreBreakdown as Record<string, number>)?.specializationScore
									) || 0}
									%
								</p>
								<p>
									⚖️ Workload Balance:{" "}
									{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.workloadScore) ||
										0}
									%
								</p>
								{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.newENPBoost) >
									0 && (
									<p>
										🌟 New ENP Boost: +
										{Number((matchedENP?.scoreBreakdown as Record<string, number>)?.newENPBoost)}%
									</p>
								)}
							</div>
						</details>

						{/* Action Buttons */}
						<div className="grid grid-cols-1 gap-3 border-t pt-4">
							<Button onClick={handleConfirm} size="lg" className="bg-green-600 hover:bg-green-700">
								✓ Confirm & Book
							</Button>
							<Button
								onClick={handleFindAnother}
								variant="outline"
								size="lg"
								disabled={rematches <= 0 && !cooldownActive}
							>
								↻ Find Another {rematches > 0 ? `(${rematches} left)` : ""}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
