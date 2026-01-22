"use client"

import { FileText, MessageSquare } from "lucide-react"

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import { Label } from "@/core/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"

interface SessionTypeSelectorProps {
	value: "CONSULTATION" | "NOTARIZATION"
	onChange: (type: "CONSULTATION" | "NOTARIZATION") => void
	disabled?: boolean
	showHeading?: boolean
}

export function SessionTypeSelector({
	value,
	onChange,
	disabled = false,
	showHeading = true,
}: SessionTypeSelectorProps) {
	return (
		<div className="space-y-4">
			{showHeading && (
				<div>
					<Label className="text-base font-semibold">Service Type</Label>
					<p className="text-muted-foreground mt-1 text-sm">What do you need?</p>
				</div>
			)}

			<RadioGroup
				value={value}
				onValueChange={v => onChange(v as "CONSULTATION" | "NOTARIZATION")}
				disabled={disabled}
				className="w-full"
			>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{/* Consultation */}
					<Card
						className="hover:border-primary h-full cursor-pointer border-2 transition-all"
						onClick={() => !disabled && onChange("CONSULTATION")}
						style={{
							borderColor: value === "CONSULTATION" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "CONSULTATION" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<RadioGroupItem value="CONSULTATION" id="consultation-type" disabled={disabled} />
								<div className="flex items-center gap-2">
									<MessageSquare className="h-5 w-5 text-indigo-600" />
									<CardTitle className="text-base">Consultation</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<CardDescription>Ask questions and get guidance from a notary</CardDescription>
							<ul className="text-muted-foreground space-y-1 text-sm">
								<li>✓ Legal advice</li>
								<li>✓ Document review</li>
								<li>✓ No official notarization yet</li>
								<li>✓ Pay per consultation rate</li>
							</ul>
						</CardContent>
					</Card>

					{/* Notarization */}
					<Card
						className="hover:border-primary h-full cursor-pointer border-2 transition-all"
						onClick={() => !disabled && onChange("NOTARIZATION")}
						style={{
							borderColor: value === "NOTARIZATION" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "NOTARIZATION" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<CardHeader className="pb-3">
							<div className="flex items-center gap-2">
								<RadioGroupItem value="NOTARIZATION" id="notarization-type" disabled={disabled} />
								<div className="flex items-center gap-2">
									<FileText className="h-5 w-5 text-emerald-600" />
									<CardTitle className="text-base">Notarization</CardTitle>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<CardDescription>Official notarization of documents</CardDescription>
							<ul className="text-muted-foreground space-y-1 text-sm">
								<li>✓ Legal binding</li>
								<li>✓ Official records</li>
								<li>✓ Audit trail</li>
								<li>✓ Pay per document + platform fee</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</RadioGroup>
		</div>
	)
}
