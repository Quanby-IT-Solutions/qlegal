"use client"

import { Globe, Users } from "lucide-react"

import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@/core/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/core/components/ui/radio-group"

interface SessionModeSelectorProps {
	value?: "REN" | "IEN"
	onChange: (mode: "REN" | "IEN") => void
	disabled?: boolean
	showHeading?: boolean
}

export function SessionModeSelector({
	value,
	onChange,
	disabled = false,
	showHeading = true,
}: SessionModeSelectorProps) {
	return (
		<div className="space-y-4">
			{showHeading && (
				<div>
					<label className="text-base font-semibold">Session Mode</label>
					<p className="text-muted-foreground mt-1 text-sm">How will you meet with the notary?</p>
				</div>
			)}

			<RadioGroup
				value={value}
				onValueChange={v => onChange(v as "REN" | "IEN")}
				disabled={disabled}
				className="flex"
			>
				{/* REN - Remote */}
				<FieldLabel htmlFor="ren-mode">
					<Field
						orientation="horizontal"
						className="cursor-pointer"
						style={{
							borderColor: value === "REN" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "REN" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<FieldContent>
							<div className="mb-2 flex items-center gap-2">
								<Globe className="size-5 text-blue-600" />
								<FieldTitle>Remote</FieldTitle>
							</div>
							<FieldDescription>Join by video call</FieldDescription>
						</FieldContent>
						<RadioGroupItem value="REN" id="ren-mode" disabled={disabled} />
					</Field>
				</FieldLabel>

				{/* IEN - In-Person */}
				<FieldLabel htmlFor="ien-mode">
					<Field
						orientation="horizontal"
						className="cursor-pointer"
						style={{
							borderColor: value === "IEN" ? "hsl(var(--primary))" : undefined,
							backgroundColor: value === "IEN" ? "hsl(var(--primary) / 0.05)" : undefined,
						}}
					>
						<FieldContent>
							<div className="mb-2 flex items-center gap-2">
								<Users className="size-5 text-green-600" />
								<FieldTitle>In-Person</FieldTitle>
							</div>
							<FieldDescription>Meet at the notary office</FieldDescription>
						</FieldContent>
						<RadioGroupItem value="IEN" id="ien-mode" disabled={disabled} />
					</Field>
				</FieldLabel>
			</RadioGroup>
		</div>
	)
}
