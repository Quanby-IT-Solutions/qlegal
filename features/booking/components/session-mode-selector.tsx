"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"
import { Globe, Users } from "lucide-react"

interface SessionModeSelectorProps {
	value: "REN" | "IEN"
	onChange: (mode: "REN" | "IEN") => void
	disabled?: boolean
	showHeading?: boolean
	showNote?: boolean
}

export function SessionModeSelector({ value, onChange, disabled = false, showHeading = true, showNote = true }: SessionModeSelectorProps) {
	return (
		<div className="space-y-4">
			{showHeading && (
				<div>
					<Label className="text-base font-semibold">Session Mode</Label>
					<p className="text-sm text-muted-foreground mt-1">How will you meet with the notary?</p>
				</div>
			)}

			<RadioGroup value={value} onValueChange={(v) => onChange(v as "REN" | "IEN")} disabled={disabled} className="w-full">
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{/* REN - Remote */}
					<Card className="h-full cursor-pointer border-2 transition-all hover:border-primary"
						onClick={() => !disabled && onChange("REN")}
						style={{
							borderColor: value === "REN" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "REN" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<RadioGroupItem value="REN" id="ren-mode" disabled={disabled} />
								<div className="flex items-center gap-2">
									<Globe className="h-5 w-5 text-blue-600" />
									<CardTitle className="text-base">REN (Remote)</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<CardDescription>
								Everyone joins via video call from their own location
							</CardDescription>
							<ul className="text-sm space-y-1 text-muted-foreground">
								<li>✓ Convenient - join from anywhere</li>
								<li>✓ For OFWs, different cities</li>
								<li>✓ Instant scheduling</li>
							</ul>
						</CardContent>
					</Card>

					{/* IEN - In-Person */}
					<Card className="h-full cursor-pointer border-2 transition-all hover:border-primary"
						onClick={() => !disabled && onChange("IEN")}
						style={{
							borderColor: value === "IEN" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "IEN" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<RadioGroupItem value="IEN" id="ien-mode" disabled={disabled} />
								<div className="flex items-center gap-2">
									<Users className="h-5 w-5 text-green-600" />
									<CardTitle className="text-base">IEN (In-Person)</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<CardDescription>
								Everyone meets physically at notary's office or location
							</CardDescription>
							<ul className="text-sm space-y-1 text-muted-foreground">
								<li>✓ Traditional approach</li>
								<li>✓ For complex documents</li>
								<li>✓ Face-to-face trust</li>
							</ul>
						</CardContent>
					</Card>

				</div>
			</RadioGroup>

			{showNote && (
				<div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
					<strong>⚠️ Location requirement:</strong> All participants must be in the Philippines or at a Philippine embassy/consular office abroad.
				</div>
			)}
		</div>
	)
}
